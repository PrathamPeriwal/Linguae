import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Inbox, Search, Trash2 } from "lucide-react";
import {
  Avatar,
  Bloom,
  Button,
  ChatSkeleton,
  ConversationRowSkeleton,
  EmptyState,
  ErrorState,
  Field,
  GreetingMorph,
  IconButton,
  Input,
  LanguageChip,
  LanguageCombobox,
  LearnerCardSkeleton,
  RequestRowSkeleton,
  RevealBar,
  Skeleton,
  Textarea,
  ThemeToggle,
} from "../components/ui";
import { cn } from "../lib/cn";

const portrait =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#FF8A94"/><circle cx="40" cy="32" r="12" fill="#2A0B25"/><rect x="22" y="50" width="36" height="22" rx="11" fill="#2A0B25"/></svg>',
  );

const swatches = [
  ["bg", "bg-bg"],
  ["panel", "bg-panel"],
  ["raised", "bg-raised"],
  ["accent", "bg-accent"],
  ["spark", "bg-spark"],
  ["ember", "bg-ember"],
  ["success", "bg-success"],
  ["danger", "bg-danger"],
];

const accents = [
  ["coral", "bg-[#FF8A94]"],
  ["salmon", "bg-[#FF7A6B]"],
  ["apricot", "bg-[#FFB38F]"],
];

function Section({ title, children }) {
  return (
    <section className="grid min-w-0 gap-4 border-t border-line py-8">
      <h2 className="font-display text-h2 text-fg">{title}</h2>
      {children}
    </section>
  );
}

function AccentSwitcher() {
  const [accent, setAccent] = useState("coral");

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);

  useEffect(() => {
    return () => {
      delete document.documentElement.dataset.accent;
    };
  }, []);

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Accent">
      {accents.map(([name, dot]) => (
        <button
          key={name}
          type="button"
          aria-pressed={accent === name}
          onClick={() => setAccent(name)}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-control border px-3 text-small capitalize",
            accent === name ? "border-accent" : "border-line",
          )}
        >
          <span className={cn("size-3 rounded-full", dot)} aria-hidden="true" />
          {name}
        </button>
      ))}
    </div>
  );
}

