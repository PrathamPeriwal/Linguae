import { LanguageChip } from "../../../components/ui/LanguageChip.jsx";

export function FeatureBento() {
  return (
    <div>
      <h2 className="text-h2 text-fg">What you get</h2>
      <p className="mt-2 max-w-[65ch] text-body text-fg-muted">
        A profile, people to talk to, one-to-one chat, and a one-to-one video call.
      </p>
      <div className="mt-8 grid gap-4 lg:grid-cols-6">
        <article className="rounded-panel border border-line bg-raised p-5 sm:p-6 lg:col-span-4 lg:row-span-2">
          <h3 className="text-h3 text-fg">Find a partner</h3>
          <p className="mt-2 max-w-[65ch] text-body text-fg-muted">
            Filter by the language someone speaks, then send a friend request.
          </p>
          <div className="mt-6 rounded-card border border-line bg-panel p-3" aria-hidden="true">
            <div className="flex flex-wrap items-center gap-2">
              <div className="h-11 min-w-[8rem] flex-1 rounded-control border border-line bg-bg" />
              <LanguageChip language="Spanish" />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-card bg-raised px-3 py-3">
              <span className="font-display text-h2 text-fg" lang="es">
                Hola
              </span>
              <span className="h-2 min-w-[4rem] flex-1 rounded-full bg-fg/15" />
              <span className="inline-flex h-9 items-center rounded-control bg-accent px-3 text-small font-semibold text-on-accent">
                Send request
              </span>
            </div>
          </div>
          <p className="mt-2 text-caption text-fg-muted">Example</p>
        </article>

        <article className="rounded-panel border border-line bg-panel p-5 lg:col-span-2">
          <h3 className="text-h3 text-fg">Chat</h3>
          <p className="mt-2 text-body text-fg-muted">One-to-one messages.</p>
          <div className="mt-4 flex flex-col gap-2" aria-hidden="true">
            <div className="w-fit max-w-[85%] rounded-card bg-raised px-3 py-2 text-small text-fg">Hola.</div>
            <div className="w-fit max-w-[85%] self-end rounded-card bg-accent px-3 py-2 text-small text-on-accent">
              Hello.
            </div>
          </div>
          <p className="mt-3 text-caption text-fg-muted">Example</p>
        </article>

        <article className="rounded-panel border border-line bg-panel p-5 lg:col-span-2">
          <h3 className="text-h3 text-fg">Video call</h3>
          <p className="mt-2 text-body text-fg-muted">One-to-one video from a chat.</p>
          <div className="mt-4" aria-hidden="true">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex aspect-video items-end rounded-card bg-bg p-2">
                <span className="size-6 rounded-full bg-raised" />
              </div>
              <div className="flex aspect-video items-end rounded-card bg-bg p-2">
                <span className="size-6 rounded-full bg-raised" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="grid size-9 place-items-center rounded-full bg-raised">
                <span className="h-3 w-2 rounded-sm border-2 border-fg" />
              </span>
              <span className="grid size-9 place-items-center rounded-full bg-raised">
                <span className="relative h-3 w-4 rounded-sm border-2 border-fg">
                  <span className="absolute -right-1 top-0.5 h-1.5 w-1 bg-fg" />
                </span>
              </span>
              <span className="size-9 rounded-full border border-danger" />
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
