const STEPS = [
  {
    n: "1",
    title: "Say what you speak and what you are learning.",
    body: "Your profile lists a native language and a learning language.",
    art: <ProfileArt />,
  },
  {
    n: "2",
    title: "Find someone and send a request.",
    body: "Search the list, then send a friend request.",
    art: <RequestArt />,
  },
  {
    n: "3",
    title: "Chat, then start a video call.",
    body: "Message them one to one, then start a video call.",
    art: <ChatArt />,
  },
];

function ProfileArt() {
  return (
    <div className="flex h-28 flex-col justify-center gap-2 rounded-card border border-line bg-panel px-3">
      <div className="h-8 rounded-control border border-line bg-bg" />
      <div className="flex gap-2">
        <div className="h-7 flex-1 rounded-full border border-line" />
        <div className="h-7 flex-1 rounded-full bg-accent/15" />
      </div>
    </div>
  );
}

function RequestArt() {
  return (
    <div className="flex h-28 flex-col justify-center gap-3 rounded-card border border-line bg-panel px-3">
      <div className="flex items-center gap-2">
        <span className="size-8 shrink-0 rounded-full bg-raised" />
        <span className="h-2 flex-1 rounded-full bg-fg/15" />
      </div>
      <span className="inline-flex h-9 w-fit items-center rounded-control bg-accent px-3 text-small font-semibold text-on-accent">
        Send request
      </span>
    </div>
  );
}

function CameraMark() {
  return (
    <span className="relative inline-block h-5 w-7 shrink-0 rounded-[3px] border-2 border-fg">
      <span className="absolute -top-1.5 left-1 h-1.5 w-2 rounded-t-[2px] border-2 border-b-0 border-fg" />
      <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-fg" />
    </span>
  );
}

function ChatArt() {
  return (
    <div className="flex h-28 items-center gap-3 rounded-card border border-line bg-panel px-3">
      <div className="min-w-0 flex-1 rounded-card bg-raised px-3 py-2">
        <div className="h-2 w-full rounded-full bg-fg/20" />
        <div className="mt-2 h-2 w-2/3 rounded-full bg-fg/15" />
      </div>
      <CameraMark />
    </div>
  );
}

export function HowItWorks() {
  return (
    <div>
      <h2 className="text-h2 text-fg">How it works</h2>
      <ol className="how-steps mt-8 grid list-none gap-10 p-0 lg:grid-cols-3 lg:gap-8">
        {STEPS.map((step, index) => (
          <li key={step.n} className="relative grid grid-cols-[2.75rem_1fr] gap-x-4 gap-y-4 lg:grid-cols-1">
            {index < STEPS.length - 1 ? (
              <span
                className="absolute left-[1.375rem] top-11 h-[calc(100%+1.125rem)] w-px -translate-x-1/2 bg-line lg:hidden"
                aria-hidden="true"
              />
            ) : null}
            <span
              className="relative z-[1] row-span-3 grid size-11 place-items-center self-start rounded-full border border-line bg-bg font-display text-h3 text-fg lg:row-span-1"
              aria-hidden="true"
            >
              {step.n}
            </span>
            <div className="col-start-2 lg:col-start-1" aria-hidden="true">
              {step.art}
            </div>
            <h3 className="col-start-2 text-h3 text-fg lg:col-start-1">
              <span className="sr-only">Step {step.n}. </span>
              {step.title}
            </h3>
            <p className="col-start-2 max-w-[65ch] text-body text-fg-muted lg:col-start-1">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
