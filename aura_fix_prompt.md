# Aura Extension — Fix All Issues

Read `CLAUDE.md` first to understand the architecture before touching any file.

Fix the following issues in order. After all fixes are done, run `npm run build` and confirm it succeeds with zero errors.

---

## Fix 1 — Manifest description too long (build is currently broken)

**File:** `manifest.json`

The `description` field is 140 characters but Chrome's limit is 132. Trim it to something like:

```
"AI-powered new tab: mood-tuned feed, AI search, wellness nudges, and mini games."
```

Confirm the new description is ≤ 132 characters before saving.

---

## Fix 2 — Implement the content script tracker

**File:** `src/content/tracker.ts`

This file is currently a stub (`console.log` + empty export). Implement it fully.

The tracker must:
1. Record a visit when the page becomes fully loaded (`document.readyState === 'complete'` or the `load` event).
2. Track time-on-page using `visibilitychange` + `beforeunload` to capture `durationSeconds` (how long the tab was visible, not just open).
3. Classify the page topic using keyword matching on `document.title` and `window.location.hostname`. Use this mapping:
   - hostname contains `github`, `stackoverflow`, `dev.to`, `hackernews`, `ycombinator` → `"tech"`
   - hostname contains `myanimelist`, `anilist`, `crunchyroll`, `animenewsnetwork`, `jikan` → `"anime"`
   - hostname contains `youtube`, `spotify`, `soundcloud` → `"music"`
   - hostname contains `reddit` → check the title/pathname for topic keywords; default to `"tech"`
   - title or hostname contains `gaming`, `steam`, `itch.io`, `twitch` → `"gaming"`
   - title contains news-related keywords (`news`, `breaking`, `latest`) → `"news"`
   - fallback → `"general"`
4. Send the visit to the background service worker via `chrome.runtime.sendMessage`:

```typescript
chrome.runtime.sendMessage({
  type: "aura-visit",
  visit: {
    url: window.location.href,
    title: document.title,
    topic: classifiedTopic,
    durationSeconds: elapsed,
    timestamp: Date.now(),
  }
});
```

The `Visit` type is already defined in `src/types/index.ts` — import and use it.

The background service worker already has a handler for `"aura-visit"` messages that appends to `profile.visitHistory` — no changes needed there.

Do NOT use `chrome.storage` directly from the content script (see `CLAUDE.md` — content scripts must talk through the background worker).

---

## Fix 3 — Remove API key exposure from the client bundle

**Context:** `VITE_GEMINI_API_KEY` in `.env.local` gets inlined into the built JS bundle by Vite. Anyone who installs the extension can read the key from the bundle. The FastAPI backend exists to avoid this — all AI calls should go through `http://127.0.0.1:8000`.

**Files to change:**

### `src/claude/client.ts`
- Remove the `API_KEY` constant and the `VITE_GEMINI_API_KEY` env read entirely.
- Change `hasApiKey()` to always return `false` — the direct Gemini path is intentionally disabled; the backend is the only AI path.
- Keep `callClaude`, `callClaudeJSON`, `isOnline`, and `ClaudeError` in the file so the rest of the codebase keeps compiling, but make `callClaude` throw a `ClaudeError` with `kind: "no_key"` and the message `"Direct API calls disabled — backend required."` instead of making a real request.
- Add a comment at the top of the file explaining why: `// Direct Gemini calls are intentionally disabled. All AI goes through the FastAPI backend (src/api/client.ts) to keep the API key out of the extension bundle.`

### `.env.example`
- Remove the `VITE_GEMINI_API_KEY` line. Add a comment that the key now lives only in `server/.env`.

**Important:** The backend-first fallback in `useFeed.ts` and `useSearch.ts` already tries the FastAPI server first, and only falls back to `callClaudeJSON` when the server is down. With this change, that fallback will show the "AI curation unavailable" message instead of calling Gemini directly — that is the correct behaviour.

