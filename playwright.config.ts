import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
export const BASE_URL = `http://127.0.0.1:${PORT}`;

// Credentials the test server runs with. Real ones never enter the test run.
export const TEST_ADMIN = { username: 'test-admin', password: 'test-password' };

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,   // one in-memory store, shared by the dev server
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    httpCredentials: TEST_ADMIN,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    command: 'npm run dev:test',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
