import { m } from "framer-motion";
import type { Theme } from "../../themes";

/**
 * Theme-aware ambient background. Always renders three drifting aurora blobs
 * tinted from the theme, plus a per-theme decorative layer (kept very subtle —
 * patterns stay at or under ~10% opacity so they never hurt readability).
 * The mood tint overlay sits on top; another part of the app drives the
 * --mood-tint variable.
 */
export default function Backdrop({ theme }: { theme: Theme }) {
  const { kind, blobColors } = theme.background;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <Blobs kind={kind} colors={blobColors} />

      {kind === "web" && <WebPattern />}
      {kind === "gotham" && <GothamLayer />}
      {kind === "sakura" && <SakuraPetals />}
      {kind === "swirl" && <SwirlAccents />}
      {kind === "skyrays" && <SkyRays />}

      {/* Sakura-style ambient motion for every theme: petals fall in Sakura,
          leaves fall in Hidden Leaf, soft motes drift upward elsewhere. */}
      {kind === "swirl" && <FallingLeaves />}
      {kind !== "sakura" && kind !== "swirl" && (
        <Motes
          colors={
            kind === "gotham"
              ? ["#f5c518"]
              : kind === "web"
                ? ["#f87171", "#60a5fa"]
                : kind === "skyrays"
                  ? ["#ffffff", "#93c5fd"]
                  : kind === "daylight"
                    ? ["#fbbf24", "#a5b4fc"]
                    : ["#a5b4fc", "#fcd34d"]
          }
          dim={kind === "gotham" || kind === "daylight"}
        />
      )}

      {/* Mood ambiance — topmost, crossfades via --mood-tint. */}
      <div className="mood-tint-overlay absolute inset-0" />
    </div>
  );
}

/* ------------------------------------------------------------------------ */

/** A soft light source painted as a radial gradient. A CSS blur() filter on a
 *  solid div gets clipped to a square region by the compositor — the "square
 *  light" artifact — so the glow must come from the gradient itself, which
 *  dissolves into the background with no edge at all. */
function Glow({
  color,
  className,
  delay,
}: {
  color: string;
  className: string;
  delay?: string;
}) {
  return (
    <div
      className={`aurora-blob absolute ${className}`}
      style={{
        background: `radial-gradient(circle closest-side, ${color} 0%, transparent 72%)`,
        animationDelay: delay,
      }}
    />
  );
}

function Blobs({
  kind,
  colors,
}: {
  kind: Theme["background"]["kind"];
  colors: [string, string, string];
}) {
  // Gotham: glows hug the bottom like rolling fog.
  if (kind === "gotham") {
    return (
      <>
        <Glow color={colors[0]} className="-bottom-72 -left-56 h-[40rem] w-[40rem]" />
        <Glow color={colors[1]} className="-bottom-80 left-1/4 h-[42rem] w-[42rem]" delay="-6s" />
        <Glow color={colors[2]} className="-bottom-72 -right-56 h-[40rem] w-[40rem]" delay="-12s" />
      </>
    );
  }

  // Daylight: slightly larger, airier pastel glows.
  const size =
    kind === "daylight" ? "h-[48rem] w-[48rem]" : "h-[42rem] w-[42rem]";

  return (
    <>
      <Glow color={colors[0]} className={`-left-72 -top-72 ${size}`} />
      <Glow color={colors[1]} className={`-right-48 top-1/4 ${size}`} delay="-6s" />
      <Glow color={colors[2]} className={`-bottom-64 left-1/4 ${size}`} delay="-12s" />
    </>
  );
}

