import { m, AnimatePresence } from "framer-motion";
import type { Mood, MoodHistoryEntry } from "../../../types";
import { MOOD_KEYS, MOOD_THEME } from "./moodTheme";

type Props = {
  mood: Mood;
  onSelect: (mood: Mood) => void;
  history: MoodHistoryEntry[];
  reshuffling?: boolean;
  feedError?: string | null;
};

const SPRING = { type: "spring", stiffness: 380, damping: 30 } as const;

/** The dominant mood over the last 7 days, for the insight line. */
function weeklyTop(history: MoodHistoryEntry[]) {
  const counts = new Map<string, number>();
  for (const e of history) {
    if (e.mood) counts.set(e.mood, (counts.get(e.mood) ?? 0) + 1);
  }
  let top: Exclude<Mood, null> | null = null;
  let max = 0;
  for (const [k, n] of counts) {
    if (n > max) {
      max = n;
      top = k as Exclude<Mood, null>;
    }
  }
  return top ? { mood: top, count: max } : null;
}

/**
 * Compact mood strip: one row of emoji pills + a single insight/status line.
 * Replaces the old card-sized MoodWidget — same signal, a fraction of the
 * visual weight, and the line actually says something useful (feed status or
 * the week's dominant mood) instead of just decorating.
 */
export default function MoodRow({
  mood,
  onSelect,
  history,
  reshuffling,
  feedError,
}: Props) {
  const top = weeklyTop(history);

  let insight: { text: string; color?: string } | null;
  if (reshuffling) {
    insight = { text: "Re-tuning your feed ✦" };
  } else if (feedError) {
    insight = { text: feedError };
  } else if (mood) {
    insight = {
      text: `Feed tuned for your ${MOOD_THEME[mood].label.toLowerCase()} mood`,
      color: MOOD_THEME[mood].color,
    };
  } else if (top) {
    insight = {
      text: `Mostly ${MOOD_THEME[top.mood].emoji} ${MOOD_THEME[top.mood].label.toLowerCase()} this week — pick a mood to tune the feed`,
    };
  } else {
    insight = { text: "Pick a mood and Aura tunes your feed to match" };
  }

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div className="flex items-center gap-1.5">
        {MOOD_KEYS.map((value) => {
          const t = MOOD_THEME[value];
          const active = mood === value;
          return (
            <m.button
              key={value}
              type="button"
              onClick={() => onSelect(active ? null : value)}
              title={t.label}
              whileHover={{ y: -2, scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              className="relative flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 hover:border-hairline"
            >
              {active && (
                <m.div
                  layoutId="mood-pill-row"
                  transition={SPRING}
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: t.gradient,
                    opacity: 0.2,
                    boxShadow: `0 0 16px ${t.color}4d, inset 0 0 0 1px ${t.color}66`,
                  }}
                />
              )}
              <m.span
                className="relative text-lg leading-none"
                animate={active ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                {t.emoji}
              </m.span>
              <AnimatePresence>
                {active && (
                  <m.span
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="relative overflow-hidden text-xs font-medium"
                    style={{ color: t.color }}
                  >
                    {t.label}
                  </m.span>
                )}
              </AnimatePresence>
            </m.button>
          );
        })}
      </div>

      <div className="flex h-4 items-center">
        <AnimatePresence mode="wait">
          <m.span
            key={insight.text}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={`text-[11px] ${feedError ? "text-warm" : "text-faint"}`}
            style={insight.color ? { color: insight.color } : undefined}
          >
            {insight.text}
          </m.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
