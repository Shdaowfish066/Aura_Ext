import { useEffect, useState } from "react";
import type { Profile } from "../../types";
import { onChange, profile as profileStore } from "../../storage";
import { getProfileSync, isBackendUp, putProfileSync } from "../../api/client";

/**
 * Best-effort profile restore from the backend, used when local storage has
 * no completed profile (fresh install / reinstall). Never throws.
 */
async function restoreProfileFromBackend(): Promise<Profile | undefined> {
  try {
    if (!(await isBackendUp())) return undefined;
    const res = await getProfileSync();
    if (res.exists && res.profile?.setupComplete) return res.profile;
  } catch {
    /* backend unavailable — local-first, nothing to do */
  }
  return undefined;
}

/** Reads/writes the user taste profile and stays in sync with storage. */
export function useProfile() {
  const [profile, setProfileState] = useState<Profile | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (typeof chrome === "undefined" || !chrome.storage) {
      setLoading(false);
      return;
    }
    profileStore.get().then((p) => {
      if (!alive) return;
      setProfileState(p);
      setLoading(false); // local result renders first — never block on sync
      if (!p || !p.setupComplete) {
        // No completed local profile (e.g. fresh reinstall) — try the backend.
        void restoreProfileFromBackend().then(async (remote) => {
          if (!alive || !remote) return;
          await profileStore.set(remote);
          if (alive) setProfileState(remote);
        });
      }
    });
    const off = onChange("profile", (p) => alive && setProfileState(p));
    return () => {
      alive = false;
      off();
    };
  }, []);

  async function update(patch: Partial<Profile>) {
    const next = { ...(profile as Profile), ...patch };
    setProfileState(next);
    await profileStore.set(next);
    // Fire-and-forget backend sync — storage stays the source of truth.
    void putProfileSync(next).catch(() => {});
  }

  /** State setter used after callers persist themselves (e.g. onboarding
   *  completes via profileStore.set then hands us the profile). Also pushes
   *  the saved profile to the backend, fire-and-forget. */
  function setProfile(p: Profile | undefined) {
    setProfileState(p);
    if (p) void putProfileSync(p).catch(() => {});
  }

  return { profile, loading, setProfile, update };
}
