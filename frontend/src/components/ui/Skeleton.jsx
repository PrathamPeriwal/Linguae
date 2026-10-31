import { cn } from "../../lib/cn";

export function Skeleton({ className }) {
  return <div className={cn("animate-pulse rounded-control bg-fg/10", className)} />;
}

function LoadingLabel() {
  return <span className="sr-only">Loading</span>;
}

export function ConversationRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3" aria-busy="true">
      <LoadingLabel />
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="grid flex-1 gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48 max-w-full" />
      </div>
    </div>
  );
}

export function LearnerCardSkeleton() {
  return (
    <div
      className="flex h-full flex-col gap-4 rounded-card border border-line bg-raised p-5"
      aria-busy="true"
    >
      <LoadingLabel />
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 shrink-0 rounded-full" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="grid gap-1">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="grid min-h-[2.625rem] gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-7 w-36 rounded-full" />
        <Skeleton className="h-7 w-40 rounded-full" />
      </div>
      <Skeleton className="mt-auto h-11 w-full" />
    </div>
  );
}

export function RequestRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3" aria-busy="true">
      <LoadingLabel />
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="grid flex-1 gap-2">
        <Skeleton className="h-4 w-40 max-w-full" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-11 w-24 shrink-0" />
    </div>
  );
}

export function ChatSkeleton({ className }) {
  return (
    <div
      className={cn("flex h-full min-h-[24rem] w-full min-w-0 flex-col", className)}
      aria-busy="true"
      aria-label="Loading chat"
    >
      <div className="flex items-center gap-3 border-b border-line p-4">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="grid gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-end gap-3 p-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="ml-auto h-10 w-1/2" />
        <Skeleton className="h-10 w-1/3" />
      </div>
      <div className="border-t border-line p-4">
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}
