import { m } from "framer-motion";
import type { MoodHistoryEntry } from "../../../types";
import { MOOD_THEME, type MoodKey } from "./moodTheme";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DOTS = 4;

const startOfDay = (ts: number) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Tiny 7-day strip of mood dots, one column per day, latest mood on top. */
export default function MoodHistory({ history }: { history: MoodHistoryEntry[] }) {
  const today = startOfDay(Date.now());
  const days = Array.from({ length: 7 }, (_, i) => today - (6 - i) * DAY_MS);

  const valid = history.filter(
    (e): e is MoodHistoryEntry & { mood: MoodKey } => e.mood !== null
  );

  if (!valid.length) {
    return (
      <p className="mt-3 border-t border-hairline pt-3 text-center text-[11px] text-faint">
        Your week of moods will show up here
      </p>
    );
  }

  return (
    <m.div
      className="mt-3 flex items-end justify-between border-t border-hairline pt-3"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.04 } } }}
    >
      {days.map((day) => {
        const date = new Date(day);
        const label =
          day === today
            ? "Today"
            : date.toLocaleDateString(undefined, { weekday: "short" });
        const entries = valid
          .filter((e) => startOfDay(e.timestamp) === day)
          .sort((a, b) => b.timestamp - a.timestamp) // latest first → top
          .slice(0, MAX_DOTS);
        return (
          <div key={day} className="flex flex-col items-center gap-1.5">
            <div className="flex min-h-[10px] flex-col gap-1">
              {entries.map((e) => {
                const t = MOOD_THEME[e.mood];
                const at = new Date(e.timestamp).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <m.span
                    key={e.timestamp}
                    title={`${label} — ${t.label} ${t.emoji} at ${at}`}
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: t.color,
                      boxShadow: `0 0 5px ${t.color}66`,
                    }}
                    variants={{
                      hidden: { scale: 0, opacity: 0 },
                      show: { scale: 1, opacity: 1 },
                    }}
                  />
                );
              })}
              {!entries.length && (
                <span className="h-2 w-2 rounded-full bg-elevated opacity-50" />
              )}
            </div>
            <span className="text-[9px] uppercase tracking-wide text-faint">
              {label}
            </span>
          </div>
        );
      })}
    </m.div>
  );
}
