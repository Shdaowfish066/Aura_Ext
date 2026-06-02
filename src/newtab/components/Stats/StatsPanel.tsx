type Props = {
  clock: { h: number; m: number; s: number };
  minutesElapsed: number;
  goalMinutes: number;
  topics: string[];
};

const pad = (n: number) => String(n).padStart(2, "0");

export default function StatsPanel({
  clock,
  minutesElapsed,
  goalMinutes,
  topics,
}: Props) {
  const pct =
    goalMinutes > 0 ? Math.min(100, (minutesElapsed / goalMinutes) * 100) : 0;
  const over = minutesElapsed > goalMinutes && goalMinutes > 0;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-semibold text-ink">Today</h2>

      {/* Session clock */}
      <div className="rounded-2xl border border-hairline bg-glass p-5 backdrop-blur-xl">
        <div className="text-xs uppercase tracking-wider text-faint">
          Session time
        </div>
        <div className="mt-1 font-display text-3xl font-semibold tabular-nums text-ink">
          {clock.h > 0 && `${clock.h}:`}
          {pad(clock.m)}
          <span className="text-subtle">:{pad(clock.s)}</span>
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] text-faint">
          <span>Daily goal</span>
          <span className={over ? "text-warm" : ""}>
            {minutesElapsed}/{goalMinutes} min
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-elevated">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ${
              over ? "bg-warm" : "bg-primary"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Top topics */}
      <div className="rounded-2xl border border-hairline bg-glass p-5 backdrop-blur-xl">
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
