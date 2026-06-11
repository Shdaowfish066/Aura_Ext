import { useCallback, useEffect, useRef, type RefObject } from "react";

type MarqueeOptions = {
  /** Auto-scroll switch — pass false while loading or with too few items. */
  enabled: boolean;
  /** 1 = scroll content leftwards (scrollLeft increases), -1 = reverse. */
  direction: 1 | -1;
  /** Pixels of auto-scroll per frame. */
  speed?: number;
  /** ms to wait after the pointer leaves before auto-scroll resumes. */
  resumeDelayMs?: number;
};

const FRICTION = 0.94; // momentum decay per frame (higher = floatier glide)
const MAX_VELOCITY = 60; // px/frame cap for flicks/wheel bursts

/**
 * Physics for a horizontally scrollable strip: gentle auto-scroll marquee
 * plus inertial "momentum" scrolling driven through `nudge(delta)` — used by
 * wheel input and drag-release flicks so manual scrolling glides instead of
 * stopping dead.
 *
 * When `enabled`, the caller renders its item list TWICE so the loop can wrap
 * seamlessly (jump by half the scrollWidth at the edges). Auto-scroll pauses
 * on hover/press/wheel/touch and under prefers-reduced-motion; momentum still
 * works in all cases (it's user-initiated motion).
 */
export function useMarquee(
  ref: RefObject<HTMLElement | null>,
  { enabled, direction, speed = 0.22, resumeDelayMs = 3000 }: MarqueeOptions
): { nudge: (delta: number) => void; stop: () => void } {
  // Live refs so flips don't tear down the rAF loop.
  const directionRef = useRef(direction);
  directionRef.current = direction;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const velocityRef = useRef(0);

  /** Add an inertial impulse (px/frame). Positive scrolls content leftwards. */
  const nudge = useCallback((delta: number) => {
    const next = velocityRef.current + delta;
    velocityRef.current = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, next));
  }, []);

  /** Cancel any in-flight momentum (e.g. when the user grabs the strip). */
  const stop = useCallback(() => {
    velocityRef.current = 0;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let rafId = 0;
    let paused = false;
    let resumeTimer: number | undefined;

    const step = () => {
      const half = el.scrollWidth / 2;
      const canWrap = enabledRef.current && half > el.clientWidth + 1;

      let delta = 0;
      if (canWrap && !paused && !reduced) {
        delta += speed * directionRef.current;
      }
      if (Math.abs(velocityRef.current) > 0.04) {
        delta += velocityRef.current;
        velocityRef.current *= FRICTION;
      } else {
        velocityRef.current = 0;
      }

      if (delta !== 0) {
        el.scrollLeft += delta;
        if (canWrap) {
          if (el.scrollLeft >= half) el.scrollLeft -= half;
          else if (el.scrollLeft <= 0 && delta < 0) el.scrollLeft += half;
        }
      }
      rafId = requestAnimationFrame(step);
    };

    const pause = () => {
      paused = true;
      if (resumeTimer !== undefined) window.clearTimeout(resumeTimer);
    };

    const scheduleResume = () => {
      if (resumeTimer !== undefined) window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        paused = false;
      }, resumeDelayMs);
    };

    el.addEventListener("pointerenter", pause);
    el.addEventListener("pointerdown", pause);
    el.addEventListener("wheel", pause, { passive: true });
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("pointerleave", scheduleResume);
    el.addEventListener("pointerup", scheduleResume);

    rafId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId);
      if (resumeTimer !== undefined) window.clearTimeout(resumeTimer);
      el.removeEventListener("pointerenter", pause);
      el.removeEventListener("pointerdown", pause);
      el.removeEventListener("wheel", pause);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("pointerleave", scheduleResume);
      el.removeEventListener("pointerup", scheduleResume);
    };
  }, [ref, speed, resumeDelayMs]);

  return { nudge, stop };
}
