/**
 * Old-school analog clock showing the user's PC time. Styled entirely with
 * theme CSS variables, so the face re-skins with every theme (bat-signal
 * yellow hands in Dark Knight, sakura pink in Sakura, …).
 */
export default function AnalogClock({ size = 120 }: { size?: number }) {
  const t = new Date();
  // Angles derive from a monotonically increasing local-time epoch, so the
  // rotation value only ever grows. Using `seconds * 6` made the second hand
  // animate BACKWARD through a full turn at the top of each minute (354°→0°
  // tweens counter-clockwise); 0°, 360°, 720°… render identically but always
  // tween forward.
  const localMs = t.getTime() - t.getTimezoneOffset() * 60_000;
  const wholeSeconds = Math.floor(localMs / 1000);

  const secDeg = wholeSeconds * 6; // whole-second steps = the classic tick
  const minDeg = (localMs / 60_000) * 6;
  const hourDeg = (localMs / 3_600_000) * 30;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`Clock showing ${t.toLocaleTimeString()}`}
    >
      {/* Face */}
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="rgba(255,255,255,0.04)"
        stroke="var(--border)"
        strokeWidth="1.5"
      />
      <circle cx="50" cy="50" r="46" fill="url(#clock-sheen)" />
      <defs>
        <radialGradient id="clock-sheen" cx="0.35" cy="0.3" r="0.9">
          <stop offset="0%" stopColor="rgba(255,255,255,0.10)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0.02)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      {/* Hour markers — 12/3/6/9 slightly stronger */}
      {Array.from({ length: 12 }, (_, i) => {
        const major = i % 3 === 0;
        return (
          <line
            key={i}
            x1="50"
            y1={major ? 9 : 10.5}
            x2="50"
            y2={major ? 16 : 14.5}
            stroke={major ? "var(--accent-primary)" : "var(--text-muted)"}
            strokeWidth={major ? 2.4 : 1.4}
            strokeLinecap="round"
            transform={`rotate(${i * 30} 50 50)`}
            opacity={major ? 0.9 : 0.6}
          />
        );
      })}

      {/* Hands — hour, minute, second */}
      <line
        x1="50"
        y1="50"
        x2="50"
        y2="29"
        stroke="var(--text-primary)"
        strokeWidth="3.4"
        strokeLinecap="round"
        transform={`rotate(${hourDeg} 50 50)`}
      />
      <line
        x1="50"
        y1="50"
        x2="50"
        y2="19"
        stroke="var(--text-secondary)"
        strokeWidth="2.2"
        strokeLinecap="round"
        transform={`rotate(${minDeg} 50 50)`}
      />
      <g
        transform={`rotate(${secDeg} 50 50)`}
        style={{ transition: "transform 0.18s cubic-bezier(0.4, 2.2, 0.6, 1)" }}
      >
        <line
          x1="50"
          y1="56"
          x2="50"
          y2="15"
          stroke="var(--accent-primary)"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </g>

      {/* Center cap */}
      <circle cx="50" cy="50" r="3" fill="var(--accent-primary)" />
      <circle cx="50" cy="50" r="1.2" fill="var(--bg-base)" />
    </svg>
  );
}
