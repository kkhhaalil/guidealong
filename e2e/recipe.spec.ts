import { expect, test } from '@playwright/test';
import {
  setMaxSimSpeed,
  startSimTour,
  trackConsoleErrors,
  waitForGaEvent,
  waitForVisited,
} from './helpers';

const TOUR_ID = 'test-park';
const FIRST_STOP = `${TOUR_ID}-welcome`;

test.describe('recipe eval', () => {
  test('scaffolded tour appears on shelf and sim drive triggers first stop', async ({ page }) => {
    test.setTimeout(120_000);
    const errors = trackConsoleErrors(page);

    await page.goto('./#/');
    await expect(page.getByTestId(`tour-card-${TOUR_ID}`)).toBeVisible();
    await expect(page.getByTestId(`tour-card-${TOUR_ID}`)).toContainText('Test Park');

    await page.goto(`./#/tour/${TOUR_ID}`);
    await page.getByTestId('tour-detail').waitFor({ state: 'visible' });
    await page.getByTestId('btn-download').click();
    await page.getByTestId('badge-downloaded').waitFor({ state: 'visible', timeout: 120_000 });

    await page.goto(`./#/tour/${TOUR_ID}/map`);
    await page.getByTestId('start-overlay').waitFor({ state: 'visible' });
    await startSimTour(page);
    await setMaxSimSpeed(page);

    await waitForGaEvent(page, 'chime', { timeout: 60_000 });
    await waitForVisited(page, FIRST_STOP, 60_000);

    expect(errors).toEqual([]);
  });
});
