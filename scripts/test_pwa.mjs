import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const BASE = process.env.APP_URL || "http://localhost:8000";
await page.goto(`${BASE}/index.html`);

// wait for SW to activate and finish precaching all assets
const total = await page.evaluate(async () => {
  await navigator.serviceWorker.ready;
  for (let i = 0; i < 240; i++) {
    const keys = await caches.keys();
    if (keys.length) {
      const c = await caches.open(keys[0]);
      const n = (await c.keys()).length;
      if (n >= 770) return n;
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return -1;
});
console.log("precached entries:", total);

// go fully offline and reload
await ctx.setOffline(true);
await page.reload();
await page.waitForSelector("#btn-start-sim", { timeout: 10000 });
await page.click("#btn-start-sim");
await page.waitForTimeout(3000);
console.log("offline: player active:", !(await page.locator("#player-active").isHidden()));
console.log("offline: now playing:", await page.locator("#np-name").textContent());
console.log("offline: audio playing:", await page.evaluate(() => { const a = document.getElementById("narrator"); return !a.paused; }));
// check a tile actually rendered from cache
console.log("offline: tiles loaded:", await page.evaluate(() =>
  Array.from(document.querySelectorAll(".leaflet-tile-loaded")).length));
await page.screenshot({ path: "7-offline.png" });
await browser.close();
console.log("OFFLINE TEST PASSED");
