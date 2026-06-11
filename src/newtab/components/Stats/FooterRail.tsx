import { m } from "framer-motion";

type Props = {
  clock: { h: number; m: number; s: number };
  goalMinutes: number;
  topics: string[];
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Slim utility rail along the bottom edge — the demoted home of everything
 * that used to be a full-size widget: the session countdown (a chip with a
 * draining ring), the user's topics, and the shelved Resource Manager. Low
 * contrast, small type: present when you look for it, invisible when you
 * don't.
 */
export default function FooterRail({ clock, goalMinutes, topics }: Props) {
  const elapsed = clock.h * 3600 + clock.m * 60 + clock.s;
  const remaining = Math.max(0, goalMinutes * 60 - elapsed);
  const rh = Math.floor(remaining / 3600);
  const rm = Math.floor((remaining % 3600) / 60);
  const rs = remaining % 60;
  const frac = goalMinutes > 0 ? remaining / (goalMinutes * 60) : 1;
  const done = remaining === 0;

  // Tiny draining ring (radius 7 → circumference ≈ 44).
  const C = 2 * Math.PI * 7;

  return (
    <div className="flex items-center justify-between gap-4 text-[11px] text-faint">
      {/* Session countdown chip */}
      <div
        className="flex shrink-0 items-center gap-2 rounded-full border border-hairline bg-glass px-3 py-1.5 backdrop-blur-md"
        title="Session time left — resets when you close the browser"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
          <circle
            cx="8"
            cy="8"
            r="7"
            fill="none"
            stroke="var(--bg-elevated)"
            strokeWidth="2"
          />
          <m.circle
            cx="8"
            cy="8"
            r="7"
            fill="none"
            stroke={done ? "var(--accent-warm)" : "var(--accent-primary)"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={C}
            animate={{ strokeDashoffset: C * (1 - frac) }}
            transform="rotate(-90 8 8)"
          />
        </svg>
        <span className="tabular-nums text-subtle">
          {done ? (
            <span className="text-warm">break time ✦</span>
          ) : (
            <>
              {rh > 0 && `${rh}:`}
              {pad(rm)}:{pad(rs)} left
            </>
          )}
        </span>
      </div>

      {/* Topics */}
      {topics.length > 0 && (
        <div className="hidden min-w-0 items-center gap-1.5 overflow-hidden md:flex">
          {topics.slice(0, 6).map((t) => (
            <span
              key={t}
              className="shrink-0 rounded-full border border-hairline px-2.5 py-1 capitalize"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Shelved resource manager */}
      <div
        className="hidden shrink-0 items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 sm:flex"
        title="Tab snoozing is being reworked — coming back smarter"
      >
        🧪 <span>Resource Manager — soon</span>
      </div>
    </div>
  );
}
