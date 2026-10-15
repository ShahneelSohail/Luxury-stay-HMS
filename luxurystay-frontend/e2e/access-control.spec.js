import { test, expect } from '@playwright/test';

// Each describe block loads its own saved auth state — zero login API calls.
// Auth states are created once by auth.setup.js before this file runs.

// ─── Unauthenticated access ───────────────────────────────────────────────────
// No storageState — clean browser with no token.

test.describe('Unauthenticated access to protected routes', () => {
  const protectedRoutes = [
    '/dashboard',
    '/reservations',
    '/checkin',
    '/rooms',
    '/housekeeping',
    '/maintenance',
    '/services',
    '/billing',
    '/guests',
    '/feedback',
    '/analytics',
    '/suite-types',
    '/staff',
  ];

  for (const route of protectedRoutes) {
    test(`${route} redirects to /login when not logged in`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

// ─── Housekeeping role RBAC ───────────────────────────────────────────────────

test.describe('Housekeeping role access', () => {
  test.use({ storageState: '.auth/housekeeping.json' });

  test('can access /rooms', async ({ page }) => {
    await page.goto('/rooms');
    await expect(page).toHaveURL('/rooms');
  });

  test('can access /housekeeping', async ({ page }) => {
    await page.goto('/housekeeping');
    await expect(page).toHaveURL('/housekeeping');
  });

  test('can access /maintenance', async ({ page }) => {
    await page.goto('/maintenance');
    await expect(page).toHaveURL('/maintenance');
  });

  test('cannot access /dashboard — redirected to /housekeeping', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/housekeeping');
  });

  test('cannot access /billing — redirected to /housekeeping', async ({ page }) => {
    await page.goto('/billing');
    await expect(page).toHaveURL('/housekeeping');
  });

  test('cannot access /guests — redirected to /housekeeping', async ({ page }) => {
    await page.goto('/guests');
    await expect(page).toHaveURL('/housekeeping');
  });

  test('cannot access /analytics — redirected to /housekeeping', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page).toHaveURL('/housekeeping');
  });

  test('cannot access /staff — redirected to /housekeeping', async ({ page }) => {
    await page.goto('/staff');
    await expect(page).toHaveURL('/housekeeping');
  });
});

// ─── Service role RBAC ────────────────────────────────────────────────────────

test.describe('Service role access', () => {
  test.use({ storageState: '.auth/service.json' });

  test('can access /rooms', async ({ page }) => {
    await page.goto('/rooms');
    await expect(page).toHaveURL('/rooms');
  });

  test('can access /services', async ({ page }) => {
    await page.goto('/services');
    await expect(page).toHaveURL('/services');
  });

  test('can access /maintenance', async ({ page }) => {
    await page.goto('/maintenance');
    await expect(page).toHaveURL('/maintenance');
  });

  test('cannot access /dashboard — redirected to /services', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/services');
  });

  test('cannot access /billing — redirected to /services', async ({ page }) => {
    await page.goto('/billing');
    await expect(page).toHaveURL('/services');
  });

  test('cannot access /guests — redirected to /services', async ({ page }) => {
    await page.goto('/guests');
    await expect(page).toHaveURL('/services');
  });

  test('cannot access /staff — redirected to /services', async ({ page }) => {
    await page.goto('/staff');
    await expect(page).toHaveURL('/services');
  });

  test('cannot access /housekeeping — redirected to /services', async ({ page }) => {
    await page.goto('/housekeeping');
    await expect(page).toHaveURL('/services');
  });
});

// ─── Receptionist role RBAC ───────────────────────────────────────────────────

test.describe('Receptionist role access', () => {
  test.use({ storageState: '.auth/receptionist.json' });

  test('can access /dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');
  });

  test('can access /reservations', async ({ page }) => {
    await page.goto('/reservations');
    await expect(page).toHaveURL('/reservations');
  });

  test('can access /billing', async ({ page }) => {
    await page.goto('/billing');
    await expect(page).toHaveURL('/billing');
  });

  test('cannot access /analytics — redirected to /dashboard', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page).toHaveURL('/dashboard');
  });

  test('cannot access /staff — redirected to /dashboard', async ({ page }) => {
    await page.goto('/staff');
    await expect(page).toHaveURL('/dashboard');
  });

  test('cannot access /suite-types — redirected to /dashboard', async ({ page }) => {
    await page.goto('/suite-types');
    await expect(page).toHaveURL('/dashboard');
  });
});

// ─── Manager role RBAC ────────────────────────────────────────────────────────

test.describe('Manager role access', () => {
  test.use({ storageState: '.auth/manager.json' });

  test('can access /dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');
  });

  test('can access /analytics', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page).toHaveURL('/analytics');
  });

  test('can access /feedback', async ({ page }) => {
    await page.goto('/feedback');
    await expect(page).toHaveURL('/feedback');
  });

  test('cannot access /suite-types (admin only) — redirected to /dashboard', async ({ page }) => {
    await page.goto('/suite-types');
    await expect(page).toHaveURL('/dashboard');
  });

  test('cannot access /staff (admin only) — redirected to /dashboard', async ({ page }) => {
    await page.goto('/staff');
    await expect(page).toHaveURL('/dashboard');
  });
});
