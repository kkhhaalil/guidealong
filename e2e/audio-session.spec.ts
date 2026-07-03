import { expect, test } from '@playwright/test';
import { gotoDemoMapWithSw, startSimTour, trackConsoleErrors, waitForGaEvent } from './helpers';

declare global {
  interface Window {
    __audioSessionLog?: string[];
  }
}

/**
 * iOS music coexistence (Audio Session API): the app must declare a mixing
 * ('ambient') session before any playback (so opening the tour never stops
 * the user's music), claim 'playback' only while narration/chime actually
 * plays (the sole category iOS keeps audible in the background), and release
 * back to 'ambient' afterwards so music can play between stops. Chrome has
 * no navigator.audioSession, so we install a recording fake before the app
 * boots and assert the transitions.
 */
test.describe('audio session', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const log: string[] = [];
      window.__audioSessionLog = log;
      Object.defineProperty(navigator, 'audioSession', {
        configurable: true,
        value: {
          get type() {
            return log[log.length - 1] ?? 'auto';
          },
          set type(v: string) {
            log.push(v);
          },
        },
      });
    });
  });

  test('mixes while idle, exclusive during narration, releases after', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await gotoDemoMapWithSw(page);
    await startSimTour(page);

    // The start-gesture unlock must declare a mixing session first.
    const afterStart = await page.evaluate(() => window.__audioSessionLog ?? []);
    expect(afterStart[0]).toBe('ambient');

    // Freeze the sim, then manually play one (1 s) narration clip.
    await page.getByTestId('btn-sim-pause').click();
    await page.getByTestId('btn-stops').click();
    await page.getByTestId('stop-item-demo-welcome').click();
    await waitForGaEvent(page, 'audio-play');

    await expect
      .poll(() => page.evaluate(() => navigator.audioSession!.type))
      .toBe('playback');

    // After the clip ends the session returns to ambient (music resumes).
    await waitForGaEvent(page, 'ended', { timeout: 15_000 });
    await expect
      .poll(() => page.evaluate(() => navigator.audioSession!.type), { timeout: 5_000 })
      .toBe('ambient');

    expect(errors).toEqual([]);
  });
});

declare global {
  interface Navigator {
    audioSession?: { type: string };
  }
}
