import { useEffect, useState } from "react";
import type { Mood, MoodHistoryEntry } from "../../types";
import { mood as moodStore } from "../../storage";
import { putMoodSync } from "../../api/client";
import { setMoodTint } from "../themes";
import { MOOD_THEME } from "../components/Mood/moodTheme";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Apply the full-screen ambiance tint for a mood (or clear it). */
function applyTint(m: Mood): void {
  setMoodTint(m ? MOOD_THEME[m].tint : "transparent");
}

/** Current mood selection + persistence + 7-day history. Feed reshuffle is
 *  driven by the mood value flowing into useFeed, not by this hook directly. */
export function useMood() {
  const [mood, setMoodState] = useState<Mood>(null);
  const [history, setHistory] = useState<MoodHistoryEntry[]>([]);

  useEffect(() => {
    let alive = true;
    if (typeof chrome === "undefined" || !chrome.storage) return;
    moodStore.getCurrent().then((m) => {
      if (!alive) return;
      setMoodState(m);
      applyTint(m); // returning users get their tint back on open
    });
    moodStore.getHistory().then((h) => alive && setHistory(h));
    return () => {
      alive = false;
    };
  }, []);

  async function setMood(next: Mood) {
    setMoodState(next);
    applyTint(next);
    await moodStore.setCurrent(next);
    const now = Date.now();
    const recent = (await moodStore.getHistory()).filter(
      (e) => now - e.timestamp < WEEK_MS
    );
    // Deselecting (null) clears the current mood but is NOT a history event.
    const updated =
      next === null ? recent : [...recent, { mood: next, timestamp: now }];
    await moodStore.setHistory(updated);
    setHistory(updated);
    // Fire-and-forget backend sync — local storage stays the source of truth.
    void putMoodSync({ current: next, history: updated }).catch(() => {});
  }

  return { mood, setMood, history };
}
