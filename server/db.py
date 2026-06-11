"""SQLite key/value persistence for profile + mood sync.

Single-user, tiny payloads — a kv table with parameterized queries is all we
need. The DB file lives next to this module (server/aura.db).
"""

from __future__ import annotations

import json
import sqlite3
import time
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).parent / "aura.db"


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init() -> None:
    conn = _connect()
    try:
        with conn:
            conn.execute(
                "CREATE TABLE IF NOT EXISTS kv ("
                "  key TEXT PRIMARY KEY,"
                "  value TEXT,"
                "  updated_at REAL"
                ")"
            )
    finally:
        conn.close()


def get_value(key: str) -> tuple[Any, float] | None:
    """Return (parsed JSON value, updated_at) or None when the key is absent."""
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT value, updated_at FROM kv WHERE key = ?", (key,)
        ).fetchone()
    finally:
        conn.close()
    if row is None:
        return None
    return json.loads(row["value"]), row["updated_at"]


def set_value(key: str, value: Any) -> None:
    """Upsert a JSON-serializable value."""
    conn = _connect()
    try:
        with conn:
            conn.execute(
                "INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value, "
                "updated_at = excluded.updated_at",
                (key, json.dumps(value), time.time()),
            )
    finally:
        conn.close()


# Create the table as soon as the module is imported.
init()
