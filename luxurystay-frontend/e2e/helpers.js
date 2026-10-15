// Shared helpers for LuxuryStay HMS E2E tests.
// Demo accounts match the quick-fill credentials hardcoded in LoginPage.jsx.
export const ACCOUNTS = {
  admin:        { email: 'm.devereaux@luxurystay.co', password: 'Admin@1234!' },
  manager:      { email: 'h.cassel@luxurystay.co',    password: 'Manager@1234!' },
  receptionist: { email: 'y.tanaka@luxurystay.co',    password: 'Reception@1234!' },
  housekeeping: { email: 'r.mendoza@luxurystay.co',   password: 'House@1234!' },
  service:      { email: 't.reyes@luxurystay.co',     password: 'Service@1234!' },
};

/**
 * Log in as a given staff role via the login form and wait for the redirect.
 * @param {import('@playwright/test').Page} page
 * @param {'admin'|'manager'|'receptionist'|'housekeeping'|'service'} role
 */
export async function loginAs(page, role) {
  const acc = ACCOUNTS[role];
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(acc.email);
  await page.locator('input[autocomplete="current-password"]').fill(acc.password);
  await page.locator('button[type="submit"]').click();
  // Wait until the browser leaves /login (any redirect counts as success)
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 12000 });
}

/**
 * Log out via the sidebar "Sign out" button and wait for /login.
 * @param {import('@playwright/test').Page} page
 */
export async function logout(page) {
  await page.locator('[title="Sign out"]').click();
  await page.waitForURL('**/login', { timeout: 8000 });
}
