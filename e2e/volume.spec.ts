import { expect, test } from '@playwright/test';
import { gotoDemoMapWithSw, startSimTour, trackConsoleErrors } from './helpers';

test.describe('volume control', () => {
  test('slider and mute drive narration volume and persist across reload', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await gotoDemoMapWithSw(page);
    await startSimTour(page);
    await page.getByTestId('btn-sim-pause').click();

    const slider = page.getByTestId('volume-slider');
    await expect(slider).toBeVisible();
    await expect(slider).toHaveValue('100');

    await slider.fill('40');
    await expect
      .poll(() => page.evaluate(() => window.__ga?.getAudioVolume?.()))
      .toBeCloseTo(0.4);
    const stored = await page.evaluate(
      () => (JSON.parse(localStorage.getItem('ga.settings') ?? '{}') as { volume?: number }).volume,
    );
    expect(stored).toBeCloseTo(0.4);

    // Mute remembers the level; unmute restores it.
    await page.getByTestId('btn-mute').click();
    await expect(slider).toHaveValue('0');
    await expect
      .poll(() => page.evaluate(() => window.__ga?.getAudioVolume?.()))
      .toBe(0);
    await page.getByTestId('btn-mute').click();
    await expect(slider).toHaveValue('40');

    // Preference survives a reload and is applied to the fresh audio element.
    await page.reload();
    await page.getByTestId('btn-resume').or(page.getByTestId('btn-start-sim')).first().click({ force: true });
    await page.getByTestId('sim-controls').waitFor({ state: 'visible' });
    await expect(page.getByTestId('volume-slider')).toHaveValue('40');
    await expect
      .poll(() => page.evaluate(() => window.__ga?.getAudioVolume?.()))
      .toBeCloseTo(0.4);

    expect(errors).toEqual([]);
  });
});
