import { Children, cloneElement, useId } from "react";
import { cn } from "../../lib/cn";

export const controlClass =
  "w-full rounded-control border border-line bg-panel text-body text-fg transition duration-fast ease-enter placeholder:text-fg-muted disabled:cursor-not-allowed disabled:opacity-50";

export function Field({ label, hint, error, children }) {
  const autoId = useId();
  const child = Children.only(children);
  const id = child.props.id || autoId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [error ? errorId : hint ? hintId : null, child.props["aria-describedby"]].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-small font-medium text-fg">
        {label}
      </label>
      {cloneElement(child, {
        id,
        invalid: Boolean(error) || child.props.invalid,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {error ? (
        <p id={errorId} role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-caption text-fg-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, invalid, ...props }) {
  return (
    <input className={cn(controlClass, "h-11 px-3", invalid && "border-danger", className)} {...props} />
  );
}

export function Textarea({ className, invalid, ...props }) {
  return (
    <textarea
      className={cn(controlClass, "min-h-28 px-3 py-2", invalid && "border-danger", className)}
      {...props}
    />
  );
}
