import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";

const MotionStep = motion.div;
import { Shuffle } from "lucide-react";
import toast from "react-hot-toast";
import { Avatar } from "../../../components/ui/Avatar.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Field, Input, Textarea } from "../../../components/ui/Field.jsx";
import { LanguageChip } from "../../../components/ui/LanguageChip.jsx";
import { LanguageCombobox } from "../../../components/ui/LanguageCombobox.jsx";
import { getErrorMessage } from "../../../lib/errors.js";
import { languageLabel } from "../../../lib/languageLabel.js";
import { getGreeting } from "../../../lib/languages.js";
import { queryKeys } from "../../../lib/queryKeys.js";
import { cn } from "../../../lib/cn.js";
import { usePrefersReducedMotion } from "../../../lib/useMediaPrefs.js";
import useAuthUser from "../../auth/hooks/useAuthUser.js";
import { FormAlert } from "../../auth/components/FormAlert.jsx";
import { completeOnboarding } from "../api.js";

const STEP_ONE = ["fullName", "bio", "location"];
const STEP_TWO = ["nativeLanguage", "learningLanguage"];

const MESSAGES = {
  fullName: "Enter your full name.",
  bio: "Write a short bio.",
  location: "Enter your location.",
  nativeLanguage: "Choose your native language.",
  learningLanguage: "Choose a language to learn.",
};

const stepVariants = {
  enter: (direction) => ({ opacity: 0, x: direction * 20 }),
  center: { opacity: 1, x: 0 },
  exit: (direction) => ({ opacity: 0, x: direction * -20 }),
};

const stepTransition = { duration: 0.2, ease: [0.22, 1, 0.36, 1] };

function onboardingFieldErrors(values) {
  const errors = {};
  for (const key of Object.keys(MESSAGES)) {
    if (!values[key]) errors[key] = MESSAGES[key];
  }
  if (
    values.nativeLanguage &&
    values.learningLanguage &&
    values.nativeLanguage === values.learningLanguage
  ) {
    errors.learningLanguage = "Choose a different language to learn.";
  }
  return errors;
}

function knownMissing(error) {
  const missing = error?.response?.data?.missingFields;
  if (!Array.isArray(missing)) return [];
  return missing.filter((name) => typeof name === "string" && MESSAGES[name]);
}

