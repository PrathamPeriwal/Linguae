import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Loader2, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { listQueryOptions } from "../../../app/queryClient";
import useAuthUser from "../../auth/hooks/useAuthUser";
import { Avatar } from "../../../components/ui/Avatar";
import { Button } from "../../../components/ui/Button";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LanguageChip } from "../../../components/ui/LanguageChip";
import { RequestRowSkeleton } from "../../../components/ui/Skeleton";
import { chatChannelId } from "../../chat/channelId";
import { getErrorMessage } from "../../../lib/errors";
import { queryKeys } from "../../../lib/queryKeys";
import { formatRelativeTime } from "../../../lib/time";
import { useDelayedPending } from "../../../lib/useDelayedPending";
import { cn } from "../../../lib/cn";
import { acceptFriendRequest, getFriendRequests } from "../api";

const MotionRow = motion.li;

function personName(person, fallback) {
  return typeof person?.fullName === "string" && person.fullName.trim()
    ? person.fullName.trim()
    : fallback;
}

function place(person) {
  return typeof person?.location === "string" ? person.location.trim() : "";
}

function languageValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function timeMs(value) {
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function isoStamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function chatPath(myId, theirId) {
  if (!myId || !theirId) return null;
  return `/chat/${chatChannelId(myId, theirId)}`;
}

function RequestTime({ value, prefix }) {
  const label = formatRelativeTime(value);
  if (!label) return null;
  return (
    <p className="mt-1 text-small text-fg-muted">
      {prefix ? `${prefix} ` : <span className="sr-only">Sent </span>}
      <time dateTime={isoStamp(value)}>{label}</time>
    </p>
  );
}

function IncomingRow({ request, pending, onAccept }) {
  const sender = request.sender;
  const name = personName(sender, "Someone");
  const location = place(sender);
  const native = languageValue(sender?.nativeLanguage);
  const learning = languageValue(sender?.learningLanguage);

  return (
    <div className="flex flex-col gap-3 border-b border-line py-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Avatar src={sender?.profilePic} name={name} size={48} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-fg">{name}</p>
          {location ? (
            <p className="mt-0.5 flex items-center gap-1 text-caption text-fg-muted">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{location}</span>
            </p>
          ) : null}
          {native || learning ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {native ? <LanguageChip language={native} variant="native" prefix="Speaks" /> : null}
              {learning ? (
                <LanguageChip language={learning} variant="learning" prefix="Learning" />
              ) : null}
            </div>
          ) : null}
          <RequestTime value={request.createdAt} />
        </div>
      </div>
      <Button
        className={cn(
          "min-h-11 w-full shrink-0 sm:w-auto",
          pending && "border-solid border-transparent bg-accent text-on-accent",
        )}
        disabled={pending}
        aria-busy={pending || undefined}
        aria-label={pending ? `Sending request from ${name}` : `Accept request from ${name}`}
        onClick={() => onAccept(request._id)}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Sending
          </>
        ) : (
          "Accept"
        )}
      </Button>
    </div>
  );
}

function AcceptedRow({ request, myId }) {
  const recipient = request.recipient;
  const name = personName(recipient, "Someone");
  const path = chatPath(myId, recipient?._id);

  return (
    <div className="flex flex-col gap-3 border-b border-line py-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar src={recipient?.profilePic} name={name} size={40} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-fg">{name}</p>
          <RequestTime value={request.updatedAt} prefix="accepted" />
        </div>
      </div>
      {path ? (
        <Button
          variant="secondary"
          to={path}
          aria-label={`Message ${name}`}
          className="min-h-11 w-full shrink-0 sm:w-auto"
        >
          Message
        </Button>
      ) : null}
    </div>
  );
}

