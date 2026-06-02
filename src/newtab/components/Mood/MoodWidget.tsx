import type { Mood } from "../../../types";

export const MOODS: { value: Exclude<Mood, null>; emoji: string; label: string }[] =
  [
    { value: "tired", emoji: "😴", label: "Tired" },
    { value: "good", emoji: "🙂", label: "Good" },
    { value: "stressed", emoji: "😣", label: "Stressed" },
    { value: "hyped", emoji: "🤩", label: "Hyped" },
    { value: "low", emoji: "😔", label: "Low" },
  ];

type Props = {
  mood: Mood;
  onSelect: (mood: Mood) => void;
  reshuffling?: boolean;
};

export default function MoodWidget({ mood, onSelect, reshuffling }: Props) {
  return (
    <div className="rounded-2xl border border-hairline bg-glass p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-faint">
          How are you feeling?
        </span>
        {reshuffling && (
          <span className="text-xs text-primary animate-pulse">
            reshuffling feed…
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {MOODS.map((m) => {
          const active = mood === m.value;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => onSelect(active ? null : m.value)}
              title={m.label}
              className={`group flex flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-2.5 transition-all duration-200 ${
                active
                  ? "border-primary bg-primary/15 scale-105"
                  : "border-transparent hover:border-hairline hover:bg-elevated"
              }`}
            >
              <span className="text-2xl transition-transform duration-200 group-hover:scale-110">
                {m.emoji}
              </span>
              <span
                className={`text-[11px] font-medium ${
                  active ? "text-ink" : "text-faint"
                }`}
              >
                {m.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
