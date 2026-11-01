import { lazy, Suspense, useEffect, useState } from "react";
import { ErrorState } from "../components/ui/ErrorState.jsx";
import { Gate } from "../components/ui/Gate.jsx";
import { Logo } from "../components/ui/Logo.jsx";
import { Toaster } from "../components/ui/Toaster.jsx";
import PageLoader from "../components/layout/PageLoader.jsx";
import useAuthUser from "../features/auth/hooks/useAuthUser.js";
import { useRouteFocus } from "../lib/useRouteFocus.js";
import { useThemeStore } from "../store/useThemeStore.js";
import RouteErrorBoundary from "./RouteErrorBoundary.jsx";
import AppRoutes from "./router.jsx";

const StreamChatProvider = lazy(() =>
  import("../features/chat/StreamChatProvider.jsx")
);

const WAKING_MESSAGE =
  "Waking the server up. This can take up to a minute on free hosting.";

const App = () => {
  const { isLoading, isFetching, isError, authUser, refetch } = useAuthUser();
  const { theme } = useThemeStore();
  const [slow, setSlow] = useState(false);
  useRouteFocus();

  const waiting = !authUser && (isLoading || (isError && isFetching));
  const offline = isError && !isFetching;

  useEffect(() => {
    if (!waiting) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), 3000);
    return () => clearTimeout(timer);
  }, [waiting]);

  if (waiting) {
    return <PageLoader message={slow ? WAKING_MESSAGE : undefined} />;
  }

  if (offline) {
    return (
      <Gate theme={theme}>
        <Logo />
        <ErrorState
          className="justify-items-center py-0 text-center"
          title="Can't reach the server"
          onRetry={() => refetch()}
        >
          Check your connection and try again.
        </ErrorState>
      </Gate>
    );
  }

  const isAuthenticated = Boolean(authUser);
  const lockViewport = Boolean(authUser?.isOnboarded);

  return (
    <div
      className={lockViewport ? "h-dvh overflow-hidden" : "min-h-screen"}
      data-theme={theme}
    >
      <RouteErrorBoundary>
        {isAuthenticated ? (
          <Suspense fallback={<PageLoader />}>
            <StreamChatProvider>
              <AppRoutes authUser={authUser} />
            </StreamChatProvider>
          </Suspense>
        ) : (
          <AppRoutes authUser={authUser} />
        )}
      </RouteErrorBoundary>
      <Toaster />
    </div>
  );
};

export default App;
