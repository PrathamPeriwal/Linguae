import { LanguageChip } from "../../../components/ui/LanguageChip.jsx";
import { LANGUAGES } from "../../../lib/languages.js";

export function LanguageGrid() {
  return (
    <div>
      <h2 className="text-h2 text-fg">{LANGUAGES.length} languages</h2>
      <p className="mt-2 max-w-[65ch] text-body text-fg-muted">
        These are the languages you can add to your profile.
      </p>
      <ul className="mt-6 flex list-none flex-wrap gap-2 p-0">
        {LANGUAGES.map((language) => (
          <li key={language}>
            <LanguageChip language={language} />
          </li>
        ))}
      </ul>
    </div>
  );
}
