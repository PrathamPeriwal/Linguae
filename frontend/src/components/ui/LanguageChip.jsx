import { cva } from "class-variance-authority";
import { cn } from "../../lib/cn";
import { languageLabel } from "../../lib/languageLabel";
import { Flag } from "./Flag";

const chipVariants = cva("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption", {
  variants: {
    variant: {
      native: "border border-line text-fg",
      learning: "bg-accent/[0.16] text-accent",
    },
  },
  defaultVariants: {
    variant: "native",
  },
});

export function LanguageChip({ language, variant = "native", prefix, className }) {
  const label = languageLabel(language);
  const text = prefix ? `${prefix} ${label}`.trim() : label;

  return (
    <span className={cn(chipVariants({ variant }), className)}>
      <Flag language={language} />
      {text}
    </span>
  );
}
