// Verify: no square glow, glassier cards, analog clock, session reset semantics.
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");
const OUT = path.join(ROOT, ".verify", "shots");
const CHROME =
  "C:\\Users\\Windows 11\\.cache\\puppeteer\\chrome\\win64-149.0.7827.55\\chrome-win64\\chrome.exe";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  userDataDir: path.join(os.tmpdir(), `aura-r3-${Date.now()}`),
  args: [
    `--disable-extensions-except=${DIST}`,
    `--load-extension=${DIST}`,
    "--no-first-run",
  ],
  defaultViewport: { width: 1600, height: 900 },
});

try {
  let id = null;
  for (let i = 0; i < 40 && !id; i++) {
    for (const t of browser.targets())
      if (t.url().startsWith("chrome-extension://"))
        id = new URL(t.url()).hostname;
    if (!id) await sleep(250);
  }
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  await page.goto(`chrome-extension://${id}/src/newtab/index.html`, {
    waitUntil: "networkidle2",
    timeout: 45000,
  });
  await sleep(3500);

  const checks = await page.evaluate(() => {
    const blurred = [...document.querySelectorAll("div")].filter((d) =>
      (d.className.toString() ?? "").includes("blur-3xl")
    );
    const clock = document.querySelector('svg[aria-label^="Clock showing"]');
    return {
      noBlurredBlobs: blurred.length === 0,
      analogClock: !!clock,
      sessionLabel: /since you opened the browser/i.test(document.body.innerText),
      glassCards: document.querySelectorAll(".glass-card").length,
    };
  });
  console.log("CHECKS=" + JSON.stringify(checks));

  await page.screenshot({ path: path.join(OUT, "17-round3-aura.png") });
  await page.evaluate(async () => {
    await chrome.storage.local.set({ theme: "batman" });
  });
  await sleep(1800);
  await page.screenshot({ path: path.join(OUT, "18-round3-batman.png") });

  // Session reset semantics: session_started_at exists; clear it (simulating
  // browser restart wiping chrome.storage.session) and confirm a reload
  // re-stamps it fresh.
  const t1 = await page.evaluate(async () => {
    const r = await chrome.storage.session.get("session_started_at");
    return r.session_started_at ?? null;
  });
  await page.evaluate(async () => {
    await chrome.storage.session.clear();
  });
  await page.reload({ waitUntil: "networkidle2" });
  await sleep(2500);
  const t2 = await page.evaluate(async () => {
    const r = await chrome.storage.session.get("session_started_at");
    return r.session_started_at ?? null;
  });
  console.log(
    "SESSION_RESET=" +
      JSON.stringify({ first: t1, restamped: t2, fresh: t2 !== null && t2 !== t1 })
  );
  console.log("DONE");
} finally {
  await browser.close();
}
