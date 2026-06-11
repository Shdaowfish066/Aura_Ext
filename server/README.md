# Aura Backend

FastAPI server for the Aura new-tab extension. Owns the Gemini API key
(proxy), feed aggregation + AI curation with a 30-minute cache, and
profile/mood sync persistence (SQLite).

## Setup (Windows PowerShell, run from `server/`)

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --port 8000
```

The server listens on `http://127.0.0.1:8000`.

## Configuration

All config is environment-based (loaded from `server/.env` locally):

| Variable         | Default            | Purpose                       |
| ---------------- | ------------------ | ----------------------------- |
| `GEMINI_API_KEY` | (required for AI)  | Gemini API key, server-side   |
| `GEMINI_MODEL`   | `gemini-2.5-flash` | Gemini model id               |
| `HOST` / `PORT`  | `127.0.0.1` / `8000` | Bind address                |

## Endpoints

- `GET  /api/health` — liveness + version
- `POST /api/claude` — generic Gemini proxy `{ system, user, maxTokens, jsonMode }` → `{ text }`
- `POST /api/feed` — `{ interests, mood, name, browsingGoal, force }` → `{ items, aiUsed, errorMessage, cached }`
- `POST /api/search` — `{ query, interests, name }` → `{ text }` (JSON string)
- `GET/PUT /api/sync/profile` — profile persistence
- `GET/PUT /api/sync/mood` — mood current + history persistence

## Hosting later

No code changes needed: set `GEMINI_API_KEY`, `HOST=0.0.0.0`, and `PORT` in
the deployment environment (the `.env` file is optional — real env vars win),
run `uvicorn main:app --host $HOST --port $PORT` behind your platform's
process manager. SQLite file `aura.db` lives next to the code; mount a
persistent volume for it. CORS already allows `chrome-extension://` origins.
