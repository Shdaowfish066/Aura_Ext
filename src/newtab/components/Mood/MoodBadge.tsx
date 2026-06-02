import type { Mood } from "../../../types";
import { MOODS } from "./MoodWidget";

/** Small current-mood indicator for the header. */
export default function MoodBadge({ mood }: { mood: Mood }) {
  const m = MOODS.find((x) => x.value === mood);
  if (!m) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-glass px-3 py-1 text-xs font-medium text-subtle backdrop-blur">
      <span className="text-sm">{m.emoji}</span>
      {m.label}
    </span>
  );
}
