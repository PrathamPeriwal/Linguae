import { useThemeStore } from "../../store/useThemeStore";
import { cn } from "../../lib/cn";
import { Gate } from "../ui/Gate";
import { Logo } from "../ui/Logo";

const PageLoader = ({ message }) => {
  const { theme } = useThemeStore();
  return (
    <Gate theme={theme} aria-busy="true">
      <Logo />
      <p
        className={cn("max-w-sm text-small text-fg-muted", message && "animate-pulse")}
        role="status"
      >
        {message || <span className="sr-only">Loading</span>}
      </p>
    </Gate>
  );
};

export default PageLoader;
