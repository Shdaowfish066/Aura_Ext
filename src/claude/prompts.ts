// All AI system + user prompt templates.
// Each builder returns { system, user } so client.ts stays generic.

import type { Mood, Profile } from "../types";
import type { RawArticle, SearchIntent } from "./types";

export type PromptPair = { system: string; user: string };

// --- 1. Feed Curation -----------------------------------------------------

const MOOD_INSTRUCTIONS: Record<string, string> = {
  hyped:    "The user is HYPED. Prioritize exciting, intense, hype-worthy content. Captions should be energetic, use exclamation, reference what makes this a banger. Surface the most action-packed, viral, or mind-blowing picks first.",
  tired:    "The user is TIRED. Prioritize light, easy, low-effort content — short reads, funny stuff, feel-good stories. Captions should be warm, gentle, reassuring. Avoid anything heavy or demanding.",
  stressed: "The user is STRESSED. Surface distraction content — interesting projects, funny things, creative work that takes their mind off things. Captions should be calming and encouraging. Avoid news or heavy topics.",
  low:      "The user is feeling LOW. Surface cozy, comforting, relatable content — slice-of-life, heartwarming, community discussions. Captions should be empathetic and gentle. Skip anything negative or stressful.",
  good:     "The user is feeling GOOD. Surface a broad, exciting mix — fresh discoveries, deep reads, things to explore. Captions should be enthusiastic and curious.",
};

const FEED_SYSTEM = `You are Aura's feed curator. You deeply understand this user's interests and mood.
Your job is to pick the TOP 8 articles from the list and write a compelling personal caption for each.
Captions must reflect BOTH the user's interests AND their current mood — they should feel NOTICEABLY DIFFERENT for different moods.
Do NOT just re-rank. Rewrite captions entirely based on the mood instruction you are given.
Be specific. Reference the user's actual interests. Never be generic.
Return ONLY valid JSON. No markdown, no explanation.`;

export function feedCurationPrompt(
  profile: Profile,
  mood: Mood,
  hour: number,
  articles: RawArticle[]
): PromptPair {
  const moodInstruction = mood ? (MOOD_INSTRUCTIONS[mood] ?? "") : "No mood set — use a neutral, informative tone.";
  const user = `User profile: ${JSON.stringify(profile)}
Current mood: ${mood ?? "none"}
Mood instruction (FOLLOW THIS STRICTLY): ${moodInstruction}
Time of day: ${hour} (0-23)
Raw articles: ${JSON.stringify(articles)}

Return JSON array of exactly 8 items, ranked by mood relevance:
[{ "id": string, "claudeCaption": string, "moodFit": string[], "rank": number }]`;
  return { system: FEED_SYSTEM, user };
}

// --- 2. AI Search ---------------------------------------------------------

const SEARCH_SYSTEM = `You are Aura, a personal AI search engine. You know this user's taste.
Answer their query directly and helpfully. Be specific to their interests.
For recommendations, always give 3-5 options with a personal reason for each.

IMPORTANT — links rules:
- Every recommendation item MUST have a "links" array with real, working URLs.
- For anime/manga: always include free sites first (animepahe.ru, gogoanime.gg, zoro.to, mangadex.org, tcbscans.com), then paid (crunchyroll.com, funimation.com).
- For movies/series: include free options (tubi.tv, pluto.tv, youtube.com if available), then paid (netflix.com, primevideo.com, disneyplus.com, hulu.com, max.com).
- For books/novels: include (archive.org, libgen.rs, readlightnovel.me) and paid (amazon.com, audible.com).
- For music: include (youtube.com, soundcloud.com, spotify.com).
- For games: include (store.steampowered.com, epicgames.com, itch.io).
- Always provide the full URL including https://.
- Never leave links empty.
Return ONLY valid JSON. No markdown fences.`;

export function searchPrompt(
  profile: Profile,
  query: string,
  intent: SearchIntent
): PromptPair {
  const user = `User profile: ${JSON.stringify(profile)}
Query: ${query}
Intent: ${intent}

Return JSON:
{ "answer": string, "items": [{ "title": string, "reason": string, "links": string[] }] }`;
  return { system: SEARCH_SYSTEM, user };
}

/**
 * Lightweight client-side intent guess so we don't spend an extra Claude call.
 * Falls back to "factual".
 */
export function classifyIntent(query: string): SearchIntent {
  const q = query.toLowerCase();
  if (/\b(recommend|suggest|what should i|best|watch|read|play)\b/.test(q))
    return "recommendation";
  if (/\b(how (do|to|can)|tutorial|guide|steps?)\b/.test(q)) return "how_to";
  if (/\b(news|latest|update|happening|today)\b/.test(q)) return "news";
  if (/\b(feel|sad|stressed|tired|anxious|motivat|lonely)\b/.test(q))
    return "emotional";
  return "factual";
}

// --- 3. Trivia Generation -------------------------------------------------

const TRIVIA_SYSTEM = `Generate 5 trivia questions based on the user's recent interests.
Make them specific, fun, and slightly challenging (not too easy).
Return ONLY valid JSON. No markdown.`;

export function triviaPrompt(topics: string[]): PromptPair {
  const user = `Recent topics: ${JSON.stringify(topics)}
Return JSON array:
[{ "question": string, "options": string[4], "correctIndex": number, "funFact": string }]`;
  return { system: TRIVIA_SYSTEM, user };
}

// --- 4. Break Prompt Generation -------------------------------------------

const BREAK_SYSTEM = `Generate a single wellness micro-activity for someone who has been browsing
for a long time. Keep it under 2 sentences. Warm, not preachy. Practical.
Return plain text only.`;

export function breakPrompt(
  minutes: number,
  time: string,
  previousPrompts: string[]
): PromptPair {
  const system = `${BREAK_SYSTEM}
Avoid repeating any of these previous prompts: ${JSON.stringify(previousPrompts)}`;
  const user = `Session duration: ${minutes} minutes. Time of day: ${time}.`;
  return { system, user };
}
