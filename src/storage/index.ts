// Typed wrapper around chrome.storage.local.
//
// All persisted state lives here behind a single typed schema so callers never
// touch raw string keys. Every write is async — always await it (CLAUDE.md
// rule 4). The content script cannot use this directly (rule 5); it must talk
// to the background worker via chrome.runtime.sendMessage.

import type {
  FeedItem,
  Mood,
  MoodHistoryEntry,
  Profile,
  SessionData,
  TriviaQuestion,
} from "../types";

/** Maps every storage key to the type of value stored under it. */
export interface StorageSchema {
  profile: Profile;
  session: SessionData;
  feed_cache: FeedItem[];
  feed_last_updated: number;
  mood_current: Mood;
  mood_history: MoodHistoryEntry[];
  trivia_cache: TriviaQuestion[];
  wellness_history: string[];
}

export type StorageKey = keyof StorageSchema;

// --- Core typed accessors -------------------------------------------------

/** Read a value. Resolves to `undefined` when the key was never written. */
export async function get<K extends StorageKey>(
  key: K
): Promise<StorageSchema[K] | undefined> {
  const result = await chrome.storage.local.get(key);
  return result[key] as StorageSchema[K] | undefined;
}

/** Read a value, falling back to `fallback` when it is absent. */
export async function getWithDefault<K extends StorageKey>(
  key: K,
  fallback: StorageSchema[K]
): Promise<StorageSchema[K]> {
  const value = await get(key);
  return value === undefined ? fallback : value;
}

/** Write a single value. */
export async function set<K extends StorageKey>(
  key: K,
  value: StorageSchema[K]
): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

/** Read-modify-write a value atomically from the caller's perspective. */
export async function update<K extends StorageKey>(
  key: K,
  updater: (current: StorageSchema[K] | undefined) => StorageSchema[K]
): Promise<StorageSchema[K]> {
  const next = updater(await get(key));
  await set(key, next);
  return next;
}

/** Remove a single key. */
export async function remove(key: StorageKey): Promise<void> {
  await chrome.storage.local.remove(key);
}

/** Wipe all Aura state (used by "reset" flows). */
export async function clear(): Promise<void> {
  await chrome.storage.local.clear();
}

/**
 * Subscribe to changes for one key. Returns an unsubscribe function.
 * Fires only for chrome.storage.local and only when `key` actually changed.
 */
export function onChange<K extends StorageKey>(
  key: K,
  listener: (newValue: StorageSchema[K] | undefined) => void
): () => void {
  const handler = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ) => {
    if (areaName !== "local") return;
    if (!(key in changes)) return;
    listener(changes[key].newValue as StorageSchema[K] | undefined);
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}

// --- Defaults -------------------------------------------------------------

/** A blank profile used before onboarding completes. */
export function createDefaultProfile(): Profile {
  return {
    name: "",
    interests: [],
    browsingGoal: "discover",
    screenTimeGoalMinutes: 240, // 4h — the onboarding slider default
    visitHistory: [],
    topTopics: [],
    setupComplete: false,
  };
}

/** A fresh session, seeded at the given start time. */
export function createDefaultSession(startTime: number): SessionData {
  return {
    startTime,
    totalMinutesToday: 0,
    lastNudgeAt: null,
    nudgeLevel: 0,
  };
}

// --- Convenience accessors for the most-used entities ---------------------

export const profile = {
  get: () => get("profile"),
  set: (value: Profile) => set("profile", value),
};

export const session = {
  get: () => get("session"),
  set: (value: SessionData) => set("session", value),
};

export const feed = {
  getCache: () => getWithDefault("feed_cache", []),
  setCache: (items: FeedItem[]) => set("feed_cache", items),
  getLastUpdated: () => get("feed_last_updated"),
  setLastUpdated: (ts: number) => set("feed_last_updated", ts),
};

export const mood = {
  getCurrent: () => getWithDefault("mood_current", null),
  setCurrent: (value: Mood) => set("mood_current", value),
  getHistory: () => getWithDefault("mood_history", []),
  setHistory: (value: MoodHistoryEntry[]) => set("mood_history", value),
};
