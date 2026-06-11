// Verify: glass cards + theme watermark, feed wheel scroll, hover clip fix,
// resource placeholder, session clock based on active minutes.
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
  userDataDir: path.join(os.tmpdir(), `aura-fix-${Date.now()}`),
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

  // Switch to spiderman to see watermark + glass
  await page.evaluate(async () => {
    await chrome.storage.local.set({ theme: "spiderman" });
  });
  await sleep(1800);
  await page.screenshot({ path: path.join(OUT, "15-glass-spiderman.png") });

  const checks = await page.evaluate(() => {
    const text = document.body.innerText;
    const logoLayer = document.querySelectorAll("svg, img").length;
    return {
      placeholder: /coming soon/i.test(text),
      noOldPanel: !/snoozed|whitelist/i.test(text),
      glassCards: document.querySelectorAll(".glass-card").length,
      logoPresent: logoLayer > 0,
    };
  });
  console.log("CHECKS=" + JSON.stringify(checks));

  // Feed wheel scroll: real wheel over the strip
  const strip = await page.evaluate(() => {
    const el = [...document.querySelectorAll("div")].find(
      (d) => d.className.includes?.("cursor-grab") && d.scrollWidth > d.clientWidth
    );
    if (!el) return null;
    el.dataset.testid = "strip";
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, scroll: el.scrollLeft };
  });
  if (strip) {
    await page.mouse.move(strip.x, strip.y);
    await page.mouse.wheel({ deltaY: 240 });
    await sleep(900); // let momentum glide
    const after = await page.evaluate(
      () => document.querySelector('[data-testid="strip"]').scrollLeft
    );
    console.log(
      "WHEEL_SCROLL=" +
        JSON.stringify({ before: Math.round(strip.scroll), after: Math.round(after) })
    );

    // Hover a feed card → screenshot strip region to inspect top clipping
    const card = await page.evaluate(() => {
      const a = document.querySelector('[data-testid="strip"] a');
      const r = a?.getBoundingClientRect();
      return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2, top: r.y } : null;
    });
    if (card) {
      await page.mouse.move(card.x, card.y, { steps: 8 });
      await sleep(900);
      await page.screenshot({
        path: path.join(OUT, "16-card-hover-clip.png"),
        clip: { x: 0, y: Math.max(0, card.top - 80), width: 800, height: 320 },
      });
      console.log("CARD_HOVER=done");
    }
  } else console.log("STRIP_NOT_FOUND");

  // Session clock: with a fresh profile, totalMinutesToday=0 → clock ~00:0x
  const clockText = await page.evaluate(() => {
    const el = [...document.querySelectorAll("div")].find((d) =>
      d.textContent?.trim().startsWith("Session time")
    );
    return el?.parentElement?.innerText?.slice(0, 80) ?? "not-found";
  });
  console.log("SESSION_CLOCK=" + JSON.stringify(clockText));
  console.log("DONE");
} finally {
  await browser.close();
}
