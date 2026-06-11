// Cinematic onboarding wizard. Flow:
//   Welcome → name → interests → browsing goal → screen time → theme →
//   "Building your Aura…" finale → onComplete(profile).
//
// Contract (unchanged): default export, props { onComplete: (profile) => void },
// and the profile is persisted via profile.set({ ..., setupComplete: true })
// BEFORE onComplete fires.

import {
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, m, type Variants } from "framer-motion";
import type { BrowsingGoal, Profile } from "../../../types";
import { createDefaultProfile, profile as profileStore } from "../../../storage";
import { useTheme } from "../../hooks/useTheme";
import Welcome from "./Welcome";

// --- Step data -------------------------------------------------------------

const INTERESTS = [
  "Anime",
  "Manga",
  "Tech",
  "Gaming",
  "Sports",
  "Science",
  "Music",
  "Movies",
  "Finance",
  "Fashion",
  "Food",
] as const;

type GoalOption = {
  value: BrowsingGoal;
  label: string;
  hint: string;
  emoji: string;
};

const GOALS: GoalOption[] = [
  { value: "stay_informed", label: "Stay informed", hint: "News-heavy feed", emoji: "📰" },
  { value: "discover", label: "Discover things", hint: "Mixed, surprise me", emoji: "🧭" },
  { value: "chill", label: "Just chill", hint: "Entertainment focus", emoji: "🍿" },
  { value: "focus", label: "Deep focus", hint: "Tutorials, long reads", emoji: "🎯" },
];

const MIN_HOURS = 1;
const MAX_HOURS = 8;
const DEFAULT_HOURS = 4;

// Step indices. 1–5 are the "question" steps shown in the progress bar.
const STEP_WELCOME = 0;
const STEP_NAME = 1;
const STEP_INTERESTS = 2;
const STEP_GOAL = 3;
const STEP_TIME = 4;
const STEP_THEME = 5;
const STEP_FINALE = 6;
const QUESTION_STEPS = 5;

// Direction-aware step transition variants (forward: right→left).
const stepVariants: Variants = {
  enter: (dir: number) => ({ x: dir >= 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? -40 : 40, opacity: 0 }),
};

type Props = {
  /** Called with the completed, already-persisted profile. */
  onComplete: (profile: Profile) => void;
};

export default function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState(STEP_WELCOME);
  const [direction, setDirection] = useState(1);
  const [name, setName] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [goal, setGoal] = useState<BrowsingGoal | null>(null);
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [saving, setSaving] = useState(false);
  const { themeId, themes, setTheme } = useTheme();

  const canAdvance = useMemo(() => {
    if (step === STEP_INTERESTS) return interests.length > 0;
    if (step === STEP_GOAL) return goal !== null;
    return true;
  }, [step, interests, goal]);

  function goTo(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  function toggleInterest(label: string) {
    setInterests((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );
  }

  async function finish() {
    if (!goal || saving) return;
    setSaving(true);
    setDirection(1);
    setStep(STEP_FINALE); // start the finale animation immediately
    const next: Profile = {
      ...createDefaultProfile(),
      name: name.trim(),
      // store interests as lowercase slugs, matching CLAUDE.md examples
      interests: interests.map((i) => i.toLowerCase()),
      browsingGoal: goal,
      screenTimeGoalMinutes: hours * 60,
      setupComplete: true,
    };
    // Persist FIRST — the hand-off delay below is purely cosmetic.
    await profileStore.set(next);
    window.setTimeout(() => onComplete(next), 1200);
  }

  function next() {
    if (!canAdvance) return;
    if (step < STEP_THEME) goTo(step + 1);
    else void finish();
  }

  function back() {
    if (step > STEP_WELCOME && step <= STEP_THEME && !saving) goTo(step - 1);
  }

  const showChrome = step >= STEP_NAME && step <= STEP_THEME;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Progress: thin gradient bar + step dots */}
      {showChrome && (
        <div className="fixed inset-x-0 top-0 z-40">
          <div className="h-0.5 w-full bg-elevated">
            <m.div
              className="h-full bg-hero"
              initial={false}
              animate={{ width: `${(step / QUESTION_STEPS) * 100}%` }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            />
          </div>
          <div className="mt-3 flex justify-center gap-1.5">
            {Array.from({ length: QUESTION_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                  i + 1 === step
                    ? "scale-125 bg-primary"
                    : i + 1 < step
                      ? "bg-primary opacity-50"
                      : "bg-elevated"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Back button */}
      {showChrome && (
        <m.button
          type="button"
          onClick={back}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ x: -2 }}
          className="fixed left-5 top-5 z-40 rounded-full px-3 py-1.5 text-sm font-medium text-faint transition-colors hover:text-subtle"
        >
          ← Back
        </m.button>
      )}

      {/* Step body with direction-aware transitions */}
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <m.div
          key={step}
          custom={direction}
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.32, ease: "easeOut" }}
          className="flex min-h-screen items-center justify-center"
        >
          {step === STEP_WELCOME && <Welcome onStart={() => goTo(STEP_NAME)} />}

          {showChrome && (
            <div className="mx-auto w-full max-w-xl px-6 py-20 text-center">
              {step === STEP_NAME && (
                <NameStep
                  value={name}
                  onChange={setName}
                  onSubmit={next}
                  onSkip={() => {
                    setName("");
                    goTo(STEP_INTERESTS);
                  }}
                />
              )}
              {step === STEP_INTERESTS && (
                <InterestsStep selected={interests} onToggle={toggleInterest} />
              )}
              {step === STEP_GOAL && (
                <GoalStep selected={goal} onSelect={setGoal} />
              )}
              {step === STEP_TIME && (
                <TimeStep hours={hours} onChange={setHours} />
              )}
              {step === STEP_THEME && (
                <ThemeStep
                  themes={themes}
                  selectedId={themeId}
                  onSelect={(id) => void setTheme(id)}
                />
              )}

              {/* Continue / Finish */}
              <div className="mt-12 flex justify-center">
                <m.button
                  type="button"
                  onClick={next}
                  disabled={!canAdvance || saving}
                  whileHover={canAdvance && !saving ? { scale: 1.04 } : undefined}
                  whileTap={canAdvance && !saving ? { scale: 0.92 } : undefined}
                  className="rounded-full bg-hero px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  {step === STEP_THEME ? "Build my Aura ✨" : "Continue →"}
                </m.button>
              </div>
            </div>
          )}
        </m.div>
      </AnimatePresence>

      {/* Finale: gradient circle expands from the button, then hand-off */}
      {step === STEP_FINALE && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
          <m.div
            aria-hidden
            className="absolute bottom-24 left-1/2 h-40 w-40 rounded-full bg-hero"
            style={{ x: "-50%" }}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 30, opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
          />
          <m.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.45, ease: "easeOut" }}
            className="relative z-10 font-display text-3xl font-semibold text-white drop-shadow-lg sm:text-4xl"
          >
            Building your Aura…
          </m.p>
        </div>
      )}
    </div>
  );
}

