import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router";
import { Toaster } from "../components/ui/Toaster.jsx";
import { ErrorState } from "../components/ui/ErrorState.jsx";
import PageLoader from "../components/layout/PageLoader.jsx";
import useAuthUser from "../features/auth/hooks/useAuthUser.js";
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
  const location = useLocation();
  const isKit = import.meta.env.DEV && location.pathname === "/_kit";
  const [slow, setSlow] = useState(false);

  const waiting =
    !authUser && !isKit && (isLoading || (isError && isFetching));
  const offline = isError && !isFetching && !isKit;

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
      <div
        className="flex min-h-screen items-center justify-center p-6"
        data-theme={theme}
      >
        <ErrorState title="Can't reach the server" onRetry={() => refetch()}>
          Check your connection and try again.
        </ErrorState>
      </div>
    );
  }

  const isAuthenticated = Boolean(authUser);
  const lockViewport = Boolean(authUser?.isOnboarded) && !isKit;

  return (
    <div
      className={isKit ? "min-h-screen" : lockViewport ? "h-dvh overflow-hidden" : "min-h-screen"}
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
