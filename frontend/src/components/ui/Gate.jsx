import { Bloom } from "./Bloom";
import { cn } from "../../lib/cn";

export function Gate({ theme, className, children, ...props }) {
  return (
    <div
      className={cn(
        "relative flex min-h-dvh items-center justify-center overflow-hidden p-6",
        className,
      )}
      data-theme={theme}
      {...props}
    >
      <Bloom />
      <div className="relative grid max-w-[65ch] justify-items-center gap-4 text-center">
        {children}
      </div>
    </div>
  );
}
