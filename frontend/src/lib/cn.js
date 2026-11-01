import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display-xl", "display-l", "h1", "h2", "h3", "body", "small", "caption"],
      radius: ["control", "card", "panel"],
      ease: ["enter", "exit"],
    },
    classGroups: {
      duration: [{ duration: ["fast", "base", "slow", "hero"] }],
    },
  },
});

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
