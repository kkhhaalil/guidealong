import { expect, test, type Page } from '@playwright/test';
import {
  downloadDemoTour,
  gotoDemoMap,
  startSimTour,
  trackConsoleErrors,
} from './helpers';

type ThemeMode = 'light' | 'dark';

const VIEWPORT = { width: 390, height: 844 };

const SCREENSHOT = {
  maxDiffPixelRatio: 0.02,
  animations: 'disabled' as const,
};

/** Regions that depend on sim position, audio progress, or licensing chrome. */
const DYNAMIC_MASKS = [
  '[data-testid^="stop-dist-"]',
  '[role="progressbar"]',
  '.leaflet-control-attribution',
  '[data-testid="mode-badge"]',
  // The sim advances a machine-speed-dependent number of ticks before the
  // pause click lands, panning the map a few pixels; a pan shifts every tile
  // and blows the diff budget. Mask the map pane — the floating chrome and
  // Leaflet's own controls (outside the pane) stay verified.
  '.leaflet-map-pane',
];

test.use({
  viewport: VIEWPORT,
  reducedMotion: 'reduce',
  caret: 'hide',
  deviceScaleFactor: 1,
});

async function setTheme(page: Page, theme: ThemeMode): Promise<void> {
  await page.goto('./#/');
  await page.waitForLoadState('load');
  await page.evaluate((mode) => {
    localStorage.setItem('ga.settings', JSON.stringify({ theme: mode }));
  }, theme);
  await page.reload({ waitUntil: 'load' });
}

async function freezeMapAtRouteStart(page: Page): Promise<void> {
  await downloadDemoTour(page);
  await gotoDemoMap(page);
  await startSimTour(page);
  await page.getByTestId('btn-sim-pause').click();
  await page.getByTestId('sim-controls').waitFor({ state: 'visible' });
}

async function playStopPaused(page: Page, stopId: string): Promise<void> {
  await page.getByTestId('btn-stops').click();
  await page.getByTestId('stop-list').waitFor({ state: 'visible' });
  await page.getByTestId(`stop-item-${stopId}`).click();
  await page.getByTestId('now-playing').waitFor({ state: 'visible' });
  await page.waitForTimeout(150);
  const playBtn = page.getByTestId('btn-play');
  const aria = await playBtn.getAttribute('aria-label');
  if (aria && !aria.includes('播放')) {
    await playBtn.click();
  }
}

async function shot(page: Page, name: string): Promise<void> {
  await expect(page).toHaveScreenshot(`${name}.png`, {
    ...SCREENSHOT,
    mask: DYNAMIC_MASKS.map((sel) => page.locator(sel)),
    fullPage: true,
  });
}

test.describe('visual regression', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`key screens — ${theme}`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      await setTheme(page, theme);

      await page.goto('./#/');
      await page.getByTestId('tour-shelf').waitFor({ state: 'visible' });
      await shot(page, `shelf-${theme}`);

      await page.goto('./#/tour/demo');
      await page.getByTestId('tour-detail').waitFor({ state: 'visible' });
      await shot(page, `tour-detail-${theme}`);

      await freezeMapAtRouteStart(page);
      await playStopPaused(page, 'demo-ridge');
      await shot(page, `map-now-playing-${theme}`);

      await page.getByTestId('btn-stops').click();
      await page.getByTestId('stop-list').waitFor({ state: 'visible' });
      await shot(page, `stop-list-${theme}`);
      await page.keyboard.press('Escape');

      await page.getByTestId('btn-more').click();
      await page.getByTestId('more-panel').waitFor({ state: 'visible' });
      await shot(page, `more-panel-${theme}`);

      expect(errors).toEqual([]);
    });
  }
});
