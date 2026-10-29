export function EmptyState({ icon: Icon, children, action }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      {Icon ? <Icon className="size-8 text-fg-muted" aria-hidden="true" /> : null}
      <p className="max-w-[65ch] text-body text-fg">{children}</p>
      {action}
    </div>
  );
}
