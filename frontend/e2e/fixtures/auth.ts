import { Page } from '@playwright/test';

/**
 * Test user configurations for E2E tests.
 *
 * Note: These users need to be set up appropriately for your test environment.
 * For new users, ensure no household profile exists.
 * For existing users, pre-populate the profile.
 */
export interface TestUser {
  id: string;
  email: string;
  workspace_id: string;
}

export const TEST_USERS = {
  /**
   * A new user with no existing household profile.
   * Used to test the full onboarding flow from scratch.
   */
  newUser: {
    id: 'test-new-user-id',
    email: 'newuser@test.com',
    workspace_id: 'test-new-user',
  },

  /**
   * An existing user with a complete household profile.
   * Used to verify that onboarding is NOT shown to existing users.
   */
  existingUser: {
    id: 'test-existing-user-id',
    email: 'existing@test.com',
    workspace_id: 'test-existing',
  },
};

/**
 * Storage key used by the app to store workspace ID.
 */
const WORKSPACE_STORAGE_KEY = 'mealplanner_current_workspace';

/**
 * Set up authentication state for testing.
 *
 * This bypasses Supabase magic link authentication by directly setting
 * the workspace in localStorage, which mimics a successful auth flow.
 *
 * Note: For production E2E tests, you may want to:
 * 1. Use a test Supabase project with seeded users
 * 2. Create a test-only auth bypass endpoint
 * 3. Mock the Supabase client entirely
 */
export async function authenticateTestUser(page: Page, user: TestUser): Promise<void> {
  // Navigate to the app first (required for localStorage access)
  await page.goto('/');

  // Set the workspace in localStorage to simulate authenticated state
  await page.evaluate((workspaceId) => {
    localStorage.setItem('mealplanner_current_workspace', workspaceId);
  }, user.workspace_id);

  // Reload to pick up the workspace
  await page.reload();
}

/**
 * Clear authentication state.
 *
 * Use this to reset between tests or simulate logout.
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('mealplanner_current_workspace');
    // Clear all localStorage to be safe
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Check if user is authenticated (has workspace set).
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return !!localStorage.getItem('mealplanner_current_workspace');
  });
}

/**
 * Get current workspace ID from storage.
 */
export async function getCurrentWorkspace(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    return localStorage.getItem('mealplanner_current_workspace');
  });
}
