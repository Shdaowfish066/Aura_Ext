import { m } from "framer-motion";
import AnalogClock from "./AnalogClock";

type Props = {
  clock: { h: number; m: number; s: number };
  goalMinutes: number;
  topics: string[];
};

const pad = (n: number) => String(n).padStart(2, "0");

export default function StatsPanel({ clock, goalMinutes, topics }: Props) {
  // Relaxing countdown: the session budget (e.g. 3h) drains toward zero.
  // Per browser session only — closing the browser resets it; nothing
  // carries over from earlier sessions.
  const elapsedSeconds = clock.h * 3600 + clock.m * 60 + clock.s;
  const remaining = Math.max(0, goalMinutes * 60 - elapsedSeconds);
  const rh = Math.floor(remaining / 3600);
  const rm = Math.floor((remaining % 3600) / 60);
  const rs = remaining % 60;
  const pctLeft =
    goalMinutes > 0 ? (remaining / (goalMinutes * 60)) * 100 : 100;
  const done = remaining === 0;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-semibold text-ink">Today</h2>

      {/* Old-school clock + the session countdown */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-4">
          <AnalogClock size={104} />
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-faint">
              Session time left
            </div>
            <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">
              {done ? (
                <span className="text-warm">break time ✦</span>
              ) : (
                <>
                  {rh > 0 && `${rh}:`}
                  {pad(rm)}
                  <span className="text-subtle">:{pad(rs)}</span>
                </>
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-faint">
              {done
                ? "you've used this session's budget"
                : "resets when you close the browser"}
            </div>
          </div>
        </div>

        {/* Draining session bar */}
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-elevated">
          <m.div
            className={`h-full rounded-full ${done ? "bg-warm" : "bg-hero"}`}
            animate={{ width: `${pctLeft}%` }}
            transition={{ type: "spring", stiffness: 60, damping: 18 }}
          />
        </div>
      </div>

      {/* Top topics */}
      <div className="glass-card p-5">
        <div className="text-xs uppercase tracking-wider text-faint">
          Your topics
        </div>
        {topics.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {topics.map((t) => (
              <span
                key={t}
                className="rounded-full border border-hairline bg-elevated px-3 py-1 text-xs capitalize text-subtle"
              >
                {t}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-faint">
            Browse around — Aura learns as you go.
          </p>
        )}
      </div>
    </div>
  );
}
