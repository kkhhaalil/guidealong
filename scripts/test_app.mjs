import { chromium } from "playwright-core";

const SHOTS = process.env.SHOTS_DIR || ".";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },  // iPhone-ish
  isMobile: true, hasTouch: true, deviceScaleFactor: 2,
});
const page = await ctx.newPage();

const externalRequests = [];
page.on("request", (r) => {
  const u = r.url();
  if (!u.startsWith(BASE)) externalRequests.push(u);
});
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

const BASE = process.env.APP_URL || "http://localhost:8000";
await page.goto(`${BASE}/index.html`);
await page.waitForTimeout(800);
await page.screenshot({ path: `${SHOTS}/1-start.png` });

// enter simulation mode
await page.click("#btn-start-sim");
await page.waitForTimeout(2500);
await page.screenshot({ path: `${SHOTS}/2-map.png` });

// speed up to x16 and wait for first auto-trigger (intro fires at start; wait for player)
const active = await page.locator("#player-active").isHidden();
console.log("player active on start (intro trigger):", !active);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SHOTS}/3-playing.png` });
console.log("now playing:", await page.locator("#np-name").textContent());
console.log("audio src:", await page.evaluate(() => document.getElementById("narrator").currentSrc));
console.log("audio playing:", await page.evaluate(() => { const a = document.getElementById("narrator"); return !a.paused && a.currentTime >= 0; }));

// skip and fast-forward simulation to reach next stop
await page.click("#btn-skip");
await page.click("#btn-speed"); // x16
await page.waitForTimeout(200);
console.log("badge:", await page.locator("#mode-badge").textContent());

// wait until second stop triggers (madison, ~14km at 960km/h ≈ 55s of sim... too slow; jump sim index instead)
await page.evaluate(() => { /* let ticks continue */ });
// wait for next trigger up to 90s
try {
  await page.waitForSelector("#player-active:not([hidden])", { timeout: 90000 });
  console.log("second trigger:", await page.locator("#np-name").textContent());
  await page.screenshot({ path: `${SHOTS}/4-second-stop.png` });
} catch { console.log("no second trigger within 90s"); }

// stop list panel
await page.click("#btn-list");
await page.waitForTimeout(400);
await page.screenshot({ path: `${SHOTS}/5-list.png` });
console.log("progress:", await page.locator("#progress-count").textContent());
console.log("list items:", await page.locator("#stops-list li").count());

// manual play from list
await page.locator("#stops-list li").nth(5).click();
await page.waitForTimeout(1200);
console.log("manual play:", await page.locator("#np-name").textContent());
await page.screenshot({ path: `${SHOTS}/6-manual.png` });

console.log("external requests:", externalRequests.length ? externalRequests : "NONE ✓");
console.log("page errors:", errors.length ? errors : "NONE ✓");
await browser.close();
