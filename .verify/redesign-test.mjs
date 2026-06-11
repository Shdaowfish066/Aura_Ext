// Verify the hero-first redesign on desktop + laptop viewports.
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
  userDataDir: path.join(os.tmpdir(), `aura-rd-${Date.now()}`),
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
    const ask = document.querySelector(".glass-strong input");
    const askBox = ask?.closest(".glass-strong")?.getBoundingClientRect();
    const feedHeader = [...document.querySelectorAll("h2")].find((h) =>
      /for you/i.test(h.textContent)
    );
    const feedY = feedHeader?.getBoundingClientRect().y ?? -1;
    return {
      askBarPresent: !!ask,
      askBarFocused: document.activeElement === ask,
      askBarCenterY: askBox ? Math.round(askBox.y + askBox.height / 2) : -1,
      chips: [...document.querySelectorAll("button")].filter((b) =>
        /catch me up|anime should|surprise me|unwind/i.test(b.textContent)
      ).length,
      moodRow: /pick a mood|feed tuned|mostly/i.test(document.body.innerText),
      feedHeaderY: Math.round(feedY),
      footerRail: /left|break time/.test(document.body.innerText) &&
        /resource manager — soon/i.test(document.body.innerText),
      glassStrong: document.querySelectorAll(".glass-strong").length,
      glassCards: document.querySelectorAll(".glass-card").length,
      viewportH: innerHeight,
    };
  });
  console.log("CHECKS=" + JSON.stringify(checks));
  await page.screenshot({ path: path.join(OUT, "22-redesign-1600.png") });

  // Ask flow: click a suggestion chip → floating panel appears
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) =>
      /surprise me|catch me up|anime should/i.test(x.textContent)
    );
    b?.click();
  });
  await sleep(9000); // wait for AI answer (or error chip)
  const askResult = await page.evaluate(() => {
    const panel = document.querySelector(".absolute.left-0.right-0.top-full");
    return { panelOpen: !!panel, text: panel?.innerText?.slice(0, 80) ?? null };
  });
  console.log("ASK_FLOW=" + JSON.stringify(askResult));
  await page.screenshot({ path: path.join(OUT, "23-redesign-answer.png") });

  // Laptop viewport
  await page.setViewport({ width: 1366, height: 768 });
  await sleep(1200);
  await page.screenshot({ path: path.join(OUT, "24-redesign-laptop.png") });
  console.log("DONE");
} finally {
  await browser.close();
}
