import { Suspense } from "react";
import { motion, useReducedMotion } from "motion/react";

const MotionFade = motion.div;
import * as Tooltip from "@radix-ui/react-tooltip";
import { Outlet, useLocation } from "react-router";
import { cn } from "../../lib/cn";
import { Skeleton } from "../ui/Skeleton";
import { ConversationsPanel } from "./ConversationsPanel";
import { getShellMode, shellSegment } from "./getShellMode";
import { Rail } from "./Rail";
import { TabBar } from "./TabBar";

function MainFallback() {
  return (
    <div className="grid gap-4 p-6" aria-busy="true">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 w-full max-w-xl" />
      <Skeleton className="h-24 w-full max-w-xl" />
    </div>
  );
}

export function AppShell() {
  const { pathname } = useLocation();
  const mode = getShellMode(pathname);
  const segment = shellSegment(pathname);
  const chat = segment === "chat";
  const reduce = useReducedMotion();

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="relative flex h-dvh flex-col overflow-hidden lg:flex-row">
        <a
          href="#main"
          className="absolute left-3 top-3 z-50 -translate-y-[150%] rounded-control bg-panel px-3 py-2 text-small text-fg focus:translate-y-0"
        >
          Skip to content
        </a>
        <Rail />
        {mode.panel ? (
          <ConversationsPanel variant="sidebar" className="hidden lg:flex" />
        ) : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <main
            id="main"
            tabIndex={-1}
            className={cn(
              "min-h-0 flex-1",
              chat ? "flex flex-col overflow-hidden" : "overflow-y-auto",
              !mode.tabBar && "pb-[env(safe-area-inset-bottom)]",
            )}
          >
            <MotionFade
              key={segment}
              className={chat ? "flex min-h-0 flex-1 flex-col" : "min-h-full"}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: reduce ? 0 : 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <Suspense fallback={<MainFallback />}>
                <Outlet />
              </Suspense>
            </MotionFade>
          </main>
          {mode.tabBar ? <TabBar /> : null}
        </div>
      </div>
    </Tooltip.Provider>
  );
}
