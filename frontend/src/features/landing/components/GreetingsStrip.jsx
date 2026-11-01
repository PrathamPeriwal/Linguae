import { Flag } from "../../../components/ui/Flag.jsx";
import { LANGUAGES, getGreeting } from "../../../lib/languages.js";
import { usePrefersReducedMotion } from "../../../lib/useMediaPrefs";

function GreetingItem({ language }) {
  const greeting = getGreeting(language);
  return (
    <li className="inline-flex items-center gap-2 whitespace-nowrap px-4">
      <Flag language={language} />
      <span lang={greeting.lang} dir={greeting.dir} className="font-display text-h3 font-bold text-fg">
        {greeting.word}
      </span>
      <span className="text-small text-fg-muted">{language}</span>
    </li>
  );
}

export function GreetingsStrip() {
  const reduce = usePrefersReducedMotion();
  const items = LANGUAGES.map((language) => <GreetingItem key={language} language={language} />);

  return (
    <div>
      <h2 className="text-h2 text-fg">Hello in each language</h2>
      <p className="mt-2 max-w-[65ch] text-body text-fg-muted">
        The word for hello in every language you can add to a profile.
      </p>
      {reduce ? (
        <ul className="mt-6 flex list-none flex-wrap gap-x-2 gap-y-3 p-0">{items}</ul>
      ) : (
        <div className="ticker-focus mt-6 rounded-card" tabIndex={0} aria-label="Greetings in every language">
          <div className="ticker">
            <div className="ticker-track">
              <ul className="ticker-row">{items}</ul>
              <ul className="ticker-row" aria-hidden="true">
                {LANGUAGES.map((language) => (
                  <GreetingItem key={`${language}-copy`} language={language} />
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
