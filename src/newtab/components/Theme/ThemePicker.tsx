import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { useTheme } from "../../hooks/useTheme";
import type { Theme } from "../../themes";

function swatchGradient(theme: Theme): string {
  const [a, b, c] = theme.preview;
  return `conic-gradient(from 210deg, ${a} 0deg 120deg, ${b} 120deg 240deg, ${c} 240deg 360deg)`;
}

/**
 * Compact header control for switching themes. A gradient dot button opens a
 * popover listing every theme; the active ring springs between rows via a
 * shared layoutId. Self-contained — reads and writes theme state itself.
 */
export default function ThemePicker() {
  const { themeId, theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Change theme (current: ${theme.name})`}
        aria-expanded={open}
        title="Change theme"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-glass backdrop-blur transition-all hover:border-primary/50 hover:shadow-glow"
      >
        <span
          className="h-4 w-4 rounded-full"
          style={{ background: swatchGradient(theme) }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, scale: 0.92, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-hairline bg-surface/95 p-2 shadow-2xl backdrop-blur-xl"
          >
            <div className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
              Theme
            </div>
            {themes.map((t) => {
              const active = t.id === themeId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    void setTheme(t.id);
                    setOpen(false);
                  }}
                  className="relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-elevated"
                >
                  {active && (
                    <m.span
                      layoutId="theme-ring"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      className="absolute inset-0 rounded-xl ring-2 ring-primary/60"
                    />
                  )}
                  <span
                    className="h-6 w-6 shrink-0 rounded-full border border-white/10"
                    style={{ background: swatchGradient(t) }}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">
                      {t.name}
                    </span>
                    <span className="block truncate text-[11px] text-faint">
                      {t.tagline}
                    </span>
                  </span>
                </button>
              );
            })}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
