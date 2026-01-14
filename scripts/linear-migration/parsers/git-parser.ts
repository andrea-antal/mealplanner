import { execSync } from 'child_process';
import type { CommitInfo } from '../types.js';

/**
 * Get commits within a date range
 */
export function getCommitsForDateRange(
  repoPath: string,
  startDate: string,
  endDate: string
): CommitInfo[] {
  try {
    // Adjust dates for git log (inclusive range)
    const afterDate = subtractDay(startDate);
    const beforeDate = addDay(endDate);

    const cmd = `git log --oneline --after="${afterDate}" --before="${beforeDate}" --format="%H|%s"`;
    const output = execSync(cmd, {
      cwd: repoPath,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024, // 1MB buffer
    });

    if (!output.trim()) {
      return [];
    }

    return output
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const [sha, ...messageParts] = line.split('|');
        const message = messageParts.join('|');
        return {
          sha: sha || '',
          message: message || '',
          type: inferCommitType(message),
        };
      })
      .filter(commit => commit.sha && commit.message);
  } catch (error) {
    console.error(`Error getting commits for ${startDate} to ${endDate}:`, error);
    return [];
  }
}

/**
 * Get commits matching a search pattern
 */
export function getCommitsMatchingPattern(
  repoPath: string,
  pattern: string
): CommitInfo[] {
  try {
    const cmd = `git log --oneline --grep="${pattern}" --format="%H|%s"`;
    const output = execSync(cmd, {
      cwd: repoPath,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024,
    });

    if (!output.trim()) {
      return [];
    }

    return output
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const [sha, ...messageParts] = line.split('|');
        const message = messageParts.join('|');
        return {
          sha: sha || '',
          message: message || '',
          type: inferCommitType(message),
        };
      });
  } catch (error) {
    console.error(`Error getting commits matching "${pattern}":`, error);
    return [];
  }
}

/**
 * Get all commits in the repository
 */
export function getAllCommits(repoPath: string): CommitInfo[] {
  try {
    const cmd = `git log --oneline --format="%H|%s"`;
    const output = execSync(cmd, {
      cwd: repoPath,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024 * 5, // 5MB buffer for full history
    });

    if (!output.trim()) {
      return [];
    }

    return output
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const [sha, ...messageParts] = line.split('|');
        const message = messageParts.join('|');
        return {
          sha: sha || '',
          message: message || '',
          type: inferCommitType(message),
        };
      });
  } catch (error) {
    console.error('Error getting all commits:', error);
    return [];
  }
}

/**
 * Get commit count
 */
export function getCommitCount(repoPath: string): number {
  try {
    const cmd = 'git rev-list --count HEAD';
    const output = execSync(cmd, {
      cwd: repoPath,
      encoding: 'utf-8',
    });
    return parseInt(output.trim(), 10) || 0;
  } catch {
    return 0;
  }
}

/**
 * Infer commit type from conventional commit message
 */
function inferCommitType(message: string): CommitInfo['type'] {
  const lower = message.toLowerCase();

  if (lower.startsWith('feat:') || lower.startsWith('feat(')) return 'feat';
  if (lower.startsWith('fix:') || lower.startsWith('fix(')) return 'fix';
  if (lower.startsWith('docs:') || lower.startsWith('docs(')) return 'docs';
  if (lower.startsWith('chore:') || lower.startsWith('chore(')) return 'chore';
  if (lower.startsWith('refactor:') || lower.startsWith('refactor(')) return 'refactor';
  if (lower.startsWith('test:') || lower.startsWith('test(')) return 'test';

  return 'other';
}

/**
 * Subtract one day from a date string
 */
function subtractDay(dateStr: string): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

/**
 * Add one day to a date string
 */
function addDay(dateStr: string): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
}
