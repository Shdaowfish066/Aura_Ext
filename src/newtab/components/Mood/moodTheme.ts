// Shared mood identity — single source of truth for mood colors used by
// MoodWidget, MoodBadge, MoodHistory and the full-screen mood tint.

import type { Mood } from "../../../types";

export type MoodKey = Exclude<Mood, null>;

export type MoodTheme = {
  label: string;
  emoji: string;
  /** Primary accent color for text/dots/borders. */
  color: string;
  /** Pill / badge fill gradient. */
  gradient: string;
  /** Low-opacity full-screen ambiance tint (passed to setMoodTint). */
  tint: string;
};

export const MOOD_THEME: Record<MoodKey, MoodTheme> = {
  tired: {
    label: "Tired",
    emoji: "😴",
    color: "#a78bfa",
    gradient: "linear-gradient(135deg,#a78bfa,#7c3aed)",
    tint: "rgba(167,139,250,0.10)",
  },
  good: {
    label: "Good",
    emoji: "🙂",
    color: "#34d399",
    gradient: "linear-gradient(135deg,#34d399,#059669)",
    tint: "rgba(52,211,153,0.10)",
  },
  stressed: {
    label: "Stressed",
    emoji: "😣",
    color: "#fb7185",
    gradient: "linear-gradient(135deg,#fb7185,#e11d48)",
    tint: "rgba(251,113,133,0.10)",
  },
  hyped: {
    label: "Hyped",
    emoji: "🤩",
    color: "#fbbf24",
    gradient: "linear-gradient(135deg,#fbbf24,#f59e0b)",
    tint: "rgba(251,191,36,0.10)",
  },
  low: {
    label: "Low",
    emoji: "😔",
    color: "#60a5fa",
    gradient: "linear-gradient(135deg,#60a5fa,#2563eb)",
    tint: "rgba(96,165,250,0.10)",
  },
};

/** Ordered list for rendering the mood picker. */
export const MOOD_KEYS: MoodKey[] = ["tired", "good", "stressed", "hyped", "low"];
