import { useEffect, useSyncExternalStore } from "react";
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

  useEffect(() => {
    if (desktop) return undefined;
    const previous = document.title;
    document.title = "Chats · Linguae";
    return () => {
      document.title = previous;
    };
  }, [desktop]);

  if (desktop) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-full flex-col">
      <h1 className="px-4 pt-4" tabIndex={-1}>
        Chats
      </h1>
      <ConversationsPanel variant="page" className="min-h-0 flex-1" />
    </div>
  );
}
