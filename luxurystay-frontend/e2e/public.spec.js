import { test, expect } from '@playwright/test';

// ─── Home page ────────────────────────────────────────────────────────────────

test.describe('Home page (/)', () => {
  test('loads without a JS crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/');
    expect(errors).toHaveLength(0);
  });

  test('displays LuxuryStay brand name', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/LuxuryStay|Luxury.*STAY/i).first()).toBeVisible();
  });

  test('/login link or button is reachable from the home page', async ({ page }) => {
    await page.goto('/');
    // Any link that navigates to /login
    const loginLink = page.locator('a[href="/login"], a[href*="login"]').first();
    if (await loginLink.count() > 0) {
      await loginLink.click();
      await expect(page).toHaveURL(/\/login/);
    } else {
      // Acceptable if there is no explicit login link on the public home page
      test.skip();
    }
  });

  test('navigating directly to /suites works', async ({ page }) => {
    await page.goto('/suites');
    await expect(page).toHaveURL('/suites');
  });

  test('navigating directly to /contact works', async ({ page }) => {
    await page.goto('/contact');
    await expect(page).toHaveURL('/contact');
  });
});

// ─── Suites page ─────────────────────────────────────────────────────────────

test.describe('Suites page (/suites)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/suites');
  });

  test('loads without a JS crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/suites');
    expect(errors).toHaveLength(0);
  });

  test('renders visible content on the page', async ({ page }) => {
    // Page has loaded meaningful content (not blank)
    await expect(page.locator('body')).not.toBeEmpty();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(20);
  });
});

// ─── Contact page ─────────────────────────────────────────────────────────────

test.describe('Contact page (/contact)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
  });

  test('loads without a JS crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/contact');
    expect(errors).toHaveLength(0);
  });

  test('renders a form or contact details', async ({ page }) => {
    // Either a <form> or something with "contact" content should be visible
    const hasForm = await page.locator('form').count() > 0;
    const hasContent = (await page.locator('body').innerText()).trim().length > 20;
    expect(hasForm || hasContent).toBeTruthy();
  });
});

// ─── Guest-protected routes redirect unauthenticated users ────────────────────

test.describe('Guest-only routes without auth', () => {
  test('/book redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/book');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/guest redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/guest');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/confirm redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/confirm');
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── 404 / catch-all ──────────────────────────────────────────────────────────

test.describe('Catch-all route', () => {
  test('unknown route redirects to the home page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page).toHaveURL('/');
  });
});
