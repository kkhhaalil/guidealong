import { expect, test } from '@playwright/test';
import { ensureSwControlling, trackConsoleErrors } from './helpers';

test.describe('download UX', () => {
  test('progress, abort/resume, delete clears cache and storage', async ({ page }) => {
    test.setTimeout(180_000);
    const errors = trackConsoleErrors(page);
    await ensureSwControlling(page);

    // Throttle tour assets so progress UI is observable and abort can fire mid-download.
    await page.route(/\/tours\/demo\//, async (route) => {
      await new Promise((r) => setTimeout(r, 40));
      await route.continue();
    });

    await page.goto('./#/tour/demo');
    await page.getByTestId('btn-download').click();
    await page.getByTestId('download-progress-bar').waitFor({ state: 'visible' });

    const percents: number[] = [];
    for (let i = 0; i < 40; i++) {
      if (!(await page.getByTestId('download-progress-bar').isVisible())) break;
      const text = (await page.getByTestId('download-progress-bar').textContent()) ?? '';
      const m = /(\d+)%/.exec(text);
      if (m) percents.push(Number(m[1]));
      if (percents.length >= 3 && percents[percents.length - 1] >= 10) break;
      await page.waitForTimeout(150);
    }
    expect(percents.length).toBeGreaterThan(1);
    for (let i = 1; i < percents.length; i++) {
      expect(percents[i]).toBeGreaterThanOrEqual(percents[i - 1]);
    }

    // Cancel while the throttle is still active so the download can't finish
    // before the click lands (the cancel button detaches on completion).
    await page.getByTestId('btn-cancel-download').click();
    await page.getByTestId('btn-resume-download').waitFor({ state: 'visible', timeout: 30_000 });
    await page.unroute(/\/tours\/demo\//);

    await page.getByTestId('btn-resume-download').click();
    await page.getByTestId('badge-downloaded').waitFor({ state: 'visible', timeout: 120_000 });

    await page.getByTestId('btn-delete-download').click();
    await page.getByTestId('btn-delete-download').click();
    await page.getByTestId('btn-download').waitFor({ state: 'visible', timeout: 30_000 });

    await page.goto('./#/');
    await expect(page.getByTestId('download-chip-demo')).toContainText('未下载');

    const cacheKeys = await page.evaluate(() => caches.keys());
    expect(cacheKeys.some((k) => k.startsWith('tour-demo-'))).toBe(false);

    const tourKeys = await page.evaluate(() => {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith('ga.tour.demo.')) keys.push(k);
      }
      return keys;
    });
    expect(tourKeys).toEqual([]);

    expect(errors).toEqual([]);
  });
});
