import { m, AnimatePresence } from "framer-motion";
import type { ThemeId } from "../../../types";
import { THEMES, gradientArt } from "../../themes";

/**
 * Full-screen crossfading gradient-art layer. Renders the art for `themeId`
 * and smoothly crossfades whenever it changes; `null` fades to nothing. Used
 * for the navbar hover-reveal (the original "image hover swap", but as
 * generated gradient art — no assets).
 */
export default function GradientArt({
  themeId,
  visible = true,
  opacity = 0.7,
  className = "",
}: {
  themeId: ThemeId | null;
  visible?: boolean;
  opacity?: number;
  className?: string;
}) {
  const show = visible && themeId !== null;
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      <AnimatePresence>
        {show && (
          <m.div
            key={themeId}
            initial={{ opacity: 0 }}
            animate={{ opacity }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="absolute inset-0"
            style={{ background: gradientArt(THEMES[themeId as ThemeId]) }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
