import { Button } from "./Button";

export function ErrorState({ title, children, onRetry }) {
  return (
    <div role="alert" className="grid max-w-[65ch] justify-items-start gap-3 py-8">
      <p className="font-sans text-h3 text-fg">{title}</p>
      <p className="text-body text-fg-muted">{children}</p>
      <Button onClick={onRetry}>Retry</Button>
    </div>
  );
}
