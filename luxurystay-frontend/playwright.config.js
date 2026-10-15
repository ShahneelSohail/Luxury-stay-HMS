import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 8000,
    navigationTimeout: 15000,
  },
  projects: [
    // Phase 1 — log in once per role and save sessions to .auth/*.json
    // This makes exactly 5 login API calls total, staying well under the rate limit.
    {
      name: 'setup',
      testMatch: '**/auth.setup.js',
    },
    // Phase 2 — run all other tests, reusing the saved sessions
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      testIgnore: '**/auth.setup.js',
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'node ../luxurystay-backend/server.js',
      url: 'http://localhost:5000/health',
      reuseExistingServer: true,
      timeout: 30_000,
      env: { NODE_ENV: 'test' },
    },
  ],
});
