import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { AppShell } from "../components/layout/AppShell.jsx";
import PageLoader from "../components/layout/PageLoader.jsx";

const HomePage = lazy(() => import("../pages/HomePage.jsx"));
const ChatsPage = lazy(() => import("../pages/ChatsPage.jsx"));
const SignUpPage = lazy(() => import("../pages/SignUpPage.jsx"));
const LoginPage = lazy(() => import("../pages/LoginPage.jsx"));
const NotificationsPage = lazy(() => import("../pages/NotificationsPage.jsx"));
const CallPage = lazy(() => import("../pages/CallPage.jsx"));
const ChatPage = lazy(() => import("../pages/ChatPage.jsx"));
const OnboardingPage = lazy(() => import("../pages/OnboardingPage.jsx"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage.jsx"));
const WelcomePage = lazy(() => import("../pages/WelcomePage.jsx"));
const KitPage = import.meta.env.DEV
  ? lazy(() => import("../pages/KitPage.jsx"))
  : null;

function withSuspense(node) {
  return <Suspense fallback={<PageLoader />}>{node}</Suspense>;
}

function OnboardedShell({ authUser }) {
  const { pathname } = useLocation();

  if (!authUser) {
    return <Navigate to={pathname === "/" ? "/welcome" : "/login"} replace />;
  }

  if (!authUser.isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return <AppShell />;
}

export default function AppRoutes({ authUser }) {
  const isAuthenticated = Boolean(authUser);
  const isOnboarded = authUser?.isOnboarded;

  return (
    <Routes>
      {import.meta.env.DEV ? (
        <Route path="/_kit" element={withSuspense(<KitPage />)} />
      ) : null}
      <Route element={<OnboardedShell authUser={authUser} />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/chats" element={<ChatsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/chat/:id" element={<ChatPage />} />
        <Route path="/call/:id" element={<CallPage />} />
      </Route>
      <Route
        path="/welcome"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : withSuspense(<WelcomePage />)
        }
      />
      <Route
        path="/signup"
        element={
          !isAuthenticated ? (
            withSuspense(<SignUpPage />)
          ) : (
            <Navigate to={isOnboarded ? "/" : "/onboarding"} />
          )
        }
      />
      <Route
        path="/login"
        element={
          !isAuthenticated ? (
            withSuspense(<LoginPage />)
          ) : (
            <Navigate to={isOnboarded ? "/" : "/onboarding"} />
          )
        }
      />
      <Route
        path="/onboarding"
        element={
          isAuthenticated ? (
            !isOnboarded ? (
              withSuspense(<OnboardingPage />)
            ) : (
              <Navigate to="/" />
            )
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route path="*" element={withSuspense(<NotFoundPage />)} />
    </Routes>
  );
}
