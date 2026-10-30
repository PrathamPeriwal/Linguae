import { useSyncExternalStore } from "react";
import { Navigate } from "react-router";
import { ConversationsPanel } from "../components/layout/ConversationsPanel";

const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribe(onChange) {
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function isDesktop() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

export default function ChatsPage() {
  const desktop = useSyncExternalStore(subscribe, isDesktop, isDesktop);
  if (desktop) return <Navigate to="/" replace />;
  return <ConversationsPanel variant="page" />;
}
