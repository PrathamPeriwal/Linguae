import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { StreamChat } from "stream-chat";
import useAuthUser from "../auth/hooks/useAuthUser";
import { queryKeys } from "../../lib/queryKeys";
import { getStreamToken } from "./api";
import {
  getChatGeneration,
  setChatClient,
} from "./chatSession";
import { StreamChatContext } from "./streamChatContext";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

let connectPromise = null;
let pendingUserId = null;

function ensureConnected(user, token) {
  const client = StreamChat.getInstance(STREAM_API_KEY);
  setChatClient(client);
  if (client.userID === user.id) return Promise.resolve(client);
  if (connectPromise && pendingUserId === user.id) return connectPromise;

  const gen = getChatGeneration();
  pendingUserId = user.id;
  connectPromise = (async () => {
    if (client.userID && client.userID !== user.id) {
      await client.disconnectUser();
    }
    if (getChatGeneration() !== gen) return null;
    if (!client.userID) {
      await client.connectUser(
        { id: user.id, name: user.name, image: user.image },
        token
      );
    }
    if (getChatGeneration() !== gen) {
      if (client.userID) await client.disconnectUser();
      return null;
    }
    return client;
  })().finally(() => {
    connectPromise = null;
    pendingUserId = null;
  });

  return connectPromise;
}

function unreadFromChannels(channels, userId) {
  const counts = {};
  for (const channel of channels) {
    const members = channel.state?.members;
    if (!members) continue;
    const otherId = Object.keys(members).find((id) => id !== userId);
    const unread = channel.state?.unreadCount || 0;
    if (otherId && unread > 0) counts[otherId] = unread;
  }
  return counts;
}

const REQUEST_EVENTS = [
  "friend_request_received",
  "friend_request_accepted",
  "friend_request_removed",
];

function zeroReadChannel(client, event, userId) {
  if (!event?.cid || !client.activeChannels?.[event.cid]?.state) return;
  const ownRead =
    (event.type === "message.read" && event.user?.id === userId) ||
    event.type === "notification.mark_read";
  if (!ownRead) return;
  client.activeChannels[event.cid].state.unreadCount = event.unread_messages ?? 0;
}

export default function StreamChatProvider({ children }) {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();
  const [client, setClient] = useState(null);
  const [channels, setChannels] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [connection, setConnection] = useState("connecting");
  const [attempt, setAttempt] = useState(0);

  const {
    data: tokenData,
    isLoading: tokenLoading,
    isFetching: tokenFetching,
    isError: tokenError,
    refetch: refetchToken,
  } = useQuery({
    queryKey: queryKeys.streamToken(),
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  const retryConnect = useCallback(() => {
    setConnection("connecting");
    setClient(null);
    setAttempt((current) => current + 1);
    refetchToken();
  }, [refetchToken]);

  useEffect(() => {
    if (!authUser?._id) return undefined;
    if (!tokenData?.token) {
      if (tokenLoading || tokenFetching) {
        setConnection((current) => (current === "ready" ? current : "connecting"));
        return undefined;
      }
      setClient(null);
      setConnection("error");
      return undefined;
    }

    let cancelled = false;
    const userId = authUser._id;
    setConnection((current) => (current === "ready" ? current : "connecting"));

    const connect = async () => {
      try {
        const chatClient = await ensureConnected(
          {
            id: userId,
            name: authUser.fullName,
            image: authUser.profilePic,
          },
          tokenData.token
        );
        if (cancelled) return;
        if (!chatClient) {
          setClient(null);
          setConnection("error");
          return;
        }
        setClient(chatClient);

        const nextChannels = await chatClient.queryChannels(
          { type: "messaging", members: { $in: [userId] } },
          { last_message_at: -1 },
          { watch: true, state: true, limit: 30 }
        );
        if (cancelled) return;
        setChannels(nextChannels);
        setUnreadCounts(unreadFromChannels(nextChannels, userId));
        setConnection("ready");
      } catch (error) {
        console.error("Error initializing Stream Chat:", error);
        if (!cancelled) {
          setClient(null);
          setConnection("error");
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
    };
  }, [
    attempt,
    authUser?._id,
    authUser?.fullName,
    authUser?.profilePic,
    tokenData?.token,
    tokenError,
    tokenFetching,
    tokenLoading,
  ]);

  const syncUnread = useCallback(() => {
    if (!client || !authUser?._id) return;
    const active = Object.values(client.activeChannels || {});
    setUnreadCounts(unreadFromChannels(active, authUser._id));
  }, [client, authUser?._id]);

  useEffect(() => {
    if (!client || !authUser?._id) return undefined;
    const userId = authUser._id;
    let cancelled = false;
    const pendingWatches = new Map();

    const refresh = (event) => {
      zeroReadChannel(client, event, userId);
      const active = Object.values(client.activeChannels || {});
      setChannels(active);
      setUnreadCounts(unreadFromChannels(active, userId));
    };

    const promote = (event) => {
      const type = event?.channel_type || event?.channel?.type;
      const id = event?.channel_id || event?.channel?.id;
      if (!type || !id) return;
      const cid = event.cid || `${type}:${id}`;
      const channel = client.channel(type, id);
      let pending = channel.initialized ? null : pendingWatches.get(cid);
      if (!channel.initialized && !pending) {
        pending = channel.watch();
        pendingWatches.set(cid, pending);
      }
      Promise.resolve(pending)
        .then(() => {
          pendingWatches.delete(cid);
          if (!cancelled) refresh(event);
        })
        .catch((error) => {
          pendingWatches.delete(cid);
          const name = error instanceof Error ? error.name : "Error";
          const message = error instanceof Error ? error.message : "";
          console.error(name, message);
        });
    };

    client.on("message.new", refresh);
    client.on("message.read", refresh);
    client.on("notification.mark_read", refresh);
    client.on("notification.message_new", promote);
    client.on("notification.added_to_channel", promote);

    return () => {
      cancelled = true;
      client.off("message.new", refresh);
      client.off("message.read", refresh);
      client.off("notification.mark_read", refresh);
      client.off("notification.message_new", promote);
      client.off("notification.added_to_channel", promote);
    };
  }, [client, authUser?._id]);

  useEffect(() => {
    if (!client) return undefined;
    const refreshLists = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friendRequests() });
      queryClient.invalidateQueries({ queryKey: queryKeys.outgoingFriendReqs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.friends() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
    };
    for (const type of REQUEST_EVENTS) client.on(type, refreshLists);
    return () => {
      for (const type of REQUEST_EVENTS) client.off(type, refreshLists);
    };
  }, [client, queryClient]);

  const value = useMemo(
    () => ({ client, channels, unreadCounts, connection, retryConnect, syncUnread }),
    [client, channels, unreadCounts, connection, retryConnect, syncUnread]
  );

  return (
    <StreamChatContext.Provider value={value}>
      {children}
    </StreamChatContext.Provider>
  );
}
