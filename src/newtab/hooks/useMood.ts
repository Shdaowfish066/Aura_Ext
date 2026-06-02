import { useEffect, useState } from "react";
import type { Mood, MoodHistoryEntry } from "../../types";
import { mood as moodStore } from "../../storage";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Current mood selection + persistence. Feed reshuffle is driven by the mood
 *  value flowing into useFeed, not by this hook directly. */
export function useMood() {
  const [mood, setMoodState] = useState<Mood>(null);

  useEffect(() => {
    let alive = true;
    if (typeof chrome === "undefined" || !chrome.storage) return;
    moodStore.getCurrent().then((m) => alive && setMoodState(m));
    return () => {
      alive = false;
    };
  }, []);

  async function setMood(next: Mood) {
    setMoodState(next);
    await moodStore.setCurrent(next);
    const now = Date.now();
    const history = (await moodStore.getHistory()).filter(
      (e) => now - e.timestamp < WEEK_MS
    );
    const entry: MoodHistoryEntry = { mood: next, timestamp: now };
    await moodStore.setHistory([...history, entry]);
  }

  return { mood, setMood };
}
