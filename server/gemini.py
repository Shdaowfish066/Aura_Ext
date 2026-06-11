"""Async Gemini client — mirrors src/claude/client.ts exactly.

POSTs to the generateContent REST endpoint with a system_instruction and a
single user turn, thinking disabled, optional JSON response mime type.
"""

from __future__ import annotations

import re
from typing import Any

import httpx

import config


class GeminiError(Exception):
    """Raised on missing key, upstream HTTP failure, or empty response."""

    def __init__(self, message: str, kind: str = "http", status: int | None = None):
        super().__init__(message)
        self.kind = kind
        self.status = status


def _endpoint() -> str:
    return (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{config.GEMINI_MODEL}:generateContent"
    )


def _extract_text(data: Any) -> str | None:
    """Extract the first non-thinking text part (mirrors extractText)."""
    try:
        parts = data["candidates"][0]["content"]["parts"]
    except (KeyError, IndexError, TypeError):
        return None
    for part in parts:
        if not part.get("thought") and isinstance(part.get("text"), str):
            return part["text"]
    return None


_FENCE_RE = re.compile(r"^```(?:json)?\s*([\s\S]*?)\s*```$", re.IGNORECASE)


def strip_fences(text: str) -> str:
    """Strip ```json ... ``` fences the model sometimes adds (mirrors stripFences)."""
    trimmed = text.strip()
    match = _FENCE_RE.match(trimmed)
    return (match.group(1) if match else trimmed).strip()


async def call_gemini(
    system: str,
    user: str,
    max_tokens: int = 1000,
    json_mode: bool = False,
) -> str:
    """Send one system+user turn to Gemini and return the first candidate's text.

    When json_mode is true the response mime type is set to application/json
    and any markdown fences are stripped from the returned text.
    """
    if not config.GEMINI_API_KEY:
        raise GeminiError("Server has no GEMINI_API_KEY configured.", kind="no_key")

    generation_config: dict[str, Any] = {
        "maxOutputTokens": max_tokens,
        # Disable thinking budget for structured JSON tasks — faster + cheaper
        "thinkingConfig": {"thinkingBudget": 0},
    }
    if json_mode:
        generation_config["responseMimeType"] = "application/json"

    body = {
        "system_instruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": generation_config,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                _endpoint(),
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": config.GEMINI_API_KEY,
                },
                json=body,
            )
        except httpx.HTTPError as exc:
            raise GeminiError(f"Gemini request failed: {exc}", kind="http") from exc

    if response.status_code != 200:
        detail = ""
        try:
            detail = response.json().get("error", {}).get("message", "")
        except Exception:
            pass
        raise GeminiError(
            f"Gemini API error {response.status_code}" + (f": {detail}" if detail else ""),
            kind="http",
            status=response.status_code,
        )

    text = _extract_text(response.json())
    if not isinstance(text, str):
        raise GeminiError("Gemini returned an empty response.", kind="parse")
    return strip_fences(text) if json_mode else text