// --- Shared step shell ------------------------------------------------------

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {title}
      </h1>
      {subtitle && <p className="mt-3 text-base text-subtle">{subtitle}</p>}
      <div className="mt-10">{children}</div>
    </div>
  );
}

// --- Step 1: Name -----------------------------------------------------------

function NameStep({
  value,
  onChange,
  onSubmit,
  onSkip,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") onSubmit();
  }

  return (
    <StepShell
      title="What should we call you?"
      subtitle="Just a first name is perfect."
    >
      <div className="group relative mx-auto max-w-md">
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Your name"
          maxLength={40}
          className="w-full bg-transparent py-3 text-center font-display text-3xl font-semibold text-ink caret-primary outline-none placeholder:text-faint"
        />
        {/* resting hairline + gradient underline that lights up on focus */}
        <div className="h-px w-full bg-hairline" />
        <div className="absolute bottom-0 left-0 h-0.5 w-full origin-center scale-x-0 bg-hero transition-transform duration-300 ease-out group-focus-within:scale-x-100" />
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="mt-8 text-sm font-medium text-faint underline-offset-4 transition-colors hover:text-subtle hover:underline"
      >
        I&apos;ll stay anonymous
      </button>
    </StepShell>
  );
}

// --- Step 2: Interests --------------------------------------------------------

const chipContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const chipItem: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 380, damping: 24 },
  },
};

function InterestsStep({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (label: string) => void;
}) {
  const count = selected.length;
  const encouragement =
    count === 0
      ? "Pick a few — this shapes your feed"
      : count <= 2
        ? "Nice start ✨"
        : "Great taste. Your feed is taking shape ✦";

  return (
    <StepShell
      title="What are you into?"
      subtitle="Pick a few. Aura tunes your feed around these."
    >
      <m.div
        variants={chipContainer}
        initial="hidden"
        animate="show"
        className="flex flex-wrap justify-center gap-2.5"
      >
        {INTERESTS.map((label) => {
          const active = selected.includes(label);
          return (
            <m.button
              key={label}
              type="button"
              variants={chipItem}
              whileTap={{ scale: 0.95 }}
              onClick={() => onToggle(label)}
              className={`relative overflow-hidden rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                active
                  ? "border-transparent text-ink ring-1 ring-primary"
                  : "border-hairline bg-elevated text-subtle hover:border-primary hover:text-ink"
              }`}
            >
              {/* low-opacity hero gradient fill when selected */}
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-0 bg-hero opacity-20"
                />
              )}
              <span className="relative inline-flex items-center gap-1.5">
                {label}
                <AnimatePresence>
                  {active && (
                    <m.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      className="text-xs text-primary"
                    >
                      ✓
                    </m.span>
                  )}
                </AnimatePresence>
              </span>
            </m.button>
          );
        })}
      </m.div>
      <p
        key={encouragement}
        className="animate-fade-up mt-6 text-sm font-medium text-subtle"
      >
        {encouragement}
      </p>
    </StepShell>
  );
}

