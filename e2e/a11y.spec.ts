import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  downloadDemoTour,
  gotoDemoMap,
  startSimTour,
  trackConsoleErrors,
} from './helpers';

type ThemeMode = 'light' | 'dark';

/** Playback controls use data-testid and require ≥56 px (§5.3). */
const PLAYBACK_TESTIDS = ['btn-prev', 'btn-play', 'btn-next'];

/**
 * Leaflet attribution is required for licensing but is not app chrome;
 * links are exempt from the 48×48 target-size rule.
 * Leaflet marker icons receive tabindex but are not interactive in this app.
 */
const TARGET_SIZE_EXEMPT =
  '.leaflet-control-attribution a, .leaflet-marker-icon, .leaflet-marker-icon *';

async function setThemeOverride(page: Page, theme: ThemeMode): Promise<void> {
  await page.goto('./#/');
  await page.waitForLoadState('load');
  await page.evaluate((mode) => {
    localStorage.setItem('ga.settings', JSON.stringify({ theme: mode }));
  }, theme);
  await page.reload({ waitUntil: 'load' });
}

async function runAxe(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .disableRules(['color-contrast'])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  if (serious.length) {
    console.error(`${label} axe violations:`, JSON.stringify(serious, null, 2));
  }
  expect(serious, `${label} should have zero serious/critical axe violations`).toEqual([]);
}

async function assertTouchTargets(page: Page, minPlayback = 56): Promise<void> {
  const sizes = await page.evaluate(
    ({ playbackIds, exemptSelector }) => {
      const minDefault = 48;
      const failures: string[] = [];
      const nodes = document.querySelectorAll<HTMLElement>(
        'button, a, [role="button"], input, [tabindex]:not([tabindex="-1"])',
      );

      for (const el of nodes) {
        if (el.matches(exemptSelector)) continue;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || el.getAttribute('aria-hidden') === 'true') {
          continue;
        }
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const testId = el.getAttribute('data-testid') ?? '';
        const min = playbackIds.includes(testId) ? 56 : minDefault;
        if (rect.width < min || rect.height < min) {
          failures.push(
            `${el.tagName}${testId ? `[data-testid=${testId}]` : ''}: ${Math.round(rect.width)}×${Math.round(rect.height)} (min ${min})`,
          );
        }
      }
      return failures;
    },
    { playbackIds: PLAYBACK_TESTIDS, exemptSelector: TARGET_SIZE_EXEMPT },
  );

  expect(sizes, 'interactive elements should meet touch-target minimums').toEqual([]);
}

async function scanShelf(page: Page, theme: ThemeMode): Promise<void> {
  await setThemeOverride(page, theme);
  await page.goto('./#/');
  await page.getByTestId('tour-shelf').waitFor({ state: 'visible' });
  await runAxe(page, `shelf/${theme}`);
  await assertTouchTargets(page);
}

async function scanTourDetail(page: Page, theme: ThemeMode): Promise<void> {
  await setThemeOverride(page, theme);
  await page.goto('./#/tour/demo');
  await page.getByTestId('tour-detail').waitFor({ state: 'visible' });
  await runAxe(page, `tour-detail/${theme}`);
  await assertTouchTargets(page);
}

async function scanMapWithPanels(page: Page, theme: ThemeMode): Promise<void> {
  await setThemeOverride(page, theme);
  await downloadDemoTour(page);
  await gotoDemoMap(page);
  await startSimTour(page);

  await page.getByTestId('now-playing').waitFor({ state: 'visible' });
  await runAxe(page, `map-now-playing/${theme}`);
  await assertTouchTargets(page, 56);

  await page.getByTestId('btn-stops').click();
  await page.getByTestId('stop-list').waitFor({ state: 'visible' });
  await runAxe(page, `map-stop-list/${theme}`);
  await assertTouchTargets(page, 56);
  await page.keyboard.press('Escape');

  await page.getByTestId('btn-stops').click();
  await page.getByTestId('stop-item-demo-ridge').click();
  await page.waitForTimeout(300);
  await page.getByTestId('btn-more').click();
  await page.getByTestId('more-panel').waitFor({ state: 'visible' });
  await runAxe(page, `map-more-panel/${theme}`);
  await assertTouchTargets(page, 56);
}

test.describe('accessibility', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`shelf — ${theme} theme`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      await scanShelf(page, theme);
      expect(errors).toEqual([]);
    });

    test(`tour detail — ${theme} theme`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      await scanTourDetail(page, theme);
      expect(errors).toEqual([]);
    });

    test(`map + panels — ${theme} theme`, async ({ page }) => {
      test.setTimeout(120_000);
      const errors = trackConsoleErrors(page);
      await scanMapWithPanels(page, theme);
      expect(errors).toEqual([]);
    });
  }

  test('theme override persists across reload', async ({ page }) => {
    await page.goto('./#/');
    await page.getByTestId('tour-shelf').waitFor({ state: 'visible' });
    await page.getByTestId('btn-theme-toggle').click(); // system → light
    await page.getByTestId('btn-theme-toggle').click(); // light → dark
    await page.reload({ waitUntil: 'load' });
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe('dark');
  });
});
