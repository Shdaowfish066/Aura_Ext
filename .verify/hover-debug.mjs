// Debug: after real hover on a gallery row, inspect the art layer's inline
// background to see whether React state actually changed.
import puppeteer from "puppeteer-core";
import path from "node:path";
import os from "node:os";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");
const CHROME =
  "C:\\Users\\Windows 11\\.cache\\puppeteer\\chrome\\win64-149.0.7827.55\\chrome-win64\\chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  userDataDir: path.join(os.tmpdir(), `aura-dbg-${Date.now()}`),
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
  await sleep(3000);

  // Open gallery
  const g = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) =>
      x.textContent.trim().startsWith("Gallery")
    );
    const r = b?.getBoundingClientRect();
    return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
  });
  await page.mouse.click(g.x, g.y);
  await sleep(1500);

  const before = await page.evaluate(() => {
    const fixed = [...document.querySelectorAll("div")].find(
      (d) => d.className.includes?.("fixed") && d.className.includes("z-50")
    );
    const artDivs = [...(fixed?.querySelectorAll("div[style]") ?? [])]
      .map((d) => d.getAttribute("style"))
      .filter((s) => s?.includes("radial-gradient"));
    return artDivs;
  });
  console.log("ART_BEFORE:", JSON.stringify(before).slice(0, 200));

  const row = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) =>
      x.textContent.includes("Hidden Leaf")
    );
    if (!b) return null;
    // Native listeners to trace what the browser actually dispatches.
    window.__evts = [];
    for (const type of ["mouseenter", "mouseleave", "mouseover", "mouseout"]) {
      b.addEventListener(type, (e) =>
        window.__evts.push(`${type}@${Date.now() % 100000} -> ${e.relatedTarget?.tagName ?? "null"}.${(e.relatedTarget?.className ?? "").toString().slice(0, 40)}`)
      );
    }
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.move(row.x, row.y, { steps: 15 });
  await sleep(500);
  const mid = await page.evaluate(() => {
    const fixed = [...document.querySelectorAll("div")].find(
      (d) => d.className.includes?.("fixed") && d.className.includes("z-50")
    );
    const artDivs = [...(fixed?.querySelectorAll("div[style]") ?? [])]
      .map((d) => d.getAttribute("style"))
      .filter((s) => s?.includes("radial-gradient"));
    // fb923c = rgb(251, 146, 60) — naruto orange
    return {
      count: artDivs.length,
      hasNaruto: artDivs.some((s) => s.includes("251, 146, 60")),
    };
  });
  console.log("ART_AFTER_HOVER:", JSON.stringify(mid));

  // Hold the hover (tiny jitter keeps it on the row), let crossfade finish,
  // then capture a full-size top-left crop where naruto orange should bloom.
  await page.mouse.move(row.x + 2, row.y + 1);
  await sleep(2000);
  const order = await page.evaluate(() => {
    const fixed = [...document.querySelectorAll("div")].find(
      (d) => d.className.includes?.("fixed") && d.className.includes("z-50")
    );
    return [...(fixed?.querySelectorAll("div[style]") ?? [])]
      .map((d) => {
        const s = d.getAttribute("style") ?? "";
        const naruto = s.includes("251, 146, 60");
        const aura = s.includes("99, 102, 241");
        return `${naruto ? "naruto" : aura ? "aura" : "other"}:opacity=${
          getComputedStyle(d).opacity
        }`;
      })
      .join(" | ");
  });
  console.log("ART_STACK:", order);
  const evts = await page.evaluate(() => window.__evts ?? []);
  console.log("EVENTS:\n" + evts.join("\n"));
  const under = await page.evaluate(
    ({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      return `${el?.tagName}.${(el?.className ?? "").toString().slice(0, 80)}`;
    },
    { x: row.x + 2, y: row.y + 1 }
  );
  console.log("ELEMENT_UNDER_POINTER:", under);
  await page.screenshot({
    path: path.join(ROOT, ".verify", "shots", "14-gallery-naruto-settled.png"),
    clip: { x: 0, y: 0, width: 800, height: 500 },
  });
  console.log("DONE");
} finally {
  await browser.close();
}
