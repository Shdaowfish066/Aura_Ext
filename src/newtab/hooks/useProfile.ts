import { useEffect, useState } from "react";
import type { Profile } from "../../types";
import { onChange, profile as profileStore } from "../../storage";

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
      setLoading(false);
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
  }

  return { profile, loading, setProfile: setProfileState, update };
}