// --- Step 3: Browsing goal ----------------------------------------------------

function GoalStep({
  selected,
  onSelect,
}: {
  selected: BrowsingGoal | null;
  onSelect: (goal: BrowsingGoal) => void;
}) {
  return (
    <StepShell
      title="What's the vibe?"
      subtitle="How you want your browsing to feel."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {GOALS.map((g) => {
          const active = selected === g.value;
          return (
            <m.div
              key={g.value}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 360, damping: 24 }}
            >
              <button
                type="button"
                onClick={() => onSelect(g.value)}
                style={
                  active
                    ? {
                        border: "1px solid transparent",
                        background:
                          "linear-gradient(var(--bg-elevated), var(--bg-elevated)) padding-box, var(--gradient-hero) border-box",
                      }
                    : undefined
                }
                className={`w-full rounded-2xl p-5 text-left transition-shadow duration-300 ${
                  active
                    ? "shadow-glow"
                    : "border border-hairline bg-elevated hover:shadow-glow"
                }`}
              >
                <div className="text-2xl">{g.emoji}</div>
                <div className="mt-2 text-sm font-semibold text-ink">
                  {g.label}
                </div>
                <div className="mt-0.5 text-xs text-subtle">{g.hint}</div>
              </button>
            </m.div>
          );
        })}
      </div>
    </StepShell>
  );
}

// --- Step 4: Screen time --------------------------------------------------------

function TimeStep({
  hours,
  onChange,
}: {
  hours: number;
  onChange: (h: number) => void;
}) {
  const pct = ((hours - MIN_HOURS) / (MAX_HOURS - MIN_HOURS)) * 100;

  return (
    <StepShell
      title="Daily screen-time goal"
      subtitle="Aura nudges you gently as you approach it."
    >
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-baseline justify-center">
          <m.span
            key={hours}
            initial={{ scale: 1.25, opacity: 0.4 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
            className="gradient-hero-text inline-block font-display text-7xl font-semibold"
          >
            {hours}
          </m.span>
          <span className="ml-2 text-xl text-subtle">
            {hours === 1 ? "hour" : "hours"}
          </span>
        </div>
        <input
          type="range"
          min={MIN_HOURS}
          max={MAX_HOURS}
          step={1}
          value={hours}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            background: `linear-gradient(to right, var(--accent-primary) ${pct}%, var(--bg-elevated) ${pct}%)`,
          }}
          className="h-2 w-full cursor-pointer appearance-none rounded-full outline-none [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:shadow-glow [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-glow [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
        />
        <div className="mt-3 flex justify-between text-xs text-faint">
          <span>{MIN_HOURS}h</span>
          <span>{MAX_HOURS}h</span>
        </div>
      </div>
    </StepShell>
  );
}

// --- Step 5: Theme ---------------------------------------------------------------

type ThemeLike = ReturnType<typeof useTheme>["themes"][number];

function ThemeStep({
  themes,
  selectedId,
  onSelect,
}: {
  themes: ThemeLike[];
  selectedId: string;
  onSelect: (id: ThemeLike["id"]) => void;
}) {
  return (
    <StepShell
      title="Pick your vibe ✨"
      subtitle="Click around — the whole page repaints live."
    >
      <m.div
        variants={chipContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {themes.map((t) => {
          const active = t.id === selectedId;
          const [c1, c2, c3] = t.preview;
          return (
            <m.button
              key={t.id}
              type="button"
              variants={chipItem}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onSelect(t.id)}
              className={`rounded-2xl border p-3 text-left transition-all duration-300 ${
                active
                  ? "scale-105 border-transparent shadow-glow ring-2 ring-primary"
                  : "border-hairline bg-elevated hover:border-primary"
              }`}
            >
              <div
                aria-hidden
                className="h-14 w-full rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${c1}, ${c2}, ${c3})`,
                }}
              />
              <div className="mt-2.5 text-sm font-semibold text-ink">
                {t.name}
              </div>
              <div className="mt-0.5 line-clamp-1 text-[11px] text-subtle">
                {t.tagline}
              </div>
            </m.button>
          );
        })}
      </m.div>
    </StepShell>
  );
}
