import { test, expect } from '@playwright/test';
import { logout } from './helpers.js';

// All tests in this file run as admin.
// Auth state is loaded from disk (saved by auth.setup.js) — no login API call.
test.use({ storageState: '.auth/admin.json' });

// ─── Sidebar & navigation ─────────────────────────────────────────────────────

test.describe('Sidebar', () => {
  test('is visible after login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('.sidebar')).toBeVisible();
  });

  test('shows brand name', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('.sidebar-brand')).toBeVisible();
  });

  test('shows logged-in user name in the footer', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('.sidebar-user')).toBeVisible();
  });

  test('nav links navigate to the correct pages', async ({ page }) => {
    await page.goto('/dashboard');
    const links = [
      { label: 'Reservations',  url: '/reservations' },
      { label: 'Rooms',         url: '/rooms' },
      { label: 'Housekeeping',  url: '/housekeeping' },
      { label: 'Billing',       url: '/billing' },
      { label: 'Guests',        url: '/guests' },
      { label: 'Analytics',     url: '/analytics' },
      { label: 'Staff & Roles', url: '/staff' },
    ];
    for (const link of links) {
      await page.getByRole('link', { name: link.label }).click();
      await expect(page).toHaveURL(link.url);
    }
  });
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

test.describe('Dashboard (/dashboard)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('loads without a JS crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('shows "Dashboard" in the breadcrumb', async ({ page }) => {
    await expect(page.locator('.current', { hasText: 'Dashboard' })).toBeVisible();
  });

  test('greeting is visible (Good morning / afternoon / evening)', async ({ page }) => {
    await expect(page.getByText(/good (morning|afternoon|evening)/i)).toBeVisible({ timeout: 10000 });
  });
});

// ─── Reservations ─────────────────────────────────────────────────────────────

test.describe('Reservations (/reservations)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reservations');
  });

  test('loads and shows "Reservations" breadcrumb', async ({ page }) => {
    await expect(page.locator('.current', { hasText: 'Reservations' })).toBeVisible();
  });

  test('loads without a JS crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});

// ─── Check-in / Front desk ────────────────────────────────────────────────────

test.describe('Check-in page (/checkin)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/checkin');
  });

  test('loads and shows "Front Desk" breadcrumb', async ({ page }) => {
    await expect(page.locator('.current', { hasText: 'Front Desk' })).toBeVisible();
  });

  test('loads without a JS crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});

// ─── Rooms ────────────────────────────────────────────────────────────────────

test.describe('Rooms (/rooms)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/rooms');
  });

  test('loads and shows "Rooms" breadcrumb', async ({ page }) => {
    await expect(page.locator('.current', { hasText: 'Rooms' })).toBeVisible();
  });

  test('loads without a JS crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});

// ─── Housekeeping ─────────────────────────────────────────────────────────────

test.describe('Housekeeping (/housekeeping)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/housekeeping');
  });

  test('loads and shows "Housekeeping" breadcrumb', async ({ page }) => {
    await expect(page.locator('.current', { hasText: 'Housekeeping' })).toBeVisible();
  });

  test('loads without a JS crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});

// ─── Maintenance ──────────────────────────────────────────────────────────────

test.describe('Maintenance (/maintenance)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/maintenance');
  });

  test('loads and shows "Maintenance" breadcrumb', async ({ page }) => {
    await expect(page.locator('.current', { hasText: 'Maintenance' })).toBeVisible();
  });

  test('loads without a JS crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});

// ─── Billing ──────────────────────────────────────────────────────────────────

test.describe('Billing (/billing)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/billing');
  });

  test('loads and shows "Billing" breadcrumb', async ({ page }) => {
    await expect(page.locator('.current', { hasText: 'Billing' })).toBeVisible();
  });

  test('loads without a JS crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});

// ─── Guests ───────────────────────────────────────────────────────────────────

test.describe('Guests (/guests)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/guests');
  });

  test('loads and shows "Guests" breadcrumb', async ({ page }) => {
    await expect(page.locator('.current', { hasText: 'Guests' })).toBeVisible();
  });

  test('loads without a JS crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});

// ─── Feedback ─────────────────────────────────────────────────────────────────

test.describe('Feedback (/feedback)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/feedback');
  });

  test('loads and shows "Feedback" breadcrumb', async ({ page }) => {
    await expect(page.locator('.current', { hasText: 'Feedback' })).toBeVisible();
  });
});

// ─── Analytics ────────────────────────────────────────────────────────────────

test.describe('Analytics (/analytics)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analytics');
  });

  test('loads and shows "Analytics" breadcrumb', async ({ page }) => {
    await expect(page.locator('.current', { hasText: 'Analytics' })).toBeVisible();
  });

  test('loads without a JS crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});

// ─── Staff management ─────────────────────────────────────────────────────────

test.describe('Staff page (/staff)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/staff');
  });

  test('loads and shows "Staff" breadcrumb', async ({ page }) => {
    await expect(page.locator('.current', { hasText: 'Staff' })).toBeVisible();
  });

  test('loads without a JS crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
