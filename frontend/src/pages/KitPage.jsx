import { useState } from "react";
import toast from "react-hot-toast";
import { Inbox, Search } from "lucide-react";
import {
  Avatar,
  Button,
  ChatSkeleton,
  ConversationRowSkeleton,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Input,
  LanguageChip,
  LanguageCombobox,
  LearnerCardSkeleton,
  RequestRowSkeleton,
  Skeleton,
  Textarea,
  ThemeToggle,
} from "../components/ui";

const portrait =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#EAAA00"/><circle cx="40" cy="32" r="12" fill="#1A0814"/><rect x="22" y="50" width="36" height="22" rx="11" fill="#1A0814"/></svg>',
  );

const swatches = [
  ["bg", "bg-bg"],
  ["panel", "bg-panel"],
  ["raised", "bg-raised"],
  ["accent", "bg-accent"],
  ["highlight", "bg-highlight"],
  ["ember", "bg-ember"],
  ["lilac", "bg-lilac"],
  ["success", "bg-success"],
  ["danger", "bg-danger"],
];

function Section({ title, children }) {
  return (
    <section className="grid min-w-0 gap-4 border-t border-line py-8">
      <h2 className="font-display text-h2 text-fg">{title}</h2>
      {children}
    </section>
  );
}

function ThemeColumn({ theme }) {
  const [portal, setPortal] = useState(null);
  const [pending, setPending] = useState(false);
  const [language, setLanguage] = useState("Spanish");

  return (
    <div ref={setPortal} data-theme={theme} className="min-w-0 bg-bg px-4 py-6 text-fg sm:px-6">
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
        <p className="w-fit rounded-control bg-highlight px-2 py-1 text-small text-[#1A0814]">
          Highlight keeps dark text
        </p>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
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
    <div className="min-h-screen bg-bg text-fg">
      <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-4 sm:px-6">
        <div>
          <h1 className="font-display text-h1">Component kit</h1>
          <p className="text-small text-fg-muted">Dev only. Both themes, including loading, empty, and error.</p>
        </div>
        <ThemeToggle />
      </header>
      <div className="grid lg:grid-cols-2">
        <ThemeColumn theme="dark" />
        <ThemeColumn theme="light" />
      </div>
    </div>
  );
}
