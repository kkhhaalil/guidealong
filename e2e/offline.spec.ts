import { expect, test } from '@playwright/test';
import {
  downloadDemoTour,
  ensureSwControlling,
  gotoDemoMap,
  setMaxSimSpeed,
  startSimTour,
  trackConsoleErrors,
  trackUncachedOriginResponses,
  waitForGaEvent,
} from './helpers';

test.describe('offline', () => {
  test('downloaded demo tour works fully offline with no uncached origin responses', async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    const errors = trackConsoleErrors(page);
    await ensureSwControlling(page);
    await downloadDemoTour(page);

    const tracker = trackUncachedOriginResponses(page);
    await context.setOffline(true);
    tracker.start();

    await page.goto('./#/');
    await expect(page.getByTestId('tour-shelf')).toBeVisible();
    await expect(page.getByTestId('download-chip-demo')).toContainText('✓已下载');

    await gotoDemoMap(page);
    await startSimTour(page);
    await setMaxSimSpeed(page);

    await page.waitForFunction(() => {
      const imgs = document.querySelectorAll('.leaflet-tile-pane img');
      return imgs.length > 0 && Array.from(imgs).some((img) => (img as HTMLImageElement).naturalWidth > 0);
    });

    await waitForGaEvent(page, 'audio-play', { timeout: 60_000 });

    const uncached = tracker.stop();
    expect(uncached).toEqual([]);
    expect(errors).toEqual([]);
  });
});

/**
 * Zero-uncached-requests-offline assertion (PLAN §7.3):
 * After setOffline(true), we record same-origin responses for app/tour assets where
 * response.fromServiceWorker() is false (would have hit network). We also collect
 * requestfailed for /tours/, /assets/, and static extensions. Playwright offline mode
 * blocks real network; SW-served cache hits report fromServiceWorker() === true.
 * Any entry in the combined log means the offline path missed cache.
 */
