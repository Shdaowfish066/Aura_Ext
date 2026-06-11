// Runtime verification driver: loads dist/ as an unpacked extension in real
// Chrome, drives the new tab page, and captures screenshots + console errors.
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");
const OUT = path.join(ROOT, ".verify", "shots");
// Chrome for Testing — branded Chrome 137+ ignores --load-extension.
const CHROME =
  "C:\\Users\\Windows 11\\.cache\\puppeteer\\chrome\\win64-149.0.7827.55\\chrome-win64\\chrome.exe";

mkdirSync(OUT, { recursive: true });
const userDataDir = path.join(os.tmpdir(), `aura-verify-${Date.now()}`);

const consoleLog = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  userDataDir,
  args: [
    `--disable-extensions-except=${DIST}`,
    `--load-extension=${DIST}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1600,900",
  ],
  defaultViewport: { width: 1600, height: 900 },
});

try {
  // Find the extension id via its MV3 service worker target.
  let extensionId = null;
  for (let i = 0; i < 40 && !extensionId; i++) {
    for (const t of browser.targets()) {
      const url = t.url();
      if (url.startsWith("chrome-extension://")) {
        extensionId = new URL(url).hostname;
        break;
      }
    }
    if (!extensionId) await sleep(250);
  }
  if (!extensionId) throw new Error("Extension service worker never appeared");
  console.log("EXTENSION_ID=" + extensionId);

  const newtabUrl = `chrome-extension://${extensionId}/src/newtab/index.html`;
  const page = await browser.newPage();
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type()))
      consoleLog.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => consoleLog.push(`[pageerror] ${err.message}`));

  // --- 1. Fresh install → onboarding Welcome -------------------------------
  await page.goto(newtabUrl, { waitUntil: "networkidle2", timeout: 30000 });
  await sleep(2500); // let stagger animations land
  await page.screenshot({ path: path.join(OUT, "01-welcome.png") });

  // --- 2. Click CTA → name step --------------------------------------------
  const cta = await page.$$eval("button", (btns) => {
    const b = btns.find((x) => x.textContent.includes("set you up"));
    if (b) b.click();
    return !!b;
  });
  console.log("WELCOME_CTA_FOUND=" + cta);
  await sleep(1200);
  await page.screenshot({ path: path.join(OUT, "02-name-step.png") });

  // Type a name and continue to interests step.
  const input = await page.$("input");
  if (input) {
    await input.type("Tahsan", { delay: 40 });
    await page.keyboard.press("Enter");
    await sleep(1200);
    await page.screenshot({ path: path.join(OUT, "03-interests-step.png") });
    // Pick three interests
    await page.$$eval("button", (btns) => {
      for (const label of ["Anime", "Tech", "Gaming"]) {
        const b = btns.find((x) => x.textContent.trim().includes(label));
        if (b) b.click();
      }
    });
    await sleep(800);
    await page.screenshot({ path: path.join(OUT, "04-interests-picked.png") });
  } else {
    console.log("NAME_INPUT_NOT_FOUND");
  }

  // --- 3. Seed a completed profile + mood, reload → dashboard --------------
  await page.evaluate(async () => {
    await chrome.storage.local.set({
      profile: {
        name: "Tahsan",
        interests: ["anime", "tech", "gaming"],
        browsingGoal: "discover",
        screenTimeGoalMinutes: 240,
        visitHistory: [],
        topTopics: [],
        setupComplete: true,
      },
      mood_current: null,
      theme: "aura",
    });
  });
  await page.reload({ waitUntil: "networkidle2", timeout: 45000 });
  await sleep(4000); // feed fetch + entrance animations
  await page.screenshot({ path: path.join(OUT, "05-dashboard-aura.png") });

  // Dashboard structure assertions
  const checks = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      greeting: text.includes("Tahsan"),
      resourceManager: /resource manager/i.test(text),
      feedHeader: /your feed/i.test(text),
      moodQuestion: /how are you feeling/i.test(text),
      feedCards: document.querySelectorAll("a[href]").length,
      moodTint: getComputedStyle(document.documentElement).getPropertyValue(
        "--mood-tint"
      ),
      themeAttr: document.documentElement.dataset.theme,
    };
  });
  console.log("DASHBOARD_CHECKS=" + JSON.stringify(checks));

  // --- 4. Click a mood → widget feedback + tint ----------------------------
  await page.$$eval("button", (btns) => {
    const b = btns.find((x) => x.textContent.includes("Hyped"));
    if (b) b.click();
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(OUT, "06-mood-hyped.png") });
  const moodState = await page.evaluate(() => ({
    tint: getComputedStyle(document.documentElement).getPropertyValue(
      "--mood-tint"
    ),
    bodyHasReshuffleOrTuned: /re-curating|tuned|unranked|curation/i.test(
      document.body.innerText
    ),
  }));
  console.log("MOOD_STATE=" + JSON.stringify(moodState));
  await sleep(6000); // let re-curation finish
  await page.screenshot({ path: path.join(OUT, "07-mood-settled.png") });

  // --- 5. Theme switching (live, via picker storage path) -------------------
  for (const t of ["spiderman", "batman", "anime", "daylight"]) {
    await page.evaluate(async (id) => {
      await chrome.storage.local.set({ theme: id });
    }, t);
    await sleep(1500); // onChange -> applyTheme + body crossfade
    await page.screenshot({ path: path.join(OUT, `08-theme-${t}.png`) });
  }
  const themeAfter = await page.evaluate(() => ({
    attr: document.documentElement.dataset.theme,
    bg: getComputedStyle(document.body).backgroundColor,
    accent: getComputedStyle(document.documentElement).getPropertyValue(
      "--accent-primary"
    ),
  }));
  console.log("THEME_AFTER=" + JSON.stringify(themeAfter));

  // --- 5b. New design: TopNav hover-reveal + Theme Gallery -------------------
  await page.evaluate(async () => {
    await chrome.storage.local.set({ theme: "aura" });
  });
  await sleep(1200);
  // Hover a numbered nav theme link → gradient art reveal
  const navLink = await page.$$eval("button", (btns) => {
    const b = btns.find((x) => x.textContent.includes("Web-Slinger"));
    if (b) {
      b.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      return true;
    }
    return false;
  });
  console.log("NAV_THEME_LINK_FOUND=" + navLink);
  await sleep(1000);
  await page.screenshot({ path: path.join(OUT, "09-nav-hover-reveal.png") });
  // Open the gallery
  await page.$$eval("button", (btns) => {
    const b = btns.find((x) => x.textContent.trim().startsWith("Gallery"));
    if (b) b.click();
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(OUT, "10-theme-gallery.png") });
  // Hover "Hidden Leaf" row in the gallery → crossfade
  await page.$$eval("button", (btns) => {
    const b = btns.find((x) => x.textContent.includes("Hidden Leaf"));
    if (b) b.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
  });
  await sleep(1200);
  await page.screenshot({ path: path.join(OUT, "11-gallery-hover-naruto.png") });
  await page.keyboard.press("Escape");
  await sleep(800);

  // --- 5c. Backend integration: feed served by FastAPI? ---------------------
  const backend = await page.evaluate(async () => {
    try {
      const health = await (
        await fetch("http://127.0.0.1:8000/api/health")
      ).json();
      const feed = await (
        await fetch("http://127.0.0.1:8000/api/feed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interests: ["tech", "anime"], mood: null }),
        })
      ).json();
      return {
        health: health.ok,
        feedItems: feed.items?.length ?? 0,
        aiUsed: feed.aiUsed,
        cached: feed.cached,
      };
    } catch (e) {
      return { error: String(e) };
    }
  });
  console.log("BACKEND_FROM_EXTENSION=" + JSON.stringify(backend));

  // --- 6. Resource manager stats sanity -------------------------------------
  const rm = await page.evaluate(async () => {
    const s = await chrome.storage.local.get([
      "resource_settings",
      "resource_stats",
    ]);
    const session = await chrome.storage.session.get("tab_activity");
    return {
      settings: s.resource_settings ?? "defaults-in-code",
      stats: s.resource_stats ?? "defaults-in-code",
      trackedTabs: Object.keys(session.tab_activity ?? {}).length,
    };
  });
  console.log("RESOURCE_MANAGER=" + JSON.stringify(rm));

  writeFileSync(
    path.join(OUT, "console.log.txt"),
    consoleLog.join("\n") || "(no console errors/warnings)"
  );
  console.log("CONSOLE_ISSUES=" + consoleLog.length);
  console.log("DONE");
} finally {
  await browser.close();
}
