import { useEffect, useRef, useState } from "react";
import { LANGUAGES, getGreeting } from "../../lib/languages";
import { cn } from "../../lib/cn";
import { useHoverCapable, usePrefersReducedMotion } from "../../lib/useMediaPrefs";

const SHIFT_COLORS = ["rgb(var(--accent))", "rgb(var(--ember))", "rgb(221 227 232)"];
const HOLD_MS = 2600;

const COMPLEX_SCRIPT = /[\u0590-\u08FF\u0900-\u0DFF\uFB50-\uFDFF\uFE70-\uFEFF]/;

const segmenter =
  typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function fixedShuffle(items) {
  const next = [...items];
  let seed = 20261030;
  for (let index = next.length - 1; index > 0; index -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const swap = seed % (index + 1);
    const current = next[index];
    next[index] = next[swap];
    next[swap] = current;
  }
  return next;
}

const GREETINGS = fixedShuffle(LANGUAGES).map((name) => getGreeting(name));

function unitsFor(greeting) {
  if (greeting.dir === "rtl" || COMPLEX_SCRIPT.test(greeting.word) || !segmenter) {
    return [greeting.word];
  }
  return Array.from(segmenter.segment(greeting.word), (part) => part.segment);
}

function relaxLetter(letter) {
  letter.dataset.shifting = "";
  letter.style.transition = "";
  window.requestAnimationFrame(() => {
    letter.style.color = "";
  });
}

export function GreetingMorph({ className }) {
  const reduce = usePrefersReducedMotion();
  const hover = useHoverCapable();
  const [current, setCurrent] = useState(0);
  const [leaving, setLeaving] = useState(null);
  const rootRef = useRef(null);
  const currentRef = useRef(0);
  const shiftTimers = useRef(new Set());

  useEffect(() => {
    if (reduce) return undefined;
    let timer = 0;

    const stop = () => {
      window.clearInterval(timer);
      timer = 0;
    };

    const start = () => {
      if (timer || document.hidden) return;
      timer = window.setInterval(() => {
        const previous = currentRef.current;
        const next = (previous + 1) % GREETINGS.length;
        currentRef.current = next;
        setLeaving(previous);
        setCurrent(next);
      }, HOLD_MS);
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduce]);

  useEffect(() => {
    const timers = shiftTimers.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
    };
  }, []);

  if (reduce) {
    const hello = getGreeting("English");
    return (
      <div className={cn("greeting-morph", className)} aria-hidden="true" lang={hello.lang} dir={hello.dir}>
        {hello.word}
      </div>
    );
  }

  function clearShifts() {
    shiftTimers.current.forEach((id) => window.clearTimeout(id));
    shiftTimers.current.clear();
    rootRef.current?.querySelectorAll("[data-letter]").forEach(relaxLetter);
  }

  function onPointerOver(event) {
    const letter = event.target.closest?.("[data-letter]");
    if (!letter || !rootRef.current?.contains(letter) || letter.dataset.shifting === "true") return;

    rootRef.current.querySelectorAll("[data-letter]").forEach((other) => {
      if (other !== letter && other.dataset.shifting === "true") relaxLetter(other);
    });

    letter.dataset.shifting = "true";
    letter.style.transition = "color 120ms var(--ease-enter)";
    SHIFT_COLORS.forEach((color, step) => {
      const id = window.setTimeout(() => {
        shiftTimers.current.delete(id);
        if (letter.dataset.shifting === "true") letter.style.color = color;
      }, step * 140);
      shiftTimers.current.add(id);
    });
  }

  return (
    <div
      ref={rootRef}
      className={cn("greeting-morph", className)}
      aria-hidden="true"
      onPointerOver={hover ? onPointerOver : undefined}
      onPointerLeave={hover ? clearShifts : undefined}
    >
      {GREETINGS.map((greeting) => (
        <span
          key={`${greeting.lang}-measure`}
          className="greeting-sizer"
          lang={greeting.lang}
          dir={greeting.dir}
        >
          {greeting.word}
        </span>
      ))}
      {GREETINGS.map((greeting, index) => (
        <span
          key={greeting.lang}
          lang={greeting.lang}
          dir={greeting.dir}
          className={cn(
            "greeting-word",
            index === current && "is-current",
            index === leaving && "is-leaving",
          )}
        >
          {unitsFor(greeting).map((part, partIndex) => (
            <span key={`${greeting.lang}-${partIndex}`} className="greeting-letter" data-letter="">
              {part}
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}
