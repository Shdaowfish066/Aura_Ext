# Aura — AI Browser Companion

Chrome MV3 extension that replaces the new tab with an AI companion: ask
anything, get a mood-tuned feed, themed ambience. React 18 + TypeScript +
Vite (`vite-plugin-web-extension`) + Tailwind 3 + framer-motion 11, with an
optional FastAPI backend (`server/`) for AI proxying, feed curation, and
profile sync.

## Commands

- `npm run build` — tsc + vite → `dist/` (load unpacked at chrome://extensions)
- Backend: `cd server; .venv\Scripts\activate; uvicorn main:app --port 8000`
  (see `server/README.md`; Gemini key lives in `server/.env`)
- Runtime verification: scripts in `.verify/` drive the built extension with
  puppeteer-core + **Chrome for Testing** (`~/.cache/puppeteer/...`) — branded
  Chrome ≥137 silently ignores `--load-extension`.

## Architecture

- `src/newtab/` — the dashboard (React). `App.tsx` owns layout; hooks own data.
- `src/background/service-worker.ts` — alarms (1-min tick), idle-gated daily
  minutes, nudges, tab-activity tracking + (shelved) idle-tab discard sweep.
- `src/storage/index.ts` — typed chrome.storage.local wrapper (single schema,
  always `await` writes) + `sessionGet/Set` for chrome.storage.session.
- `src/api/client.ts` — FastAPI client. **Backend-first with graceful
  fallback**: every AI/feed call tries `http://127.0.0.1:8000` and falls back
  to direct fetches + client Gemini (or unranked captions) when the server is
  down. Never let the new tab break because the backend is off.
- `src/claude/` — prompts + direct Gemini client (the fallback path).
- `server/` — FastAPI: `/api/feed` (aggregate HN/Dev.to/Jikan + Gemini curation
  + 30-min cache), `/api/claude`, `/api/search`, `/api/sync/*` (SQLite).

## Design system (learned through iteration — keep these)

**Layout hierarchy (hero-first, AI companion not widget grid):**
1. TopNav — slim: numbered theme quick-picks · logo · Gallery
2. Top grid: **SystemMonitor** (left, live CPU/RAM/battery via chrome.system.*,
   GPU model only — usage isn't exposed to extensions) · **HERO** (greeting →
   Ask Aura bar, the one primary interaction → MoodRow) · **Today card**
   (right: analog clock + session countdown + topics)
3. FEED — full-width horizontal marquee strip at the bottom
- Unused-but-kept components: FooterRail, MoodWidget, SearchBar,
  ResourcePlaceholder, ResourceManagerPanel (revival candidates)

**Visual tiers — differentiation is intentional, don't flatten them:**
- `.glass-strong` — brightest glass; **reserved for Ask Aura only**
- `.glass-card` — secondary surfaces (has a dark underlay for contrast
  against the glowing backdrop)
- bare `border-hairline` chips — tertiary/utility

**Hard-won rendering rules:**
- NEVER use CSS `filter: blur()` for large background glows — Chrome clips it
  to a square region ("square light" bug). Paint glows as radial-gradients.
- Keep `backdrop-filter` saturation ≤ ~120%: higher values re-light the
  backdrop inside each card's rectangle (boxy bright patches).
- No outer `--glow` box-shadow halos on hover for rect-ish cards (traces the
  rectangle); use elevation shadows. Focus glow on the Ask bar is the one
  exception (intentional spotlight). Feed cards: NO hover glow at all
  (user preference) — just the bubbly spring lift/scale + brighter border.
- Analog clock hands: derive angles from a monotonically increasing local
  epoch (`localMs / unit * deg`) — `seconds * 6` makes the hand spin backward
  at the top of each minute.
- framer-motion: import `m` (LazyMotion/domAnimation in main.tsx), not
  `motion`. Respect reduced motion: every CSS animation class must be listed
  in the `prefers-reduced-motion` block in `index.css`.
- Inline `onClose`-style props change identity every parent render (the
  dashboard re-renders each clock second) — never put them in effect deps
  that reset interaction state (caused the gallery hover-reveal bug).

**Theming:** `src/newtab/themes/index.ts` is the single source of truth — 7
themes as data (CSS vars + backdrop kind + blob colors). `applyTheme()` sets
inline vars on `<html>`; main.tsx applies the persisted theme pre-render
(no flash). Backdrop per-theme layers + ambient particles (petals/leaves fall,
motes rise). Theme logo watermark: drop files in `public/logos/<id>.png`
(see README there); built-in SVG marks are the fallback.

**Session semantics (user-decided, don't regress):**
- Session clock = countdown from `screenTimeGoalMinutes` to zero, per browser
  session; start stamped in `chrome.storage.session` (cleared on browser
  close / extension disable). NO daily carryover in the UI.
- Daily idle-gated minutes still accumulate in the worker (nudges only).

**Feed strip:** auto-marquee 0.22 px/frame (calm), seamless wrap via
duplicated items, drag with flick momentum + wheel inertia (`useMarquee`
physics: friction 0.94), scroller has `pt-3/-mt-3` headroom so hover lift
isn't clipped. Mood changes re-curate; fresh cache + unchanged mood must NOT
call Gemini (quota guard via `feed_curated_mood`).

## Gotchas

- Gemini free tier: ~20 req/min — most "AI unavailable" chips during testing
  are 429s, not bugs. The UI must always surface (never swallow) AI failures.
- Resource Manager is shelved: panel replaced by FooterRail chip, auto-sweep
  defaults OFF (`createDefaultResourceSettings`), code kept under
  `components/Resource/` + worker for future rework.
- Real API keys: `server/.env` (server) and `.env.local` (client fallback +
  committed once — regenerate before sharing).
- Layout must stay fluid for ultrawide (34" = 3440px): no fixed max-width
  caps on the main container; gutters scale via `xl:px-14 2xl:px-24`.
