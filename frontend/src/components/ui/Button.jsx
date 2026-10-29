import { cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

const buttonVariants = cva(
  "inline-flex w-fit items-center justify-center gap-2 rounded-control font-sans font-semibold transition duration-fast ease-enter disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "primary-glow bg-accent text-on-accent hover:bg-accent-hover",
        secondary: "border border-line bg-transparent text-fg hover:bg-raised",
        ghost: "bg-transparent text-fg hover:bg-raised",
        danger: "bg-danger text-on-accent hover:bg-danger/90",
      },
      size: {
        sm: "h-9 px-3 text-small",
        md: "h-11 px-4 text-body",
        lg: "h-12 px-6 text-body",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export function Button({
  variant,
  size,
  loading = false,
  disabled = false,
  className,
  children,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), "relative", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>{children}</span>
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        </span>
      ) : null}
    </button>
  );
}
