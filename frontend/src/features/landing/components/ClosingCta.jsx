import { Link } from "react-router";
import { Bloom } from "../../../components/ui/Bloom.jsx";
import { Button } from "../../../components/ui/Button.jsx";

const quietLink =
  "inline-flex min-h-11 items-center text-body text-fg-muted underline-offset-4 hover:text-fg hover:underline";

export function ClosingCta() {
  return (
    <div>
      <div className="relative inline-block max-w-full overflow-visible">
        <Bloom />
        <h2 className="relative z-[1] font-display text-display-l text-fg">Say hello in a new language.</h2>
      </div>
      <div className="relative z-[1] mt-8 flex flex-wrap items-center gap-4">
        <Button size="lg" to="/signup">
          Start talking
        </Button>
        <Link to="/login" className={quietLink}>
          Sign in
        </Link>
      </div>
    </div>
  );
}
