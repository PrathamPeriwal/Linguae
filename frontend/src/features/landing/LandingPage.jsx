import { useEffect } from "react";
import { Link } from "react-router";
import { Bloom } from "../../components/ui/Bloom.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { GreetingMorph } from "../../components/ui/GreetingMorph.jsx";
import { LanguageChip } from "../../components/ui/LanguageChip.jsx";
import { Logo } from "../../components/ui/Logo.jsx";
import { RevealBar } from "../../components/ui/RevealBar.jsx";
import { ThemeToggle } from "../../components/ui/ThemeToggle.jsx";
import { LANGUAGES } from "../../lib/languages.js";

const TITLE = "Linguae — Practise a language with someone who speaks it.";
const DESCRIPTION =
  "Find a partner who speaks the language you are learning, chat one to one, and start a video call.";

const FEATURES = [
  {
    title: "Find a partner",
    body: "Filter people by the language they speak.",
  },
  {
    title: "Chat",
    body: "One-to-one messages in real time.",
  },
  {
    title: "Video call",
    body: "One-to-one video calls.",
  },
];

export default function LandingPage() {
  useEffect(() => {
    const previousTitle = document.title;
    const meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute("content") ?? "";
    document.title = TITLE;
    meta?.setAttribute("content", DESCRIPTION);
    return () => {
      document.title = previousTitle;
      meta?.setAttribute("content", previousDescription);
    };
  }, []);

  return (
    <div className="landing min-h-screen text-fg">
      <header className="landing-rise mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Logo />
        <div className="flex max-w-full flex-wrap items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" to="/login">
            Sign in
          </Button>
          <Button to="/signup">Join</Button>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-5xl px-4 pb-8 sm:px-6">
        <section className="landing-rise overflow-visible pt-8 sm:pt-16" style={{ animationDelay: "70ms" }}>
          <div className="relative z-0 inline-block max-w-full overflow-visible">
            <Bloom />
            <GreetingMorph />
          </div>
          <h1 className="relative z-[1] mt-6 max-w-[65ch] text-balance text-h1 text-fg">
            Practise a language with someone who speaks it.
          </h1>
          <p className="relative z-[1] mt-4 max-w-[65ch] text-body text-fg">
            Every conversation starts with a <RevealBar>hello</RevealBar>.
          </p>
          <div className="relative z-[1] mt-8 flex flex-wrap items-center gap-4">
            <Button size="lg" to="/signup">
              Start talking
            </Button>
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center text-body text-fg-muted hover:text-fg"
            >
              I already have an account
            </Link>
          </div>
        </section>

        <section
          className="landing-rise mt-16 grid gap-8 md:grid-cols-3"
          style={{ animationDelay: "180ms" }}
        >
          {FEATURES.map((feature) => (
            <article key={feature.title} className="max-w-[65ch]">
              <h2 className="text-h2 text-fg">{feature.title}</h2>
              <p className="mt-2 text-body text-fg-muted">{feature.body}</p>
            </article>
          ))}
        </section>

        <section className="landing-rise mt-16" style={{ animationDelay: "260ms" }}>
          <h2 className="text-h2 text-fg">{LANGUAGES.length} languages</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {LANGUAGES.map((language) => (
              <li key={language}>
                <LanguageChip language={language} />
              </li>
            ))}
          </ul>
        </section>

        <section className="landing-rise mt-16" style={{ animationDelay: "340ms" }}>
          <div className="panel-glow flex w-full max-w-md flex-col gap-3 rounded-panel p-4 sm:p-6">
            <div className="max-w-[85%] rounded-card bg-raised px-3 py-2">
              <p className="text-body text-fg">Hola. Want to practise English?</p>
            </div>
            <div className="max-w-[85%] self-end rounded-card bg-accent px-3 py-2">
              <p className="text-body text-on-accent">Yes. Hello.</p>
            </div>
          </div>
        </section>
      </main>

      <footer
        className="landing-rise mx-auto flex w-full max-w-5xl items-baseline justify-between gap-4 px-4 py-8 sm:px-6"
        style={{ animationDelay: "420ms" }}
      >
        <p className="font-display text-h3 font-bold lowercase text-fg">linguae</p>
        <p className="text-small text-fg-muted">{new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
