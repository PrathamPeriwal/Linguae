import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "../../store/useThemeStore";
import { IconButton } from "./IconButton";

export function ThemeToggle({ className, onClick: onClickProp, ...props }) {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const next = theme === "dark" ? "light" : "dark";

  function onClick(event) {
    onClickProp?.(event);
    const apply = () => setTheme(next);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce || typeof document.startViewTransition !== "function") {
      apply();
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    let transition;
    try {
      transition = document.startViewTransition(() => {
        flushSync(apply);
      });
    } catch {
      apply();
      return;
    }

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
        },
        {
          duration: 360,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  }

  return (
    <IconButton
      {...props}
      className={className}
      aria-label={next === "light" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={onClick}
    >
      {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </IconButton>
  );
}
