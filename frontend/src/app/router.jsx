import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import Layout from "../components/layout/Layout.jsx";
import PageLoader from "../components/layout/PageLoader.jsx";

const HomePage = lazy(() => import("../pages/HomePage.jsx"));
const SignUpPage = lazy(() => import("../pages/SignUpPage.jsx"));
const LoginPage = lazy(() => import("../pages/LoginPage.jsx"));
const NotificationsPage = lazy(() => import("../pages/NotificationsPage.jsx"));
const CallPage = lazy(() => import("../pages/CallPage.jsx"));
const ChatPage = lazy(() => import("../pages/ChatPage.jsx"));
const OnboardingPage = lazy(() => import("../pages/OnboardingPage.jsx"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage.jsx"));
const KitPage = import.meta.env.DEV
  ? lazy(() => import("../pages/KitPage.jsx"))
  : null;

function withSuspense(node) {
  return <Suspense fallback={<PageLoader />}>{node}</Suspense>;
}

export default function AppRoutes({ authUser }) {
  const isAuthenticated = Boolean(authUser);
  const isOnboarded = authUser?.isOnboarded;

  return (
    <Routes>
      {import.meta.env.DEV ? (
        <Route path="/_kit" element={withSuspense(<KitPage />)} />
      ) : null}
      <Route
        path="/"
        element={
          isAuthenticated && isOnboarded ? (
            <Layout showSidebar={true}>
              {withSuspense(<HomePage />)}
            </Layout>
          ) : (
            <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
          )
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
        path="/notifications"
        element={
          isAuthenticated && isOnboarded ? (
            <Layout showSidebar={true}>
              {withSuspense(<NotificationsPage />)}
            </Layout>
          ) : (
            <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
          )
        }
      />
      <Route
        path="/call/:id"
        element={
          isAuthenticated && isOnboarded ? (
            withSuspense(<CallPage />)
          ) : (
            <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
          )
        }
      />
      <Route
        path="/chat/:id"
        element={
          isAuthenticated && isOnboarded ? (
            <Layout showSidebar={false}>
              {withSuspense(<ChatPage />)}
            </Layout>
          ) : (
            <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
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
