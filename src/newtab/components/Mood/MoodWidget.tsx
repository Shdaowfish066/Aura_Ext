import { useEffect, useRef, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import type { Mood, MoodHistoryEntry } from "../../../types";
import { mood as moodStore } from "../../../storage";
import { MOOD_KEYS, MOOD_THEME } from "./moodTheme";
import MoodHistory from "./MoodHistory";

/** Kept for back-compat — derived from the shared mood theme map. */
export const MOODS: { value: Exclude<Mood, null>; emoji: string; label: string }[] =
  MOOD_KEYS.map((value) => ({
    value,
    emoji: MOOD_THEME[value].emoji,
    label: MOOD_THEME[value].label,
  }));

type Props = {
  mood: Mood;
  onSelect: (mood: Mood) => void;
  reshuffling?: boolean;
  feedError?: string | null;
  /** Optional — when absent the widget loads mood history itself. */
  history?: MoodHistoryEntry[];
};

const SPRING = { type: "spring", stiffness: 380, damping: 30 } as const;

const ACTIVE_POP = { scale: [1, 1.35, 1] };

/** Each emoji idles with a tiny personality loop instead of sitting static:
 *  tired sways sleepily, hyped bounces, stressed jitters, low droops. */
const IDLE_ANIM: Record<
  Exclude<Mood, null>,
  { animate: Record<string, number[]>; transition: Record<string, unknown> }
> = {
  tired: {
    animate: { rotate: [-7, 7, -7] },
    transition: { duration: 4.5, repeat: Infinity, ease: "easeInOut" },
  },
  good: {
    animate: { y: [0, -2.5, 0] },
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
  stressed: {
    animate: { x: [0, -1.5, 1.5, -1.5, 1.5, 0] },
    transition: {
      duration: 0.45,
      repeat: Infinity,
      repeatDelay: 2.6,
      ease: "easeInOut",
    },
  },
  hyped: {
    animate: { y: [0, -4, 0], scale: [1, 1.07, 1] },
    transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" },
  },
  low: {
    animate: { y: [0, 2, 0], rotate: [0, -5, 0] },
    transition: { duration: 5, repeat: Infinity, ease: "easeInOut" },
  },
};

export default function MoodWidget({
  mood,
  onSelect,
  reshuffling,
  feedError,
  history,
}: Props) {
  const theme = mood ? MOOD_THEME[mood] : null;

  // Self-loaded history (used only when the parent doesn't pass one).
  const [ownHistory, setOwnHistory] = useState<MoodHistoryEntry[]>([]);
  useEffect(() => {
    if (history !== undefined) return;
    if (typeof chrome === "undefined" || !chrome.storage) return;
    let alive = true;
    const read = () =>
      moodStore.getHistory().then((h) => alive && setOwnHistory(h));
    void read();
    // The parent persists history right after the mood prop flips — re-read
    // shortly after so the new dot shows up without waiting for a reload.
    const t = setTimeout(read, 600);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [history, mood]); // refresh after each mood change

  // Success line: shown when a reshuffle finishes without a feed error.
  const [justTuned, setJustTuned] = useState(false);
  const prevReshufflingRef = useRef(reshuffling);
  useEffect(() => {
    const finished = prevReshufflingRef.current && !reshuffling;
    prevReshufflingRef.current = reshuffling;
    if (finished && !feedError && mood) {
      setJustTuned(true);
      const t = setTimeout(() => setJustTuned(false), 2500);
      return () => clearTimeout(t);
    }
    if (reshuffling || feedError) setJustTuned(false);
  }, [reshuffling, feedError, mood]);

  const feedback = reshuffling
    ? "reshuffling"
    : feedError
      ? "error"
      : justTuned
        ? "tuned"
        : "idle";

  return (
    <div
      className="glass-card p-4 transition-all duration-700"
      style={
        theme
          ? {
              borderColor: `${theme.color}55`,
              boxShadow: `0 0 28px ${theme.color}1f, inset 0 0 22px ${theme.color}0a`,
            }
          : undefined
      }
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-faint">
          How are you feeling?
        </span>
        {theme && (
          <span
            className="text-[11px] font-medium"
            style={{ color: theme.color }}
          >
            {theme.emoji} {theme.label}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {MOODS.map(({ value, emoji, label }) => {
          const t = MOOD_THEME[value];
          const active = mood === value;
          return (
            <m.button
              key={value}
              type="button"
              onClick={() => onSelect(active ? null : value)}
              title={label}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              className="relative flex flex-1 flex-col items-center gap-1 rounded-xl border border-transparent px-2 py-2.5 hover:border-hairline hover:bg-elevated"
            >
              {active && (
                <m.div
                  layoutId="mood-pill"
                  transition={SPRING}
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: t.gradient,
                    opacity: 0.18,
                    boxShadow: `0 0 18px ${t.color}59, inset 0 0 0 1px ${t.color}66`,
                  }}
                />
              )}
              <m.span
                className="relative text-2xl"
                animate={active ? ACTIVE_POP : IDLE_ANIM[value].animate}
                transition={
                  active
                    ? { duration: 0.45, ease: "easeOut" }
                    : IDLE_ANIM[value].transition
                }
              >
                {emoji}
              </m.span>
              <span
                className={`relative text-[11px] font-medium ${
                  active ? "" : "text-faint"
                }`}
                style={active ? { color: t.color } : undefined}
              >
                {label}
              </span>
            </m.button>
          );
        })}
      </div>

      {/* Fixed-height feedback row — curation status lives here. */}
      <div className="mt-2 flex h-5 items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {feedback === "reshuffling" && (
            <m.span
              key="reshuffling"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="shimmer animate-pulse text-[11px] font-medium text-primary"
            >
              Re-curating your feed ✦
            </m.span>
          )}
          {feedback === "tuned" && theme && (
            <m.span
              key="tuned"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-[11px] font-medium"
              style={{ color: theme.color }}
            >
              Feed tuned for your {theme.label.toLowerCase()} mood
            </m.span>
          )}
          {feedback === "error" && (
            <m.span
              key="error"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-[11px] font-medium text-warm"
            >
              {feedError}
            </m.span>
          )}
        </AnimatePresence>
      </div>

      <MoodHistory history={history ?? ownHistory} />
    </div>
  );
}
