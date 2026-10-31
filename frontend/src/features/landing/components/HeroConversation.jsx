import { useEffect, useState } from "react";
import { Avatar } from "../../../components/ui/Avatar.jsx";
import { LanguageChip } from "../../../components/ui/LanguageChip.jsx";
import { cn } from "../../../lib/cn";
import { usePrefersReducedMotion } from "../../../lib/useMediaPrefs";

const MESSAGES = [
  { from: "them", text: "Hola. I speak Spanish and I'm learning English." },
  { from: "you", text: "Hello. I speak English and I'm learning Spanish." },
  { from: "them", text: "Shall we chat, then start a video call?" },
];

const GAP_MS = 1200;
const TYPE_MS = 700;

function Bubble({ from, children, live }) {
  const own = from === "you";
  return (
    <div
      className={cn(
        "w-fit max-w-[85%] rounded-card px-3 py-2",
        own ? "self-end bg-accent" : "bg-raised",
      )}
    >
      <p className={cn("text-body", own ? "text-on-accent" : "text-fg")} aria-live={live ? "polite" : undefined}>
        {children}
      </p>
    </div>
  );
}

function Typing({ from }) {
  const own = from === "you";
  return (
    <div
      className={cn(
        "flex w-fit items-center rounded-card px-3 py-2",
        own ? "self-end bg-accent" : "bg-raised",
      )}
      aria-hidden="true"
    >
      <span className={cn("typing-dots", own && "is-own")}>
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}

export function HeroConversation() {
  const reduce = usePrefersReducedMotion();
  const [count, setCount] = useState(() => (reduce ? MESSAGES.length : 0));
  const [typing, setTyping] = useState(() => !reduce);

  useEffect(() => {
    if (reduce) {
      setCount(MESSAGES.length);
      setTyping(false);
      return undefined;
    }

    setCount(0);
    setTyping(true);
    const timers = [];
    MESSAGES.forEach((_, index) => {
      const showAt = TYPE_MS + index * GAP_MS;
      timers.push(
        window.setTimeout(() => {
          setCount(index + 1);
          setTyping(false);
        }, showAt),
      );
      if (index < MESSAGES.length - 1) {
        timers.push(window.setTimeout(() => setTyping(true), showAt + 350));
      }
    });

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [reduce]);

  const pending = typing ? MESSAGES[count] : null;

  return (
    <figure className="min-w-0">
      <figcaption className="mb-2 text-caption text-fg-muted">Example conversation</figcaption>
      <div className="panel-glow flex min-h-72 w-full flex-col gap-3 rounded-panel bg-panel p-4 sm:p-6">
        <div className="flex items-center gap-3 border-b border-line pb-3">
          <Avatar name="Ana Costa" alt="" size={40} />
          <div className="min-w-0">
            <p className="text-body font-semibold text-fg">Ana Costa</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <LanguageChip language="Spanish" variant="native" />
              <LanguageChip language="English" variant="learning" />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {MESSAGES.slice(0, count).map((message) => (
            <Bubble key={message.text} from={message.from} live={!reduce}>
              {message.text}
            </Bubble>
          ))}
          {pending ? <Typing from={pending.from} /> : null}
        </div>
      </div>
    </figure>
  );
}
