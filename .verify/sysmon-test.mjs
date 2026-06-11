// Verify: system monitor live stats, Today card restored, feed hover de-glowed.
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
  userDataDir: path.join(os.tmpdir(), `aura-sm-${Date.now()}`),
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
  await sleep(6000); // two CPU samples needed for a live %

  const checks = await page.evaluate(() => {
    const text = document.body.innerText;
    const cpuLine = text.match(/CPU\s*\n?\s*(\d+%|…)/);
    const memLine = text.match(/Memory\s*\n?\s*(\d+%|…)/);
    return {
      systemPanel: /SYSTEM/i.test(text),
      cpu: cpuLine?.[1] ?? null,
      memory: memLine?.[1] ?? null,
      gpu: /GPU/i.test(text),
      todayCard: /session time left|break time/i.test(text),
      analogClock: !!document.querySelector('svg[aria-label^="Clock showing"]'),
      askBar: !!document.querySelector(".glass-strong input"),
      footerRailGone: !/resource manager — soon/i.test(text),
    };
  });
  console.log("CHECKS=" + JSON.stringify(checks));
  await page.screenshot({ path: path.join(OUT, "25-sysmon.png") });
  console.log("DONE");
} finally {
  await browser.close();
}
