import { expect, test } from '@playwright/test';

test.describe('WP0 smoke', () => {
  test('shell loads, demo button renders, SW precaches', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('demo-button')).toBeVisible();
    await expect(page.getByTestId('demo-button')).toContainText('开始探索');

    const swReady = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      await navigator.serviceWorker.ready;
      return true;
    });
    expect(swReady).toBe(true);

    await page.reload();

    const hasShellCache = await page.evaluate(async () => {
      const keys = await caches.keys();
      return keys.some((k) => k.includes('shell-') || k.includes('workbox-precache'));
    });
    expect(hasShellCache).toBe(true);
  });
});
