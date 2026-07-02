import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

/** Wait until the service worker is active and controlling the page. */
export async function ensureSwControlling(page: Page): Promise<void> {
  await page.goto('./');
  await page.waitForLoadState('load');
  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return;
    await navigator.serviceWorker.register('./sw.js', { scope: './' });
    await navigator.serviceWorker.ready;
  });
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) {
    await page.reload({ waitUntil: 'load' });
  }
  const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
  expect(controlled).toBe(true);
}

export async function downloadDemoTour(page: Page): Promise<void> {
  await page.goto('./#/tour/demo');
  await page.getByTestId('tour-detail').waitFor({ state: 'visible' });
  await page.getByTestId('btn-download').click();
  await page.getByTestId('download-progress-bar').waitFor({ state: 'visible' });
  await page.getByTestId('badge-downloaded').waitFor({ state: 'visible', timeout: 120_000 });
}

export async function gotoDemoMap(page: Page): Promise<void> {
  await page.goto('./#/tour/demo/map');
  await page.getByTestId('start-overlay').waitFor({ state: 'visible' });
}

export async function startSimTour(page: Page, resume = false): Promise<void> {
  if (resume) {
    await page.getByTestId('btn-resume').click({ force: true });
  } else {
    await page.getByTestId('btn-start-sim').click({ force: true });
  }
  await page.getByTestId('sim-controls').waitFor({ state: 'visible' });
}

export async function setMaxSimSpeed(page: Page): Promise<void> {
  const btn = page.getByTestId('btn-speed');
  for (let i = 0; i < 6; i++) {
    const idx = await page.evaluate(() => window.__ga?.getState()?.speedIndex ?? 0);
    if (idx === 5) break;
    await btn.click();
  }
}

export async function waitForGaEvent(
  page: Page,
  type: string,
  opts?: { timeout?: number },
): Promise<void> {
  await page.waitForFunction(
    (eventType) => (window.__ga?.events ?? []).some((e) => e.type === eventType),
    type,
    { timeout: opts?.timeout ?? 30_000 },
  );
}

export async function waitForVisited(page: Page, stopId: string, timeout = 60_000): Promise<void> {
  await page.waitForFunction(
    (id) => (window.__ga?.getState()?.visited ?? []).includes(id),
    stopId,
    { timeout },
  );
}

export function primaryColor(page: Page): Promise<string> {
  return page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
  );
}

/**
 * After calling start(), records same-origin responses that did not come from the
 * service worker (i.e. would require network). While offline, any such response
 * indicates a cache miss / broken offline story.
 */
export function trackUncachedOriginResponses(page: Page): {
  start: () => void;
  stop: () => string[];
} {
  const hits: string[] = [];
  let origin = '';
  let active = false;

  const onFailed = (req: import('@playwright/test').Request) => {
    if (!active) return;
    const url = req.url();
    if (!url.startsWith(origin)) return;
    if (url.includes('/tours/') || url.includes('/assets/') || url.endsWith('.js') || url.endsWith('.css')) {
      hits.push(url);
    }
  };

  const handler = (response: import('@playwright/test').Response) => {
    if (!active) return;
    const req = response.request();
    const url = req.url();
    if (!url.startsWith(origin)) return;
    const path = new URL(url).pathname;
    const isApp =
      path.includes('/tours/') ||
      path.includes('/assets/') ||
      path.endsWith('.js') ||
      path.endsWith('.css') ||
      path.endsWith('.png') ||
      path.endsWith('.mp3') ||
      path.endsWith('.json');
    if (!isApp) return;
    if (!response.fromServiceWorker() && !req.serviceWorker()) {
      hits.push(url);
    }
  };

  page.on('response', handler);
  page.on('requestfailed', onFailed);

  return {
    start() {
      active = true;
      hits.length = 0;
      origin = new URL(page.url()).origin;
    },
    stop() {
      active = false;
      page.off('response', handler);
      page.off('requestfailed', onFailed);
      return [...hits];
    },
  };
}

export async function waitForDownloadPercent(page: Page, minPercent: number): Promise<void> {
  await page.waitForFunction(
    (min) => {
      const bar = document.querySelector('[data-testid="download-progress-bar"]');
      if (!bar) return false;
      const text = bar.textContent ?? '';
      const m = /(\d+)%/.exec(text);
      return m ? Number(m[1]) >= min : false;
    },
    minPercent,
    { timeout: 60_000 },
  );
}
