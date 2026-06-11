"""Aura backend — FastAPI app serving the Chrome extension at 127.0.0.1:8000.

Run from the server/ directory:
    uvicorn main:app --port 8000
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import config
from routers import claude, feed, sync

app = FastAPI(title="Aura Backend", version=config.VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"chrome-extension://.*",
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(claude.router)
app.include_router(feed.router)
app.include_router(sync.router)


@app.get("/api/health")
async def health() -> dict[str, object]:
    return {"ok": True, "version": config.VERSION}
