import { useState } from "react";
import { cn } from "../../lib/cn";
import { usePrefersReducedMotion } from "../../lib/useMediaPrefs";

export function RevealBar({ children, className }) {
  const reduce = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      className={cn("reveal-bar group", reduce && "is-reduce", className)}
      aria-pressed={open}
      onClick={() => setOpen((value) => (reduce ? !value : true))}
    >
      {children}
      <span aria-hidden="true" className={cn("reveal-bar__mask", open && "is-open")} />
    </button>
  );
}
