import { useEffect, useState } from "react";

function queryMatches(query) {
  return typeof window.matchMedia === "function" && window.matchMedia(query).matches;
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => queryMatches(query));

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export function usePrefersReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

export function useHoverCapable() {
  return useMediaQuery("(hover: hover) and (pointer: fine)");
}
