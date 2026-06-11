import { useSystemStats } from "../../hooks/useSystemStats";

function iconUrl(name: string): string {
  return typeof chrome !== "undefined" && chrome.runtime?.getURL
    ? chrome.runtime.getURL(`system/${name}`)
    : `/system/${name}`;
}

function Row({
  icon,
  label,
  value,
  sub,
  invertIcon = false,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  invertIcon?: boolean;
}) {
  return (
    <div className="flex items-center gap-3.5">
      <img
        src={iconUrl(icon)}
        alt=""
        draggable={false}
        className={`h-11 w-11 shrink-0 object-contain ${
          invertIcon ? "invert opacity-80 [[data-theme=daylight]_&]:invert-0" : ""
        }`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-subtle">
            {label}
          </span>
          <span className="font-display text-xl font-semibold tabular-nums text-ink">
            {value}
          </span>
        </div>
        {sub && (
          <div className="mt-0.5 truncate text-[10px] text-faint" title={sub}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Live machine monitor — calm by design: icon, label, number. No bars or
 * graphs (user preference: too flashy). CPU + RAM refresh every 2s via
 * chrome.system.*; GPU shows the model (live GPU usage isn't exposed to
 * extensions).
 */
export default function SystemMonitor() {
  const s = useSystemStats();

  return (
    <div className="glass-card flex h-full flex-col gap-6 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-subtle">
          System
        </h2>
        <span
          className="h-1.5 w-1.5 rounded-full bg-primary animate-glow-pulse"
          title="Live — refreshes every 2s"
        />
      </div>

      <Row
        icon="cpu.png"
        label="CPU"
        value={s.cpuPercent === null ? "…" : `${Math.round(s.cpuPercent)}%`}
        sub={
          s.cpuModel
            ? `${s.cpuModel} · ${s.cpuCores} threads`
            : `${s.cpuCores} threads`
        }
      />

      <Row
        icon="ram.png"
        label="RAM"
        value={s.ramPercent === null ? "…" : `${Math.round(s.ramPercent)}%`}
        sub={
          s.ramTotalGB
            ? `${s.ramUsedGB.toFixed(1)} / ${s.ramTotalGB.toFixed(0)} GB in use`
            : undefined
        }
        invertIcon
      />

      <Row icon="gpu.png" label="GPU" value="" sub={s.gpuModel ?? "not detected"} />

      <div className="mt-auto border-t border-hairline pt-3 text-[10px] leading-relaxed text-faint">
        Tab snoozing returns here in a future update.
      </div>
    </div>
  );
}
