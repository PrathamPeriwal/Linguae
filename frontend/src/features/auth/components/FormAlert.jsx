import { CircleAlert } from "lucide-react";

export function FormAlert({ message }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-control border border-danger bg-danger/10 px-3 py-3 text-small text-danger"
    >
      <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 break-words">{message}</p>
    </div>
  );
}
