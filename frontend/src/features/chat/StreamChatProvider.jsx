import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

export default function StreamChatProvider({ children }) {
  const { authUser } = useAuthUser();
  const [client, setClient] = useState(null);
  const [channels, setChannels] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  const { data: tokenData } = useQuery({
    queryKey: queryKeys.streamToken(),
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  useEffect(() => {
    if (!authUser?._id || !tokenData?.token) return;
    let cancelled = false;
    const userId = authUser._id;

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
        if (cancelled || !chatClient) return;
        setClient(chatClient);

        const nextChannels = await chatClient.queryChannels(
          { type: "messaging", members: { $in: [userId] } },
          { last_message_at: -1 },
          { watch: true, state: true, limit: 30 }
        );
        if (cancelled) return;
        setChannels(nextChannels);
        setUnreadCounts(unreadFromChannels(nextChannels, userId));
      } catch (error) {
        console.error("Error initializing Stream Chat:", error);
      }
    };

    connect();

    return () => {
      cancelled = true;
    };
  }, [authUser?._id, authUser?.fullName, authUser?.profilePic, tokenData?.token]);

  useEffect(() => {
    if (!client || !authUser?._id) return;
    const userId = authUser._id;

    const refresh = () => {
      const active = Object.values(client.activeChannels || {});
      setChannels(active);
      setUnreadCounts(unreadFromChannels(active, userId));
    };

    client.on("message.new", refresh);
    client.on("message.read", refresh);
    client.on("notification.mark_read", refresh);

    return () => {
      client.off("message.new", refresh);
      client.off("message.read", refresh);
      client.off("notification.mark_read", refresh);
    };
  }, [client, authUser?._id]);

  const value = useMemo(
    () => ({ client, channels, unreadCounts }),
    [client, channels, unreadCounts]
  );

  return (
    <StreamChatContext.Provider value={value}>
      {children}
    </StreamChatContext.Provider>
  );
}