/** Spider-Man: faint spider web anchored in the top-right corner. */
function WebPattern() {
  const stroke = "rgba(255, 255, 255, 0.05)";
  const radii = [70, 140, 210, 280, 350, 420];
  // Spokes radiating from the corner into the lower-left quadrant.
  const spokes = [95, 115, 135, 155, 175].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return {
      x2: 440 + Math.cos(rad) * 480,
      y2: 0 + Math.sin(rad) * 480,
    };
  });

  return (
    <svg
      className="absolute right-0 top-0 h-[440px] w-[440px]"
      viewBox="0 0 440 440"
      fill="none"
      aria-hidden="true"
    >
      {radii.map((r) => (
        <circle key={r} cx="440" cy="0" r={r} stroke={stroke} strokeWidth="1" />
      ))}
      {spokes.map((s, i) => (
        <line
          key={i}
          x1="440"
          y1="0"
          x2={s.x2}
          y2={s.y2}
          stroke={stroke}
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}

/** Batman: bat-signal glow up top + a faint bat watermark bottom-right. */
function GothamLayer() {
  return (
    <>
      {/* Soft yellow "bat-signal" beam glow near the top. */}
      <div
        className="absolute -top-24 left-1/2 h-[420px] w-[560px] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(245, 197, 24, 0.10) 0%, rgba(245, 197, 24, 0.04) 40%, transparent 70%)",
        }}
      />
      {/* Bat silhouette watermark. */}
      <svg
        className="absolute -bottom-10 -right-10 h-72 w-96"
        viewBox="0 0 200 100"
        aria-hidden="true"
      >
        <path
          d="M100 18 L106 32 L114 24 C140 26 164 42 174 68 C160 56 146 54 136 62 C130 54 120 54 114 64 L100 52 L86 64 C80 54 70 54 64 62 C54 54 40 56 26 68 C36 42 60 26 86 24 L94 32 Z"
          fill="#f5c518"
          opacity="0.04"
        />
      </svg>
    </>
  );
}

/** Soft particles drifting upward — gives non-sakura themes the same calm,
 *  alive feeling as the falling petals. Deterministic layout (no Math.random)
 *  so renders are stable. */
const MOTE_SLOTS = [
  { left: 6, size: 4, dur: 18, delay: 0, opacity: 0.4 },
  { left: 15, size: 3, dur: 24, delay: 7, opacity: 0.3 },
  { left: 26, size: 5, dur: 16, delay: 12, opacity: 0.45 },
  { left: 37, size: 3, dur: 26, delay: 3, opacity: 0.25 },
  { left: 48, size: 4, dur: 20, delay: 16, opacity: 0.4 },
  { left: 58, size: 6, dur: 15, delay: 9, opacity: 0.5 },
  { left: 68, size: 3, dur: 25, delay: 1, opacity: 0.3 },
  { left: 78, size: 4, dur: 19, delay: 14, opacity: 0.4 },
  { left: 88, size: 5, dur: 17, delay: 5, opacity: 0.45 },
  { left: 95, size: 3, dur: 23, delay: 11, opacity: 0.3 },
];

function Motes({ colors, dim = false }: { colors: string[]; dim?: boolean }) {
  return (
    <>
      {MOTE_SLOTS.map((s, i) => {
        const color = colors[i % colors.length];
        return (
          <div
            key={i}
            className="mote absolute top-full rounded-full"
            style={{
              left: `${s.left}%`,
              width: s.size,
              height: s.size,
              background: color,
              boxShadow: `0 0 ${s.size * 2}px ${color}`,
              ["--mote-opacity" as string]: String(
                dim ? s.opacity * 0.6 : s.opacity
              ),
              animationDuration: `${s.dur}s`,
              animationDelay: `-${s.delay}s`,
            }}
          />
        );
      })}
    </>
  );
}

/** Hidden Leaf: green leaves drifting down (same fall path as the petals). */
function FallingLeaves() {
  return (
    <>
      {PETALS.filter((_, i) => i % 2 === 0).map((p, i) => (
        <div
          key={i}
          className="petal absolute top-0"
          style={{
            left: `${p.left}%`,
            width: p.size + 2,
            height: p.size,
            opacity: p.opacity * 0.8,
            background: i % 2 === 0 ? "#84cc16" : "#a3e635",
            borderRadius: "0 70% 0 70%", // simple leaf silhouette
            animationDuration: `${p.dur + 2}s`,
            animationDelay: `-${p.delay}s`,
          }}
        />
      ))}
    </>
  );
}

/** Anime: ~12 falling sakura petals (CSS keyframes via .petal). */
const PETALS = [
  { left: 4, size: 10, dur: 11, delay: 0, opacity: 0.5 },
  { left: 12, size: 8, dur: 14, delay: 3, opacity: 0.35 },
  { left: 21, size: 13, dur: 9, delay: 6, opacity: 0.55 },
  { left: 30, size: 9, dur: 15, delay: 1, opacity: 0.4 },
  { left: 39, size: 12, dur: 10, delay: 8, opacity: 0.5 },
  { left: 48, size: 8, dur: 16, delay: 4, opacity: 0.3 },
  { left: 57, size: 14, dur: 12, delay: 10, opacity: 0.6 },
  { left: 66, size: 9, dur: 13, delay: 2, opacity: 0.4 },
  { left: 74, size: 11, dur: 9, delay: 7, opacity: 0.5 },
  { left: 82, size: 8, dur: 15, delay: 12, opacity: 0.35 },
  { left: 90, size: 12, dur: 11, delay: 5, opacity: 0.55 },
  { left: 96, size: 10, dur: 14, delay: 9, opacity: 0.45 },
];

function SakuraPetals() {
  return (
    <>
      {PETALS.map((p, i) => (
        <div
          key={i}
          className="petal absolute top-0"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            background: "#f9a8d4",
            // Petal shape: rounded with one squared corner.
            borderRadius: "70% 0 70% 70%",
            animationDuration: `${p.dur}s`,
            animationDelay: `-${p.delay}s`,
          }}
        />
      ))}
    </>
  );
}

