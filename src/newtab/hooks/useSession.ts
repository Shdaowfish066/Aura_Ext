import { useEffect, useState } from "react";
import type { SessionData } from "../../types";
import {
  createDefaultSession,
  onChange,
  session as sessionStore,
} from "../../storage";

/** Reads session timing and ticks a live elapsed clock once per second.
 *  Elapsed time is derived from startTime so it stays live even if the
 *  background worker's per-minute increment hasn't fired yet. */
export function useSession() {
  const [session, setSession] = useState<SessionData | undefined>(undefined);
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

    const off = onChange("session", (s) => alive && s && setSession(s));
    const tick = setInterval(() => alive && setNow(Date.now()), 1000);
    return () => {
      alive = false;
      off();
      clearInterval(tick);
    };
  }, []);

  const elapsedMs = session ? Math.max(0, now - session.startTime) : 0;
  const totalSeconds = Math.floor(elapsedMs / 1000);

  return {
    session,
    nudgeLevel: session?.nudgeLevel ?? 0,
    minutesElapsed: Math.floor(totalSeconds / 60),
    clock: {
      h: Math.floor(totalSeconds / 3600),
      m: Math.floor((totalSeconds % 3600) / 60),
      s: totalSeconds % 60,
    },
  };
}
