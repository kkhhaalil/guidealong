import type { Page } from '@playwright/test';

export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
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
