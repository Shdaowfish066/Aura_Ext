// Theme registry. Each theme is a data object that maps to the CSS custom
// properties declared in index.css. `applyTheme` writes the variables inline
// on <html> (single source of truth — no per-theme CSS blocks to keep in
// sync) and sets data-theme for any theme-scoped CSS selectors.

import type { ThemeId } from "../../types";

export type BackdropKind =
  | "aurora" // soft drifting blobs (Aura default)
  | "web" // Spider-Man: faint web lines + red/blue blobs
  | "gotham" // Batman: low fog blobs + bat-signal glow
  | "sakura" // Anime: falling petals + pink/cyan blobs
  | "swirl" // Naruto: leaf-swirl accents + orange blobs
  | "skyrays" // Superman: light rays from above + navy/red blobs
  | "daylight"; // light theme: soft pastel blobs

export type Theme = {
  id: ThemeId;
  name: string;
  tagline: string;
  /** False for light themes — components can adapt contrast. */
  dark: boolean;
  /** CSS custom property name -> value. Applied inline on <html>. */
  vars: Record<string, string>;
  background: {
    kind: BackdropKind;
    /** Tints for the three drifting backdrop blobs. */
    blobColors: [string, string, string];
  };
  /** Swatch colors for theme picker previews. */
  preview: [string, string, string];
};

const base = {
  "--mood-tint": "transparent",
};

