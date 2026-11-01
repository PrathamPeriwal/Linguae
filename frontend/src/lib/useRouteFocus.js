import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

function isField(node) {
  if (!(node instanceof HTMLElement)) return false;
  if (node.isContentEditable) return true;
  return node.closest("input, textarea, select") != null;
}

export function useRouteFocus() {
  const { pathname } = useLocation();
  const first = useRef(true);
  const seenPath = useRef(pathname);
  const fieldAtNavigation = useRef(null);

  if (seenPath.current !== pathname) {
    const active = document.activeElement;
    fieldAtNavigation.current = isField(active) ? active : null;
    seenPath.current = pathname;
  }

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }

    const captured = fieldAtNavigation.current;
    const started = performance.now();
    let frame = 0;
    let firstTry = true;

    const attempt = () => {
      const active = document.activeElement;
      if (firstTry) {
        firstTry = false;
        if (captured && captured.isConnected && active === captured) return;
      } else if (isField(active)) {
        return;
      }

      const root = document.getElementById("main") || document.body;
      const heading = root.querySelector("h1");
      if (!heading) {
        if (performance.now() - started < 4000) frame = window.requestAnimationFrame(attempt);
        return;
      }
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    };

    frame = window.requestAnimationFrame(attempt);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);
}
