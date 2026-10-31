import { cn } from "../../lib/cn";

export function Logo({ wordmark = true, className }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        aria-hidden="true"
        className="shrink-0 text-fg"
      >
        <rect x="1" y="2" width="18" height="14" rx="6" fill="currentColor" />
        <path d="M7 16 L4 22 L13 16 Z" fill="currentColor" />
        <rect x="13" y="12" width="18" height="14" rx="6" fill="#FF8A94" />
        <path d="M25 26 L28 31 L19 26 Z" fill="#FF8A94" />
      </svg>
      {wordmark ? (
        <span className="font-display text-h3 font-bold lowercase text-fg">linguae</span>
      ) : null}
    </span>
  );
}
