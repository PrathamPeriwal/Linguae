import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Link, useLocation } from "react-router";
import { listQueryOptions } from "../../app/queryClient";
import useAuthUser from "../../features/auth/hooks/useAuthUser";
import { chatUserIdFromRoute } from "../../features/chat/channelId";
import { useStreamChat } from "../../features/chat/streamChatContext";
import { getUserFriends } from "../../features/friends/api";
import { cn } from "../../lib/cn";
import { useDelayedPending } from "../../lib/useDelayedPending";
import { getErrorMessage } from "../../lib/errors";
import { queryKeys } from "../../lib/queryKeys";
import { formatShortTime } from "../../lib/time";
import { Avatar } from "../ui/Avatar";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { Input } from "../ui/Field";
import { ConversationRowSkeleton } from "../ui/Skeleton";

function previewFor(channels, myId, friendId) {
  if (!myId || !friendId || !Array.isArray(channels)) return null;
  const channelId = [myId, friendId].sort().join("-");
  const channel = channels.find((item) => item?.id === channelId);
  const messages = channel?.state?.messages;
  if (!Array.isArray(messages) || messages.length === 0) return null;

  const last = messages[messages.length - 1];
  const text = typeof last?.text === "string" ? last.text.trim() : "";
  const at = last?.created_at || channel.state?.last_message_at || null;
  if (!text && !at) return null;
  return { text, at };
}

function timeStamp(value) {
  if (value == null || value === "") return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function openedFriendId(pathname, myId) {
  if (!pathname.startsWith("/chat/")) return "";
  const raw = pathname.slice("/chat/".length).split("/")[0];
  if (!raw) return "";
  try {
    return chatUserIdFromRoute(decodeURIComponent(raw), myId);
  } catch {
    return chatUserIdFromRoute(raw, myId);
  }
}

function ConversationRow({ friend, active, unread, preview }) {
  const time = preview?.at ? formatShortTime(preview.at) : "";
  const text = preview?.text || "";

  return (
    <Link
      to={`/chat/${friend._id}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 px-3 py-2",
        active ? "bg-raised" : "hover:bg-raised-hover",
      )}
    >
      <Avatar src={friend.profilePic} name={friend.fullName} size={40} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-small font-semibold text-fg">
            {friend.fullName}
          </span>
          {time ? (
            <time
              className="shrink-0 text-caption text-fg-muted"
              dateTime={timeStamp(preview.at)}
            >
              {time}
            </time>
          ) : null}
        </span>
        {text ? (
          <span className="block truncate text-caption text-fg-muted">{text}</span>
        ) : null}
      </span>
      {unread > 0 ? (
        <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-spark px-1.5 text-caption font-semibold text-[#2A0B25]">
          <span className="sr-only">{unread} unread</span>
          <span aria-hidden="true">{unread}</span>
        </span>
      ) : null}
    </Link>
  );
}

export function ConversationsPanel({ variant = "sidebar", className }) {
  const sidebar = variant === "sidebar";
  const { pathname } = useLocation();
  const { authUser } = useAuthUser();
  const { channels, unreadCounts } = useStreamChat();
  const [query, setQuery] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.friends(),
    queryFn: getUserFriends,
    enabled: Boolean(authUser),
    ...listQueryOptions,
  });

  const showSkeleton = useDelayedPending(isLoading);
  const friends = Array.isArray(data) ? data : [];
  const openedId = openedFriendId(pathname, authUser?._id);
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? friends.filter((friend) => (friend.fullName || "").toLowerCase().includes(needle))
    : friends;

  let body;
  if (isError) {
    body = (
      <div className="px-3">
        <ErrorState title="Couldn't load conversations" onRetry={() => refetch()}>
          {getErrorMessage(error)}
        </ErrorState>
      </div>
    );
  } else if (isLoading || showSkeleton) {
    body = showSkeleton ? (
      <div aria-busy="true">
        <span className="sr-only">Loading</span>
        {Array.from({ length: 6 }, (_, index) => (
          <ConversationRowSkeleton key={index} />
        ))}
      </div>
    ) : (
      <div className="min-h-24 flex-1" aria-busy="true">
        <span className="sr-only">Loading</span>
      </div>
    );
  } else if (friends.length === 0) {
    body = (
      <EmptyState
        icon={Users}
        action={
          <Link to="/" className="text-small font-semibold text-accent">
            Discover
          </Link>
        }
      >
        No friends yet.
      </EmptyState>
    );
  } else if (visible.length === 0) {
    body = <p className="px-3 py-8 text-center text-small text-fg-muted">No matches.</p>;
  } else {
    body = visible.map((friend) => (
      <ConversationRow
        key={friend._id}
        friend={friend}
        active={Boolean(openedId) && openedId === String(friend._id)}
        unread={unreadCounts?.[friend._id] || 0}
        preview={previewFor(channels, authUser?._id, friend._id)}
      />
    ));
  }

  return (
    <aside
      aria-label="Conversations"
      className={cn(
        "flex min-h-0 flex-col bg-panel",
        sidebar ? "h-full w-[300px] shrink-0 overflow-hidden border-r border-line" : "min-h-full",
        className,
      )}
    >
      <div className="shrink-0 border-b border-line p-3">
        <Input
          type="search"
          aria-label="Search conversations"
          placeholder="Search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
      </div>
      <div className={cn("min-h-0", sidebar ? "flex-1 overflow-y-auto" : "flex-1")}>{body}</div>
    </aside>
  );
}
