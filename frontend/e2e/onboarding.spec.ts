import { test, expect } from '@playwright/test';
import { TEST_USERS, authenticateTestUser, clearAuth } from './fixtures/auth';

/**
 * E2E tests for new user onboarding flow.
 *
 * These tests validate that:
 * 1. New users see the onboarding wizard
 * 2. Users can complete the full onboarding flow
 * 3. Users can skip onboarding
 * 4. Existing users don't see the wizard
 *
 * Prerequisites:
 * - Backend must be running
 * - TEST_USERS.newUser workspace should have NO household profile
 * - TEST_USERS.existingUser workspace should have a household profile
 */
test.describe('New User Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth/storage before each test
    await page.goto('/');
    await clearAuth(page);
  });

  test('should show onboarding wizard for new user without profile', async ({ page }) => {
    // Set up as new user (no profile exists on backend)
    await authenticateTestUser(page, TEST_USERS.newUser);

    // Navigate to home
    await page.goto('/');

    // Wait for onboarding wizard to appear
    const wizard = page.locator('[data-testid="onboarding-wizard"]');
    await expect(wizard).toBeVisible({ timeout: 10000 });

    // Verify welcome step content is shown
    await expect(page.getByText('Welcome')).toBeVisible();
  });

  test('should navigate through wizard steps with Get Started button', async ({ page }) => {
    await authenticateTestUser(page, TEST_USERS.newUser);
    await page.goto('/');

    // Wait for wizard
    await expect(page.locator('[data-testid="onboarding-wizard"]')).toBeVisible();

    // Step 1: Welcome - click "Get Started"
    const getStartedButton = page.getByRole('button', { name: /get started/i });
    await expect(getStartedButton).toBeVisible();
    await getStartedButton.click();

    // Should move to Step 2: Skill Level
    await expect(page.getByText('Cooking Experience')).toBeVisible();
  });

  test('should complete full onboarding flow', async ({ page }) => {
    await authenticateTestUser(page, TEST_USERS.newUser);
    await page.goto('/');

    // Wait for wizard
    await expect(page.locator('[data-testid="onboarding-wizard"]')).toBeVisible();

    // Step 1: Welcome - click "Get Started"
    await page.getByRole('button', { name: /get started/i }).click();

    // Step 2: Skill Level - select intermediate (default)
    await page.getByRole('button', { name: /next/i }).click();

    // Step 3: Cooking Frequency - keep default
    await page.getByRole('button', { name: /next/i }).click();

    // Step 4: Kitchen Equipment - keep default
    await page.getByRole('button', { name: /next/i }).click();

    // Step 5: Pantry Stock - keep default
    await page.getByRole('button', { name: /next/i }).click();

    // Step 6: Primary Goal - keep default
    await page.getByRole('button', { name: /next/i }).click();

    // Step 7: Cuisine Preferences - select at least one
    // Click on Italian cuisine option
    await page.getByText('Italian').click();
    await page.getByRole('button', { name: /next/i }).click();

    // Step 8: Dietary Goals - keep default
    await page.getByRole('button', { name: /next/i }).click();

    // Step 9: Household Members - add a member
    await expect(page.getByText('Household Members')).toBeVisible();

    // Fill in member details
    const nameInput = page.getByPlaceholder(/name/i);
    await nameInput.fill('Test User');

    // Click add member button
    await page.getByRole('button', { name: /add/i }).click();

    // Complete setup
    await page.getByRole('button', { name: /complete setup/i }).click();

    // Wait for wizard to close (success)
    await expect(page.locator('[data-testid="onboarding-wizard"]')).not.toBeVisible({ timeout: 10000 });

    // Should see success toast
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });

  test('should skip onboarding and be able to continue', async ({ page }) => {
    await authenticateTestUser(page, TEST_USERS.newUser);
    await page.goto('/');

    // Wait for wizard
    await expect(page.locator('[data-testid="onboarding-wizard"]')).toBeVisible();

    // Click skip
    await page.getByRole('button', { name: /skip for now/i }).click();

    // Wizard should close
    await expect(page.locator('[data-testid="onboarding-wizard"]')).not.toBeVisible();
  });

  test('should show wizard again after first skip on page reload', async ({ page }) => {
    await authenticateTestUser(page, TEST_USERS.newUser);
    await page.goto('/');

    // First visit - skip
    await expect(page.locator('[data-testid="onboarding-wizard"]')).toBeVisible();
    await page.getByRole('button', { name: /skip for now/i }).click();

    // Reload page
    await page.reload();

    // Wizard should appear again (skip_count = 1, not permanently dismissed)
    await expect(page.locator('[data-testid="onboarding-wizard"]')).toBeVisible({ timeout: 10000 });
  });

  test('should show permanent dismiss option on second skip', async ({ page }) => {
    await authenticateTestUser(page, TEST_USERS.newUser);
    await page.goto('/');

    // First skip
    await expect(page.locator('[data-testid="onboarding-wizard"]')).toBeVisible();
    await page.getByRole('button', { name: /skip for now/i }).click();

    // Reload and skip again
    await page.reload();
    await expect(page.locator('[data-testid="onboarding-wizard"]')).toBeVisible();
    await page.getByRole('button', { name: /skip for now/i }).click();

    // Should show confirmation dialog for permanent dismiss
    await expect(page.getByText(/skip permanently|don't show again/i)).toBeVisible({ timeout: 5000 });
  });

  test('should NOT show wizard if user already has profile', async ({ page }) => {
    // This test requires existingUser to actually have a profile in the backend
    await authenticateTestUser(page, TEST_USERS.existingUser);
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Wizard should NOT appear
    await expect(page.locator('[data-testid="onboarding-wizard"]')).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('Onboarding Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearAuth(page);
  });

  test('should allow going back to previous step', async ({ page }) => {
    await authenticateTestUser(page, TEST_USERS.newUser);
    await page.goto('/');

    // Wait for wizard and proceed
    await expect(page.locator('[data-testid="onboarding-wizard"]')).toBeVisible();
    await page.getByRole('button', { name: /get started/i }).click();

    // Should be on step 2
    await expect(page.getByText('Cooking Experience')).toBeVisible();

    // Go back
    await page.getByRole('button', { name: /back/i }).click();

    // Should be on step 1 again
    await expect(page.getByText('Welcome')).toBeVisible();
  });

  test('should show progress indicator', async ({ page }) => {
    await authenticateTestUser(page, TEST_USERS.newUser);
    await page.goto('/');

    // Wait for wizard
    await expect(page.locator('[data-testid="onboarding-wizard"]')).toBeVisible();

    // Should show step indicator
    await expect(page.getByText(/step 1 of 9/i)).toBeVisible();

    // Move to next step
    await page.getByRole('button', { name: /get started/i }).click();

    // Step indicator should update
    await expect(page.getByText(/step 2 of 9/i)).toBeVisible();
  });
});

test.describe('Onboarding Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await authenticateTestUser(page, TEST_USERS.newUser);
    await page.goto('/');

    // Wait for wizard
    await expect(page.locator('[data-testid="onboarding-wizard"]')).toBeVisible();

    // Tab through to the Get Started button and press Enter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Should have moved to next step
    await expect(page.getByText('Cooking Experience')).toBeVisible();
  });
});
