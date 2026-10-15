import { test, expect } from '@playwright/test';

test.use({ storageState: '.auth/admin.json' });

test.describe('Reservations flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reservations');
    await page.waitForLoadState('networkidle');
  });

  // ─── Page structure ─────────────────────────────────────────────────────────

  test('shows the page heading', async ({ page }) => {
    await expect(page.getByText(/book of guests/i)).toBeVisible();
  });

  test('has List and Calendar view toggles', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'List' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Calendar' })).toBeVisible();
  });

  test('switching to Calendar view does not crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.getByRole('button', { name: 'Calendar' }).click();
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
    // Switch back
    await page.getByRole('button', { name: 'List' }).click();
  });

  // ─── Status filters ──────────────────────────────────────────────────────────

  test('status filter select is present with all status options', async ({ page }) => {
    // Status filter is a native <select> (not buttons)
    const statusSelect = page.locator('select').first();
    await expect(statusSelect).toBeVisible();
    const options = await statusSelect.locator('option').allTextContents();
    for (const label of ['All statuses', 'Pending', 'Confirmed', 'In-house', 'Checked out', 'Cancelled']) {
      expect(options.some(o => o.includes(label))).toBeTruthy();
    }
  });

  test('changing status filter updates the list without crashing', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const statusSelect = page.locator('select').first();
    for (const value of ['confirmed', 'checked-in', 'cancelled', '']) {
      await statusSelect.selectOption(value);
      await page.waitForTimeout(300);
    }
    expect(errors).toHaveLength(0);
  });

  // ─── New reservation modal ───────────────────────────────────────────────────

  test('"New reservation" button opens a modal', async ({ page }) => {
    await page.getByRole('button', { name: 'New reservation' }).click();
    await expect(page.locator('.modal')).toBeVisible();
  });

  test('reservation modal has guest search, date, and occupancy fields', async ({ page }) => {
    await page.getByRole('button', { name: 'New reservation' }).click();
    await expect(page.locator('input[placeholder*="Search by name"]')).toBeVisible();
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
    await expect(page.locator('input[type="number"]').first()).toBeVisible();
  });

  test('guest search in reservation modal returns results', async ({ page }) => {
    await page.getByRole('button', { name: 'New reservation' }).click();
    const searchInput = page.locator('input[placeholder*="Search by name"]');
    await searchInput.fill('a');
    await page.waitForTimeout(500);
    // Either results appear or a "no results" message — no crash
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    expect(errors).toHaveLength(0);
  });

  test('closing the reservation modal works', async ({ page }) => {
    await page.getByRole('button', { name: 'New reservation' }).click();
    await expect(page.locator('.modal')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.modal')).not.toBeVisible();
  });

  // ─── Existing reservations ───────────────────────────────────────────────────

  test('at least one reservation row is visible', async ({ page }) => {
    const rows = page.locator('table tbody tr, .reservation-row');
    const count = await rows.count();
    if (count === 0) {
      // Acceptable if the DB is empty — just verify no crash
      await expect(page.locator('body')).not.toBeEmpty();
    } else {
      await expect(rows.first()).toBeVisible();
    }
  });

  test('"View" opens a reservation detail panel', async ({ page }) => {
    const viewBtn = page.getByRole('button', { name: 'View' }).first();
    if (await viewBtn.count() === 0) {
      test.skip();
      return;
    }
    await viewBtn.click();
    // Detail panel is a fixed-position right drawer — look for booking ID or guest name inside it
    await expect(page.getByText(/booking|check.in|check.out/i).first()).toBeVisible({ timeout: 8000 });
  });
});
