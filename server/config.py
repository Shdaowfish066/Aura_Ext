"""Server configuration. All values come from the environment (server/.env).

Hosting later is config-only: set GEMINI_API_KEY / HOST / PORT in the
deployment environment instead of the .env file.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Load server/.env (sits next to this file) without overriding real env vars.
load_dotenv(Path(__file__).parent / ".env", override=False)

GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
HOST: str = os.environ.get("HOST", "127.0.0.1")
PORT: int = int(os.environ.get("PORT", "8000"))

VERSION: str = "0.1.0"
