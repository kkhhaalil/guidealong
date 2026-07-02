import { expect, test } from '@playwright/test';
import { gotoDemoMapWithSw, startSimTour, trackConsoleErrors } from './helpers';

/**
 * Regression: floating map chrome (sim controls, now-playing, follow/theme
 * toggles, back button) must stay hit-testable above Leaflet's panes and
 * control corners (z-index up to 1000, contained via isolate on MapView).
 */
test.describe('ui layering', () => {
  test('floating controls stay on top of the map', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await gotoDemoMapWithSw(page);
    await startSimTour(page);

    // Let the map settle and the puck/markers render + pan once.
    await page.waitForTimeout(1500);

    const ids = [
      'btn-sim-pause',
      'btn-speed',
      'follow-toggle',
      'btn-theme-toggle',
      'btn-back-map',
      'btn-play',
      'btn-prev',
      'btn-next',
      'btn-stops',
    ];
    const results = await page.evaluate((testIds) => {
      const failures: string[] = [];
      for (const id of testIds) {
        const el = document.querySelector(`[data-testid="${id}"]`);
        if (!el) {
          failures.push(`${id}: missing`);
          continue;
        }
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) {
          failures.push(`${id}: zero size`);
          continue;
        }
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        const onTop = hit != null && (el === hit || el.contains(hit));
        if (!onTop) {
          failures.push(
            `${id}: covered by ${hit ? `${hit.tagName}.${String((hit as HTMLElement).className)}` : 'nothing'}`,
          );
        }
      }
      return failures;
    }, ids);
    expect(results).toEqual([]);

    // Hit-testing can't catch occlusion by Leaflet panes (pointer-events:
    // none — they paint over content without intercepting clicks). Controls
    // rendered INSIDE the map's isolated stacking context must therefore sit
    // above Leaflet's highest layer (control corners, z-index 1000).
    const followZ = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="follow-toggle"]');
      return el ? Number(getComputedStyle(el).zIndex) : NaN;
    });
    expect(followZ).toBeGreaterThan(1000);

    // Leaflet's own zoom control must also remain clickable (it lives inside
    // the isolated map stacking context; nothing should overlap it).
    const zoomHit = await page.evaluate(() => {
      const el = document.querySelector('.leaflet-control-zoom-in');
      if (!el) return 'missing';
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return hit != null && (el === hit || el.contains(hit)) ? 'ok' : 'covered';
    });
    expect(zoomHit).toBe('ok');

    expect(errors).toEqual([]);
  });
});