/** Naruto: faint leaf-village swirl accents, one slowly rotating. */
function SwirlAccents() {
  // Expanding-arc spiral path centered on (100,100).
  const spiral =
    "M100 100 a10 10 0 0 1 20 0 a20 20 0 0 1 -40 0 a30 30 0 0 1 60 0 a40 40 0 0 1 -80 0 a50 50 0 0 1 100 0 a60 60 0 0 1 -120 0 a70 70 0 0 1 140 0";

  const SpiralSvg = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 200 200" fill="none" aria-hidden="true">
      <path d={spiral} stroke="#fb923c" strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="100" r="88" stroke="#fb923c" strokeWidth="2" />
    </svg>
  );

  return (
    <>
      <m.div
        className="absolute -right-24 top-12 h-72 w-72 opacity-[0.08]"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      >
        <SpiralSvg className="h-full w-full" />
      </m.div>
      <SpiralSvg className="absolute -bottom-20 -left-16 h-64 w-64 opacity-[0.06]" />
      <SpiralSvg className="absolute left-1/2 top-2/3 h-32 w-32 opacity-[0.05]" />
    </>
  );
}

/** Superman: angled translucent light rays falling from above. */
function SkyRays() {
  const rays = [
    { left: "12%", width: 130, opacity: 0.05, tint: "255, 255, 255" },
    { left: "32%", width: 90, opacity: 0.04, tint: "147, 197, 253" },
    { left: "55%", width: 150, opacity: 0.06, tint: "255, 255, 255" },
    { left: "78%", width: 100, opacity: 0.045, tint: "147, 197, 253" },
  ];
  return (
    <>
      {rays.map((r, i) => (
        <div
          key={i}
          className="absolute -top-24 h-[85vh]"
          style={{
            left: r.left,
            width: r.width,
            transform: "skewX(-14deg)",
            background: `linear-gradient(to bottom, rgba(${r.tint}, ${r.opacity}) 0%, transparent 85%)`,
          }}
        />
      ))}
    </>
  );
}
