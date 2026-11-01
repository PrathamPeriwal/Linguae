import { useDeferredValue, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { getOutgoingFriendReqs, sendFriendRequest } from "../../requests/api";
import { getErrorMessage } from "../../../lib/errors";
import { queryKeys } from "../../../lib/queryKeys";
import { useDelayedPending } from "../../../lib/useDelayedPending";

const PAGE_SIZE = 12;

function learnerCount(count) {
  return count === 1 ? "1 learner" : `${count} learners`;
}

function languageKey(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function recipientIds(requests) {
  const ids = new Set();
  if (!Array.isArray(requests)) return ids;
  for (const request of requests) {
    const id = request?.recipient?._id;
    if (id) ids.add(id);
  }
  return ids;
}

const DiscoverView = () => {
  const queryClient = useQueryClient();
  const inFlight = useRef(false);
  const intro = useRef(true);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [language, setLanguage] = useState("");
  const filterKey = `${deferredSearch}\0${language}`;
  const [shown, setShown] = useState(PAGE_SIZE);
  const [shownFor, setShownFor] = useState(filterKey);

  if (shownFor !== filterKey) {
    setShownFor(filterKey);
    setShown(PAGE_SIZE);
  }

  useEffect(() => {
    const previous = document.title;
    document.title = "Discover · Linguae";
    return () => {
      document.title = previous;
    };
  }, []);

  const usersQuery = useQuery({
    queryKey: queryKeys.users(),
    queryFn: getRecommendedUsers,
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
    onError: (error, _userId, context) => {
      queryClient.setQueryData(queryKeys.outgoingFriendReqs(), context?.previous ?? []);
      toast.error(getErrorMessage(error));
    },
    onSettled: () => {
      inFlight.current = false;
      queryClient.invalidateQueries({ queryKey: queryKeys.outgoingFriendReqs() });
    },
  });

  const showSkeleton = useDelayedPending(usersQuery.isLoading);
  const users = Array.isArray(usersQuery.data) ? usersQuery.data : [];
  const listReady = !usersQuery.isError && !usersQuery.isLoading && !showSkeleton && Array.isArray(usersQuery.data);
  const playIntro = listReady && intro.current;

  useEffect(() => {
    if (listReady) intro.current = false;
  }, [listReady]);

  const term = deferredSearch.trim().toLowerCase();
  const lang = languageKey(language);
  const filtered = users.filter((user) => {
    const name = typeof user.fullName === "string" ? user.fullName.toLowerCase() : "";
    const native = languageKey(user.nativeLanguage);
    const nameOk = term.length === 0 || name.includes(term);
    const langOk = lang.length === 0 || native === lang;
    return nameOk && langOk;
  });
  const visible = filtered.slice(0, shown);
  const sentIds = recipientIds(outgoingQuery.data);

  function send(userId) {
    if (!userId || inFlight.current || sentIds.has(userId)) return;
    inFlight.current = true;
    mutate(userId);
  }

  function clearFilters() {
    setSearch("");
    setLanguage("");
  }

  let body;
  if (usersQuery.isError) {
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
  } else if (users.length === 0) {
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
  } else if (filtered.length === 0) {
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
        <ul className="learner-grid">
          {visible.map((user, index) => (
            <LearnerCard
              key={user._id}
              user={user}
              sent={sentIds.has(user._id)}
              sending={isPending && variables === user._id}
              onSend={send}
              enterIndex={playIntro ? index : null}
            />
          ))}
        </ul>
        {shown < filtered.length ? (
          <div className="flex justify-center">
            <Button variant="secondary" onClick={() => setShown((count) => count + PAGE_SIZE)}>
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
          {listReady ? learnerCount(filtered.length) : ""}
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
