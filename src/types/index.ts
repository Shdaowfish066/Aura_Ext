// Shared types for Aura. These mirror the Core Data Types in CLAUDE.md.

/** User's persisted taste profile. */
export type Profile = {
  name: string;
  interests: string[]; // e.g. ["anime", "tech", "sports"]
  browsingGoal: BrowsingGoal;
  screenTimeGoalMinutes: number;
  visitHistory: Visit[]; // last 50 visits
  topTopics: string[]; // derived from visitHistory
  setupComplete: boolean;
};

/** Browsing goal selected during onboarding. */
export type BrowsingGoal = "stay_informed" | "discover" | "chill" | "focus";

/** A single page visit logged by the content script. */
export type Visit = {
  url: string;
  title: string;
  topic: string; // Claude-classified or keyword-extracted
  durationSeconds: number;
  timestamp: number;
};

/** A single feed card. */
export type FeedItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  topic: string; // "anime" | "tech" | "news" | "sports" etc.
  publishedAt: string;
  claudeCaption: string; // "Why you'd like this" — written by Claude
  moodFit: string[]; // moods this content fits: ["good", "hyped"]
  imageUrl?: string;
};

/** User's current mood. */
export type Mood = "tired" | "good" | "stressed" | "hyped" | "low" | null;

/** A timestamped mood selection (mood_history entries). */
export type MoodHistoryEntry = {
  mood: Mood;
  timestamp: number;
};

/** Session tracking. */
export type SessionData = {
  startTime: number;
  totalMinutesToday: number;
  lastNudgeAt: number | null;
  nudgeLevel: 0 | 1 | 2 | 3; // escalating nudge stages
};

/** A trivia question, as produced by the Claude trivia prompt. */
export type TriviaQuestion = {
  question: string;
  options: string[]; // length 4
  correctIndex: number;
  funFact: string;
};
