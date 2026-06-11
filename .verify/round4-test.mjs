// Verify round 4: ultrawide layout, countdown timer, ambient motes, glass hover.
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
  userDataDir: path.join(os.tmpdir(), `aura-r4-${Date.now()}`),
  args: [
    `--disable-extensions-except=${DIST}`,
    `--load-extension=${DIST}`,
    "--no-first-run",
    "--window-size=3440,1440",
  ],
  defaultViewport: { width: 3440, height: 1440 },
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
    const text = document.body.innerText;
    const container = document.querySelector(".z-10.mx-auto");
    return {
      countdown: /session time left/i.test(text),
      resetsLabel: /resets when you close the browser/i.test(text),
      noDailyGoal: !/daily goal/i.test(text),
      motes: document.querySelectorAll(".mote").length,
      containerWidth: container?.getBoundingClientRect().width ?? 0,
      viewport: innerWidth,
    };
  });
  console.log("CHECKS=" + JSON.stringify(checks));

  await page.screenshot({ path: path.join(OUT, "19-ultrawide-aura.png") });

  // Sakura-style check on Hidden Leaf: falling leaves present
  await page.evaluate(async () => {
    await chrome.storage.local.set({ theme: "naruto" });
  });
  await sleep(1800);
  const leaves = await page.evaluate(
    () => document.querySelectorAll(".petal").length
  );
  console.log("NARUTO_LEAVES=" + leaves);
  await page.screenshot({ path: path.join(OUT, "20-ultrawide-naruto.png") });

  // Glass hover: hover the mood card and crop it to inspect for boxy glow
  const card = await page.evaluate(() => {
    const el = document.querySelector(".glass-card");
    const r = el?.getBoundingClientRect();
    return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2, r } : null;
  });
  if (card) {
    await page.mouse.move(card.x, card.y, { steps: 6 });
    await sleep(800);
    await page.screenshot({
      path: path.join(OUT, "21-glass-hover.png"),
      clip: {
        x: Math.max(0, card.r.x - 120),
        y: Math.max(0, card.r.y - 120),
        width: Math.min(3440, card.r.width + 240),
        height: Math.min(1440, card.r.height + 240),
      },
    });
    console.log("GLASS_HOVER=done");
  }
  console.log("DONE");
} finally {
  await browser.close();
}
