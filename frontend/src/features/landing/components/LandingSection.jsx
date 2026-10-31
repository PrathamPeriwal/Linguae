import { createElement } from "react";
import { cn } from "../../../lib/cn";
import { useInView } from "../../../lib/useInView";

export function LandingSection({ as = "section", className, children, ...props }) {
  const { ref, shown } = useInView();
  return createElement(
    as,
    { ...props, ref, className: cn("landing-inview", shown && "is-in", className) },
    children,
  );
}
