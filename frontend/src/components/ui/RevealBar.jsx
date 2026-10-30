import { useState } from "react";
import { cn } from "../../lib/cn";
import { usePrefersReducedMotion } from "../../lib/useMediaPrefs";

export function RevealBar({ children, className }) {
  const reduce = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      className={cn("reveal-bar group", className)}
      aria-pressed={open}
      onClick={() => setOpen((value) => (reduce ? !value : true))}
    >
      <span className="relative inline-block overflow-hidden align-baseline">
        <span>{children}</span>
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 bg-spark",
            reduce
              ? open
                ? "hidden"
                : "group-hover:hidden group-focus-visible:hidden"
              : cn(
                  "transition-transform duration-slow ease-exit motion-reduce:transition-none",
                  "group-hover:-translate-x-[110%] group-focus-visible:-translate-x-[110%]",
                  open && "-translate-x-[110%]",
                ),
          )}
        />
      </span>
    </button>
  );
}
