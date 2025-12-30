/**
 * App version management
 *
 * Update APP_VERSION when releasing new features to trigger release notes display.
 * Uses semantic versioning: MAJOR.MINOR.PATCH
 * - MAJOR: Breaking changes or complete redesigns
 * - MINOR: New features or significant improvements
 * - PATCH: Bug fixes or minor tweaks
 */

export const APP_VERSION = '0.7.0';

/**
 * Compare two semantic version strings
 * @param current - Current app version (e.g., "0.2.0")
 * @param seen - Last seen version from localStorage (e.g., "0.1.0")
 * @returns true if current version is newer than seen version
 */
export function isNewerVersion(current: string, seen: string): boolean {
  const [cMajor, cMinor, cPatch] = current.split('.').map(Number);
  const [sMajor, sMinor, sPatch] = seen.split('.').map(Number);

  if (cMajor > sMajor) return true;
  if (cMajor === sMajor && cMinor > sMinor) return true;
  if (cMajor === sMajor && cMinor === sMinor && cPatch > sPatch) return true;

  return false;
}
