import { useRef } from "react";
import { AnimatePresence, motion } from "motion/react";

const MotionItem = motion.li;
const MotionLabel = motion.span;
import { Check, Loader2, MapPin, UserPlus } from "lucide-react";
import { Avatar } from "../../../components/ui/Avatar";
import { Button } from "../../../components/ui/Button";
import { LanguageChip } from "../../../components/ui/LanguageChip";
import { RevealBar } from "../../../components/ui/RevealBar";
import { cn } from "../../../lib/cn";
import { getGreeting } from "../../../lib/languages";
import { languageLabel } from "../../../lib/languageLabel";

const REQUEST_STATE = {
  idle: { label: "Send request", icon: UserPlus },
  sending: { label: "Sending", icon: Loader2 },
  sent: { label: "Request sent", icon: Check },
};

function languageKey(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function RequestButton({ name, state, onClick }) {
  const { label, icon: Icon } = REQUEST_STATE[state];
  const action =
    state === "sent"
      ? `Request sent to ${name}`
      : state === "sending"
        ? `Sending request to ${name}`
        : `Send request to ${name}`;

  return (
    <Button
      variant={state === "sent" ? "secondary" : "primary"}
      disabled={state !== "idle"}
      aria-label={action}
      aria-busy={state === "sending" || undefined}
      onClick={onClick}
      className={cn(
        "mt-auto w-full min-w-[11.5rem]",
        state === "sending" && "border-solid border-transparent bg-accent text-on-accent",
      )}
    >
      <span className="inline-grid items-center justify-items-center">
        <span
          className="invisible col-start-1 row-start-1 inline-flex items-center gap-2 whitespace-nowrap"
          aria-hidden="true"
        >
          <span className="size-4 shrink-0" />
          <span className="grid">
            <span className="col-start-1 row-start-1">Send request</span>
            <span className="col-start-1 row-start-1">Request sent</span>
          </span>
        </span>
        <AnimatePresence initial={false}>
          <MotionLabel
            key={state}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="col-start-1 row-start-1 inline-flex items-center gap-2 whitespace-nowrap"
          >
            <Icon className={cn("size-4 shrink-0", state === "sending" && "animate-spin")} aria-hidden="true" />
            {label}
          </MotionLabel>
        </AnimatePresence>
      </span>
    </Button>
  );
}

export function LearnerCard({ user, sent, sending, onSend, enterIndex = null }) {
  const stagger = useRef(enterIndex);
  const enter = stagger.current;
  const name = user.fullName || "Learner";
  const location = typeof user.location === "string" ? user.location.trim() : "";
  const native = languageKey(user.nativeLanguage);
  const greeting = getGreeting(languageLabel(native));
  const state = sending ? "sending" : sent ? "sent" : "idle";

  return (
    <MotionItem
      className="flex h-full min-w-0 flex-col gap-4 overflow-hidden rounded-card border border-line bg-raised p-5"
      initial={enter == null ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        enter == null
          ? { duration: 0 }
          : {
              duration: 0.2,
              delay: Math.min(enter, 7) * 0.04,
              ease: [0.22, 1, 0.36, 1],
            }
      }
    >
      <div className="flex items-center gap-3">
        <Avatar src={user.profilePic} name={name} size={48} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate">{name}</h2>
          {location ? (
            <p className="mt-0.5 flex items-center gap-1 text-caption text-fg-muted">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{location}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="min-w-0">
        <p className="truncate font-display text-h1 text-fg" lang={greeting.lang}>
          <bdi dir={greeting.dir}>{greeting.word}</bdi>
        </p>
        <p className="text-small text-fg">
          <RevealBar>means {greeting.meaning}</RevealBar>
        </p>
      </div>

      <p className="line-clamp-2 min-h-[2.625rem] break-words text-small text-fg">
        {typeof user.bio === "string" ? user.bio : ""}
      </p>

      <div className="flex flex-wrap gap-2">
        <LanguageChip language={user.nativeLanguage} variant="native" prefix="Speaks" />
        <LanguageChip language={user.learningLanguage} variant="learning" prefix="Learning" />
      </div>

      <RequestButton name={name} state={state} onClick={() => onSend(user._id)} />
    </MotionItem>
  );
}
