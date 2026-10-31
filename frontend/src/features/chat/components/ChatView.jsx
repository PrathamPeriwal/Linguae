import "stream-chat-react/dist/css/v2/index.css";
import "../../../styles/stream-chat.css";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Video } from "lucide-react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router";
import {
  Channel,
  Chat,
  MessageInput,
  MessageList,
  SendButton,
  Thread,
  Window,
  renderText as renderStreamText,
} from "stream-chat-react";
import { listQueryOptions } from "../../../app/queryClient";
import { Avatar } from "../../../components/ui/Avatar";
import { Button } from "../../../components/ui/Button";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LanguageChip } from "../../../components/ui/LanguageChip";
import { RevealBar } from "../../../components/ui/RevealBar";
import { ChatSkeleton } from "../../../components/ui/Skeleton";
import useAuthUser from "../../auth/hooks/useAuthUser";
import { getUserFriends } from "../../friends/api";
import { cn } from "../../../lib/cn";
import { getErrorMessage } from "../../../lib/errors";
import { getGreeting } from "../../../lib/languages";
import { languageLabel } from "../../../lib/languageLabel";
import { queryKeys } from "../../../lib/queryKeys";
import { useDelayedPending } from "../../../lib/useDelayedPending";
import { useThemeStore } from "../../../store/useThemeStore";
import { chatChannelId, chatUserIdFromRoute } from "../channelId";
import { useStreamChat } from "../streamChatContext";

const CALL_LINK_PREFIX = "I've started a video call. Join me here: ";
const ChatFriendContext = createContext(null);

function callUrlFromText(text) {
  if (typeof text !== "string") return "";
  const trimmed = text.trim();
  const candidate = trimmed.startsWith(CALL_LINK_PREFIX)
    ? trimmed.slice(CALL_LINK_PREFIX.length).trim()
    : trimmed;
  if (!candidate || /\s/.test(candidate)) return "";
  let url;
  try {
    url = new URL(candidate);
  } catch {
    return "";
  }
  if (url.origin !== window.location.origin) return "";
  if (!/^\/call\/[^/]+$/.test(url.pathname)) return "";
  if (url.search || url.hash) return "";
  return candidate;
}

function renderChatText(text, mentionedUsers) {
  const url = callUrlFromText(text);
  if (!url) return renderStreamText(text, mentionedUsers);
  return (
    <span className="chat-call-card">
      <a href={url}>
        Join video call
        <span className="sr-only"> {url}</span>
      </a>
    </span>
  );
}

function ChatEmpty({ listType }) {
  const friend = useContext(ChatFriendContext);
  if (listType !== "message" || !friend) return null;
  const languageName = languageLabel(friend.nativeLanguage);
  const greeting = getGreeting(languageName || "English");
  const name = friend.fullName || "them";
  const language = languageName || "their language";

  return (
    <div className="str-chat__empty-channel">
      <p className="chat-hello" lang={greeting.lang} dir={greeting.dir}>
        {greeting.word}
      </p>
      <p className="mt-2 text-small text-fg">
        <RevealBar>means {greeting.meaning}</RevealBar>
      </p>
      <p className="mt-3 max-w-[40ch] text-small text-fg-muted">
        Say hello to {name} in {language}.
      </p>
    </div>
  );
}

function MessageListRegion() {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const list = ref.current?.querySelector(".str-chat__list");
    if (list) list.setAttribute("aria-label", "Messages");
    const field = ref.current?.parentElement?.querySelector("textarea");
    if (field) field.setAttribute("aria-label", "Message");
  });

  return (
    <div ref={ref} className="chat-stream-list">
      <MessageList renderText={renderChatText} />
    </div>
  );
}

function PopSendButton({ sendMessage, className, onPop, ...rest }) {
  return (
    <SendButton
      {...rest}
      className={cn("str-chat__send-button", className)}
      sendMessage={(event) => {
        onPop();
        sendMessage(event);
      }}
    />
  );
}

