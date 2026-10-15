import { test, expect } from '@playwright/test';

test.use({ storageState: '.auth/admin.json' });

test.describe('Service requests flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('networkidle');
  });

  // ─── Page structure ──────────────────────────────────────────────────────────

  test('shows the page heading', async ({ page }) => {
    await expect(page.getByText(/at your service/i)).toBeVisible();
  });

  test('shows Guest Requests and Maintenance tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Guest Requests' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Maintenance' })).toBeVisible();
  });

  // ─── Guest requests tab ──────────────────────────────────────────────────────

  test('Guest Requests tab is active by default', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Guest Requests' })).toHaveClass(/active|selected/);
  });

  test('status filter buttons exist on Guest Requests tab', async ({ page }) => {
    for (const s of ['All', 'Pending', 'In progress', 'Fulfilled', 'Cancelled']) {
      await expect(page.getByRole('button', { name: new RegExp(`^${s}`, 'i') }).first()).toBeVisible();
    }
  });

  test('status filters switch without crashing', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const s of ['Pending', 'In progress', 'Fulfilled', 'All']) {
      await page.getByRole('button', { name: new RegExp(`^${s}`, 'i') }).first().click();
      await page.waitForTimeout(300);
    }
    expect(errors).toHaveLength(0);
  });

  test('"Details" opens a service request detail panel', async ({ page }) => {
    const detailsBtn = page.getByRole('button', { name: 'Details' }).first();
    if (await detailsBtn.count() === 0) { test.skip(); return; }
    await detailsBtn.click();
    await expect(page.getByText(/priority|room|guest/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('service detail shows "Start work" or "Mark fulfilled" action', async ({ page }) => {
    const detailsBtn = page.getByRole('button', { name: 'Details' }).first();
    if (await detailsBtn.count() === 0) { test.skip(); return; }
    await detailsBtn.click();
    const hasStart    = await page.getByRole('button', { name: /start work/i }).count() > 0;
    const hasFulfill  = await page.getByRole('button', { name: /mark fulfilled/i }).count() > 0;
    const hasCancelled = await page.getByRole('button', { name: /cancelled/i }).count() > 0;
    expect(hasStart || hasFulfill || hasCancelled).toBeTruthy();
  });

  // ─── Maintenance tab ─────────────────────────────────────────────────────────

  test('switching to Maintenance tab does not crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.getByRole('button', { name: 'Maintenance' }).click();
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test('Maintenance tab shows "New request" button', async ({ page }) => {
    await page.getByRole('button', { name: 'Maintenance' }).click();
    await expect(page.getByRole('button', { name: 'New request' })).toBeVisible();
  });

  test('Maintenance status filters exist', async ({ page }) => {
    await page.getByRole('button', { name: 'Maintenance' }).click();
    for (const s of ['All', 'Open', 'Assigned', 'In progress', 'Resolved']) {
      await expect(page.getByRole('button', { name: new RegExp(`^${s}`, 'i') }).first()).toBeVisible();
    }
  });

  // ─── New maintenance request modal ───────────────────────────────────────────

  test('"New request" modal opens with required fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Maintenance' }).click();
    await page.getByRole('button', { name: 'New request' }).click();
    await expect(page.locator('.modal')).toBeVisible();
    // Category, priority selects and description textarea
    await expect(page.locator('.modal select').first()).toBeVisible();
    await expect(page.locator('.modal textarea')).toBeVisible();
  });

  test('category select has valid maintenance categories', async ({ page }) => {
    await page.getByRole('button', { name: 'Maintenance' }).click();
    await page.getByRole('button', { name: 'New request' }).click();
    // Modal selects: nth(0)=Room, nth(1)=Category, nth(2)=Priority
    const options = await page.locator('.modal select').nth(1).locator('option').allTextContents();
    // Option text is display labels: "Plumbing", "Electrical", "A/C", "Furniture", "Technology"
    const cats = ['Plumbing', 'Electrical', 'Furniture', 'Technology', 'HVAC'];
    expect(cats.some(c => options.some(o => o.includes(c)))).toBeTruthy();
  });

  test('can submit a new maintenance request', async ({ page }) => {
    await page.getByRole('button', { name: 'Maintenance' }).click();
    await page.getByRole('button', { name: 'New request' }).click();

    // Modal selects: nth(0)=Room (optional), nth(1)=Category, nth(2)=Priority
    // Category — select "Plumbing" (first real option)
    await page.locator('.modal select').nth(1).selectOption({ index: 0 });
    // Priority — select "high"
    const selects = page.locator('.modal select');
    if (await selects.count() >= 3) {
      await selects.nth(2).selectOption('high');
    }
    // Description (required)
    await page.locator('.modal textarea').fill('Playwright test request — AC not cooling in room 301');

    await page.getByRole('button', { name: /submit request/i }).click();
    await expect(page.locator('.modal')).not.toBeVisible({ timeout: 8000 });
  });

  test('closing "New request" modal with Cancel works', async ({ page }) => {
    await page.getByRole('button', { name: 'Maintenance' }).click();
    await page.getByRole('button', { name: 'New request' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.modal')).not.toBeVisible();
  });
});
