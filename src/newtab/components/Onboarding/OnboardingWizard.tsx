import { useMemo, useState, type ReactNode } from "react";
import type { BrowsingGoal, Profile } from "../../../types";
import { createDefaultProfile, profile as profileStore } from "../../../storage";

// --- Step data (exactly the options listed in CLAUDE.md) ------------------

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
};

const GOALS: GoalOption[] = [
  { value: "stay_informed", label: "Stay informed", hint: "News-heavy feed" },
  { value: "discover", label: "Discover things", hint: "Mixed, surprise me" },
  { value: "chill", label: "Just chill", hint: "Entertainment focus" },
  { value: "focus", label: "Deep focus", hint: "Tutorials, long reads" },
];

const MIN_HOURS = 1;
const MAX_HOURS = 8;
const DEFAULT_HOURS = 4;

type Props = {
  /** Called with the completed, already-persisted profile. */
  onComplete: (profile: Profile) => void;
};

export default function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<string[]>([]);
  const [goal, setGoal] = useState<BrowsingGoal | null>(null);
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [saving, setSaving] = useState(false);

  const totalSteps = 3;

  const canAdvance = useMemo(() => {
    if (step === 0) return interests.length > 0;
    if (step === 1) return goal !== null;
    return true;
  }, [step, interests, goal]);

  function toggleInterest(label: string) {
    setInterests((prev) =>
      prev.includes(label)
        ? prev.filter((i) => i !== label)
        : [...prev, label]
    );
  }

  async function finish() {
    if (!goal) return;
    setSaving(true);
    const next: Profile = {
      ...createDefaultProfile(),
      // store interests as lowercase slugs, matching CLAUDE.md examples
      interests: interests.map((i) => i.toLowerCase()),
      browsingGoal: goal,
      screenTimeGoalMinutes: hours * 60,
      setupComplete: true,
    };
    await profileStore.set(next);
    onComplete(next);
  }

  function next() {
    if (!canAdvance) return;
    if (step < totalSteps - 1) setStep((s) => s + 1);
    else void finish();
  }

  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-hairline bg-surface p-8 shadow-2xl animate-scale-in">
        {/* Brand + progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <span className="font-display text-2xl font-semibold tracking-tight text-ink">
              Aura
            </span>
            <span className="text-xs font-medium text-faint">
              Step {step + 1} of {totalSteps}
            </span>
          </div>
          <div className="mt-4 flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  i <= step ? "bg-primary" : "bg-elevated"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step body */}
        <div key={step} className="animate-fade-up">
          {step === 0 && (
            <Step
              title="What are you into?"
              subtitle="Pick a few. Aura tunes your feed around these."
            >
              <div className="flex flex-wrap gap-2.5">
                {INTERESTS.map((label) => {
                  const active = interests.includes(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleInterest(label)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                        active
                          ? "border-primary bg-primary text-white"
                          : "border-hairline bg-elevated text-subtle hover:text-ink hover:border-primary/50"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </Step>
          )}

          {step === 1 && (
            <Step
              title="What's the vibe?"
              subtitle="How you want your browsing to feel."
            >
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {GOALS.map((g) => {
                  const active = goal === g.value;
                  return (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGoal(g.value)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        active
                          ? "border-primary bg-primary/10"
                          : "border-hairline bg-elevated hover:border-primary/50"
                      }`}
                    >
                      <div className="text-sm font-semibold text-ink">
                        {g.label}
                      </div>
                      <div className="mt-0.5 text-xs text-subtle">{g.hint}</div>
                    </button>
                  );
                })}
              </div>
            </Step>
          )}

          {step === 2 && (
            <Step
              title="Daily screen-time goal"
              subtitle="Aura nudges you gently as you approach it."
            >
              <div className="rounded-xl border border-hairline bg-elevated p-6">
                <div className="mb-5 text-center">
                  <span className="font-display text-4xl font-semibold text-ink">
                    {hours}
                  </span>
                  <span className="ml-1 text-lg text-subtle">
                    {hours === 1 ? "hour" : "hours"}
                  </span>
                </div>
                <input
                  type="range"
                  min={MIN_HOURS}
                  max={MAX_HOURS}
                  step={1}
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full accent-[var(--accent-primary)]"
                />
                <div className="mt-2 flex justify-between text-xs text-faint">
                  <span>{MIN_HOURS}h</span>
                  <span>{MAX_HOURS}h</span>
                </div>
              </div>
            </Step>
          )}
        </div>

        {/* Footer controls */}
        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={back}
            disabled={step === 0 || saving}
            className="text-sm font-medium text-faint transition-colors hover:text-subtle disabled:invisible"
          >
            Back
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!canAdvance || saving}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {step < totalSteps - 1
              ? "Continue"
              : saving
                ? "Setting up…"
                : "Enter Aura"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-1.5 mb-6 text-sm text-subtle">{subtitle}</p>
      {children}
    </div>
  );
}
