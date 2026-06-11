"""Gemini proxy endpoints: /api/claude (generic) and /api/search."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import config
from gemini import GeminiError, call_gemini
from prompts import classify_intent, search_prompt

router = APIRouter(prefix="/api", tags=["claude"])


class ClaudeRequest(BaseModel):
    system: str
    user: str
    maxTokens: int = 1000
    jsonMode: bool = False


class TextResponse(BaseModel):
    text: str


def _raise_for(err: GeminiError) -> None:
    if err.kind == "no_key":
        raise HTTPException(status_code=503, detail=str(err))
    raise HTTPException(status_code=502, detail=str(err))


@router.post("/claude", response_model=TextResponse)
async def proxy_claude(req: ClaudeRequest) -> TextResponse:
    """Generic Gemini proxy — the extension's callClaude, server-side."""
    if not config.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="Server has no GEMINI_API_KEY configured.")
    try:
        text = await call_gemini(
            req.system, req.user, max_tokens=req.maxTokens, json_mode=req.jsonMode
        )
    except GeminiError as err:
        _raise_for(err)
    return TextResponse(text=text)


class SearchRequest(BaseModel):
    query: str
    interests: list[str] = Field(default_factory=list)
    name: str = ""


@router.post("/search", response_model=TextResponse)
async def search(req: SearchRequest) -> TextResponse:
    """AI search — mirrors useSearch.ts (JSON mode, 800 max tokens)."""
    if not config.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="Server has no GEMINI_API_KEY configured.")
    profile = {"name": req.name, "interests": req.interests}
    system, user = search_prompt(profile, req.query.strip(), classify_intent(req.query))
    try:
        text = await call_gemini(system, user, max_tokens=800, json_mode=True)
    except GeminiError as err:
        _raise_for(err)
    return TextResponse(text=text)
