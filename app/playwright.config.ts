import { defineConfig, devices } from '@playwright/test';

// Empty strings must fall through (CI may export an empty var).
const chromePath =
  [
    process.env.PLAYWRIGHT_CHROME_PATH,
    process.env.CHROME_PATH,
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH,
  ].find((p) => p && p.length > 0) ?? '/usr/bin/google-chrome-stable';

export default defineConfig({
  testDir: '../e2e',
  testIgnore: process.env.E2E_RECIPE === '1' ? undefined : ['**/recipe.spec.ts'],
  timeout: 60_000,
  retries: 1,
  workers: 1,
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFileName}/{arg}{ext}',
  use: {
    baseURL: process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    launchOptions: {
      executablePath: chromePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required'],
    },
  },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: undefined } }],
  webServer: process.env.PREVIEW_URL
    ? undefined
    : {
        command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
        port: 4173,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
