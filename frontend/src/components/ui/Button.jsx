import { cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { Link } from "react-router";
import { cn } from "../../lib/cn";

const buttonVariants = cva(
  "inline-flex w-fit items-center justify-center gap-2 rounded-control border border-transparent font-sans font-semibold transition duration-fast ease-enter disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "primary-glow bg-accent text-on-accent hover:bg-accent-hover",
        secondary: "border-line bg-transparent text-fg hover:bg-raised",
        ghost: "bg-transparent text-fg hover:bg-raised",
        danger: "border-danger bg-transparent text-danger hover:bg-danger/10 [&_svg]:size-4",
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
  to,
  ...props
}) {
  const classes = cn(
    buttonVariants({ variant, size }),
    "relative",
    disabled && !loading && "border-dashed border-line bg-panel text-fg-muted",
    className,
  );
  const content = (
    <>
      <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>{children}</span>
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        </span>
      ) : null}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} aria-disabled={disabled || loading || undefined} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </button>
  );
}
