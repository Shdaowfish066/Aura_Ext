import { useEffect, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import type { ThemeId } from "../../../types";

/**
 * Big theme emblem rendered BEHIND the center glass cards (the cards' blur
 * picks it up, iOS-glass style). Tries a user-supplied image first —
 * `public/logos/<themeId>.png` or `.svg`, see public/logos/README.md — and
 * falls back to a built-in minimal SVG mark per theme.
 */
export default function ThemeLogo({ themeId }: { themeId: ThemeId }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setSrc(null);
    if (typeof chrome === "undefined" || !chrome.runtime?.getURL) return;
    // Probe png first, then svg; fall back to the inline mark when neither exists.
    const candidates = [`logos/${themeId}.png`, `logos/${themeId}.svg`].map(
      (p) => chrome.runtime.getURL(p)
    );
    (async () => {
      for (const url of candidates) {
        const ok = await new Promise<boolean>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = url;
        });
        if (!alive) return;
        if (ok) {
          setSrc(url);
          return;
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [themeId]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center">
      <AnimatePresence mode="wait">
        <m.div
          key={`${themeId}-${src ?? "builtin"}`}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="-translate-y-6"
        >
          {src ? (
            <img
              src={src}
              alt=""
              draggable={false}
              className="h-[26rem] w-[26rem] object-contain opacity-[0.08] saturate-50"
            />
          ) : (
            <BuiltinMark themeId={themeId} />
          )}
        </m.div>
      </AnimatePresence>
    </div>
  );
}

/** Minimal geometric marks used until real logos are dropped into /logos. */
function BuiltinMark({ themeId }: { themeId: ThemeId }) {
  const common = {
    width: 400,
    height: 400,
    viewBox: "0 0 100 100",
    fill: "none",
    className: "opacity-[0.07]",
    "aria-hidden": true as const,
  };
  const stroke = "var(--accent-primary)";

  switch (themeId) {
    case "spiderman":
      // Spider: body + eight legs
      return (
        <svg {...common}>
          <ellipse cx="50" cy="54" rx="7" ry="11" fill={stroke} />
          <circle cx="50" cy="40" r="5" fill={stroke} />
          {[
            "M44 44 28 32 20 14",
            "M44 50 24 46 12 34",
            "M44 58 26 62 16 78",
            "M46 64 36 80 38 92",
            "M56 44 72 32 80 14",
            "M56 50 76 46 88 34",
            "M56 58 74 62 84 78",
            "M54 64 64 80 62 92",
          ].map((d) => (
            <path key={d} d={d} stroke={stroke} strokeWidth="2.6" strokeLinecap="round" />
          ))}
        </svg>
      );
    case "batman":
      // Bat silhouette
      return (
        <svg {...common}>
          <path
            d="M50 26 46 36c-3-2-7-2-10 0l2-10c-8 2-16 8-20 18 6-3 11-3 15 1l4 8 5-5h8l5 5 4-8c4-4 9-4 15-1-4-10-12-16-20-18l2 10c-3-2-7-2-10 0L50 26z"
            fill={stroke}
            transform="translate(0,12) scale(1.15) translate(-7,-7)"
          />
        </svg>
      );
    case "anime":
      // Five-petal sakura blossom
      return (
        <svg {...common}>
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse
              key={deg}
              cx="50"
              cy="32"
              rx="9"
              ry="16"
              fill={stroke}
              transform={`rotate(${deg} 50 50)`}
            />
          ))}
          <circle cx="50" cy="50" r="5" fill="var(--accent-secondary)" />
        </svg>
      );
    case "naruto":
      // Leaf-village spiral
      return (
        <svg {...common}>
          <path
            d="M50 50m0-30a30 30 0 1 1-21 51M50 50m0-18a18 18 0 1 1-13 31M50 50m0-8a8 8 0 1 1-6 14"
            stroke={stroke}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path d="M76 72 92 88" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
    case "superman":
      // Diamond shield
      return (
        <svg {...common}>
          <path
            d="M50 12 88 30 50 88 12 30Z"
            stroke={stroke}
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M36 34h20c8 0 10 10 2 13l-14 5c-7 3-5 12 3 12h17"
            stroke="var(--accent-warm)"
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      );
    case "daylight":
      // Sun
      return (
        <svg {...common}>
          <circle cx="50" cy="50" r="16" stroke={stroke} strokeWidth="4" />
          {Array.from({ length: 8 }, (_, i) => i * 45).map((deg) => (
            <path
              key={deg}
              d="M50 22V10"
              stroke={stroke}
              strokeWidth="4"
              strokeLinecap="round"
              transform={`rotate(${deg} 50 50)`}
            />
          ))}
        </svg>
      );
    case "aura":
    default:
      // Concentric aura rings
      return (
        <svg {...common}>
          <circle cx="50" cy="50" r="38" stroke={stroke} strokeWidth="3.5" />
          <circle cx="50" cy="50" r="24" stroke="var(--accent-warm)" strokeWidth="3.5" />
          <circle cx="50" cy="50" r="7" fill="var(--accent-secondary)" />
        </svg>
      );
  }
}