---

## Fix 4 — Remove piracy site links from search prompts

**Files:** `src/claude/prompts.ts` AND `server/prompts.py`

Both files have a `SEARCH_SYSTEM` prompt that hardcodes specific piracy sites (e.g. `animepahe.ru`, `gogoanime.gg`, `tcbscans.com`, `libgen.rs`). This would get the extension rejected from the Chrome Web Store.

Replace the `IMPORTANT — links rules` section in both files with:

```
IMPORTANT — links rules:
- Every recommendation item MUST have a "links" array with real, working URLs.
- Always prefer legitimate, widely available platforms (YouTube, Spotify, Crunchyroll, Steam, Amazon, etc.).
- Always provide the full URL including https://.
- Never leave links empty.
```

Make this identical change in both `src/claude/prompts.ts` and `server/prompts.py`.

---

## Fix 5 — Deduplicate `stripFences`

**Files:** `src/claude/client.ts`, `src/newtab/hooks/useSearch.ts`

The `stripFences` function is copy-pasted in both files. 

- In `src/claude/client.ts`, change `function stripFences` to `export function stripFences`.
- In `src/newtab/hooks/useSearch.ts`, remove the local `stripFences` definition and import it from `../../claude/client`.

---

## Fix 6 — Fix the `any` cast in feed curation

**File:** `src/newtab/hooks/useFeed.ts`

Find the section in `curate()` where articles are sorted by `_rank`. Replace the `(item as any)._rank` pattern with a proper local type:

```typescript
type RankedItem = FeedItem & { _rank: number };
```

Use this type for the intermediate array so the sort and the final `.map(({ _rank, ...item }) => item as FeedItem)` are type-safe. No runtime behaviour change.

---

## Fix 7 — Fix synchronous SQLite in async FastAPI routes

**File:** `server/db.py`

The current code uses blocking `sqlite3.connect()` inside a FastAPI app, which blocks the async event loop during every DB read/write.

Replace the implementation to use `asyncio.to_thread()` to run the blocking SQLite calls in a thread pool. The public API (`get_value`, `set_value`, `init`) should become `async` functions. Update `server/routers/sync.py` to `await` these calls accordingly.

Example pattern:
```python
import asyncio

async def get_value(key: str) -> tuple[Any, float] | None:
    return await asyncio.to_thread(_get_value_sync, key)

def _get_value_sync(key: str) -> tuple[Any, float] | None:
    conn = _connect()
    try:
        row = conn.execute("SELECT value, updated_at FROM kv WHERE key = ?", (key,)).fetchone()
    finally:
        conn.close()
    if row is None:
        return None
    return json.loads(row["value"]), row["updated_at"]
```

Apply the same pattern to `set_value`. Keep `init()` synchronous (it runs at import time, before the event loop starts).

---

## Fix 8 — Update the README to reflect Gemini (not Claude)

**File:** `README.md`

The README says "Built with the Anthropic Claude API" and the table says `AI Layer: Anthropic Claude API`. The actual AI layer is Google Gemini.

- Change all references to "Anthropic Claude API" → "Google Gemini API"
- In the tech stack table, change `Anthropic Claude API` → `Google Gemini API (gemini-2.5-flash)`
- In the "How Claude Powers Aura" section, rename the heading to "How Gemini Powers Aura" and update the column header from "What Claude Does" to "What Gemini Does"
- In the footer line, change "Built with Claude." → "Built with Gemini."
- In the Environment Variables section, update `VITE_ANTHROPIC_API_KEY` (if present) to reflect the correct key name, and note that the key now lives only in `server/.env`

---

## Verification

After all fixes, run:

```bash
npm run build
```

Expected: build succeeds, zero TypeScript errors, `dist/` is populated. The manifest step should pass (description ≤ 132 chars). The extension should be loadable at `chrome://extensions` → Load unpacked → select `dist/`.
