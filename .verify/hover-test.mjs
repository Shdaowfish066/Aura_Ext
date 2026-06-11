// Focused retest: real mouse hover (not synthetic events) on nav + gallery.
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
  userDataDir: path.join(os.tmpdir(), `aura-hover-${Date.now()}`),
  args: [
    `--disable-extensions-except=${DIST}`,
    `--load-extension=${DIST}`,
    "--no-first-run",
    "--no-default-browser-check",
  ],
  defaultViewport: { width: 1600, height: 900 },
});

try {
  let extensionId = null;
  for (let i = 0; i < 40 && !extensionId; i++) {
    for (const t of browser.targets()) {
      if (t.url().startsWith("chrome-extension://")) {
        extensionId = new URL(t.url()).hostname;
        break;
      }
    }
    if (!extensionId) await sleep(250);
  }
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/newtab/index.html`, {
    waitUntil: "networkidle2",
    timeout: 45000,
  });
  await sleep(3000); // profile restores from backend, dashboard renders

  // Real-mouse hover over the "Web-Slinger" nav link
  const navBox = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) =>
      x.textContent.includes("Web-Slinger")
    );
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (navBox) {
    await page.mouse.move(navBox.x, navBox.y, { steps: 10 });
    await sleep(1200);
    await page.screenshot({ path: path.join(OUT, "12-nav-hover-real.png") });
    console.log("NAV_HOVER=done");
  } else console.log("NAV_HOVER=link-not-found");

  // Open gallery with a real click
  const galleryBox = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) =>
      x.textContent.trim().startsWith("Gallery")
    );
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (galleryBox) {
    await page.mouse.click(galleryBox.x, galleryBox.y);
    await sleep(1500);
    // Real-mouse hover "Hidden Leaf" row
    const rowBox = await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) =>
        x.textContent.includes("Hidden Leaf")
      );
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    if (rowBox) {
      await page.mouse.move(rowBox.x, rowBox.y, { steps: 10 });
      await sleep(1400);
      await page.screenshot({
        path: path.join(OUT, "13-gallery-hover-real.png"),
      });
      console.log("GALLERY_HOVER=done");
    } else console.log("GALLERY_HOVER=row-not-found");
  } else console.log("GALLERY=button-not-found");
  console.log("DONE");
} finally {
  await browser.close();
}