export const THEMES: Record<ThemeId, Theme> = {
  aura: {
    id: "aura",
    name: "Aura",
    tagline: "The original calm",
    dark: true,
    vars: {
      ...base,
      "--bg-base": "#0d0f1a",
      "--bg-surface": "#151929",
      "--bg-elevated": "#1e2235",
      "--accent-primary": "#6366f1",
      "--accent-secondary": "#a78bfa",
      "--accent-warm": "#f59e0b",
      "--text-primary": "#f1f5f9",
      "--text-secondary": "#94a3b8",
      "--text-muted": "#475569",
      "--border": "rgba(255, 255, 255, 0.06)",
      "--glass": "rgba(255, 255, 255, 0.04)",
      "--gradient-hero":
        "linear-gradient(120deg, #818cf8, #c4b5fd, #fbbf24, #818cf8)",
      "--glow": "rgba(99, 102, 241, 0.35)",
    },
    background: {
      kind: "aurora",
      blobColors: [
        "rgba(99, 102, 241, 0.25)",
        "rgba(245, 158, 11, 0.15)",
        "rgba(167, 139, 250, 0.18)",
      ],
    },
    preview: ["#6366f1", "#a78bfa", "#f59e0b"],
  },

  spiderman: {
    id: "spiderman",
    name: "Web-Slinger",
    tagline: "With great tabs comes great responsibility",
    dark: true,
    vars: {
      ...base,
      "--bg-base": "#160a12",
      "--bg-surface": "#221019",
      "--bg-elevated": "#311722",
      "--accent-primary": "#e23636",
      "--accent-secondary": "#3b82f6",
      "--accent-warm": "#ff8c42",
      "--text-primary": "#fdf2f4",
      "--text-secondary": "#c4a3ab",
      "--text-muted": "#6d5158",
      "--border": "rgba(255, 235, 238, 0.07)",
      "--glass": "rgba(255, 235, 238, 0.04)",
      "--gradient-hero":
        "linear-gradient(120deg, #f87171, #60a5fa, #e23636, #f87171)",
      "--glow": "rgba(226, 54, 54, 0.4)",
    },
    background: {
      kind: "web",
      blobColors: [
        "rgba(226, 54, 54, 0.22)",
        "rgba(59, 130, 246, 0.18)",
        "rgba(255, 140, 66, 0.12)",
      ],
    },
    preview: ["#e23636", "#3b82f6", "#160a12"],
  },

  batman: {
    id: "batman",
    name: "Dark Knight",
    tagline: "It's not who you are underneath",
    dark: true,
    vars: {
      ...base,
      "--bg-base": "#07080c",
      "--bg-surface": "#0e1118",
      "--bg-elevated": "#161b26",
      "--accent-primary": "#f5c518",
      "--accent-secondary": "#64748b",
      "--accent-warm": "#e6a817",
      "--text-primary": "#eef1f6",
      "--text-secondary": "#8e99ab",
      "--text-muted": "#4a5568",
      "--border": "rgba(245, 197, 24, 0.08)",
      "--glass": "rgba(255, 255, 255, 0.03)",
      "--gradient-hero":
        "linear-gradient(120deg, #f5c518, #94a3b8, #fde047, #f5c518)",
      "--glow": "rgba(245, 197, 24, 0.3)",
    },
    background: {
      kind: "gotham",
      blobColors: [
        "rgba(245, 197, 24, 0.10)",
        "rgba(71, 85, 105, 0.20)",
        "rgba(30, 41, 59, 0.45)",
      ],
    },
    preview: ["#f5c518", "#1e293b", "#07080c"],
  },

  anime: {
    id: "anime",
    name: "Sakura",
    tagline: "Cherry blossoms in the terminal glow",
    dark: true,
    vars: {
      ...base,
      "--bg-base": "#171022",
      "--bg-surface": "#231733",
      "--bg-elevated": "#322146",
      "--accent-primary": "#f472b6",
      "--accent-secondary": "#22d3ee",
      "--accent-warm": "#fbbf24",
      "--text-primary": "#fdf4ff",
      "--text-secondary": "#b8a3c9",
      "--text-muted": "#64536e",
      "--border": "rgba(244, 114, 182, 0.09)",
      "--glass": "rgba(253, 244, 255, 0.04)",
      "--gradient-hero":
        "linear-gradient(120deg, #f9a8d4, #67e8f9, #c4b5fd, #f9a8d4)",
      "--glow": "rgba(244, 114, 182, 0.35)",
    },
    background: {
      kind: "sakura",
      blobColors: [
        "rgba(244, 114, 182, 0.20)",
        "rgba(34, 211, 238, 0.14)",
        "rgba(196, 181, 253, 0.16)",
      ],
    },
    preview: ["#f472b6", "#22d3ee", "#171022"],
  },

  naruto: {
    id: "naruto",
    name: "Hidden Leaf",
    tagline: "Believe it!",
    dark: true,
    vars: {
      ...base,
      "--bg-base": "#1a120b",
      "--bg-surface": "#261a10",
      "--bg-elevated": "#362416",
      "--accent-primary": "#fb923c",
      "--accent-secondary": "#84cc16",
      "--accent-warm": "#facc15",
      "--text-primary": "#fefaf4",
      "--text-secondary": "#c2ab94",
      "--text-muted": "#6e5c48",
      "--border": "rgba(251, 146, 60, 0.09)",
      "--glass": "rgba(254, 250, 244, 0.04)",
      "--gradient-hero":
        "linear-gradient(120deg, #fdba74, #facc15, #a3e635, #fdba74)",
      "--glow": "rgba(251, 146, 60, 0.35)",
    },
    background: {
      kind: "swirl",
      blobColors: [
        "rgba(251, 146, 60, 0.22)",
        "rgba(132, 204, 22, 0.12)",
        "rgba(250, 204, 21, 0.14)",
      ],
    },
    preview: ["#fb923c", "#84cc16", "#1a120b"],
  },

  superman: {
    id: "superman",
    name: "Man of Steel",
    tagline: "Up, up and away",
    dark: true,
    vars: {
      ...base,
      "--bg-base": "#0a1228",
      "--bg-surface": "#11203f",
      "--bg-elevated": "#182b52",
      "--accent-primary": "#dc2626",
      "--accent-secondary": "#3b82f6",
      "--accent-warm": "#fbbf24",
      "--text-primary": "#f0f6ff",
      "--text-secondary": "#94a8c8",
      "--text-muted": "#4a5d80",
      "--border": "rgba(147, 197, 253, 0.09)",
      "--glass": "rgba(240, 246, 255, 0.04)",
      "--gradient-hero":
        "linear-gradient(120deg, #f87171, #fbbf24, #60a5fa, #f87171)",
      "--glow": "rgba(59, 130, 246, 0.4)",
    },
    background: {
      kind: "skyrays",
      blobColors: [
        "rgba(220, 38, 38, 0.16)",
        "rgba(59, 130, 246, 0.22)",
        "rgba(251, 191, 36, 0.12)",
      ],
    },
    preview: ["#dc2626", "#3b82f6", "#fbbf24"],
  },

  daylight: {
    id: "daylight",
    name: "Daylight",
    tagline: "Soft light, clear mind",
    dark: false,
    vars: {
      ...base,
      "--bg-base": "#faf7f2",
      "--bg-surface": "#ffffff",
      "--bg-elevated": "#f1ede6",
      "--accent-primary": "#6366f1",
      "--accent-secondary": "#ec4899",
      "--accent-warm": "#f59e0b",
      "--text-primary": "#1e293b",
      "--text-secondary": "#64748b",
      "--text-muted": "#94a3b8",
      "--border": "rgba(15, 23, 42, 0.08)",
      "--glass": "rgba(255, 255, 255, 0.6)",
      "--gradient-hero":
        "linear-gradient(120deg, #6366f1, #ec4899, #f59e0b, #6366f1)",
      "--glow": "rgba(99, 102, 241, 0.25)",
    },
    background: {
      kind: "daylight",
      blobColors: [
        "rgba(99, 102, 241, 0.12)",
        "rgba(236, 72, 153, 0.10)",
        "rgba(245, 158, 11, 0.10)",
      ],
    },
    preview: ["#faf7f2", "#6366f1", "#ec4899"],
  },
};

