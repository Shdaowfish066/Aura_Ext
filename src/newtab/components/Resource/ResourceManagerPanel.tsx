import { m, AnimatePresence } from "framer-motion";
import { useResourceManager } from "../../hooks/useResourceManager";
import Toggle from "./Toggle";
import TabRow from "./TabRow";

const IDLE_OPTIONS = [5, 10, 20, 30];

const toGB = (mb: number) => (mb / 1024).toFixed(1);

/** Self-contained Browser Resource Manager panel (tab snoozer). */
export default function ResourceManagerPanel() {
  const {
    tabs,
    settings,
    stats,
    memory,
    ready,
    toggleEnabled,
    setIdleMinutes,
    discardTab,
    whitelistHost,
    removeFromWhitelist,
  } = useResourceManager();

  const usedMB = memory ? memory.totalMB - memory.availableMB : 0;
  const usedPct = memory && memory.totalMB > 0 ? (usedMB / memory.totalMB) * 100 : 0;
  const statsLine = `~${stats.estimatedMBSaved} MB freed · ${stats.totalDiscarded} tabs snoozed`;

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-hairline bg-glass p-4 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-wider text-faint">
          Resource Manager
        </h2>
        <Toggle on={settings.enabled} onToggle={toggleEnabled} label="Auto-snooze" />
      </div>

      {/* Stats chip + RAM bar */}
      <div className="mt-3 flex flex-col gap-2">
        <AnimatePresence mode="popLayout" initial={false}>
          <m.span
            key={statsLine}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="self-start rounded-full border border-hairline bg-elevated px-3 py-1 text-[11px] tabular-nums text-subtle"
          >
            {statsLine}
          </m.span>
        </AnimatePresence>

        {memory && (
          <div>
            <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
              <m.div
                className="h-full rounded-full bg-hero"
                animate={{ width: `${usedPct}%` }}
                transition={{ type: "spring", stiffness: 80, damping: 20 }}
              />
            </div>
            <div className="mt-1 text-[10px] tabular-nums text-faint">
              {toGB(usedMB)} / {toGB(memory.totalMB)} GB
            </div>
          </div>
        )}
      </div>

      {/* Idle threshold segments */}
      <div className="mt-3 flex items-center gap-1">
        <span className="mr-1 text-[10px] text-faint">Snooze after</span>
        {IDLE_OPTIONS.map((min) => {
          const active = settings.idleMinutes === min;
          return (
            <button
              key={min}
              type="button"
              onClick={() => setIdleMinutes(min)}
              className={`relative rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                active ? "text-white" : "text-subtle hover:text-ink"
              }`}
            >
              {active && (
                <m.span
                  layoutId="aura-rm-idle-pill"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative tabular-nums">{min}m</span>
            </button>
          );
        })}
      </div>

      {!settings.enabled && (
        <p className="mt-2 text-[11px] text-faint">Auto-snooze is off</p>
      )}

      {/* Tab list */}
      <div
        className={`mt-3 min-h-0 flex-1 overflow-y-auto transition-opacity duration-300 ${
          settings.enabled ? "" : "opacity-40"
        }`}
      >
        {ready && tabs.length === 0 ? (
          <p className="mt-2 text-xs text-faint">No snoozable tabs open.</p>
        ) : (
          <AnimatePresence initial={false}>
            {tabs.map((tab) => (
              <TabRow
                key={tab.id}
                tab={tab}
                onSnooze={(id) => void discardTab(id)}
                onShield={whitelistHost}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Whitelist chips */}
      {settings.whitelist.length > 0 && (
        <div className="mt-3 border-t border-hairline pt-2">
          <div className="text-[10px] uppercase tracking-wider text-faint">
            Never snoozed
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <AnimatePresence initial={false}>
              {settings.whitelist.map((host) => (
                <m.span
                  key={host}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  className="flex items-center gap-1 rounded-full border border-hairline bg-elevated px-2 py-0.5 text-[10px] text-subtle"
                >
                  🛡 {host}
                  <button
                    type="button"
                    aria-label={`Remove ${host} from whitelist`}
                    onClick={() => removeFromWhitelist(host)}
                    className="ml-0.5 text-faint hover:text-warm"
                  >
                    ×
                  </button>
                </m.span>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
