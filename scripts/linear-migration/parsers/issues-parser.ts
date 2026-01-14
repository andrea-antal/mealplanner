import { readFileSync } from 'fs';
import type { ParsedBug } from '../types.js';
import { PRIORITY_MAP } from '../config.js';

/**
 * Parse KNOWN_ISSUES.md file and extract bug entries
 */
export function parseKnownIssues(filePath: string): ParsedBug[] {
  const content = readFileSync(filePath, 'utf-8');
  const bugs: ParsedBug[] = [];

  // Split by issue headers (### followed by number and title)
  const issuePattern = /### (\d+)\. (.+?)(?=\n)/g;
  const matches = [...content.matchAll(issuePattern)];

  for (const match of matches) {
    const issueNumber = parseInt(match[1], 10);
    const issueTitle = match[2].trim();

    // Find the section for this issue (between this header and the next ### or ## or ---)
    const startIndex = match.index!;
    const nextHeaderMatch = content.slice(startIndex + match[0].length).match(/\n(?:###|##|---)/);
    const endIndex = nextHeaderMatch
      ? startIndex + match[0].length + nextHeaderMatch.index!
      : content.length;

    const issueContent = content.slice(startIndex, endIndex);

    // Parse fields
    const priority = extractField(issueContent, 'Priority');
    const discovered = extractField(issueContent, 'Discovered');
    const status = extractField(issueContent, 'Status');
    const description = extractSection(issueContent, 'Description');
    const workaround = extractSection(issueContent, 'Workaround');
    const proposedFix = extractSection(issueContent, 'Potential Fix') || extractSection(issueContent, 'Recommended Fix');
    const relatedFiles = extractRelatedFiles(issueContent);

    // Infer labels from content
    const labels = inferLabels(issueTitle, issueContent);

    bugs.push({
      number: issueNumber,
      title: issueTitle,
      priority: mapPriority(priority),
      description: description || issueTitle,
      status: status?.toLowerCase().includes('open') ? 'open' : 'resolved',
      discoveredDate: discovered || 'Unknown',
      relatedFiles,
      workaround: workaround || undefined,
      proposedFix: proposedFix || undefined,
      labels,
      migrationId: `bug:${issueNumber}`,
    });
  }

  return bugs;
}

/**
 * Extract a single-line field value
 */
function extractField(content: string, fieldName: string): string | null {
  const pattern = new RegExp(`\\*\\*${fieldName}\\*\\*:\\s*(.+?)(?=\\n|$)`, 'i');
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Extract a multi-line section
 */
function extractSection(content: string, sectionName: string): string | null {
  const pattern = new RegExp(`\\*\\*${sectionName}\\*\\*:\\s*\\n?([\\s\\S]*?)(?=\\n\\*\\*|\\n###|\\n---|$)`, 'i');
  const match = content.match(pattern);
  if (!match) return null;

  return match[1]
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('**'))
    .join('\n')
    .trim();
}

/**
 * Extract related files from the content
 */
function extractRelatedFiles(content: string): string[] {
  const files: string[] = [];

  // Look for "Related Files" section
  const filesSection = extractSection(content, 'Related Files');
  if (filesSection) {
    const fileMatches = filesSection.match(/`([^`]+)`/g);
    if (fileMatches) {
      files.push(...fileMatches.map(f => f.replace(/`/g, '')));
    }
  }

  // Also look for inline file references
  const inlineFiles = content.match(/`(?:frontend|backend)\/[^`]+`/g);
  if (inlineFiles) {
    for (const file of inlineFiles) {
      const cleanFile = file.replace(/`/g, '');
      if (!files.includes(cleanFile)) {
        files.push(cleanFile);
      }
    }
  }

  return files;
}

/**
 * Infer labels from bug title and content
 */
function inferLabels(title: string, content: string): string[] {
  const labels: string[] = ['bug'];
  const combined = `${title} ${content}`.toLowerCase();

  if (combined.includes('daycare') || combined.includes('meal plan') || combined.includes('weekend')) {
    labels.push('meal-plans');
  }
  if (combined.includes('recipe') || combined.includes('rating')) {
    labels.push('recipes');
  }
  if (combined.includes('household') || combined.includes('member')) {
    labels.push('household');
  }
  if (combined.includes('frontend') || combined.includes('ui') || combined.includes('favicon') || combined.includes('.tsx')) {
    labels.push('frontend');
  }
  if (combined.includes('backend') || combined.includes('api') || combined.includes('.py')) {
    labels.push('backend');
  }
  if (combined.includes('claude') || combined.includes('ai') || combined.includes('prompt')) {
    labels.push('ai/claude');
  }

  return [...new Set(labels)];
}

/**
 * Map priority text to Linear priority number
 */
function mapPriority(priorityText: string | null): 1 | 2 | 3 | 4 {
  if (!priorityText) return 3;

  const normalized = priorityText.toLowerCase().trim();

  // Check for explicit matches
  if (normalized in PRIORITY_MAP) {
    return PRIORITY_MAP[normalized];
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(PRIORITY_MAP)) {
    if (normalized.includes(key)) {
      return value;
    }
  }

  return 3; // Default to medium
}

/**
 * Format bug as Linear issue description
 */
export function formatBugDescription(bug: ParsedBug): string {
  let description = `## Summary\n${bug.description}\n`;

  description += `\n## Details\n`;
  description += `- **Discovered**: ${bug.discoveredDate}\n`;
  description += `- **Status**: ${bug.status}\n`;

  if (bug.workaround) {
    description += `\n## Workaround\n${bug.workaround}\n`;
  }

  if (bug.proposedFix) {
    description += `\n## Proposed Fix\n${bug.proposedFix}\n`;
  }

  if (bug.relatedFiles.length > 0) {
    description += `\n## Related Files\n`;
    for (const file of bug.relatedFiles) {
      description += `- \`${file}\`\n`;
    }
  }

  description += `\n## Source\nMigrated from \`docs/KNOWN_ISSUES.md\` (Issue #${bug.number})`;

  return description;
}
