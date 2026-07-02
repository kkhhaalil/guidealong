import { expect, test } from '@playwright/test';
import { gotoDemoMapWithSw, setMaxSimSpeed, startSimTour, trackConsoleErrors, waitForVisited } from './helpers';

test.describe('resume', () => {
  test('reload offers resume and restores position + speed', async ({ page }) => {
    test.setTimeout(90_000);
    const errors = trackConsoleErrors(page);
    await gotoDemoMapWithSw(page);
    await startSimTour(page);
    await setMaxSimSpeed(page);
    await waitForVisited(page, 'demo-welcome');

    await page.waitForFunction(() => (window.__ga?.getState()?.fractionalIndex ?? 0) > 2);

    const before = await page.evaluate(() => {
      const s = window.__ga?.getState();
      return { simIdx: s?.fractionalIndex ?? 0, speedIdx: s?.speedIndex ?? 0 };
    });
    expect(before.simIdx).toBeGreaterThan(2);
    expect(before.speedIdx).toBe(5);

    await page.getByTestId('btn-sim-pause').click();
    await page.waitForFunction(() => {
      const raw = localStorage.getItem('ga.tour.demo.resume');
      if (!raw) return false;
      const r = JSON.parse(raw) as { simIdx?: number; mode?: string };
      return r.mode === 'sim' && (r.simIdx ?? 0) > 2;
    });

    await page.reload();
    await page.getByTestId('btn-resume').waitFor({ state: 'visible' });
    await page.getByTestId('btn-resume').click();
    await page.getByTestId('sim-controls').waitFor({ state: 'visible' });

    const after = await page.evaluate(() => {
      const s = window.__ga?.getState();
      return { simIdx: s?.fractionalIndex ?? 0, speedIdx: s?.speedIndex ?? 0 };
    });
    expect(after.simIdx).toBeCloseTo(before.simIdx, 0);
    expect(after.speedIdx).toBe(before.speedIdx);

    expect(errors).toEqual([]);
  });
});
