import { expect, test } from '@playwright/test';
import { trackConsoleErrors } from './helpers';

test.describe('WP0 smoke', () => {
  test('shell loads, tour cards render, SW precaches', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto('./');
    await expect(page.getByTestId('tour-card-demo')).toBeVisible();
    await expect(page.getByTestId('tour-card-demo')).toContainText('演示公园');

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
    expect(errors).toEqual([]);
  });
});
