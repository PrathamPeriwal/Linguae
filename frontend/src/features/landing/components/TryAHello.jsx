import { useRef, useState } from "react";
import { LanguageChip } from "../../../components/ui/LanguageChip.jsx";
import { RevealBar } from "../../../components/ui/RevealBar.jsx";
import { cn } from "../../../lib/cn";
import { LANGUAGES, LANGUAGE_PHRASES } from "../../../lib/languages.js";

export function TryAHello() {
  const [selected, setSelected] = useState(LANGUAGES[0]);
  const buttons = useRef([]);
  const phrases = LANGUAGE_PHRASES[selected] ?? LANGUAGE_PHRASES.English;
  const index = Math.max(0, LANGUAGES.indexOf(selected));

  function choose(nextIndex) {
    const language = LANGUAGES[nextIndex];
    if (!language) return;
    setSelected(language);
    buttons.current[nextIndex]?.focus();
  }

  function onKeyDown(event) {
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const back = event.key === "ArrowLeft" || event.key === "ArrowUp";
    if (!forward && !back && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    if (event.key === "Home") choose(0);
    else if (event.key === "End") choose(LANGUAGES.length - 1);
    else if (forward) choose((index + 1) % LANGUAGES.length);
    else choose((index - 1 + LANGUAGES.length) % LANGUAGES.length);
  }

  return (
    <div>
      <h2 className="text-h2 text-fg">A taste of it</h2>
      <p className="mt-2 max-w-[65ch] text-body text-fg-muted">
        Three phrases in the language you pick. This is a sample, not part of the app.
      </p>
      <div
        role="radiogroup"
        aria-label="Language"
        className="mt-6 flex flex-wrap gap-2"
        onKeyDown={onKeyDown}
      >
        {LANGUAGES.map((language, chipIndex) => {
          const checked = language === selected;
          return (
            <button
              key={language}
              ref={(node) => {
                buttons.current[chipIndex] = node;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full",
                checked && "ring-2 ring-accent ring-offset-2 ring-offset-bg",
              )}
              onClick={() => setSelected(language)}
            >
              <LanguageChip language={language} variant={checked ? "learning" : "native"} />
            </button>
          );
        })}
      </div>
      <div key={selected} className="phrase-fade mt-8">
        <h3 className="text-h3 text-fg">{selected}</h3>
        <ul className="mt-6 grid list-none gap-8 p-0">
          {phrases.map((item) => (
            <li key={item.phrase}>
              <p className="max-w-full text-balance font-display text-display-l text-fg" lang={item.lang} dir={item.dir}>
                {item.phrase}
              </p>
              <p className="mt-2 text-body text-fg">
                <RevealBar>{item.meaning}</RevealBar>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
