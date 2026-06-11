import { useState } from "react";
import { m } from "framer-motion";
import type { TrackedTab } from "../../../types";

type Props = {
  tab: TrackedTab;
  onSnooze: (tabId: number) => void;
  onShield: (host: string) => void;
};

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function idleLabel(tab: TrackedTab): string {
  if (tab.active) return "active now";
  const mins = Math.floor((Date.now() - tab.lastActiveAt) / 60_000);
  if (mins < 1) return "idle <1m";
  if (mins < 60) return `idle ${mins}m`;
  return `idle ${Math.floor(mins / 60)}h`;
}

/** One row of the resource manager tab list, with hover actions. */
export default function TabRow({ tab, onSnooze, onShield }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const host = hostnameOf(tab.url);
  const snoozable =
    !tab.active && !tab.pinned && !tab.audible && !tab.discarded;

  return (
    <m.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="group overflow-hidden"
    >
      <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-elevated/60">
        {/* Favicon (with fallback dot) */}
        {tab.favIconUrl && !imgFailed ? (
          <img
            src={tab.favIconUrl}
            alt=""
            className="h-4 w-4 shrink-0 rounded-sm"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="h-2 w-2 shrink-0 rounded-full bg-subtle" />
        )}

        {/* Title + idle label */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs text-ink" title={tab.title}>
            {tab.title}
          </div>
          <div className="text-[10px] text-faint">{idleLabel(tab)}</div>
        </div>

        {/* State badges */}
        <div className="flex shrink-0 items-center gap-1 text-[10px]">
          {tab.active && <span title="Active">🟢</span>}
          {tab.audible && <span title="Playing audio">🔊</span>}
          {tab.pinned && <span title="Pinned">📌</span>}
          {tab.discarded && (
            <span className="animate-glow-pulse rounded-full border border-hairline bg-elevated px-1.5 py-0.5 text-[9px] tracking-wider text-subtle">
              zzz
            </span>
          )}
          {tab.whitelisted && <span title="Whitelisted">🛡</span>}
        </div>

        {/* Hover actions */}
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            title={snoozable ? "Snooze now" : "Can't snooze this tab"}
            disabled={!snoozable}
            onClick={() => onSnooze(tab.id)}
            className="rounded-md border border-hairline bg-elevated px-1.5 py-0.5 text-[10px] text-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
          >
            🌙
          </button>
          {!tab.whitelisted && host && (
            <button
              type="button"
              title={`Never snooze ${host}`}
              onClick={() => onShield(host)}
              className="rounded-md border border-hairline bg-elevated px-1.5 py-0.5 text-[10px] text-subtle hover:text-ink"
            >
              🛡
            </button>
          )}
        </div>
      </div>
    </m.div>
  );
}
