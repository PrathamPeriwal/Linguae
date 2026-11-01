import { useState } from "react";
import { Bell, Compass } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tooltip from "@radix-ui/react-tooltip";
import { motion, useReducedMotion } from "motion/react";

const MotionPill = motion.span;
import { Link, useLocation } from "react-router";
import useAuthUser from "../../features/auth/hooks/useAuthUser";
import { cn } from "../../lib/cn";
import { Avatar } from "../ui/Avatar";
import { Logo } from "../ui/Logo";
import { ThemeToggle } from "../ui/ThemeToggle";
import { LogoutConfirm } from "./LogoutConfirm";
import { useIncomingCount } from "./useIncomingCount";

function RailTip({ label, children }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={8}
          className="z-50 rounded-control bg-raised px-2 py-1 text-caption text-fg"
        >
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function RailPill() {
  const reduce = useReducedMotion();

  return (
    <MotionPill
      layoutId={reduce ? undefined : "rail-pill"}
      className="absolute inset-1 bg-spark"
      style={{ borderRadius: 9999 }}
      transition={reduce ? { duration: 0 } : { type: "spring", bounce: 0.2, duration: 0.36 }}
    />
  );
}

function RailLink({ to, label, icon, active, count = 0 }) {
  const Icon = icon;
  const name = count > 0 ? `${label}, ${count} incoming` : label;

  return (
    <RailTip label={label}>
      <Link
        to={to}
        aria-label={name}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative inline-flex size-11 items-center justify-center rounded-full",
          active ? "text-[#2A0B25]" : "text-fg",
        )}
      >
        {active ? <RailPill /> : null}
        <Icon className="relative z-10 size-5" aria-hidden="true" />
        {count > 0 ? (
          <span
            aria-hidden="true"
            className="absolute right-0 top-0 z-10 min-w-4 rounded-full bg-spark px-1 text-center text-caption font-semibold leading-none text-[#2A0B25]"
          >
            {count}
          </span>
        ) : null}
      </Link>
    </RailTip>
  );
}

export function Rail() {
  const { pathname } = useLocation();
  const { authUser } = useAuthUser();
  const incoming = useIncomingCount();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const name = authUser?.fullName || "Account";

  return (
    <div className="hidden h-full min-h-0 w-[72px] shrink-0 flex-col items-center border-r border-line bg-panel py-3 lg:flex">
      <RailTip label="Linguae">
        <Link
          to="/"
          aria-label="Linguae"
          className="inline-flex size-11 items-center justify-center rounded-control"
        >
          <Logo wordmark={false} />
        </Link>
      </RailTip>

      <nav aria-label="Primary" className="mt-3 flex flex-1 flex-col items-center gap-2">
        <RailLink to="/" label="Discover" icon={Compass} active={pathname === "/"} />
        <RailLink
          to="/notifications"
          label="Requests"
          icon={Bell}
          active={pathname === "/notifications"}
          count={incoming}
        />
      </nav>

      <div className="flex flex-col items-center gap-2">
        <RailTip label="Theme">
          <ThemeToggle />
        </RailTip>

        <DropdownMenu.Root>
          <RailTip label="Account">
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label="Account menu"
                className="inline-flex size-11 items-center justify-center rounded-full"
              >
                <Avatar src={authUser?.profilePic} name={name} size={32} alt="" />
              </button>
            </DropdownMenu.Trigger>
          </RailTip>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              side="right"
              align="end"
              sideOffset={8}
              className="z-50 min-w-44 rounded-card border border-line bg-panel p-1 text-fg"
            >
              <DropdownMenu.Label className="px-3 py-2 text-small font-semibold">
                {name}
              </DropdownMenu.Label>
              <DropdownMenu.Item
                className="cursor-pointer rounded-control px-3 py-2 text-small text-danger outline-none data-[highlighted]:bg-raised"
                onSelect={() => setConfirmOpen(true)}
              >
                Log out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <LogoutConfirm open={confirmOpen} onOpenChange={setConfirmOpen} />
    </div>
  );
}
