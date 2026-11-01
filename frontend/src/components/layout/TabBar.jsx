import { useState } from "react";
import { Bell, Compass, MessageCircle, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router";
import useAuthUser from "../../features/auth/hooks/useAuthUser";
import { useStreamChat } from "../../features/chat/streamChatContext";
import { cn } from "../../lib/cn";
import { Button } from "../ui/Button";
import { Dialog, DialogContent } from "../ui/Dialog";
import { ThemeToggle } from "../ui/ThemeToggle";
import { LogoutConfirm } from "./LogoutConfirm";
import { useIncomingCount } from "./useIncomingCount";

function TabLink({ to, label, icon, active, count = 0, countWord = "incoming" }) {
  const Icon = icon;
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      aria-label={count > 0 ? `${label}, ${count} ${countWord}` : undefined}
      className={cn(
        "flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 text-caption",
        active ? "text-accent" : "text-fg-muted",
      )}
    >
      <span className="relative">
        <Icon className="size-5" aria-hidden="true" />
        {count > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-2 -top-1 min-w-4 rounded-full bg-spark px-1 text-center text-caption font-semibold leading-none text-[#2A0B25]"
          >
            {count}
          </span>
        ) : null}
      </span>
      {label}
    </Link>
  );
}

export function TabBar() {
  const { pathname } = useLocation();
  const { authUser } = useAuthUser();
  const incoming = useIncomingCount();
  const { unreadCounts } = useStreamChat();
  const chatUnread = Object.values(unreadCounts || {}).reduce((sum, count) => sum + count, 0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const name = authUser?.fullName || "Account";

  return (
    <>
      <nav
        aria-label="Primary"
        className="flex border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <TabLink to="/" label="Discover" icon={Compass} active={pathname === "/"} />
        <TabLink
          to="/chats"
          label="Chats"
          icon={MessageCircle}
          active={pathname === "/chats"}
          count={chatUnread}
          countWord="unread"
        />
        <TabLink
          to="/notifications"
          label="Requests"
          icon={Bell}
          active={pathname === "/notifications"}
          count={incoming}
        />
        <button
          type="button"
          className="flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 text-caption text-fg-muted"
          onClick={() => setSheetOpen(true)}
        >
          <UserRound className="size-5" aria-hidden="true" />
          Me
        </button>
      </nav>

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent variant="sheet" title={name}>
          <div className="mt-6 flex items-center justify-between gap-3">
            <span className="text-body text-fg">Theme</span>
            <ThemeToggle />
          </div>
          <Button variant="danger" className="mt-6 w-full" onClick={() => setConfirmOpen(true)}>
            Log out
          </Button>
        </DialogContent>
      </Dialog>
      <LogoutConfirm open={confirmOpen} onOpenChange={setConfirmOpen} />
    </>
  );
}
