import { m } from "framer-motion";

type Props = {
  on: boolean;
  onToggle: () => void;
  label?: string;
};

/** Animated master switch — gradient track when on, spring-sliding knob. */
export default function Toggle({ on, onToggle, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label ?? "Toggle"}
      onClick={onToggle}
      className={`relative h-5 w-9 shrink-0 rounded-full border border-hairline transition-colors duration-300 ${
        on ? "bg-hero shadow-glow" : "bg-elevated"
      }`}
    >
      {/* framer-motion owns the transform, so center via `top`, not translate */}
      <m.div
        className="absolute left-0 top-[2px] h-3.5 w-3.5 rounded-full bg-ink"
        animate={{ x: on ? 18 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}