const RequestsView = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const reduce = useReducedMotion() === true;
  const pendingRef = useRef(new Set());
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const previous = document.title;
    document.title = "Requests · Linguae";
    return () => {
      document.title = previous;
    };
  }, []);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.friendRequests(),
    queryFn: getFriendRequests,
    ...listQueryOptions,
  });

  function trackPending(id, on) {
    if (!id || pendingRef.current.has(id) === on) return;
    const next = new Set(pendingRef.current);
    if (on) next.add(id);
    else next.delete(id);
    pendingRef.current = next;
    setPendingIds(next);
  }

  const { mutate } = useMutation({
    mutationFn: acceptFriendRequest,
    onMutate: async (requestId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.friendRequests() });
      const previous = queryClient.getQueryData(queryKeys.friendRequests());
      const row = Array.isArray(previous?.incomingReqs)
        ? previous.incomingReqs.find((item) => item?._id === requestId)
        : null;
      queryClient.setQueryData(queryKeys.friendRequests(), (current) => {
        const list = Array.isArray(current?.incomingReqs) ? current.incomingReqs : [];
        return {
          incomingReqs: list.filter((item) => item?._id !== requestId),
          acceptedReqs: Array.isArray(current?.acceptedReqs) ? current.acceptedReqs : [],
        };
      });
      const name = personName(row?.sender, "them");
      return { previous, name, senderId: row?.sender?._id };
    },
    onError: (mutationError, _requestId, context) => {
      if (context && Object.prototype.hasOwnProperty.call(context, "previous")) {
        queryClient.setQueryData(queryKeys.friendRequests(), context.previous);
      }
      toast.error(getErrorMessage(mutationError));
    },
    onSuccess: (_data, _requestId, context) => {
      const name = context?.name || "them";
      const myId = authUser?._id || queryClient.getQueryData(queryKeys.authUser())?.user?._id;
      const path = chatPath(myId, context?.senderId);
      setAnnouncement(`Accepted request from ${name}`);
      toast.success(
        (t) => (
          <span className="flex flex-wrap items-center gap-2">
            <span>You're now connected with {name}</span>
            {path ? (
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-control px-3 font-semibold text-accent"
                aria-label={`Say hello to ${name}`}
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate(path);
                }}
              >
                Say hello
              </button>
            ) : null}
          </span>
        ),
        { duration: 8000, className: "mb-16 lg:mb-0" },
      );
    },
    onSettled: (_data, _mutationError, requestId) => {
      trackPending(requestId, false);
      queryClient.invalidateQueries({ queryKey: queryKeys.friendRequests() });
      queryClient.invalidateQueries({ queryKey: queryKeys.friends() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      queryClient.invalidateQueries({ queryKey: queryKeys.outgoingFriendReqs() });
    },
  });

  function accept(requestId) {
    if (!requestId || pendingRef.current.has(requestId)) return;
    trackPending(requestId, true);
    mutate(requestId);
  }

  const showSkeleton = useDelayedPending(isLoading);
  const failed = isError && data == null;
  const incoming = (Array.isArray(data?.incomingReqs) ? data.incomingReqs : []).filter(
    (row) => row?._id && row.sender,
  );
  const accepted = (Array.isArray(data?.acceptedReqs) ? data.acceptedReqs : [])
    .filter((row) => row?._id && row.recipient)
    .slice()
    .sort((a, b) => timeMs(b.updatedAt) - timeMs(a.updatedAt))
    .slice(0, 10);
  const myId = authUser?._id;
  const rowMotion = reduce
    ? { duration: 0 }
    : {
        layout: { type: "spring", bounce: 0.2, duration: 0.36 },
        opacity: { duration: 0.2, ease: [0.4, 0, 1, 1] },
      };

  let body;
  if (failed) {
    body = (
      <ErrorState title="Couldn't load requests" onRetry={() => refetch()}>
        {getErrorMessage(error)}
      </ErrorState>
    );
  } else if (isLoading || showSkeleton) {
    body = showSkeleton ? (
      <div className="max-w-3xl" aria-busy="true" aria-label="Loading requests">
        {Array.from({ length: 3 }, (_, index) => (
          <RequestRowSkeleton key={index} />
        ))}
      </div>
    ) : (
      <div className="min-h-40" aria-busy="true">
        <span className="sr-only">Loading</span>
      </div>
    );
  } else {
    body = (
      <div className="flex max-w-3xl flex-col gap-10">
        <section className="grid gap-3" aria-labelledby="waiting-heading">
          <h2 id="waiting-heading" className="flex items-baseline gap-2">
            Waiting for you
            <span className="font-sans text-small font-normal text-fg-muted">
              {incoming.length}
              <span className="sr-only"> {incoming.length === 1 ? "request" : "requests"}</span>
            </span>
          </h2>
          <ul className="relative">
            <AnimatePresence initial={false} mode="popLayout">
              {incoming.map((request) => (
                <MotionRow
                  key={request._id}
                  layout={reduce ? false : "position"}
                  initial={false}
                  animate={{ opacity: 1 }}
                  exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0 }}
                  transition={rowMotion}
                  className="w-full"
                >
                  <IncomingRow
                    request={request}
                    pending={pendingIds.has(request._id)}
                    onAccept={accept}
                  />
                </MotionRow>
              ))}
            </AnimatePresence>
          </ul>
          {incoming.length === 0 ? (
            <EmptyState
              action={
                <Button variant="secondary" to="/">
                  Discover
                </Button>
              }
            >
              No requests right now. When someone wants to chat, they will show up here.
            </EmptyState>
          ) : null}
        </section>

        <section className="grid gap-3" aria-labelledby="accepted-heading">
          <h2 id="accepted-heading">Accepted your request</h2>
          {accepted.length === 0 ? (
            <p className="text-small text-fg-muted">No accepted requests yet.</p>
          ) : (
            <ul>
              {accepted.map((request) => (
                <li key={request._id}>
                  <AcceptedRow request={request} myId={myId} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>
      <header className="max-w-[65ch]">
        <h1>Requests</h1>
        <p className="mt-1 text-small text-fg-muted">
          Accept a request, or message someone who accepted yours.
        </p>
      </header>
      {body}
    </div>
  );
};

export default RequestsView;
