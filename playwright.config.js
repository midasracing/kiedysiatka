import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: { timeout: 15000 },
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  // Routes in the live-data tests must intercept every request. A registered
  // production worker can otherwise serve real feeds behind Playwright's routes.
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure', serviceWorkers: 'block' },
  projects: [
    { name: 'mobile-chromium', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'], browserName: 'webkit' } }
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});
