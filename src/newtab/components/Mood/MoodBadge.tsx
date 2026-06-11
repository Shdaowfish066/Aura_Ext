import type { Mood } from "../../../types";
import { MOOD_THEME } from "./moodTheme";

/** Small current-mood indicator for the header. Takes on the mood's identity
 *  (gradient fill + colored glow) when a mood is set. */
export default function MoodBadge({ mood }: { mood: Mood }) {
  if (!mood) return null;
  const t = MOOD_THEME[mood];
  return (
    <span
      className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border px-3 py-1 text-xs font-medium backdrop-blur transition-all duration-500"
      style={{
        borderColor: `${t.color}4d`,
        color: t.color,
        boxShadow: `0 0 14px ${t.color}33`,
      }}
    >
      {/* Low-opacity gradient fill behind the label */}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{ background: t.gradient, opacity: 0.14 }}
      />
      <span className="relative text-sm">{t.emoji}</span>
      <span className="relative">{t.label}</span>
    </span>
  );
}
