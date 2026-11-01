import { cn } from "../../lib/cn";

export function IconButton({ className, children, type = "button", ...props }) {
  if (!props["aria-label"] && !props["aria-labelledby"]) {
    throw new Error("IconButton requires an aria-label");
  }

  return (
    <button
      type={type}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-control text-fg transition duration-fast ease-enter hover:bg-raised disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