function ThemeColumn({ theme }) {
  const [portal, setPortal] = useState(null);
  const [pending, setPending] = useState(false);
  const [language, setLanguage] = useState("Spanish");

  return (
    <div
      ref={setPortal}
      data-theme={theme}
      className={cn("min-w-0 px-4 py-6 text-fg sm:px-6", theme === "light" && "bg-bg")}
    >
      <p className="text-caption text-fg-muted">{theme === "dark" ? "Dark" : "Light"}</p>

      <Section title="Type">
        <p className="min-w-0 overflow-hidden font-display text-display-xl text-fg">Hi</p>
        <p className="font-display text-display-l text-fg">Hello</p>
        <p className="font-display text-h1 text-fg">Find a partner</p>
        <p className="font-display text-h2 text-fg">Chat in the language you are learning</p>
        <p className="font-sans text-h3 text-fg">One-to-one video call</p>
        <p className="max-w-[65ch] text-body text-fg">
          Practise a language with someone who speaks it.
        </p>
        <p className="text-small text-fg-muted">Secondary text stays quieter than the body.</p>
        <p className="text-caption text-fg-muted">Caption is the smallest size.</p>
      </Section>

      <Section title="Colour">
        <div className="flex flex-wrap gap-3">
          {swatches.map(([name, swatch]) => (
            <div key={name} className="grid justify-items-center gap-1">
              <span className={`size-10 rounded-control border border-line ${swatch}`} />
              <span className="text-caption text-fg-muted">{name}</span>
            </div>
          ))}
        </div>
        <p className="w-fit rounded-control bg-spark px-2 py-1 text-small text-[#2A0B25]">
          Spark keeps dark text
        </p>
      </Section>

      <Section title="Depth">
        <article className="max-w-sm rounded-card bg-raised p-5 transition-colors duration-base ease-enter hover:bg-raised-hover">
          <h3 className="text-h3 text-fg">A raised card</h3>
          <p className="mt-1 text-small text-fg-muted">Hover to step up a tone.</p>
        </article>
      </Section>

      <Section title="Hero">
        <div className="relative w-full overflow-visible py-16">
          <GreetingMorph>
            <Bloom />
          </GreetingMorph>
        </div>
      </Section>

      <Section title="Chat">
        <div className="panel-glow flex max-w-md flex-col gap-3 rounded-panel p-4">
          <div className="flex items-end gap-2">
            <div className="max-w-[85%] rounded-card bg-raised px-3 py-2">
              <p className="text-body text-fg">Hola. Want to practise English?</p>
              <p className="mt-1 text-caption text-fg-muted">09:14</p>
            </div>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-spark px-1.5 text-caption font-semibold text-[#2A0B25]">
              2
            </span>
          </div>
          <div className="max-w-[85%] self-end rounded-card bg-accent px-3 py-2">
            <p className="text-body text-on-accent">Yes. Hello.</p>
            <p className="mt-1 text-caption text-on-accent/70">09:15</p>
          </div>
          <div className="flex w-fit items-center rounded-card bg-panel px-3 py-2" role="status" aria-label="Typing">
            <span className="typing-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </div>
        </div>
      </Section>

      <Section title="Reveal">
        <p className="max-w-[65ch] text-body text-fg">
          Every conversation starts with a <RevealBar>hello</RevealBar>.
        </p>
        <p className="font-display text-h1 text-fg" lang="es">
          Hola
        </p>
        <p className="text-small text-fg">
          <RevealBar>means Hello</RevealBar>
        </p>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">
            <Trash2 aria-hidden="true" />
            Remove
          </Button>
          {theme === "light" ? (
            <p className="inline-flex h-11 items-center gap-2 rounded-control bg-danger px-4 text-body font-semibold text-on-danger">
              <Trash2 className="size-4" aria-hidden="true" />
              Filled danger
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
        <Button
          loading={pending}
          onClick={() => {
            setPending(true);
            window.setTimeout(() => setPending(false), 1200);
          }}
        >
          Send request
        </Button>
      </Section>

      <Section title="Icon button">
        <IconButton aria-label="Search people">
          <Search aria-hidden="true" />
        </IconButton>
      </Section>

      <Section title="Fields">
        <form
          className="grid max-w-md gap-4"
          onSubmit={(event) => event.preventDefault()}
        >
          <Field label="Email" hint="We use this to sign you in.">
            <Input type="email" placeholder="ada@school.edu" autoComplete="email" />
          </Field>
          <Field label="Email" error="Enter an email address, like ada@school.edu.">
            <Input type="email" defaultValue="ada" autoComplete="off" />
          </Field>
          <Field label="Bio" error="Bio is empty. Write one or two sentences about yourself.">
            <Textarea placeholder="I want to practise Hindi." />
          </Field>
          <Field label="Native language">
            <LanguageCombobox
              value={language}
              onChange={setLanguage}
              container={portal}
            />
          </Field>
        </form>
      </Section>

      <Section title="Avatar">
        <div className="flex items-center gap-4">
          <Avatar src={portrait} name="Ada Lovelace" size={40} />
          <Avatar src={portrait} name="Ada Lovelace" size={64} />
          <Avatar name="Ada Lovelace" size={40} />
          <Avatar src="https://invalid.example/avatar.png" name="Ana García" size={40} />
        </div>
      </Section>

      <Section title="Language chips">
        <div className="flex flex-wrap gap-2">
          <LanguageChip language="spanish" />
          <LanguageChip language="Hindi" variant="learning" />
          <LanguageChip language="Arabic" variant="native" />
        </div>
      </Section>

      <Section title="Loading">
        <Skeleton className="h-4 w-24" />
        <ConversationRowSkeleton />
        <LearnerCardSkeleton />
        <RequestRowSkeleton />
        <ChatSkeleton />
      </Section>

      <Section title="Empty">
        <EmptyState icon={Inbox} action={<Button>Go to Discover</Button>}>
          No requests yet. Say hello in Discover.
        </EmptyState>
      </Section>

      <Section title="Error">
        <ErrorState title="Couldn't load learners." onRetry={() => toast.success("Trying again.")}>
          Check your connection, then try again.
        </ErrorState>
      </Section>

      <Section title="Toast">
        <div className="grid max-w-sm gap-2">
          <p className="rounded-control border border-success bg-raised px-3 py-2 text-small">
            Profile saved.
          </p>
          <p className="rounded-control border border-danger bg-raised px-3 py-2 text-small">
            Couldn't save your profile. Try again.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => toast.success("Friend request sent.")}>
            Show success toast
          </Button>
          <Button variant="secondary" onClick={() => toast.error("Can't reach the server. Try again.")}>
            Show error toast
          </Button>
        </div>
      </Section>

      <Section title="Theme">
        <ThemeToggle />
      </Section>
    </div>
  );
}

export default function KitPage() {
  return (
    <div className="min-h-screen text-fg">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-4 py-4 sm:px-6">
        <div>
          <h1 className="font-display text-h1">Component kit</h1>
          <p className="text-small text-fg-muted">Dev only. Both themes, including loading, empty, and error.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AccentSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <div className="grid lg:grid-cols-2">
        <ThemeColumn theme="dark" />
        <ThemeColumn theme="light" />
      </div>
    </div>
  );
}