function avatarUrl() {
  const seed =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(seed)}`;
}

function RequiredLabel({ children, extra }) {
  return (
    <span className="flex items-baseline justify-between gap-3">
      <span className="inline-flex items-baseline gap-2">
        {children}
        <span className="text-caption font-normal text-fg-muted">Required</span>
      </span>
      {extra}
    </span>
  );
}

function ProfilePreview({ values }) {
  const greeting = values.nativeLanguage
    ? getGreeting(languageLabel(values.nativeLanguage))
    : { word: "Hello", lang: "en", dir: "ltr" };
  const name = values.fullName.trim() ? values.fullName : "";
  const location = values.location.trim() ? values.location : "";
  const bio = values.bio.trim() ? values.bio : "";

  return (
    <aside aria-labelledby="profile-preview-label" className="hidden min-w-0 lg:block">
      <div className="sticky top-8 rounded-card border border-line bg-raised p-6">
        <p id="profile-preview-label" className="text-small text-fg-muted">
          How others will see you
        </p>
        <div className="mt-5 flex items-center gap-3">
          <Avatar src={values.profilePic} name={values.fullName} size={72} alt="" className="text-h3" />
          <p className={cn("min-w-0 truncate text-body font-semibold", name ? "text-fg" : "text-fg-muted")}>
            {name || "Your name"}
          </p>
        </div>
        <p
          className="mt-5 max-w-full truncate font-display text-h1 text-fg"
          lang={greeting.lang}
          dir={greeting.dir}
        >
          {greeting.word}
        </p>
        <p className={cn("mt-3 truncate text-small", location ? "text-fg" : "text-fg-muted")}>
          {location || "Location"}
        </p>
        <p className={cn("mt-3 line-clamp-2 break-words text-small", bio ? "text-fg" : "text-fg-muted")}>
          {bio || "Your bio"}
        </p>
        <div className="mt-4 flex min-h-7 flex-wrap gap-2">
          {values.nativeLanguage ? <LanguageChip language={values.nativeLanguage} variant="native" /> : null}
          {values.learningLanguage ? (
            <LanguageChip language={values.learningLanguage} variant="learning" />
          ) : null}
        </div>
      </div>
    </aside>
  );
}

const OnboardingForm = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const reduce = usePrefersReducedMotion();
  const focusPlan = useRef(null);
  const headingRef = useCallback((node) => {
    if (!node || focusPlan.current?.type !== "heading") return;
    node.focus();
    focusPlan.current = null;
  }, []);
  const busy = useRef(false);
  const stepRef = useRef(1);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState({ 1: false, 2: false });
  const [formError, setFormError] = useState("");
  const [values, setValues] = useState({
    fullName: authUser?.fullName || "",
    bio: authUser?.bio || "",
    nativeLanguage: authUser?.nativeLanguage || "",
    learningLanguage: authUser?.learningLanguage || "",
    location: authUser?.location || "",
    profilePic: authUser?.profilePic || "",
  });

  stepRef.current = step;

  useEffect(() => {
    const previous = document.title;
    document.title = step === 1 ? "About you — Linguae" : "Languages — Linguae";
    return () => {
      document.title = previous;
    };
  }, [step]);

  useEffect(() => {
    const plan = focusPlan.current;
    if (plan?.type !== "field") return undefined;
    let frames = 0;
    const timer = window.setInterval(() => {
      frames += 1;
      if (focusPlan.current !== plan || frames > 20) {
        window.clearInterval(timer);
        return;
      }
      const node = document.getElementById(plan.id);
      if (!node?.isConnected) return;
      node.focus();
      focusPlan.current = null;
      window.clearInterval(timer);
    }, 50);
    return () => window.clearInterval(timer);
  }, [step]);

  const { mutate: onboardingMutation, isPending } = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      toast.success("Profile onboarded successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.authUser() });
    },
    onError: (error) => {
      const missing = knownMissing(error);
      if (missing.length === 0) {
        setFormError(getErrorMessage(error));
        return;
      }
      setFormError("");
      setSubmitted((current) => ({
        1: current[1] || missing.some((name) => STEP_ONE.includes(name)),
        2: current[2] || missing.some((name) => STEP_TWO.includes(name)),
      }));
      const first = missing[0];
      const target = STEP_TWO.includes(first) ? 2 : 1;
      if (target !== stepRef.current) {
        focusPlan.current = { type: "field", id: first };
        setDirection(target > stepRef.current ? 1 : -1);
        setStep(target);
        return;
      }
      window.requestAnimationFrame(() => document.getElementById(first)?.focus());
    },
    onSettled: () => {
      busy.current = false;
    },
  });

  const allErrors = onboardingFieldErrors(values);
  const errors = {};
  for (const key of Object.keys(allErrors)) {
    const stage = STEP_ONE.includes(key) ? 1 : 2;
    if (submitted[stage] || touched[key]) errors[key] = allErrors[key];
  }

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setFormError("");
  }

  function touch(name) {
    setTouched((current) => ({ ...current, [name]: true }));
  }

  function goTo(next) {
    if (next === step || isPending) return;
    setDirection(next > step ? 1 : -1);
    focusPlan.current = { type: "heading" };
    setStep(next);
  }

  function onSubmit(event) {
    event.preventDefault();
    if (busy.current || isPending) return;
    setSubmitted((current) => ({ ...current, [step]: true }));
    const issues = onboardingFieldErrors(values);
    if (step === 1) {
      const invalid = STEP_ONE.find((key) => issues[key]);
      if (invalid) {
        document.getElementById(invalid)?.focus();
        return;
      }
      goTo(2);
      return;
    }
    const invalid = STEP_TWO.find((key) => issues[key]);
    if (invalid) {
      document.getElementById(invalid)?.focus();
      return;
    }
    setFormError("");
    busy.current = true;
    onboardingMutation({
      fullName: values.fullName,
      bio: values.bio,
      nativeLanguage: values.nativeLanguage,
      learningLanguage: values.learningLanguage,
      location: values.location,
      profilePic: values.profilePic,
    });
  }

  const count = values.bio.length;
  const countLabel = `${count} ${count === 1 ? "character" : "characters"}`;

  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-clip px-4 py-6 text-fg sm:px-6 lg:py-10">
      <div className="mx-auto grid w-full max-w-5xl items-start gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <main id="main" className="min-w-0">
          <div className="grid gap-2">
            <p id="onboarding-step" className="text-small text-fg">
              Step {step} of 2
            </p>
            <div
              className="grid grid-cols-2 gap-2"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={2}
              aria-valuenow={step}
              aria-labelledby="onboarding-step"
            >
              <span aria-hidden="true" className={cn("h-1 rounded-full", step >= 1 ? "bg-accent" : "bg-line")} />
              <span aria-hidden="true" className={cn("h-1 rounded-full", step >= 2 ? "bg-accent" : "bg-line")} />
            </div>
          </div>

          <form onSubmit={onSubmit} noValidate className="mt-6">
            <div className="overflow-x-clip">
              <AnimatePresence mode="wait" initial={false} custom={reduce ? 0 : direction}>
                <MotionStep
                  key={step}
                  custom={reduce ? 0 : direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={stepTransition}
                  className="grid gap-5"
                >
                  {step === 1 ? (
                    <>
                      <h1 ref={headingRef} tabIndex={-1}>
                        About you
                      </h1>
                      <FormAlert message={formError} />
                      <div className="flex items-center gap-4">
                        <Avatar
                          src={values.profilePic}
                          name={values.fullName}
                          size={96}
                          alt="Profile picture"
                          className="text-h3"
                        />
                        <Button type="button" variant="secondary" onClick={() => update("profilePic", avatarUrl())}>
                          <Shuffle aria-hidden="true" className="size-4" />
                          Shuffle
                        </Button>
                      </div>
                      <Field label={<RequiredLabel>Full name</RequiredLabel>} error={errors.fullName}>
                        <Input
                          id="fullName"
                          name="fullName"
                          type="text"
                          autoComplete="name"
                          aria-required="true"
                          value={values.fullName}
                          onChange={(event) => update("fullName", event.target.value)}
                          onBlur={() => touch("fullName")}
                        />
                      </Field>
                      <Field
                        label={
                          <RequiredLabel
                            extra={
                              <span id="bio-count" className="text-caption font-normal text-fg-muted">
                                {countLabel}
                              </span>
                            }
                          >
                            Bio
                          </RequiredLabel>
                        }
                        error={errors.bio}
                      >
                        <Textarea
                          id="bio"
                          name="bio"
                          rows={4}
                          aria-required="true"
                          aria-describedby="bio-count"
                          placeholder="What you want to practise"
                          value={values.bio}
                          onChange={(event) => update("bio", event.target.value)}
                          onBlur={() => touch("bio")}
                        />
                      </Field>
                      <Field label={<RequiredLabel>Location</RequiredLabel>} error={errors.location}>
                        <Input
                          id="location"
                          name="location"
                          type="text"
                          autoComplete="address-level2"
                          aria-required="true"
                          placeholder="City, country"
                          value={values.location}
                          onChange={(event) => update("location", event.target.value)}
                          onBlur={() => touch("location")}
                        />
                      </Field>
                      <Button type="submit" className="w-full">
                        Continue
                      </Button>
                    </>
                  ) : (
                    <>
                      <h1 ref={headingRef} tabIndex={-1}>
                        Languages
                      </h1>
                      <FormAlert message={formError} />
                      <Field label={<RequiredLabel>Native language</RequiredLabel>} error={errors.nativeLanguage}>
                        <LanguageCombobox
                          id="nativeLanguage"
                          aria-required="true"
                          value={values.nativeLanguage}
                          placeholder="Search languages"
                          onChange={(language) => {
                            update("nativeLanguage", language.toLowerCase());
                            touch("nativeLanguage");
                          }}
                          onBlur={() => touch("nativeLanguage")}
                        />
                      </Field>
                      <Field label={<RequiredLabel>Learning language</RequiredLabel>} error={errors.learningLanguage}>
                        <LanguageCombobox
                          id="learningLanguage"
                          aria-required="true"
                          value={values.learningLanguage}
                          placeholder="Search languages"
                          onChange={(language) => {
                            update("learningLanguage", language.toLowerCase());
                            touch("learningLanguage");
                          }}
                          onBlur={() => touch("learningLanguage")}
                        />
                      </Field>
                      <div className="flex gap-3">
                        <Button type="button" variant="secondary" onClick={() => goTo(1)} disabled={isPending}>
                          Back
                        </Button>
                        <Button
                          type="submit"
                          className="min-w-0 flex-1"
                          loading={isPending}
                          disabled={isPending}
                        >
                          Start talking
                        </Button>
                      </div>
                    </>
                  )}
                </MotionStep>
              </AnimatePresence>
            </div>
          </form>
        </main>
        <ProfilePreview values={values} />
      </div>
    </div>
  );
};

export default OnboardingForm;
