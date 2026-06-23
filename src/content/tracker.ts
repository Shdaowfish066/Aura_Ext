// Page visit + time tracker (content script, runs at document_idle on <all_urls>).
//
// Send design — "delta chunks", because the worker APPENDS every message to
// profile.visitHistory (so re-sending a cumulative total would double-count):
//   * A visible-time stopwatch starts once the page has fully loaded.
//   * We flush the seconds accumulated SINCE THE LAST FLUSH (a chunk) when:
//       1. the tab goes hidden (visibilitychange -> hidden) — the reliable
//          MV3 moment, since beforeunload can't run async work;
//       2. pagehide / beforeunload — best-effort final chunk (sendMessage is
//          fired synchronously and the response is ignored);
//       3. a 60s interval while visible — so very long sessions still get
//          recorded even if the tab is never hidden before the browser dies.
//   * After a successful hand-off the accumulator resets, so chunks sum to
//     the true visible time. Chunks under 5s are dropped as noise, which also
//     debounces rapid tab switching.
// No chrome.storage access here — the service worker owns all persistence.

import type { Visit } from "../types";

// --- Skip obviously useless pages -------------------------------------------
const isTrackable =
  (window.location.protocol === "http:" || window.location.protocol === "https:") &&
  window.location.hostname.length > 0;

// --- Topic classification (keyword matching, checked in this exact order) ---
function classifyTopic(): string {
  const host = window.location.hostname.toLowerCase();
  const title = document.title.toLowerCase();

  const hostHas = (...keys: string[]) => keys.some((k) => host.includes(k));

  // 1. Tech sites by hostname.
  if (hostHas("github", "stackoverflow", "dev.to", "hackernews", "ycombinator")) return "tech";
  // 2. Anime sites by hostname.
  if (hostHas("myanimelist", "anilist", "crunchyroll", "animenewsnetwork", "jikan")) return "anime";
  // 3. Music sites by hostname.
  if (hostHas("youtube", "spotify", "soundcloud")) return "music";
  // 4. Reddit: infer the topic from the title + pathname (e.g. /r/anime),
  //    using the same keyword families as the other rules; default "tech".
  if (host.includes("reddit")) {
    const hay = `${title} ${window.location.pathname.toLowerCase()}`;
    if (hay.includes("anime") || hay.includes("manga")) return "anime";
    if (hay.includes("music")) return "music";
    if (["gaming", "steam", "itch.io", "twitch"].some((k) => hay.includes(k))) return "gaming";
    if (["news", "breaking", "latest"].some((k) => hay.includes(k))) return "news";
    return "tech";
  }
  // 5. Gaming by title OR hostname keywords.
  if (["gaming", "steam", "itch.io", "twitch"].some((k) => title.includes(k) || host.includes(k)))
    return "gaming";
  // 6. News by title keywords.
  if (["news", "breaking", "latest"].some((k) => title.includes(k))) return "news";
  // 7. Fallback.
  return "general";
}

// --- Visible-time stopwatch ---------------------------------------------------
let accumulatedMs = 0; // visible time not yet flushed to the worker
let visibleSince: number | null = null; // timestamp of the current visible run

function pauseStopwatch() {
  if (visibleSince !== null) {
    accumulatedMs += Date.now() - visibleSince;
    visibleSince = null;
  }
}

function resumeStopwatch() {
  if (visibleSince === null && document.visibilityState === "visible") {
    visibleSince = Date.now();
  }
}

// Flush the accumulated chunk. Sub-5s chunks are dropped as noise.
function flushVisit() {
  pauseStopwatch(); // fold any running time into the accumulator
  const durationSeconds = Math.round(accumulatedMs / 1000);
  if (durationSeconds < 5) {
    resumeStopwatch(); // keep accumulating; nothing was handed off
    return;
  }
  const visit: Visit = {
    url: window.location.href,
    title: document.title,
    topic: classifyTopic(),
    durationSeconds,
    timestamp: Date.now(),
  };
  try {
    // Callback form: an asleep worker or a reloaded extension surfaces as
    // lastError / a thrown "Extension context invalidated" — silently dropped.
    chrome.runtime.sendMessage({ type: "aura-visit", visit }, () => void chrome.runtime.lastError);
    accumulatedMs = 0; // chunk handed off
  } catch {
    // Keep the accumulator so a later flush can retry with the full time.
  }
  resumeStopwatch();
}

function startTracking() {
  resumeStopwatch(); // begin counting now, if the tab is currently visible

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushVisit(); // pauses the stopwatch as a side effect
    } else {
      resumeStopwatch();
    }
  });

  // Best-effort final chunk; pagehide also covers bfcache navigations.
  window.addEventListener("pagehide", flushVisit);
  window.addEventListener("beforeunload", flushVisit);

  // Long sessions: periodic flush so time isn't lost if the browser dies.
  window.setInterval(flushVisit, 60_000);
}

if (isTrackable) {
  // Record the visit only once the page has fully loaded.
  if (document.readyState === "complete") startTracking();
  else window.addEventListener("load", startTracking, { once: true });
}

export {};
