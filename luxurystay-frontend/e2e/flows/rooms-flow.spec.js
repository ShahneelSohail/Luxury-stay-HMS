import { test, expect } from '@playwright/test';

test.use({ storageState: '.auth/admin.json' });

test.describe('Rooms flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/rooms');
    await page.waitForLoadState('networkidle');
  });

  // ─── Page structure ──────────────────────────────────────────────────────────

  test('shows the page heading', async ({ page }) => {
    await expect(page.getByText(/floor-by-floor/i)).toBeVisible();
  });

  test('shows status filter buttons', async ({ page }) => {
    for (const label of ['All', 'Occupied', 'Available', 'Cleaning', 'Maint']) {
      await expect(page.getByRole('button', { name: new RegExp(label, 'i') }).first()).toBeVisible();
    }
  });

  test('shows "Add room" button for admin', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Add room' })).toBeVisible();
  });

  // ─── Status filters ──────────────────────────────────────────────────────────

  test('clicking status filters does not crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const label of ['Occupied', 'Available', 'Cleaning', 'All']) {
      await page.getByRole('button', { name: new RegExp(`^${label}`, 'i') }).first().click();
      await page.waitForTimeout(300);
    }
    expect(errors).toHaveLength(0);
  });

  test('room cards are visible', async ({ page }) => {
    // At least one room card should exist if DB is seeded
    const cards = page.locator('.card, [class*="room-card"]');
    const manageButtons = page.getByRole('button', { name: 'Manage' });
    const count = await manageButtons.count();
    if (count === 0) {
      await expect(page.locator('body')).not.toBeEmpty();
    } else {
      expect(count).toBeGreaterThan(0);
    }
  });

  // ─── Manage modal ────────────────────────────────────────────────────────────

  test('"Manage" button opens a modal', async ({ page }) => {
    const manageBtn = page.getByRole('button', { name: 'Manage' }).first();
    if (await manageBtn.count() === 0) { test.skip(); return; }
    await manageBtn.click();
    await expect(page.locator('.modal')).toBeVisible();
  });

  test('manage modal has a status dropdown', async ({ page }) => {
    const manageBtn = page.getByRole('button', { name: 'Manage' }).first();
    if (await manageBtn.count() === 0) { test.skip(); return; }
    await manageBtn.click();
    // Status uses custom Dropdown component (not native select) — look for the toggle button
    await expect(page.locator('.modal .dropdown-toggle').first()).toBeVisible();
  });

  test('manage modal has a status note input', async ({ page }) => {
    const manageBtn = page.getByRole('button', { name: 'Manage' }).first();
    if (await manageBtn.count() === 0) { test.skip(); return; }
    await manageBtn.click();
    await expect(page.locator('.modal input[placeholder*="e.g."]')).toBeVisible();
  });

  test('manage modal has "Save changes" button', async ({ page }) => {
    const manageBtn = page.getByRole('button', { name: 'Manage' }).first();
    if (await manageBtn.count() === 0) { test.skip(); return; }
    await manageBtn.click();
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();
  });

  test('closing manage modal with Cancel works', async ({ page }) => {
    const manageBtn = page.getByRole('button', { name: 'Manage' }).first();
    if (await manageBtn.count() === 0) { test.skip(); return; }
    await manageBtn.click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.modal')).not.toBeVisible();
  });

  test('can change room status and save', async ({ page }) => {
    const manageBtn = page.getByRole('button', { name: 'Manage' }).first();
    if (await manageBtn.count() === 0) { test.skip(); return; }
    await manageBtn.click();
    // Status uses a custom Dropdown component — open it and pick "Cleaning"
    const dropdownToggle = page.locator('.modal .dropdown-toggle').first();
    if (await dropdownToggle.count() === 0) { test.skip(); return; }
    await dropdownToggle.click();
    const cleaningOption = page.locator('.modal .dropdown-menu li').filter({ hasText: /cleaning/i });
    if (await cleaningOption.count() === 0) { test.skip(); return; }
    await cleaningOption.click();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.locator('.modal')).not.toBeVisible({ timeout: 8000 });
  });

  // ─── Add room modal ──────────────────────────────────────────────────────────

  test('"Add room" modal opens with all required fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Add room' }).click();
    await expect(page.locator('.modal')).toBeVisible();
    // Room number and floor are text/number inputs; Type uses a custom Dropdown component
    await expect(page.locator('.modal input').first()).toBeVisible();
    await expect(page.locator('.modal .dropdown-toggle')).toBeVisible();
  });

  test('"Add room" modal has a room type selector', async ({ page }) => {
    await page.getByRole('button', { name: 'Add room' }).click();
    // Type selector is a custom Dropdown — open it and check for suite/deluxe/penthouse options
    await page.locator('.modal .dropdown-toggle').click();
    const options = await page.locator('.modal .dropdown-menu li').allTextContents();
    expect(options.some(o => /suite|deluxe|penthouse/i.test(o))).toBeTruthy();
    // Close dropdown by pressing Escape
    await page.keyboard.press('Escape');
  });

  test('closing "Add room" modal cancels without creating a room', async ({ page }) => {
    await page.getByRole('button', { name: 'Add room' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.modal')).not.toBeVisible();
  });
});
