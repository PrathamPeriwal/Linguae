import { Link } from "react-router";
import { Logo } from "../../../components/ui/Logo.jsx";

const quietLink =
  "inline-flex min-h-11 items-center text-body text-fg-muted underline-offset-4 hover:text-fg hover:underline";

export function LandingFooter() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line py-8">
      <div className="flex items-baseline gap-4">
        <Logo />
        <p className="text-small text-fg-muted">{new Date().getFullYear()}</p>
      </div>
      <nav className="flex flex-wrap items-center gap-x-4" aria-label="Sign in or join">
        <Link to="/login" className={quietLink}>
          Sign in
        </Link>
        <Link to="/signup" className={quietLink}>
          Join
        </Link>
      </nav>
    </div>
  );
}
