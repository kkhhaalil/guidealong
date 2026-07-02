import { expect, test } from '@playwright/test';
import {
  gotoDemoMap,
  setMaxSimSpeed,
  startSimTour,
  trackConsoleErrors,
  waitForGaEvent,
  waitForVisited,
} from './helpers';

test.describe('drive', () => {
  test('sim x32 visits stops in order with chime, audio, and queue', async ({ page }) => {
    test.setTimeout(90_000);
    const errors = trackConsoleErrors(page);
    await gotoDemoMap(page);
    await startSimTour(page);
    await setMaxSimSpeed(page);

    await waitForGaEvent(page, 'chime');
    await waitForGaEvent(page, 'audio-play');

    const order = ['demo-welcome', 'demo-ridge', 'demo-spring', 'demo-finish'];
    for (const id of order) {
      await waitForVisited(page, id);
    }

    const visited = await page.evaluate(() => window.__ga?.getState()?.visited ?? []);
    expect(visited).toEqual(order);

    const queueEvent = await page.evaluate(() =>
      (window.__ga?.events ?? []).find((e) => e.type === 'queue' && Array.isArray(e.queue) && e.queue.length > 0),
    );
    expect(queueEvent).toBeTruthy();

    const triggers = await page.evaluate(() =>
      (window.__ga?.events ?? []).filter((e) => e.type === 'trigger').map((e) => e.stopId),
    );
    const ridgeIdx = triggers.indexOf('demo-ridge');
    const springIdx = triggers.indexOf('demo-spring');
    expect(ridgeIdx).toBeGreaterThanOrEqual(0);
    expect(springIdx).toBeGreaterThanOrEqual(0);
    expect(Math.abs(ridgeIdx - springIdx)).toBeLessThanOrEqual(2);

    expect(errors).toEqual([]);
  });

  test('manual preview does not mark visited until auto arrival', async ({ page }) => {
    test.setTimeout(120_000);
    const errors = trackConsoleErrors(page);
    await gotoDemoMap(page);
    await startSimTour(page);
    await page.waitForTimeout(500);
    await page.getByTestId('btn-sim-pause').click();
    await page.getByTestId('btn-stops').click();
    await page.getByTestId('stop-item-demo-finish').click();

    await waitForGaEvent(page, 'ended', { timeout: 15_000 });

    let visited = await page.evaluate(() => window.__ga?.getState()?.visited ?? []);
    expect(visited).not.toContain('demo-finish');

    await page.getByTestId('btn-sim-pause').click();
    await setMaxSimSpeed(page);
    await waitForVisited(page, 'demo-finish', 90_000);

    visited = await page.evaluate(() => window.__ga?.getState()?.visited ?? []);
    expect(visited).toContain('demo-finish');

    expect(errors).toEqual([]);
  });
});
