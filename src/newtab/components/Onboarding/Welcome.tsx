// First screen of onboarding: a full-screen, time-of-day-aware welcome moment.
// Words stagger-reveal, decorative orbs float behind, and a single CTA appears
// last to pull the user into the wizard.

import { m, type Variants } from "framer-motion";

type Props = {
  onStart: () => void;
};

/** Time-of-day aware greeting. Symbol is rendered outside the gradient text. */
function getGreeting(): { text: string; symbol: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Good morning", symbol: "☀" };
  if (hour >= 12 && hour < 17) return { text: "Good afternoon", symbol: "☀" };
  if (hour >= 17 && hour < 22) return { text: "Good evening", symbol: "✦" };
  return { text: "Hello, night owl", symbol: "☾" };
}

const SUBLINE = "Let's make your browser feel like home.";

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.15 },
  },
};

const word: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

// Decorative floating orbs — varied size, position, and animation timing.
const ORBS = [
  { size: 240, top: "10%", left: "12%", delay: "0s", duration: "7s", color: "bg-primary", opacity: "opacity-20" },
  { size: 150, top: "66%", left: "8%", delay: "1.4s", duration: "9s", color: "bg-secondary", opacity: "opacity-20" },
  { size: 190, top: "16%", left: "74%", delay: "0.7s", duration: "8s", color: "bg-warm", opacity: "opacity-15" },
  { size: 120, top: "72%", left: "78%", delay: "2s", duration: "6.5s", color: "bg-primary", opacity: "opacity-15" },
  { size: 90, top: "44%", left: "88%", delay: "0.3s", duration: "10s", color: "bg-secondary", opacity: "opacity-10" },
] as const;

export default function Welcome({ onStart }: Props) {
  const greeting = getGreeting();
  const headlineWords = greeting.text.split(" ");
  const sublineWords = SUBLINE.split(" ");

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-6">
      {/* Floating decorative orbs */}
      {ORBS.map((orb, i) => (
        <div
          key={i}
          aria-hidden
          className={`animate-float pointer-events-none absolute rounded-full blur-3xl ${orb.color} ${orb.opacity}`}
          style={{
            width: orb.size,
            height: orb.size,
            top: orb.top,
            left: orb.left,
            animationDelay: orb.delay,
            animationDuration: orb.duration,
          }}
        />
      ))}

      <m.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 text-center"
      >
        <h1 className="font-display text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
          {headlineWords.map((w, i) => (
            <m.span
              key={i}
              variants={word}
              className="gradient-hero-text mr-[0.26em] inline-block"
            >
              {w}
            </m.span>
          ))}
          <m.span variants={word} className="inline-block text-warm">
            {greeting.symbol}
          </m.span>
        </h1>

        <p className="mx-auto mt-6 max-w-md text-lg text-subtle sm:text-xl">
          {sublineWords.map((w, i) => (
            <m.span key={i} variants={word} className="mr-[0.3em] inline-block">
              {w}
            </m.span>
          ))}
        </p>

        <m.button
          type="button"
          onClick={onStart}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.5, ease: "easeOut" }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="mt-12 rounded-full bg-hero px-8 py-3.5 font-body text-base font-semibold text-white shadow-lg transition-shadow duration-300 hover:shadow-glow"
        >
          Let&apos;s set you up →
        </m.button>
      </m.div>
    </div>
  );
}
