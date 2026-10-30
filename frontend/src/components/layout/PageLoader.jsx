import { LoaderIcon } from "lucide-react";
import { useThemeStore } from "../../store/useThemeStore";

const PageLoader = ({ message }) => {
  const { theme } = useThemeStore();
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4 px-6"
      data-theme={theme}
    >
      <LoaderIcon className="animate-spin size-10 text-primary" />
      {message ? (
        <p className="max-w-sm text-center text-sm animate-pulse">{message}</p>
      ) : null}
    </div>
  );
};
export default PageLoader;
