import { test, expect } from '@playwright/test';
import { loginAs, logout, ACCOUNTS } from './helpers.js';

// NOTE: "Login redirect by role" tests intentionally call loginAs() — they are
// testing the real redirect behaviour after form submission. That is 5 API calls
// total, well within the auth rate limit of 20/15 min.

// ─── Sign-in form ─────────────────────────────────────────────────────────────

test.describe('Sign-in form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders email, password and submit button', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[autocomplete="current-password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows both field errors when submitting an empty form', async ({ page }) => {
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText('Email is required.')).toBeVisible();
    await expect(page.getByText('Password is required.')).toBeVisible();
  });

  test('clears email error once the field is filled', async ({ page }) => {
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText('Email is required.')).toBeVisible();
    await page.locator('input[type="email"]').fill('test@example.com');
    await expect(page.getByText('Email is required.')).not.toBeVisible();
  });

  test('shows only the password error when email is filled', async ({ page }) => {
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText('Email is required.')).not.toBeVisible();
    await expect(page.getByText('Password is required.')).toBeVisible();
  });

  test('shows the staff-domain resolver strip for @luxurystay.co addresses', async ({ page }) => {
    await page.locator('input[type="email"]').fill('user@luxurystay.co');
    await expect(page.getByText(/staff console/i)).toBeVisible();
  });

  test('resolver strip is hidden for non-staff emails', async ({ page }) => {
    await page.locator('input[type="email"]').fill('guest@gmail.com');
    await expect(page.getByText(/staff console/i)).not.toBeVisible();
  });

  test('shows a general error banner for a wrong password', async ({ page }) => {
    await page.locator('input[type="email"]').fill(ACCOUNTS.admin.email);
    await page.locator('input[autocomplete="current-password"]').fill('WrongPassword999!');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 10000 });
  });

  test('demo quick-fill button populates credentials and switches to sign-in tab', async ({ page }) => {
    // Switch to create-account tab first to verify the button switches back
    await page.getByText('Create account').click();
    await page.getByText('Admin · Margaux').click();
    await expect(page.locator('input[type="email"]')).toHaveValue(ACCOUNTS.admin.email);
    await expect(page.locator('input[autocomplete="current-password"]')).toHaveValue(ACCOUNTS.admin.password);
    // Should have switched back to sign-in tab
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('password toggle reveals the password text', async ({ page }) => {
    await page.locator('input[autocomplete="current-password"]').fill('Secret123!');
    // Initial state: hidden
    await expect(page.locator('input[autocomplete="current-password"]')).toHaveAttribute('type', 'password');
    // Click the eye button
    await page.locator('[tabindex="-1"]').first().click();
    // Now exposed as text
    await expect(page.locator('input[type="text"][autocomplete="current-password"]')).toBeVisible();
  });
});

// ─── Login redirects by role ──────────────────────────────────────────────────

test.describe('Login redirect by role', () => {
  test('admin is redirected to /dashboard', async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page).toHaveURL('/dashboard');
  });

  test('manager is redirected to /dashboard', async ({ page }) => {
    await loginAs(page, 'manager');
    await expect(page).toHaveURL('/dashboard');
  });

  test('receptionist is redirected to /dashboard', async ({ page }) => {
    await loginAs(page, 'receptionist');
    await expect(page).toHaveURL('/dashboard');
  });

  test('housekeeping staff is redirected to /housekeeping', async ({ page }) => {
    await loginAs(page, 'housekeeping');
    await expect(page).toHaveURL('/housekeeping');
  });

  test('service staff is redirected to /services', async ({ page }) => {
    await loginAs(page, 'service');
    await expect(page).toHaveURL('/services');
  });

});

// ─── Already authenticated ────────────────────────────────────────────────────

test.describe('Already authenticated', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('visiting /login redirects away from the login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).not.toHaveURL(/\/login/);
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────
// Uses saved storageState — no login API call needed.

test.describe('Logout', () => {
  test.use({ storageState: '.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('logout button redirects to /login', async ({ page }) => {
    await logout(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('localStorage is cleared after logout', async ({ page }) => {
    await logout(page);
    const token = await page.evaluate(() => localStorage.getItem('ls_token'));
    const user  = await page.evaluate(() => localStorage.getItem('ls_user'));
    expect(token).toBeNull();
    expect(user).toBeNull();
  });

  test('visiting a protected route after logout redirects to /login', async ({ page }) => {
    await logout(page);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── Registration form ────────────────────────────────────────────────────────

test.describe('Registration form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Create account').click();
  });

  test('shows the registration form after clicking Create account', async ({ page }) => {
    await expect(page.locator('input[autocomplete="name"]')).toBeVisible();
    await expect(page.locator('input[autocomplete="new-password"]').first()).toBeVisible();
  });

  test('shows required-field errors on empty submission', async ({ page }) => {
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText('Name is required.')).toBeVisible();
    await expect(page.getByText('Email is required.')).toBeVisible();
    await expect(page.getByText('Password is required.')).toBeVisible();
  });

  test('shows name-too-short error for a single character', async ({ page }) => {
    await page.locator('input[autocomplete="name"]').fill('A');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/at least 2 characters/i)).toBeVisible();
  });

  test('shows weak-password error when missing uppercase / number', async ({ page }) => {
    await page.locator('input[autocomplete="name"]').fill('Jane Smith');
    await page.locator('input[type="email"]').fill('jane@example.com');
    await page.locator('input[autocomplete="new-password"]').first().fill('alllower1');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/uppercase letter/i)).toBeVisible();
  });

  test('shows too-short password error for fewer than 8 characters', async ({ page }) => {
    await page.locator('input[autocomplete="name"]').fill('Jane Smith');
    await page.locator('input[type="email"]').fill('jane@example.com');
    await page.locator('input[autocomplete="new-password"]').first().fill('Ab1!');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });

  test('shows password-mismatch error when confirm differs', async ({ page }) => {
    await page.locator('input[autocomplete="name"]').fill('Jane Smith');
    await page.locator('input[type="email"]').fill('jane@example.com');
    await page.locator('input[autocomplete="new-password"]').first().fill('StrongPass1!');
    await page.locator('input[autocomplete="new-password"]').last().fill('DifferentPass1!');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test('shows confirm-required error when confirm is left empty', async ({ page }) => {
    await page.locator('input[autocomplete="name"]').fill('Jane Smith');
    await page.locator('input[type="email"]').fill('jane@example.com');
    await page.locator('input[autocomplete="new-password"]').first().fill('StrongPass1!');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/please confirm your password/i)).toBeVisible();
  });
});