function ChatHeader({ friend, calling, onCall }) {
  const name = friend.fullName || "Chat";
  const location = typeof friend.location === "string" ? friend.location.trim() : "";

  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-line bg-panel px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:gap-3 sm:px-3">
      <Link
        to="/chats"
        aria-label="Back to chats"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-control text-fg lg:hidden"
      >
        <ArrowLeft className="size-5" aria-hidden="true" />
      </Link>
      <Avatar src={friend.profilePic} name={name} size={40} />
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-sans text-body font-semibold text-fg">{name}</h1>
        {location ? <p className="truncate text-caption text-fg-muted">{location}</p> : null}
        <div className="mt-1 flex flex-wrap gap-1.5">
          {friend.nativeLanguage ? (
            <LanguageChip language={friend.nativeLanguage} variant="native" prefix="Speaks" />
          ) : null}
          {friend.learningLanguage ? (
            <LanguageChip language={friend.learningLanguage} variant="learning" prefix="Learning" />
          ) : null}
        </div>
      </div>
      <Button
        variant="secondary"
        size="md"
        className="shrink-0 max-sm:w-11 max-sm:px-0"
        aria-label="Start video call"
        loading={calling}
        onClick={onCall}
      >
        <Video className="size-5" aria-hidden="true" />
        <span className="hidden sm:inline">Start video call</span>
      </Button>
    </header>
  );
}

