import { cva } from "class-variance-authority";
import { cn } from "../../lib/cn";
import { languageLabel } from "../../lib/languageLabel";
import { Flag } from "./Flag";

const chipVariants = cva("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption", {
  variants: {
    variant: {
      native: "border border-line text-fg",
      learning: "bg-lilac/15 text-lilac",
    },
  },
  defaultVariants: {
    variant: "native",
  },
});

export function LanguageChip({ language, variant = "native", className }) {
  const label = languageLabel(language);

  return (
    <span className={cn(chipVariants({ variant }), className)}>
      <Flag language={language} />
      {label}
    </span>
  );
}
