"""/api/sync/* — profile and mood persistence backed by the SQLite kv store."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

import db

router = APIRouter(prefix="/api/sync", tags=["sync"])

PROFILE_KEY = "profile"
MOOD_KEY = "mood"


class OkResponse(BaseModel):
    ok: bool = True


@router.get("/profile")
async def get_profile() -> dict[str, Any]:
    stored = await db.get_value(PROFILE_KEY)
    if stored is None:
        return {"exists": False}
    profile, updated_at = stored
    return {"exists": True, "profile": profile, "updatedAt": updated_at}


@router.put("/profile", response_model=OkResponse)
async def put_profile(profile: dict[str, Any]) -> OkResponse:
    await db.set_value(PROFILE_KEY, profile)
    return OkResponse()


class MoodHistoryEntry(BaseModel):
    mood: str | None
    timestamp: int


class MoodState(BaseModel):
    current: str | None = None
    history: list[MoodHistoryEntry] = Field(default_factory=list)


@router.get("/mood", response_model=MoodState)
async def get_mood() -> MoodState:
    stored = await db.get_value(MOOD_KEY)
    if stored is None:
        return MoodState()
    value, _ = stored
    return MoodState(**value)


@router.put("/mood", response_model=OkResponse)
async def put_mood(state: MoodState) -> OkResponse:
    await db.set_value(MOOD_KEY, state.model_dump())
    return OkResponse()
