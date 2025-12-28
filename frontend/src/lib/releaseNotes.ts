/**
 * Release notes tracking utilities
 *
 * Manages which versions of release notes users have seen using localStorage.
 * Tracking is workspace-scoped to support multiple workspaces per user.
 */

import { APP_VERSION, isNewerVersion } from './version';
import { getCurrentWorkspace } from './workspace';

/**
 * Get localStorage key for release notes tracking
 * Format: mealplanner_{workspace_id}_last_release_notes_version
 * @returns Storage key or null if no workspace selected
 */
function getStorageKey(): string | null {
  const workspaceId = getCurrentWorkspace();
  if (!workspaceId) return null;
  return `mealplanner_${workspaceId}_last_release_notes_version`;
}

/**
 * Check if release notes should be displayed
 * @returns true if user hasn't seen the current version yet
 */
export function shouldShowReleaseNotes(): boolean {
  const key = getStorageKey();
  if (!key) return false; // No workspace, don't show

  const lastSeenVersion = localStorage.getItem(key);

  // First-time user - don't show release notes immediately (avoid overwhelming on first visit)
  if (!lastSeenVersion) {
    markReleaseNotesAsSeen(); // Mark current version as seen
    return false;
  }

  // Check if current version is newer than last seen version
  return isNewerVersion(APP_VERSION, lastSeenVersion);
}

/**
 * Mark current version as seen in localStorage
 */
export function markReleaseNotesAsSeen(): void {
  const key = getStorageKey();
  if (!key) return;

  localStorage.setItem(key, APP_VERSION);
}

/**
 * Get the last version the user saw (for debugging/testing)
 * @returns Last seen version or null
 */
export function getLastSeenVersion(): string | null {
  const key = getStorageKey();
  if (!key) return null;

  return localStorage.getItem(key);
}
