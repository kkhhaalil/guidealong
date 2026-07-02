import { expect, test } from '@playwright/test';
import { ensureSwControlling, trackConsoleErrors } from './helpers';

test.describe('PWA', () => {
  test('manifest link valid, SW controls page, shell loads offline before tour download', async ({
    page,
    context,
  }) => {
    const errors = trackConsoleErrors(page);
    await ensureSwControlling(page);

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestHref).toBeTruthy();
    const manifestRes = await page.request.get(new URL(manifestHref!, page.url()).href);
    expect(manifestRes.ok()).toBe(true);
    const manifest = (await manifestRes.json()) as { name?: string; start_url?: string };
    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();

    const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
    expect(controlled).toBe(true);

    await context.setOffline(true);
    await page.goto('./#/');
    await expect(page.getByTestId('tour-shelf')).toBeVisible();
    await expect(page.getByTestId('tour-card-demo')).toBeVisible();

    expect(errors).toEqual([]);
  });
});
