// Background service worker — session timer, wellness nudges, visit tracking.
// Uses chrome.alarms (a setInterval won't survive worker suspension in MV3).

import type { Profile, SessionData, Visit } from "../types";
import {
  createDefaultSession,
  get,
  getWithDefault,
  resourceManager,
  sessionGet,
  sessionSet,
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

/** True only when the user is actually using Chrome right now: recent input
 *  (chrome.idle) AND a focused Chrome window. Without this gate the alarm
 *  counted wall-clock minutes — the session "never stopped". */
async function isUserActive(): Promise<boolean> {
  try {
    const state = await chrome.idle.queryState(180);
    if (state !== "active") return false;
    const win = await chrome.windows.getLastFocused();
    return win?.focused === true;
  } catch {
    return true; // fail open: better to slightly overcount than freeze
  }
}

async function tick() {
  const now = Date.now();
  let session = await ensureSession();

  // Reset at midnight (new calendar day).
  if (!sameDay(session.startTime, now)) {
    session = createDefaultSession(now);
    await set("session", session);
    return;
  }

  // Only count minutes the user actually spent in the browser.
  if (!(await isUserActive())) return;

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

/** Stamp the start of THIS browser session. Lives in chrome.storage.session,
 *  which Chrome clears when the browser closes or the extension is disabled —
 *  so the session clock genuinely resets, instead of accumulating forever. */
async function ensureSessionStart() {
  const existing = await sessionGet<number>("session_started_at");
  if (existing === undefined) {
    await sessionSet("session_started_at", Date.now());
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureSession();
  await ensureSessionStart();
  startAlarm();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureSession();
  await ensureSessionStart();
  startAlarm();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) {
    void tick();
    void sweepIdleTabs();
  }
});

// Visit tracking from the content script (it cannot touch storage directly).
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "aura-visit" && message.visit) {
    void appendVisit(message.visit as Visit).then(() => sendResponse({ ok: true }));
    return true; // async response
  }
  // Manual "snooze now" from the Resource Manager panel.
  if (message?.type === "aura-rm-discard" && typeof message.tabId === "number") {
    void discardTabNow(message.tabId).then((ok) => sendResponse({ ok }));
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

// ---------------------------------------------------------------------------
// Resource Manager (tab snoozer) — discards tabs idle ≥ N minutes to free RAM.
// Activity timestamps live in chrome.storage.session (per-browser-session,
// shared with extension pages) under "tab_activity": Record<tabId, ms>.
// ---------------------------------------------------------------------------

const TAB_ACTIVITY_KEY = "tab_activity";
const EST_MB_PER_TAB = 80; // heuristic RAM saved per discarded tab

type TabActivity = Record<number, number>;

async function getActivity(): Promise<TabActivity> {
  return (await sessionGet<TabActivity>(TAB_ACTIVITY_KEY)) ?? {};
}

async function stampTabs(tabIds: number[], at = Date.now()) {
  if (!tabIds.length) return;
  const activity = await getActivity();
  for (const id of tabIds) activity[id] = at;
  await sessionSet(TAB_ACTIVITY_KEY, activity);
}

async function removeActivity(tabId: number) {
  const activity = await getActivity();
  if (tabId in activity) {
    delete activity[tabId];
    await sessionSet(TAB_ACTIVITY_KEY, activity);
  }
}

/** Mark every open tab as just-active (install/startup baseline). */
async function seedAllTabs() {
  const tabs = await chrome.tabs.query({});
  const now = Date.now();
  const activity: TabActivity = {};
  for (const t of tabs) {
    if (t.id !== undefined) activity[t.id] = now;
  }
  await sessionSet(TAB_ACTIVITY_KEY, activity);
}

/** Only plain web pages may be discarded (never chrome://, extensions, etc.). */
function isHttpUrl(url: string | undefined): boolean {
  return !!url && (url.startsWith("http://") || url.startsWith("https://"));
}

function hostnameOf(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

async function bumpStats(discarded: number) {
  if (discarded <= 0) return;
  const stats = await resourceManager.getStats();
  await resourceManager.setStats({
    totalDiscarded: stats.totalDiscarded + discarded,
    estimatedMBSaved: stats.estimatedMBSaved + discarded * EST_MB_PER_TAB,
    lastSweepAt: Date.now(),
  });
}

/** Discard every eligible tab idle longer than the configured threshold. */
async function sweepIdleTabs() {
  const settings = await resourceManager.getSettings();
  if (!settings.enabled) return;

  const now = Date.now();
  const [tabs, activity] = await Promise.all([
    chrome.tabs.query({}),
    getActivity(),
  ]);
  const idleMs = settings.idleMinutes * 60_000;

  let discarded = 0;
  const unseen: number[] = []; // unknown tabs get seeded, not discarded

  for (const tab of tabs) {
    if (tab.id === undefined) continue;
    if (tab.active || tab.pinned || tab.audible || tab.discarded) continue;
    if (tab.autoDiscardable === false) continue;
    if (!isHttpUrl(tab.url)) continue;
    const host = hostnameOf(tab.url);
    if (host && settings.whitelist.includes(host)) continue;

    const lastActiveAt = activity[tab.id];
    if (lastActiveAt === undefined) {
      unseen.push(tab.id);
      continue;
    }
    if (now - lastActiveAt < idleMs) continue;

    try {
      await chrome.tabs.discard(tab.id);
      discarded += 1;
    } catch {
      /* tab vanished or Chrome refused — skip */
    }
  }

  if (unseen.length) await stampTabs(unseen, now);
  await bumpStats(discarded);
}

/** Manual "snooze now": same protections as the sweep, minus the idle check. */
async function discardTabNow(tabId: number): Promise<boolean> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.active || tab.pinned || tab.audible || tab.discarded) return false;
    if (!isHttpUrl(tab.url)) return false;
    await chrome.tabs.discard(tabId);
    await bumpStats(1);
    return true;
  } catch {
    return false;
  }
}

// --- Activity tracking listeners (top-level, MV3) ---------------------------

chrome.tabs.onActivated.addListener((activeInfo) => {
  void stampTabs([activeInfo.tabId]);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading" || changeInfo.audible !== undefined) {
    void stampTabs([tabId]);
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  void chrome.tabs
    .query({ active: true, windowId })
    .then((tabs) => {
      const id = tabs[0]?.id;
      if (id !== undefined) return stampTabs([id]);
    })
    .catch(() => undefined);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void removeActivity(tabId);
});

// Seed every existing tab as just-active so nothing is discarded immediately.
chrome.runtime.onInstalled.addListener(() => {
  void seedAllTabs();
});

chrome.runtime.onStartup.addListener(() => {
  void seedAllTabs();
});
