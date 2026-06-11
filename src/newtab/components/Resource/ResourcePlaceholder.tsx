import { m } from "framer-motion";

/**
 * Placeholder while the Resource Manager is being rethought. The full
 * implementation (ResourceManagerPanel + useResourceManager + the service
 * worker sweep) stays in this folder, just unwired; auto-snooze defaults off.
 */
export default function ResourcePlaceholder() {
  return (
    <div className="glass-card flex h-full min-h-[280px] flex-col items-center justify-center gap-4 p-6 text-center">
      <m.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="flex h-16 w-16 items-center justify-center rounded-3xl border border-hairline bg-glass text-3xl shadow-glow"
        aria-hidden
      >
        🧪
      </m.div>
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">
          Resource Manager
        </h2>
        <p className="mt-1.5 max-w-[220px] text-xs leading-relaxed text-subtle">
          Being rebuilt into something smarter. Tab snoozing will come back
          here soon.
        </p>
      </div>
      <span className="rounded-full border border-hairline px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-faint">
        coming soon
      </span>
    </div>
  );
}
