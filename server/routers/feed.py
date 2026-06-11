"""/api/feed — source aggregation + Gemini curation with an in-memory TTL cache.

Mirrors the curation flow in src/newtab/hooks/useFeed.ts.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import config
from gemini import GeminiError, call_gemini
from prompts import feed_curation_prompt
from sources import fetch_sources

router = APIRouter(prefix="/api", tags=["feed"])

CACHE_TTL_SECONDS = 30 * 60  # re-curate at most every 30 min
MAX_TO_CURATE = 14           # cap Gemini input to stay within free tier


class FeedRequest(BaseModel):
    interests: list[str] = Field(default_factory=list)
    mood: str | None = None
    name: str = ""
    browsingGoal: str = "discover"
    force: bool = False


class FeedItem(BaseModel):
    id: str
    title: str
    url: str
    source: str
    topic: str
    publishedAt: str
    claudeCaption: str
    moodFit: list[str]
    imageUrl: str | None = None


class FeedResponse(BaseModel):
    items: list[FeedItem]
    aiUsed: bool
    errorMessage: str | None
    cached: bool


# cache key (sorted interests tuple, mood) -> (timestamp, FeedResponse-without-cached)
_cache: dict[tuple[tuple[str, ...], str | None], tuple[float, dict[str, Any]]] = {}


def _fallback_items(raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {**a, "claudeCaption": f"Trending on {a['source']}", "moodFit": []}
        for a in raw
    ]


async def _curate(
    raw: list[dict[str, Any]], profile: dict[str, Any], mood: str | None
) -> tuple[list[dict[str, Any]], bool, str | None]:
    """Return (items, ai_used, error_message). Mirrors curate() in useFeed.ts."""
    subset = raw[:MAX_TO_CURATE]
    if not config.GEMINI_API_KEY:
        return (
            _fallback_items(subset),
            False,
            "AI curation is off — server has no Gemini key",
        )
    try:
        hour = datetime.now().hour
        system, user = feed_curation_prompt(profile, mood, hour, subset)
        text = await call_gemini(system, user, max_tokens=1200, json_mode=True)
        curated: list[dict[str, Any]] = json.loads(text)
        by_id = {c.get("id"): c for c in curated}
        ranked = []
        for a in subset:
            c = by_id.get(a["id"])
            ranked.append(
                (
                    c.get("rank", 999) if c else 999,
                    {
                        **a,
                        "claudeCaption": (c or {}).get("claudeCaption")
                        or f"Trending on {a['source']}",
                        "moodFit": (c or {}).get("moodFit") or [],
                    },
                )
            )
        ranked.sort(key=lambda pair: pair[0])
        return [item for _, item in ranked], True, None
    except (GeminiError, json.JSONDecodeError, TypeError, AttributeError):
        logging.exception("Feed curation failed; serving unranked fallback")
        return (
            _fallback_items(subset),
            False,
            "AI curation unavailable right now — showing unranked picks",
        )


@router.post("/feed", response_model=FeedResponse)
async def get_feed(req: FeedRequest) -> FeedResponse:
    key = (tuple(sorted(req.interests)), req.mood)

    if not req.force:
        hit = _cache.get(key)
        if hit and time.time() - hit[0] < CACHE_TTL_SECONDS:
            return FeedResponse(**hit[1], cached=True)

    raw = await fetch_sources(req.interests, req.mood)
    if not raw:
        raise HTTPException(status_code=502, detail="no sources reachable")

    profile = {
        "name": req.name,
        "interests": req.interests,
        "browsingGoal": req.browsingGoal,
    }
    items, ai_used, error_message = await _curate(raw, profile, req.mood)

    payload = {"items": items, "aiUsed": ai_used, "errorMessage": error_message}
    _cache[key] = (time.time(), payload)
    return FeedResponse(**payload, cached=False)
