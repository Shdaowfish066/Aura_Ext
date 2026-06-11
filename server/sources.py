"""Content source fetchers — mirrors src/newtab/hooks/useFeed.ts.

Each fetcher returns a list of raw article dicts; failures yield [] so one
broken source never takes down the feed.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

import httpx

TIMEOUT = 10.0

# HN feed type per mood — completely different article pools
MOOD_HN_FEED: dict[str, str] = {
    "hyped":    "topstories",   # viral, exciting
    "good":     "newstories",   # fresh, unexplored
    "tired":    "askstories",   # discussions, easy reads
    "low":      "askstories",   # conversations, relatable
    "stressed": "showstories",  # people showing cool projects, distracting
}

# Dev.to tag per mood
MOOD_DEVTO_TAG: dict[str, str] = {
    "hyped":    "javascript",
    "good":     "webdev",
    "tired":    "beginners",
    "low":      "watercooler",
    "stressed": "productivity",
}

# Jikan genre IDs mapped to mood
MOOD_ANIME_GENRES: dict[str, int] = {
    "tired": 4,     # Comedy
    "low": 36,      # Slice of Life
    "stressed": 4,  # Comedy (light, easy)
    "hyped": 1,     # Action
    "good": 10,     # Fantasy (broad mix)
}

RawArticle = dict[str, Any]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def fetch_hackernews(client: httpx.AsyncClient, mood: str | None) -> list[RawArticle]:
    try:
        feed = MOOD_HN_FEED.get(mood, "topstories") if mood else "topstories"
        ids = (
            await client.get(f"https://hacker-news.firebaseio.com/v0/{feed}.json")
        ).json()

        async def fetch_item(item_id: int) -> Any:
            try:
                res = await client.get(
                    f"https://hacker-news.firebaseio.com/v0/item/{item_id}.json"
                )
                return res.json()
            except Exception:
                return None

        items = await asyncio.gather(*(fetch_item(i) for i in ids[:12]))
        return [
            {
                "id": f"hn-{i['id']}",
                "title": i["title"],
                "url": i.get("url") or f"https://news.ycombinator.com/item?id={i['id']}",
                "source": "Hacker News",
                "topic": "tech",
                "publishedAt": datetime.fromtimestamp(
                    i.get("time", 0), tz=timezone.utc
                ).isoformat(),
            }
            for i in items
            if i and i.get("title")
        ]
    except Exception:
        return []


async def fetch_devto(client: httpx.AsyncClient, mood: str | None) -> list[RawArticle]:
    try:
        tag = MOOD_DEVTO_TAG.get(mood, "") if mood else ""
        url = (
            f"https://dev.to/api/articles?per_page=10&tag={tag}"
            if tag
            else "https://dev.to/api/articles?per_page=10&top=1"
        )
        res = (await client.get(url)).json() or []
        return [
            {
                "id": f"devto-{a['id']}",
                "title": a["title"],
                "url": a["url"],
                "source": "Dev.to",
                "topic": "tech",
                "publishedAt": a.get("published_at") or _now_iso(),
                "imageUrl": a.get("cover_image") or None,
            }
            for a in res
        ]
    except Exception:
        return []


async def fetch_anime(client: httpx.AsyncClient, mood: str | None) -> list[RawArticle]:
    try:
        genre_id = MOOD_ANIME_GENRES.get(mood) if mood else None
        url = (
            f"https://api.jikan.moe/v4/anime?genres={genre_id}&order_by=score&sort=desc&limit=12"
            if genre_id
            else "https://api.jikan.moe/v4/top/anime?limit=12&filter=airing"
        )
        res = (await client.get(url)).json()
        return [
            {
                "id": f"anime-{a['mal_id']}",
                "title": a["title"],
                "url": a["url"],
                "source": "MyAnimeList",
                "topic": "anime",
                "publishedAt": (a.get("aired") or {}).get("from") or _now_iso(),
                "imageUrl": ((a.get("images") or {}).get("jpg") or {}).get("image_url"),
            }
            for a in (res.get("data") or [])
        ]
    except Exception:
        return []


async def fetch_sources(interests: list[str], mood: str | None) -> list[RawArticle]:
    """Fetch the right sources for the user's interests and interleave round-robin."""
    def has(*keys: str) -> bool:
        return any(k in interests for k in keys)

    want_tech = has("tech", "gaming", "science", "finance")
    want_anime = has("anime", "manga", "movies", "music")

    async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as client:
        jobs = []
        if want_tech or (not want_tech and not want_anime):
            jobs.append(fetch_hackernews(client, mood))
            jobs.append(fetch_devto(client, mood))
        if want_anime or (not want_tech and not want_anime):
            jobs.append(fetch_anime(client, mood))
        results = await asyncio.gather(*jobs)

    # Interleave round-robin so no single source dominates the top.
    flat: list[RawArticle] = []
    longest = max((len(r) for r in results), default=0)
    for i in range(longest):
        for r in results:
            if i < len(r):
                flat.append(r[i])
    return flat
