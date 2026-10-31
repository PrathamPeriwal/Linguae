import { Link } from "react-router";
import { Bloom } from "../../../components/ui/Bloom.jsx";
import { GreetingMorph } from "../../../components/ui/GreetingMorph.jsx";
import { Logo } from "../../../components/ui/Logo.jsx";
import { ThemeToggle } from "../../../components/ui/ThemeToggle.jsx";

export function AuthLayout({ children }) {
  return (
    <div className="flex min-h-dvh w-full max-w-full flex-col overflow-x-clip text-fg">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-bg/80 px-4 py-3 backdrop-blur-md sm:px-6">
        <Link to="/welcome" className="inline-flex min-h-11 items-center rounded-control">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <div className="grid w-full flex-1 items-start md:grid-cols-2 md:items-center">
        <main id="main" className="relative z-[1] min-w-0 px-4 py-6 sm:px-8 sm:py-10">
          <div className="mx-auto w-full max-w-md">{children}</div>
        </main>
        <div className="relative hidden min-w-0 items-center overflow-visible px-8 py-10 md:flex">
          <div className="relative w-full max-w-xl">
            <GreetingMorph>
              <Bloom />
            </GreetingMorph>
            <p className="relative z-[1] mt-4 max-w-[65ch] text-body text-fg-muted">
              Say hello in a new language.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
