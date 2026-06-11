import { useEffect, useState } from "react";
import { m, AnimatePresence, type Variants } from "framer-motion";
import type { ThemeId } from "../../../types";
import { THEME_LIST, THEMES, gradientArt } from "../../themes";

const listStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};

const rowVariant: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

/**
 * Full-screen cinematic theme picker. Numbered links 01–07; hovering a theme
 * crossfades the whole background to that theme's gradient art (the original
 * "image hover reveal", rendered as generated gradient art). Clicking applies
 * the theme and closes.
 */
export default function ThemeGallery({
  open,
  currentThemeId,
  onPick,
  onClose,
}: {
  open: boolean;
  currentThemeId: ThemeId;
  onPick: (id: ThemeId) => void;
  onClose: () => void;
}) {
  const [hovered, setHovered] = useState<ThemeId | null>(null);
  const reveal = (hovered ?? currentThemeId) as ThemeId;

  // Reset the hover preview only when the gallery opens — NOT in the effect
  // below: `onClose` is typically an inline prop whose identity changes on
  // every parent render (the dashboard re-renders each clock tick), and a
  // combined effect would wipe the hover state mid-interaction.
  useEffect(() => {
    if (open) setHovered(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 overflow-hidden"
        >
          {/* Crossfading gradient-art background */}
          <div className="absolute inset-0 bg-base">
            <AnimatePresence>
              <m.div
                key={reveal}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="absolute inset-0"
                style={{ background: gradientArt(THEMES[reveal]) }}
              />
            </AnimatePresence>
          </div>
          <div className="absolute inset-0 bg-base/30 backdrop-blur-[2px]" />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between p-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-subtle">
                Pick your vibe
              </p>
              <h2 className="gradient-hero-text font-display text-2xl font-semibold">
                Theme Gallery
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close gallery"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline text-lg text-subtle transition-all hover:border-primary/50 hover:text-ink"
            >
              ✕
            </button>
          </div>

          {/* Numbered theme list */}
          <m.ul
            variants={listStagger}
            initial="hidden"
            animate="show"
            className="relative z-10 flex flex-col gap-1 px-8 pb-10"
          >
            {THEME_LIST.map((t, i) => {
              const active = currentThemeId === t.id;
              return (
                <m.li key={t.id} variants={rowVariant}>
                  <button
                    type="button"
                    onMouseEnter={() => setHovered(t.id)}
                    onFocus={() => setHovered(t.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => {
                      onPick(t.id);
                      onClose();
                    }}
                    className="group flex w-full items-baseline gap-5 border-b border-hairline/60 py-3.5 text-left transition-colors"
                  >
                    <span className="font-display text-sm tabular-nums text-faint transition-colors group-hover:text-primary">
                      0{i + 1}
                    </span>
                    <span className="flex flex-1 items-baseline gap-3">
                      <span
                        className={`font-display text-3xl font-semibold tracking-tight transition-all duration-300 group-hover:translate-x-2 sm:text-4xl ${
                          active ? "text-ink" : "text-subtle group-hover:text-ink"
                        }`}
                      >
                        {t.name}
                      </span>
                      <span className="hidden text-xs text-faint transition-opacity group-hover:text-subtle md:inline">
                        {t.tagline}
                      </span>
                    </span>
                    {/* preview swatch */}
                    <span
                      className="h-5 w-12 shrink-0 rounded-full ring-1 ring-white/10 transition-transform group-hover:scale-110"
                      style={{
                        background: `linear-gradient(90deg, ${t.preview[0]}, ${t.preview[1]}, ${t.preview[2]})`,
                      }}
                    />
                    {active && (
                      <span className="text-[10px] uppercase tracking-wider text-primary">
                        active
                      </span>
                    )}
                  </button>
                </m.li>
              );
            })}
          </m.ul>
        </m.div>
      )}
    </AnimatePresence>
  );
}
