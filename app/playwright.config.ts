import { defineConfig, devices } from '@playwright/test';

const chromePath =
  process.env.CHROME_PATH ??
  process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ??
  '/usr/bin/google-chrome-stable';

export default defineConfig({
  testDir: '../e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    launchOptions: {
      executablePath: chromePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: undefined } }],
  webServer: process.env.PREVIEW_URL
    ? undefined
    : {
        command: 'npm run preview -- --host 127.0.0.1 --port 4173',
        port: 4173,
        reuseExistingServer: !process.env.CI,
      },
});
