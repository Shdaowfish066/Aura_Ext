import { useEffect, useState } from "react";
import type { SessionData } from "../../types";
import {
  createDefaultSession,
  onChange,
  session as sessionStore,
  sessionGet,
  sessionSet,
} from "../../storage";

/** Session timing, anchored to the user's PC clock.
 *
 *  The session-time clock counts from `session_started_at`, a timestamp in
 *  chrome.storage.session stamped when this browser session began. Chrome
 *  clears that storage when the browser closes or the extension is disabled,
 *  so the clock genuinely resets — no more eternal timer.
 *
 *  `minutesElapsed` (for the daily goal bar) still uses the worker's
 *  idle-gated `totalMinutesToday`, which only advances during real use. */
export function useSession() {
  const [session, setSession] = useState<SessionData | undefined>(undefined);
  const [startedAt, setStartedAt] = useState<number | undefined>(undefined);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    if (typeof chrome === "undefined" || !chrome.storage) return;

    sessionStore.get().then(async (s) => {
      if (!alive) return;
      if (s) {
        setSession(s);
      } else {
        const fresh = createDefaultSession(Date.now());
        await sessionStore.set(fresh);
        setSession(fresh);
      }
    });

    // Browser-session start: read the worker's stamp, or (if this new tab
    // beat the worker to it) stamp it ourselves from the PC clock.
    sessionGet<number>("session_started_at").then(async (ts) => {
      if (!alive) return;
      if (ts === undefined) {
        ts = Date.now();
        await sessionSet("session_started_at", ts);
      }
      setStartedAt(ts);
    });

    const off = onChange("session", (s) => alive && s && setSession(s));
    const tick = setInterval(() => alive && setNow(Date.now()), 1000);
    return () => {
      alive = false;
      off();
      clearInterval(tick);
    };
  }, []);

  const totalSeconds = startedAt
    ? Math.max(0, Math.floor((now - startedAt) / 1000))
    : 0;

  return {
    session,
    nudgeLevel: session?.nudgeLevel ?? 0,
    /** Idle-gated minutes of real use today (drives the daily goal bar). */
    minutesElapsed: session?.totalMinutesToday ?? 0,
    /** Wall time of the current date, for the analog clock. */
    now,
    clock: {
      h: Math.floor(totalSeconds / 3600),
      m: Math.floor((totalSeconds % 3600) / 60),
      s: totalSeconds % 60,
    },
  };
}
