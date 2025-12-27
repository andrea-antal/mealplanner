/**
 * Workspace utilities for managing multi-tenant data isolation.
 *
 * This module provides simple workspace ID management without authentication.
 * Workspace IDs are stored in localStorage and sent with all API requests
 * to ensure data isolation between beta testers.
 *
 * When authentication is added later, these workspace IDs will map to user IDs
 * extracted from JWT tokens instead of localStorage.
 */

const WORKSPACE_STORAGE_KEY = 'mealplanner_current_workspace';

/**
 * Validates workspace ID format to match backend validation.
 *
 * Rules:
 * - Only lowercase letters, numbers, and hyphens
 * - 1-50 characters long
 * - No special characters (prevents directory traversal attacks)
 *
 * @param id - Workspace ID to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * isValidWorkspaceId('andrea') // true
 * isValidWorkspaceId('test-user-1') // true
 * isValidWorkspaceId('Test-User') // false (uppercase not allowed)
 * isValidWorkspaceId('../admin') // false (special chars not allowed)
 */
export function isValidWorkspaceId(id: string): boolean {
  if (!id || id.length === 0 || id.length > 50) {
    return false;
  }

  // Must match backend validation: ^[a-z0-9-]+$
  const pattern = /^[a-z0-9-]+$/;
  return pattern.test(id);
}

/**
 * Gets the current workspace ID from localStorage.
 *
 * @returns Workspace ID if set and valid, null otherwise
 *
 * @example
 * const workspaceId = getCurrentWorkspace();
 * if (!workspaceId) {
 *   // Show workspace selector to user
 * }
 */
export function getCurrentWorkspace(): string | null {
  try {
    const workspaceId = localStorage.getItem(WORKSPACE_STORAGE_KEY);

    if (!workspaceId) {
      return null;
    }

    // Validate in case localStorage was manually edited
    if (!isValidWorkspaceId(workspaceId)) {
      console.warn(`Invalid workspace ID in localStorage: ${workspaceId}. Clearing.`);
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
      return null;
    }

    return workspaceId;
  } catch (error) {
    // Handle localStorage not available (private browsing, etc.)
    console.error('Failed to read workspace from localStorage:', error);
    return null;
  }
}

/**
 * Sets the current workspace ID in localStorage.
 *
 * @param workspaceId - Workspace ID to set (must be valid)
 * @throws Error if workspace ID is invalid
 *
 * @example
 * try {
 *   setCurrentWorkspace('andrea');
 *   // Workspace set successfully
 * } catch (error) {
 *   // Show validation error to user
 * }
 */
export function setCurrentWorkspace(workspaceId: string): void {
  if (!isValidWorkspaceId(workspaceId)) {
    throw new Error(
      'Invalid workspace ID. Must be 1-50 characters, lowercase letters, numbers, and hyphens only.'
    );
  }

  try {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
  } catch (error) {
    console.error('Failed to save workspace to localStorage:', error);
    throw new Error('Failed to save workspace. Please check your browser settings.');
  }
}

/**
 * Clears the current workspace ID from localStorage.
 * Useful for testing or switching workspaces.
 *
 * @example
 * clearCurrentWorkspace();
 * // User will be prompted to select workspace again
 */
export function clearCurrentWorkspace(): void {
  try {
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear workspace from localStorage:', error);
  }
}
