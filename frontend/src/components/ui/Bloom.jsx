import { cn } from "../../lib/cn";

export function Bloom({ className }) {
  return <div className={cn("bloom", className)} aria-hidden="true" />;
}