const ChatView = () => {
  const { id: routeId } = useParams();
  const { authUser } = useAuthUser();
  const theme = useThemeStore((state) => state.theme);
  const { client, connection, retryConnect, syncUnread } = useStreamChat();
  const myId = authUser?._id ? String(authUser._id) : "";
  const targetId = chatUserIdFromRoute(routeId, myId);
  const rootRef = useRef(null);
  const poppedAt = useRef(0);
  const [channel, setChannel] = useState(null);
  const [watchState, setWatchState] = useState("idle");
  const [watchError, setWatchError] = useState(null);
  const [watchAttempt, setWatchAttempt] = useState(0);
  const [calling, setCalling] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const friendsQuery = useQuery({
    queryKey: queryKeys.friends(),
    queryFn: getUserFriends,
    enabled: Boolean(authUser),
    ...listQueryOptions,
  });

  const friends = Array.isArray(friendsQuery.data) ? friendsQuery.data : [];
  const friendsLoading = !friendsQuery.isError && !Array.isArray(friendsQuery.data);
  const friend = friends.find((item) => String(item._id) === targetId) || null;
  const friendId = friend?._id ? String(friend._id) : "";
  const expectedId = myId && friendId ? chatChannelId(myId, friendId) : "";
  const openKey = `${targetId}:${watchAttempt}`;
  const [openedKey, setOpenedKey] = useState(openKey);
  if (openKey !== openedKey) {
    setOpenedKey(openKey);
    setChannel(null);
    setWatchState("idle");
    setWatchError(null);
  }
  const matched = Boolean(channel && expectedId && channel.id === expectedId && watchState === "ready");

  let failure = null;
  if (connection === "error") failure = "connect";
  else if (friendsQuery.isError) failure = "friends";
  else if (!friendsLoading && connection !== "connecting" && !friend) failure = "missing";
  else if (watchState === "error") failure = "watch";

  const pending = !failure && (connection === "connecting" || friendsLoading || !matched);
  const showSkeleton = useDelayedPending(pending);

  useEffect(() => {
    const previous = document.title;
    document.title = friend?.fullName ? `${friend.fullName} · Linguae` : "Chat · Linguae";
    return () => {
      document.title = previous;
    };
  }, [friend?.fullName]);

  useEffect(() => {
    if (connection !== "ready" || !client || !myId || !friendId) return undefined;
    let cancelled = false;
    const channelId = chatChannelId(myId, friendId);
    const next = client.channel("messaging", channelId, {
      members: [myId, friendId],
    });

    const open = async () => {
      try {
        if (!next.initialized) await next.watch();
        if (cancelled) return;
        const previousUnread = next.state?.unreadCount || 0;
        if (next.state) next.state.unreadCount = 0;
        syncUnread();
        setChannel(next);
        setWatchError(null);
        setWatchState("ready");
        try {
          await next.markRead();
        } catch (error) {
          console.error(error);
          if (cancelled || !next.state) return;
          next.state.unreadCount = previousUnread;
          syncUnread();
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setWatchError(error);
          setWatchState("error");
        }
      }
    };

    open();

    return () => {
      cancelled = true;
    };
  }, [client, connection, friendId, myId, syncUnread, watchAttempt]);

  const popSend = useCallback(() => {
    const now = Date.now();
    if (now - poppedAt.current < 160) return;
    poppedAt.current = now;
    rootRef.current?.querySelectorAll(".str-chat__send-button").forEach((button) => {
      button.classList.remove("is-sent");
      void button.offsetWidth;
      button.classList.add("is-sent");
    });
  }, []);

  useEffect(() => {
    if (!channel || !myId) return undefined;
    const onMessage = (event) => {
      const message = event.message;
      if (!message || (message.parent_id && !message.show_in_channel)) return;
      if (message.user?.id === myId) {
        popSend();
        return;
      }
      if (channel.state) channel.state.unreadCount = 0;
      syncUnread();
      const who = message.user?.name || "New message";
      const text = typeof message.text === "string" && message.text.trim()
        ? message.text.trim()
        : "Sent a message";
      setAnnouncement((current) => {
        const next = `${who}: ${text}`;
        return current === next ? `${next}\u00a0` : next;
      });
    };
    channel.on("message.new", onMessage);
    return () => channel.off("message.new", onMessage);
  }, [channel, myId, popSend, syncUnread]);

  const sendButton = useMemo(() => {
    return function ChatSendButton(props) {
      return <PopSendButton {...props} onPop={popSend} />;
    };
  }, [popSend]);

  const retry = () => {
    if (connection === "error") retryConnect();
    friendsQuery.refetch();
    setWatchAttempt((current) => current + 1);
  };

  const startCall = async () => {
    if (!channel || calling) return;
    const callUrl = `${window.location.origin}/call/${channel.id}`;
    setCalling(true);
    try {
      await channel.sendMessage({ text: `${CALL_LINK_PREFIX}${callUrl}` });
      toast.success("Video call link sent successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't send the call link. Try again.");
    } finally {
      setCalling(false);
    }
  };

  if (failure) {
    const copy = {
      connect: ["Couldn't connect to chat", "Check your connection and try again."],
      friends: ["Couldn't load this chat", getErrorMessage(friendsQuery.error)],
      missing: ["Couldn't open this chat", "That person isn't in your friends."],
      watch: [
        "Couldn't open this chat",
        watchError?.response ? getErrorMessage(watchError) : "The conversation didn't load. Try again.",
      ],
    }[failure];

    return (
      <div className="flex h-full max-h-dvh min-h-0 flex-1 items-center justify-center px-4">
        <ErrorState title={copy[0]} onRetry={retry}>
          {copy[1]}
        </ErrorState>
      </div>
    );
  }

  if (pending || showSkeleton || !matched) {
    return showSkeleton ? (
      <ChatSkeleton className="min-h-0 flex-1" />
    ) : (
      <div className="min-h-0 flex-1" aria-busy="true">
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  return (
    <ChatFriendContext.Provider value={friend}>
      <div ref={rootRef} className="flex h-full max-h-dvh min-h-0 w-full flex-1 flex-col overflow-hidden">
        <ChatHeader friend={friend} calling={calling} onCall={startCall} />
        <div className="chat-stream flex h-full min-h-0 flex-1 flex-col">
          <Chat client={client} theme={theme === "light" ? "str-chat__theme-light" : "str-chat__theme-dark"}>
            <Channel
              channel={channel}
              EmptyStateIndicator={ChatEmpty}
              initializeOnMount={false}
              SendButton={sendButton}
            >
              <Window>
                <MessageListRegion />
                <MessageInput focus additionalTextareaProps={{ placeholder: "Message" }} />
              </Window>
              <Thread additionalMessageListProps={{ renderText: renderChatText }} />
            </Channel>
          </Chat>
        </div>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </p>
      </div>
    </ChatFriendContext.Provider>
  );
};

export default ChatView;
