import { m, type Variants } from "framer-motion";
import type { ThemeId } from "../../../types";
import { THEMES } from "../../themes";

// Three featured themes get numbered quick-pick slots in the navbar; the full
// set lives in the gallery.
const FEATURED: ThemeId[] = ["spiderman", "batman", "anime"];

const navStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

// translateY(20px) -> 0, opacity 0 -> 1 — the reference stagger reveal.
const navItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

function AuraMark() {
  return (
    <span className="flex items-center gap-2 select-none">
      <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden>
        <circle
          cx="16"
          cy="16"
          r="13"
          stroke="var(--accent-primary)"
          strokeWidth="2"
          opacity="0.9"
        />
        <circle
          cx="16"
          cy="16"
          r="7"
          stroke="var(--accent-warm)"
          strokeWidth="2"
          opacity="0.85"
        />
        <circle cx="16" cy="16" r="2.4" fill="var(--accent-secondary)" />
      </svg>
      <span className="font-display text-sm font-semibold uppercase tracking-[0.35em] text-ink">
        Aura
      </span>
    </span>
  );
}

type Props = {
  currentThemeId: ThemeId;
  onPickTheme: (id: ThemeId) => void;
  onHoverTheme: (id: ThemeId | null) => void;
  onOpenGallery: () => void;
};

export default function TopNav({
  currentThemeId,
  onPickTheme,
  onHoverTheme,
  onOpenGallery,
}: Props) {
  return (
    <m.nav
      variants={navStagger}
      initial="hidden"
      animate="show"
      className="grid grid-cols-3 items-center"
      onMouseLeave={() => onHoverTheme(null)}
    >
      {/* Left — numbered featured-theme quick picks (hover-reveals their art) */}
      <div className="flex items-center gap-5">
        {FEATURED.map((id, i) => {
          const active = currentThemeId === id;
          return (
            <m.button
              key={id}
              variants={navItem}
              type="button"
              onMouseEnter={() => onHoverTheme(id)}
              onFocus={() => onHoverTheme(id)}
              onClick={() => onPickTheme(id)}
              className="group flex items-center gap-2 text-left"
              title={`Switch to ${THEMES[id].name}`}
            >
              <span className="font-display text-[11px] tabular-nums text-faint transition-colors group-hover:text-primary">
                0{i + 1}
              </span>
              <span
                className={`text-xs font-medium tracking-wide transition-colors ${
                  active
                    ? "text-ink"
                    : "text-subtle group-hover:text-ink"
                }`}
              >
                {THEMES[id].name}
                <span className="mt-0.5 block h-px w-0 bg-primary transition-all duration-300 group-hover:w-full" />
              </span>
            </m.button>
          );
        })}
      </div>

      {/* Center — logo */}
      <m.div variants={navItem} className="flex justify-center">
        <AuraMark />
      </m.div>

      {/* Right — gallery entry + current theme */}
      <m.div
        variants={navItem}
        className="flex items-center justify-end gap-4"
      >
        <span className="hidden text-[11px] uppercase tracking-wider text-faint sm:inline">
          {THEMES[currentThemeId].name}
        </span>
        <button
          type="button"
          onClick={onOpenGallery}
          onMouseEnter={() => onHoverTheme(currentThemeId)}
          className="group flex items-center gap-1.5 rounded-full border border-hairline px-3.5 py-1.5 text-xs font-medium text-subtle transition-all hover:border-primary/50 hover:text-ink hover:shadow-glow"
        >
          Gallery
          <span className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </button>
      </m.div>
    </m.nav>
  );
}
