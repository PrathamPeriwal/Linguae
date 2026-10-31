import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LANGUAGES, getGreeting } from "../../lib/languages";
import { cn } from "../../lib/cn";
import { useHoverCapable, usePrefersReducedMotion } from "../../lib/useMediaPrefs";

const SHIFT_COLORS = ["rgb(var(--accent))", "rgb(var(--ember))", "rgb(221 227 232)"];
const HOLD_MS = 2600;

const COMPLEX_SCRIPT = /[\u0590-\u08FF\u0900-\u0DFF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const WIDE_SCRIPT =
  /[\u1100-\u11FF\u2E80-\u2FFF\u3000-\u303F\u3040-\u30FF\u31F0-\u31FF\u3400-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFF66-\uFF9F]/;

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

function fitStyle(word) {
  const count = segmenter
    ? Array.from(segmenter.segment(word), (part) => part.segment).length
    : Array.from(word).length;
  return {
    "--chars": String(Math.max(count, 1)),
    "--factor": WIDE_SCRIPT.test(word) ? "1" : "0.6",
  };
}

function relaxLetter(letter) {
  letter.dataset.shifting = "";
  letter.style.transition = "";
  window.requestAnimationFrame(() => {
    letter.style.color = "";
  });
}

function measureSizes(slot) {
  const available = slot.clientWidth;
  if (available <= 0) return {};
  const sample = slot.querySelector(".greeting-sizer");
  if (!sample) return {};
  const sampleStyle = getComputedStyle(sample);
  const host = document.createElement("div");
  const probe = document.createElement("span");
  host.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;overflow:hidden;visibility:hidden;";
  probe.style.whiteSpace = "nowrap";
  probe.style.fontFamily = sampleStyle.fontFamily;
  probe.style.fontWeight = "800";
  probe.style.letterSpacing = "0.06em";
  probe.style.fontSize = "var(--text-display-xl)";
  host.appendChild(probe);
  document.body.appendChild(host);
  const cap = parseFloat(getComputedStyle(probe).fontSize) || available;
  const sizes = {};
  slot.querySelectorAll(".greeting-word, .greeting-sizer").forEach((node) => {
    const word = node.dataset.word || node.textContent || "";
    if (!word || sizes[word]) return;
    probe.textContent = word;
    probe.style.fontSize = "100px";
    const em = probe.getBoundingClientRect().width / 100;
    const size = Math.min(cap, em > 0 ? (available - 1) / em : cap);
    sizes[word] = `${Math.round(size * 100) / 100}px`;
  });
  host.remove();
  return sizes;
}

function useGreetingFit(slotRef, watch) {
  const [sizes, setSizes] = useState({});

  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (!slot) return undefined;

    let frame = 0;
    const fit = () => {
      const next = measureSizes(slot);
      setSizes((prev) => {
        const keys = Object.keys(next);
        if (keys.length === Object.keys(prev).length && keys.every((key) => prev[key] === next[key])) {
          return prev;
        }
        return next;
      });
    };

    fit();
    if (typeof ResizeObserver !== "function") return undefined;
    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(fit);
    });
    observer.observe(slot);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [slotRef, watch]);

  return sizes;
}

export function GreetingMorph({ className, children }) {
  const reduce = usePrefersReducedMotion();
  const hover = useHoverCapable();
  const [current, setCurrent] = useState(0);
  const [leaving, setLeaving] = useState(null);
  const slotRef = useRef(null);
  const rootRef = useRef(null);
  const currentRef = useRef(0);
  const shiftTimers = useRef(new Set());
  const active = reduce ? getGreeting("English") : GREETINGS[current];
  const sizes = useGreetingFit(slotRef, reduce ? "static" : current);

  function sized(word) {
    const fit = fitStyle(word);
    return sizes[word] ? { ...fit, fontSize: sizes[word] } : fit;
  }

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
    <div ref={slotRef} className={cn("greeting-slot", className)}>
      <div
        ref={rootRef}
        className="greeting-morph"
        aria-hidden="true"
        onPointerOver={hover && !reduce ? onPointerOver : undefined}
        onPointerLeave={hover && !reduce ? clearShifts : undefined}
      >
        {children}
        <span className="greeting-sizer" lang={active.lang} dir={active.dir} style={sized(active.word)}>
          {active.word}
        </span>
        {reduce ? (
          <span
            className="greeting-word is-current"
            lang={active.lang}
            dir={active.dir}
            data-word={active.word}
            style={sized(active.word)}
          >
            {active.word}
          </span>
        ) : (
          GREETINGS.map((greeting, index) => (
            <span
              key={greeting.lang}
              lang={greeting.lang}
              dir={greeting.dir}
              data-word={greeting.word}
              style={sized(greeting.word)}
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
          ))
        )}
      </div>
    </div>
  );
}
