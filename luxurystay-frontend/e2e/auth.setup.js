// Runs ONCE before all tests. Logs in as each role and saves the browser
// localStorage state to .auth/<role>.json so other tests can reuse the session
// without hitting the login API again (avoids the rate-limit of 20/15 min).
import { test as setup } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
import { ACCOUNTS } from './helpers.js';

const authDir = join(dirname(fileURLToPath(import.meta.url)), '../.auth');
mkdirSync(authDir, { recursive: true });

for (const role of Object.keys(ACCOUNTS)) {
  setup(`save auth state — ${role}`, async ({ page }) => {
    const acc = ACCOUNTS[role];
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(acc.email);
    await page.locator('input[autocomplete="current-password"]').fill(acc.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
    await page.context().storageState({ path: join(authDir, `${role}.json`) });
  });
}
