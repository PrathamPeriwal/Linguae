import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Search } from "lucide-react";
import { listQueryOptions } from "../../../app/queryClient";
import { Bloom } from "../../../components/ui/Bloom";
import { Button } from "../../../components/ui/Button";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Field, Input } from "../../../components/ui/Field";
import { LanguageCombobox } from "../../../components/ui/LanguageCombobox";
import { LearnerCardSkeleton } from "../../../components/ui/Skeleton";
import { LearnerCard } from "../../friends/components/LearnerCard";
import { getRecommendedUsers } from "../api";
import { getOutgoingFriendReqs, removeFriendRequest, sendFriendRequest } from "../../requests/api";
import { getErrorMessage } from "../../../lib/errors";
import { queryKeys } from "../../../lib/queryKeys";
import { useDelayedPending } from "../../../lib/useDelayedPending";

const SEARCH_MAX = 60;

function learnerCount(count) {
  return count === 1 ? "1 learner" : `${count} learners`;
}

function languageKey(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function listedUsers(data) {
  const users = [];
  const seen = new Set();
  for (const page of data?.pages || []) {
    for (const user of page?.users || []) {
      if (!user?._id || seen.has(user._id)) continue;
      seen.add(user._id);
      users.push(user);
    }
  }
  return users;
}

function requestsByRecipient(requests) {
  const map = new Map();
  if (!Array.isArray(requests)) return map;
  for (const request of requests) {
    const id = request?.recipient?._id;
    if (id) map.set(String(id), request);
  }
  return map;
}

function withRequestId(current, userId, requestId) {
  const list = Array.isArray(current) ? current : [];
  let found = false;
  const next = list.map((request) => {
    const recipientId = request?.recipient?._id || request?.recipient;
    if (String(recipientId) !== String(userId)) return request;
    found = true;
    return { _id: requestId || request._id, recipient: { _id: userId }, status: "pending" };
  });
  if (!found && requestId) {
    next.push({ _id: requestId, recipient: { _id: userId }, status: "pending" });
  }
  return next;
}

const DiscoverView = () => {
  const queryClient = useQueryClient();
  const inFlight = useRef(false);
  const intro = useRef(true);
  const undoingRef = useRef(new Set());
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("");
  const [undoingIds, setUndoingIds] = useState(() => new Set());
  const debouncedSearch = useDebouncedValue(search, 300);
  const q = debouncedSearch.trim().slice(0, SEARCH_MAX);
  const languageFilter = languageKey(language);

  useEffect(() => {
    const previous = document.title;
    document.title = "Discover · Linguae";
    return () => {
      document.title = previous;
    };
  }, []);

  const usersQuery = useInfiniteQuery({
    queryKey: queryKeys.users({ q, language: languageFilter }),
    queryFn: ({ pageParam, signal }) =>
      getRecommendedUsers({
        cursor: pageParam || undefined,
        q,
        language: languageFilter,
        signal,
      }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    ...listQueryOptions,
  });

  const outgoingQuery = useQuery({
    queryKey: queryKeys.outgoingFriendReqs(),
    queryFn: getOutgoingFriendReqs,
    ...listQueryOptions,
  });

  const { mutate, isPending, variables } = useMutation({
    mutationFn: sendFriendRequest,
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.outgoingFriendReqs() });
      const previous = queryClient.getQueryData(queryKeys.outgoingFriendReqs());
      queryClient.setQueryData(queryKeys.outgoingFriendReqs(), (current) => {
        const list = Array.isArray(current) ? current : [];
        if (list.some((request) => request?.recipient?._id === userId)) return list;
        return [...list, { recipient: { _id: userId } }];
      });
      return { previous };
    },
    onSuccess: (created, userId) => {
      queryClient.setQueryData(queryKeys.outgoingFriendReqs(), (current) =>
        withRequestId(current, userId, created?._id),
      );
    },
    onError: (error, _userId, context) => {
      queryClient.setQueryData(queryKeys.outgoingFriendReqs(), context?.previous ?? []);
      toast.error(getErrorMessage(error));
      if (error?.response?.status === 409) {
        queryClient.invalidateQueries({ queryKey: queryKeys.friendRequests() });
      }
    },
    onSettled: () => {
      inFlight.current = false;
      queryClient.invalidateQueries({ queryKey: queryKeys.outgoingFriendReqs() });
    },
  });

  const undoMutation = useMutation({
    mutationFn: ({ requestId }) => removeFriendRequest(requestId),
    onMutate: async ({ userId, requestId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.outgoingFriendReqs() });
      const previous = queryClient.getQueryData(queryKeys.outgoingFriendReqs());
      queryClient.setQueryData(queryKeys.outgoingFriendReqs(), (current) => {
        const list = Array.isArray(current) ? current : [];
        return list.filter((request) => request?.recipient?._id !== userId && request?._id !== requestId);
      });
      return { previous };
    },
    onError: (error, { userId, requestId }, context) => {
      queryClient.setQueryData(queryKeys.outgoingFriendReqs(), (current) => {
        const list = Array.isArray(current) ? current : [];
        if (list.some((request) => request?.recipient?._id === userId || request?._id === requestId)) {
          return list;
        }
        const previous = Array.isArray(context?.previous) ? context.previous : [];
        const restored = previous.find(
          (request) => request?._id === requestId || request?.recipient?._id === userId,
        );
        return restored ? [...list, restored] : (context?.previous ?? list);
      });
      toast.error(getErrorMessage(error));
    },
    onSettled: (_data, _error, { userId }) => {
      const next = new Set(undoingRef.current);
      next.delete(userId);
      undoingRef.current = next;
      setUndoingIds(next);
      queryClient.invalidateQueries({ queryKey: queryKeys.outgoingFriendReqs() });
    },
  });

  const showSkeleton = useDelayedPending(usersQuery.isLoading);
  const users = listedUsers(usersQuery.data);
  const total = usersQuery.data?.pages?.[0]?.total;
  const listReady =
    !usersQuery.isError && !usersQuery.isLoading && !showSkeleton && typeof total === "number";
  const playIntro = listReady && intro.current;
  const sentRequests = requestsByRecipient(outgoingQuery.data);
  const filtersActive = q.length > 0 || languageFilter.length > 0;
  const lastPage = usersQuery.data?.pages?.[usersQuery.data.pages.length - 1];
  const nextCursor = lastPage?.nextCursor ?? null;

  useEffect(() => {
    if (listReady) intro.current = false;
  }, [listReady]);

  function send(userId) {
    if (!userId || inFlight.current || sentRequests.has(String(userId))) return;
    inFlight.current = true;
    mutate(userId);
  }

  function undo(userId) {
    const requestId = sentRequests.get(String(userId))?._id;
    if (!userId || !requestId || undoingRef.current.has(userId)) return;
    const next = new Set(undoingRef.current);
    next.add(userId);
    undoingRef.current = next;
    setUndoingIds(next);
    undoMutation.mutate({ userId, requestId });
  }

  function clearFilters() {
    setSearch("");
    setLanguage("");
  }

  let body;
  if (usersQuery.isError && users.length === 0) {
    body = (
      <ErrorState title="Couldn't load learners" onRetry={() => usersQuery.refetch()}>
        {getErrorMessage(usersQuery.error)}
      </ErrorState>
    );
  } else if (usersQuery.isLoading || showSkeleton) {
    body = showSkeleton ? (
      <div className="learner-grid" aria-busy="true" aria-label="Loading learners">
        {Array.from({ length: 6 }, (_, index) => (
          <LearnerCardSkeleton key={index} />
        ))}
      </div>
    ) : (
      <div className="min-h-40" aria-busy="true">
        <span className="sr-only">Loading</span>
      </div>
    );
  } else if (users.length === 0 && !filtersActive) {
    body = (
      <div className="relative flex flex-col items-center">
        <div className="relative z-0 size-24" aria-hidden="true">
          <Bloom />
        </div>
        <div className="relative z-[1]">
          <EmptyState>You're early. No one else has joined yet.</EmptyState>
        </div>
      </div>
    );
  } else if (users.length === 0) {
    body = (
      <EmptyState
        icon={Search}
        action={
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        }
      >
        No learners match those filters.
      </EmptyState>
    );
  } else {
    body = (
      <>
        <ul className="learner-grid" aria-busy={usersQuery.isFetching || undefined}>
          {users.map((user, index) => (
            <LearnerCard
              key={user._id}
              user={user}
              sent={sentRequests.has(String(user._id))}
              sending={isPending && variables === user._id}
              undoing={undoingIds.has(user._id)}
              requestId={sentRequests.get(String(user._id))?._id}
              onSend={send}
              onUndo={undo}
              enterIndex={playIntro ? index : null}
            />
          ))}
        </ul>
        {nextCursor && !usersQuery.isPlaceholderData ? (
          <div className="flex justify-center">
            <Button
              variant="secondary"
              loading={usersQuery.isFetchingNextPage}
              onClick={() => usersQuery.fetchNextPage()}
            >
              Show more
            </Button>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-[65ch]">
          <h1>Meet new learners</h1>
          <p className="mt-1 text-small text-fg-muted">Search by name and the language they speak.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
          <div className="relative w-full sm:w-64">
            <label className="sr-only" htmlFor="discover-search">
              Search by name
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted"
              aria-hidden="true"
            />
            <Input
              id="discover-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name"
              autoComplete="off"
              spellCheck={false}
              className="pl-9"
            />
          </div>
          <div className="w-full sm:w-56">
            <Field label="Native language">
              <LanguageCombobox
                id="native-language"
                allLabel="All languages"
                value={language}
                placeholder="All languages"
                onChange={(next) => setLanguage(languageKey(next))}
              />
            </Field>
          </div>
        </div>
      </header>

      <div>
        <p className="min-h-5 text-small text-fg-muted" aria-live="polite" aria-atomic="true">
          {listReady ? learnerCount(total) : ""}
        </p>
        <p className="mt-1 text-small text-fg-muted">
          Hover or tap a coral bar to see what the greeting means.
        </p>
      </div>

      {body}
    </div>
  );
};

export default DiscoverView;
