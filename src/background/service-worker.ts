// Background service worker — session timer, wellness nudges, visit tracking.
// Uses chrome.alarms (a setInterval won't survive worker suspension in MV3).

import type { Profile, SessionData, Visit } from "../types";
import {
  createDefaultSession,
  get,
  getWithDefault,
  set,
} from "../storage";

const ALARM = "aura-tick";

// Nudge thresholds in minutes → escalating level (CLAUDE.md).
const NUDGES: { minutes: number; level: 1 | 2 | 3 }[] = [
  { minutes: 90, level: 1 },
  { minutes: 180, level: 2 },
  { minutes: 270, level: 3 },
];

function sameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.toDateString() === db.toDateString();
}

async function ensureSession(): Promise<SessionData> {
  const existing = await get("session");
  if (existing) return existing;
  const fresh = createDefaultSession(Date.now());
  await set("session", fresh);
  return fresh;
}

async function tick() {
  const now = Date.now();
  let session = await ensureSession();

  // Reset at midnight (new calendar day).
  if (!sameDay(session.startTime, now)) {
    session = createDefaultSession(now);
  }

  session.totalMinutesToday += 1;

  // Escalate nudges as thresholds are crossed.
  for (const { minutes, level } of NUDGES) {
    if (session.totalMinutesToday >= minutes && session.nudgeLevel < level) {
      session.nudgeLevel = level;
      session.lastNudgeAt = now;
      try {
        await chrome.runtime.sendMessage({ type: "aura-nudge", level });
      } catch {
        /* no listener (no open new tab) — the new tab reads nudgeLevel from storage */
      }
    }
  }

  await set("session", session);
}

function startAlarm() {
  chrome.alarms.create(ALARM, { periodInMinutes: 1 });
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureSession();
  startAlarm();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureSession();
  startAlarm();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) void tick();
});

// Visit tracking from the content script (it cannot touch storage directly).
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "aura-visit" && message.visit) {
    void appendVisit(message.visit as Visit).then(() => sendResponse({ ok: true }));
    return true; // async response
  }
  return false;
});

async function appendVisit(visit: Visit) {
  const profile = await get("profile");
  if (!profile) return;
  const visitHistory = [...(profile.visitHistory ?? []), visit].slice(-50);
  const next: Profile = { ...profile, visitHistory };
  await set("profile", next);
}
