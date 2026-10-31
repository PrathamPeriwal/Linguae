import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./useMediaPrefs";

export function useInView() {
  const ref = useRef(null);
  const reduce = usePrefersReducedMotion();
  const [shown, setShown] = useState(reduce);

  useEffect(() => {
    if (reduce || typeof IntersectionObserver !== "function") {
      setShown(true);
      return undefined;
    }

    const node = ref.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const passed = entry.boundingClientRect.top < 0;
        if (!entry.isIntersecting && !passed) return;
        setShown(true);
        observer.disconnect();
      },
      { threshold: 0, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [reduce]);

  return { ref, shown };
}
