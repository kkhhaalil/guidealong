import { expect, test } from '@playwright/test';
import {
  gotoDemoMapWithSw,
  primaryColor,
  setMaxSimSpeed,
  startSimTour,
  trackConsoleErrors,
  waitForVisited,
} from './helpers';

test.describe('switching', () => {
  test('demo progress survives tour switch; palettes differ', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await gotoDemoMapWithSw(page);
    await startSimTour(page);
    await setMaxSimSpeed(page);
    await waitForVisited(page, 'demo-welcome');

    const visitedBefore = await page.evaluate(() => window.__ga?.getState()?.visited ?? []);
    expect(visitedBefore.length).toBeGreaterThanOrEqual(1);

    const demoPrimaryOnMap = await primaryColor(page);

    await page.goto('./#/tour/yellowstone');
    await page.getByTestId('tour-detail').waitFor({ state: 'visible' });
    const ysPrimary = await primaryColor(page);
    expect(ysPrimary).not.toBe(demoPrimaryOnMap);

    await page.goto('./#/tour/demo/map');
    await page.getByTestId('start-overlay').waitFor({ state: 'visible' });
    await startSimTour(page, false);

    const visitedAfter = await page.evaluate(() => window.__ga?.getState()?.visited ?? []);
    expect(visitedAfter).toEqual(visitedBefore);

    const demoPrimaryAgain = await primaryColor(page);
    expect(demoPrimaryAgain).toBe(demoPrimaryOnMap);
    expect(demoPrimaryAgain).not.toBe(ysPrimary);

    expect(errors).toEqual([]);
  });
});
