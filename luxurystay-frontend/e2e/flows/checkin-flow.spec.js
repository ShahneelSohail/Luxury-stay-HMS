import { test, expect } from '@playwright/test';

test.use({ storageState: '.auth/receptionist.json' });

test.describe('Check-in / Check-out flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/checkin');
    await page.waitForLoadState('networkidle');
  });

  // ─── Page structure ─────────────────────────────────────────────────────────

  test('shows the page heading', async ({ page }) => {
    await expect(page.getByText(/au revoir/i)).toBeVisible();
  });

  test('shows Arrivals, Departures and Overdue tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: /arrivals/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /departures/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /overdue/i })).toBeVisible();
  });

  test('Arrivals tab is active by default', async ({ page }) => {
    const arrivalsBtn = page.getByRole('button', { name: /arrivals/i });
    await expect(arrivalsBtn).toHaveClass(/active|selected|current/);
  });

  // ─── Tab switching ───────────────────────────────────────────────────────────

  test('switching to Departures tab does not crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.getByRole('button', { name: /departures/i }).click();
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test('switching to Overdue tab does not crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.getByRole('button', { name: /overdue/i }).click();
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  // ─── Arrivals table ──────────────────────────────────────────────────────────

  test('arrivals table shows correct columns', async ({ page }) => {
    const thead = page.locator('thead').first();
    // Table only renders when there are arrivals — skip when no data
    if (await thead.count() === 0) { test.skip(); return; }
    await expect(thead.getByText('Guest')).toBeVisible();
    await expect(thead.getByText('Room')).toBeVisible();
    await expect(thead.getByText('Status')).toBeVisible();
  });

  // ─── Check-in flow ───────────────────────────────────────────────────────────

  test('clicking "Check in" opens the check-in panel', async ({ page }) => {
    const checkInBtn = page.getByRole('button', { name: /^check in$/i }).first();
    if (await checkInBtn.count() === 0) {
      test.skip(); // No arrivals today — acceptable
      return;
    }
    await checkInBtn.click();
    // Panel should show preferences checklist
    await expect(page.getByText(/down pillow|espresso|arrival/i).first()).toBeVisible();
  });

  test('check-in panel shows "Issue keys" CTA button', async ({ page }) => {
    const checkInBtn = page.getByRole('button', { name: /^check in$/i }).first();
    if (await checkInBtn.count() === 0) { test.skip(); return; }
    await checkInBtn.click();
    await expect(page.getByRole('button', { name: /issue keys/i })).toBeVisible();
  });

  test('check-in panel has arrival preference checkboxes', async ({ page }) => {
    const checkInBtn = page.getByRole('button', { name: /^check in$/i }).first();
    if (await checkInBtn.count() === 0) { test.skip(); return; }
    await checkInBtn.click();
    const preferences = ['Down pillow', 'Espresso amenities', 'Daily Le Monde'];
    for (const pref of preferences) {
      await expect(page.getByText(pref)).toBeVisible();
    }
  });

  test('"Back to arrivals" closes the check-in panel', async ({ page }) => {
    const checkInBtn = page.getByRole('button', { name: /^check in$/i }).first();
    if (await checkInBtn.count() === 0) { test.skip(); return; }
    await checkInBtn.click();
    await page.getByRole('button', { name: /back to arrivals/i }).click();
    // Should be back to the main table
    await expect(page.getByRole('button', { name: /^check in$/i }).first()).toBeVisible();
  });

  // ─── Check-out flow ──────────────────────────────────────────────────────────

  test('clicking "Check out" on departures opens the departure panel', async ({ page }) => {
    await page.getByRole('button', { name: /departures/i }).click();
    await page.waitForTimeout(300);
    const checkOutBtn = page.getByRole('button', { name: /check out/i }).first();
    if (await checkOutBtn.count() === 0) { test.skip(); return; }
    await checkOutBtn.click();
    await expect(page.getByRole('button', { name: /settle folio/i })).toBeVisible();
  });

  test('departure panel shows departure checklist items', async ({ page }) => {
    await page.getByRole('button', { name: /departures/i }).click();
    await page.waitForTimeout(300);
    const checkOutBtn = page.getByRole('button', { name: /check out/i }).first();
    if (await checkOutBtn.count() === 0) { test.skip(); return; }
    await checkOutBtn.click();
    const checklist = ['Mini-bar verified', 'Keys returned', 'Safe emptied'];
    for (const item of checklist) {
      await expect(page.getByText(item)).toBeVisible();
    }
  });

  test('"Back to departures" closes the departure panel', async ({ page }) => {
    await page.getByRole('button', { name: /departures/i }).click();
    await page.waitForTimeout(300);
    const checkOutBtn = page.getByRole('button', { name: /check out/i }).first();
    if (await checkOutBtn.count() === 0) { test.skip(); return; }
    await checkOutBtn.click();
    await page.getByRole('button', { name: /back to departures/i }).click();
    await expect(page.getByRole('button', { name: /check out/i }).first()).toBeVisible();
  });
});
