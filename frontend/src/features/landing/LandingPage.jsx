import { useEffect } from "react";
import { Link } from "react-router";
import { Bloom } from "../../components/ui/Bloom.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { GreetingMorph } from "../../components/ui/GreetingMorph.jsx";
import { Logo } from "../../components/ui/Logo.jsx";
import { RevealBar } from "../../components/ui/RevealBar.jsx";
import { ThemeToggle } from "../../components/ui/ThemeToggle.jsx";
import { ClosingCta } from "./components/ClosingCta.jsx";
import { FeatureBento } from "./components/FeatureBento.jsx";
import { GreetingsStrip } from "./components/GreetingsStrip.jsx";
import { HeroConversation } from "./components/HeroConversation.jsx";
import { HowItWorks } from "./components/HowItWorks.jsx";
import { LandingFooter } from "./components/LandingFooter.jsx";
import { LandingSection } from "./components/LandingSection.jsx";
import { LanguageGrid } from "./components/LanguageGrid.jsx";
import { TryAHello } from "./components/TryAHello.jsx";

const TITLE = "Linguae — Practise a language with someone who speaks it.";
const DESCRIPTION =
  "Find a partner who speaks the language you are learning, chat one to one, and start a video call.";

const quietLink =
  "inline-flex min-h-11 items-center text-body text-fg-muted underline-offset-4 hover:text-fg hover:underline";

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
      <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo />
          <nav className="flex flex-wrap items-center gap-2" aria-label="Account">
            <ThemeToggle />
            <Button variant="ghost" to="/login">
              Sign in
            </Button>
            <Button to="/signup">Join</Button>
          </nav>
        </div>
      </header>

      <div className="overflow-x-clip">
        <main id="main" className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <LandingSection className="overflow-visible pb-16 pt-10 lg:pt-16">
            <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-12">
              <div className="min-w-0">
                <GreetingMorph>
                  <Bloom />
                </GreetingMorph>
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
                  <Link to="/login" className={quietLink}>
                    I already have an account
                  </Link>
                </div>
              </div>
              <HeroConversation />
            </div>
          </LandingSection>

          <LandingSection className="py-16">
            <GreetingsStrip />
          </LandingSection>

          <LandingSection className="py-16">
            <TryAHello />
          </LandingSection>

          <LandingSection className="py-16">
            <HowItWorks />
          </LandingSection>

          <LandingSection className="py-16">
            <FeatureBento />
          </LandingSection>

          <LandingSection className="py-16">
            <LanguageGrid />
          </LandingSection>

          <LandingSection className="overflow-visible py-16">
            <ClosingCta />
          </LandingSection>
        </main>

        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <LandingSection as="footer">
            <LandingFooter />
          </LandingSection>
        </div>
      </div>
    </div>
  );
}