export const THEME_LIST: Theme[] = Object.values(THEMES);

export const DEFAULT_THEME_ID: ThemeId = "aura";

/** Apply a theme's variables inline on <html> and tag it for CSS selectors. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  for (const [name, value] of Object.entries(theme.vars)) {
    root.style.setProperty(name, value);
  }
}

/** Set the full-screen mood ambiance tint (any CSS color, or "transparent"). */
export function setMoodTint(color: string): void {
  document.documentElement.style.setProperty("--mood-tint", color);
}

// --- Gradient art (hover-reveal backgrounds) -------------------------------
// Generates a rich layered radial-gradient "mesh" per theme from its accent
// colors. Used by the theme gallery + navbar hover-reveal — no image assets.

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** A full-screen CSS background string — a soft multi-blob mesh for a theme. */
export function gradientArt(theme: Theme): string {
  const p = theme.vars["--accent-primary"];
  const s = theme.vars["--accent-secondary"];
  const w = theme.vars["--accent-warm"];
  const b = theme.vars["--bg-base"];
  const b2 = theme.vars["--bg-surface"];
  const a = theme.dark ? 1 : 0.55; // lighter pops on light themes
  return [
    `radial-gradient(60% 80% at 14% 18%, ${hexToRgba(p, 0.55 * a)}, transparent 60%)`,
    `radial-gradient(55% 70% at 86% 12%, ${hexToRgba(s, 0.5 * a)}, transparent 55%)`,
    `radial-gradient(75% 95% at 78% 88%, ${hexToRgba(w, 0.42 * a)}, transparent 62%)`,
    `radial-gradient(55% 65% at 30% 92%, ${hexToRgba(s, 0.4 * a)}, transparent 58%)`,
    `radial-gradient(45% 55% at 50% 50%, ${hexToRgba(p, 0.18 * a)}, transparent 70%)`,
    `linear-gradient(135deg, ${b}, ${b2})`,
  ].join(", ");
}
