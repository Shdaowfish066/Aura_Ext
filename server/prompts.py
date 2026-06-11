"""AI prompt templates — faithful port of src/claude/prompts.ts."""

from __future__ import annotations

import json
from typing import Any

MOOD_INSTRUCTIONS: dict[str, str] = {
    "hyped":    "The user is HYPED. Prioritize exciting, intense, hype-worthy content. Captions should be energetic, use exclamation, reference what makes this a banger. Surface the most action-packed, viral, or mind-blowing picks first.",
    "tired":    "The user is TIRED. Prioritize light, easy, low-effort content — short reads, funny stuff, feel-good stories. Captions should be warm, gentle, reassuring. Avoid anything heavy or demanding.",
    "stressed": "The user is STRESSED. Surface distraction content — interesting projects, funny things, creative work that takes their mind off things. Captions should be calming and encouraging. Avoid news or heavy topics.",
    "low":      "The user is feeling LOW. Surface cozy, comforting, relatable content — slice-of-life, heartwarming, community discussions. Captions should be empathetic and gentle. Skip anything negative or stressful.",
    "good":     "The user is feeling GOOD. Surface a broad, exciting mix — fresh discoveries, deep reads, things to explore. Captions should be enthusiastic and curious.",
}

FEED_SYSTEM = """You are Aura's feed curator. You deeply understand this user's interests and mood.
Your job is to pick the TOP 8 articles from the list and write a compelling personal caption for each.
Captions must reflect BOTH the user's interests AND their current mood — they should feel NOTICEABLY DIFFERENT for different moods.
Do NOT just re-rank. Rewrite captions entirely based on the mood instruction you are given.
Be specific. Reference the user's actual interests. Never be generic.
Return ONLY valid JSON. No markdown, no explanation."""


def feed_curation_prompt(
    profile: dict[str, Any],
    mood: str | None,
    hour: int,
    articles: list[dict[str, Any]],
) -> tuple[str, str]:
    """Return (system, user) for feed curation."""
    mood_instruction = (
        MOOD_INSTRUCTIONS.get(mood, "")
        if mood
        else "No mood set — use a neutral, informative tone."
    )
    user = f"""User profile: {json.dumps(profile)}
Current mood: {mood if mood is not None else "none"}
Mood instruction (FOLLOW THIS STRICTLY): {mood_instruction}
Time of day: {hour} (0-23)
Raw articles: {json.dumps(articles)}

Return JSON array of exactly 8 items, ranked by mood relevance:
[{{ "id": string, "claudeCaption": string, "moodFit": string[], "rank": number }}]"""
    return FEED_SYSTEM, user


SEARCH_SYSTEM = """You are Aura, a personal AI search engine. You know this user's taste.
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
Return ONLY valid JSON. No markdown fences."""


def search_prompt(
    profile: dict[str, Any], query: str, intent: str
) -> tuple[str, str]:
    """Return (system, user) for AI search."""
    user = f"""User profile: {json.dumps(profile)}
Query: {query}
Intent: {intent}

Return JSON:
{{ "answer": string, "items": [{{ "title": string, "reason": string, "links": string[] }}] }}"""
    return SEARCH_SYSTEM, user


def classify_intent(query: str) -> str:
    """Lightweight intent guess — mirrors classifyIntent in prompts.ts."""
    import re

    q = query.lower()
    if re.search(r"\b(recommend|suggest|what should i|best|watch|read|play)\b", q):
        return "recommendation"
    if re.search(r"\b(how (do|to|can)|tutorial|guide|steps?)\b", q):
        return "how_to"
    if re.search(r"\b(news|latest|update|happening|today)\b", q):
        return "news"
    if re.search(r"\b(feel|sad|stressed|tired|anxious|motivat|lonely)\b", q):
        return "emotional"
    return "factual"
