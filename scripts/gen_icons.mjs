import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const page = await (await browser.newContext({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 })).newPage();
// maskable-safe: content within inner 80%
await page.setContent(`<style>
  body{margin:0}
  .icon{width:512px;height:512px;display:flex;align-items:center;justify-content:center;
    background:linear-gradient(160deg,#14342b 0%,#1e4d3f 45%,#3b7a5e 100%);}
  .icon span{font-size:280px;filter:drop-shadow(0 12px 24px rgba(0,0,0,.35))}
</style><div class="icon"><span>🌋</span></div>`);
await page.waitForTimeout(300);
const el = page.locator(".icon");
await el.screenshot({ path: new URL("../assets/icons/icon-512.png", import.meta.url).pathname });
await page.setViewportSize({ width: 192, height: 192 });
await page.setContent(`<style>
  body{margin:0}
  .icon{width:192px;height:192px;display:flex;align-items:center;justify-content:center;
    background:linear-gradient(160deg,#14342b 0%,#1e4d3f 45%,#3b7a5e 100%);}
  .icon span{font-size:105px}
</style><div class="icon"><span>🌋</span></div>`);
await page.waitForTimeout(300);
await page.locator(".icon").screenshot({ path: new URL("../assets/icons/icon-192.png", import.meta.url).pathname });
await browser.close();
console.log("icons done");
