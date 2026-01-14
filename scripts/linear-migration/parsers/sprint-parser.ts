import { readFileSync } from 'fs';
import type { ParsedSprint, SprintFeature } from '../types.js';
import { CYCLES } from '../config.js';
import { getCommitsForDateRange } from './git-parser.js';

/**
 * Parse SPRINT_HISTORY.md and extract completed sprint features
 */
export function parseSprintHistory(filePath: string, repoPath: string): ParsedSprint[] {
  const content = readFileSync(filePath, 'utf-8');
  const sprints: ParsedSprint[] = [];

  // Define sprint sections to parse
  const sprintDefinitions = [
    {
      pattern: /## ✅ Sprint 1: Dynamic Recipe Generation \(Complete\)([\s\S]*?)(?=\n## ✅|$)/,
      name: 'Sprint 1',
      cycleName: 'Sprint 1 - Recipe Generation',
    },
    {
      pattern: /## ✅ Sprint 1\.1: Enhanced Recipe Generation \(Complete\)([\s\S]*?)(?=\n## ✅|$)/,
      name: 'Sprint 1.1',
      cycleName: 'Sprint 1.x - Enhancements',
    },
    {
      pattern: /## ✅ Sprint 1\.2: Bug Fixes \(Complete\)([\s\S]*?)(?=\n## ✅|$)/,
      name: 'Sprint 1.2',
      cycleName: 'Sprint 1.x - Enhancements',
    },
    {
      pattern: /## ✅ Sprint 1\.3: Meal Plan UX Improvements \(Complete\)([\s\S]*?)(?=\n## ✅|$)/,
      name: 'Sprint 1.3',
      cycleName: 'Sprint 1.x - Enhancements',
    },
    {
      pattern: /## ✅ Sprint 2: Smart Grocery Management \(Complete\)([\s\S]*?)(?=\n## ✅|$)/,
      name: 'Sprint 2',
      cycleName: 'Sprint 2 - Grocery Management',
    },
    {
      pattern: /## ✅ Sprint 2\.1: Critical Bug Fixes[\s\S]*?\(Complete\)([\s\S]*?)(?=\n## ✅|$)/,
      name: 'Sprint 2.1',
      cycleName: 'Sprint 2 - Grocery Management',
    },
    {
      pattern: /## ✅ Sprint 2\.2: Recipe Generation from Meal Plan[\s\S]*?\(Complete\)([\s\S]*?)(?=\n## ✅|$)/,
      name: 'Sprint 2.2',
      cycleName: 'Sprint 2 - Grocery Management',
    },
    {
      pattern: /## ✅ Sprint 3: Recipe Ratings & Filtering \(Complete\)([\s\S]*?)(?=\n## ✅|$)/,
      name: 'Sprint 3',
      cycleName: 'Sprint 3 - Recipe Ratings',
    },
    {
      pattern: /## ✅ Sprint 3 Phase 1: Individual Dietary Preferences \(Complete\)([\s\S]*?)(?=\n## ✅|$)/,
      name: 'Sprint 3 Phase 1',
      cycleName: 'Sprint 3 - Recipe Ratings',
    },
    {
      pattern: /## ✅ Sprint 4: Multi-Modal Grocery Input[\s\S]*?\(Complete\)([\s\S]*?)(?=\n## ✅|$)/,
      name: 'Sprint 4',
      cycleName: 'Sprint 4 - Multi-Modal Input',
    },
    {
      pattern: /## ✅ v0\.7\.0: Mobile Optimization[\s\S]*?\(Complete\)([\s\S]*?)(?=\n## ✅|$)/,
      name: 'v0.7.0',
      cycleName: 'v0.7.0 - Mobile Optimization',
    },
    {
      pattern: /## 🚨 2025-12-21 INCIDENT: Data Recovery[\s\S]*?([\s\S]*?)(?=\n## ✅|$)/,
      name: 'Incident 2025-12-21',
      cycleName: 'Sprint 3 - Recipe Ratings', // Happened during Sprint 3
    },
  ];

  for (const sprintDef of sprintDefinitions) {
    const match = content.match(sprintDef.pattern);
    if (!match) continue;

    const sprintContent = match[1] || match[0];
    const cycle = CYCLES.find(c => c.name === sprintDef.cycleName);

    if (!cycle) continue;

    // Parse features from the sprint content
    const features = parseSprintFeatures(sprintDef.name, sprintContent, repoPath, cycle);

    if (features.length > 0) {
      sprints.push({
        name: sprintDef.name,
        cycleName: sprintDef.cycleName,
        dateRange: { start: cycle.startDate, end: cycle.endDate },
        status: 'complete',
        features,
      });
    }
  }

  return sprints;
}

/**
 * Parse features from a sprint section
 */
function parseSprintFeatures(
  sprintName: string,
  content: string,
  repoPath: string,
  cycle: { startDate: string; endDate: string }
): SprintFeature[] {
  const features: SprintFeature[] = [];

  // Extract summary/goal
  const goalMatch = content.match(/\*\*Goal\*\*:\s*(.+?)(?=\n|$)/);
  const goal = goalMatch ? goalMatch[1].trim() : '';

  // Extract user stories or features
  const userStories = extractUserStories(content);
  const filesChanged = extractFilesChanged(content);
  const userImpact = extractUserImpact(content);

  // Get commits for this date range
  const commits = getCommitsForDateRange(repoPath, cycle.startDate, cycle.endDate);

  // Create main feature for the sprint
  const mainFeature: SprintFeature = {
    title: `[${sprintName}] ${goal || sprintName}`,
    description: goal || `Completed work for ${sprintName}`,
    technicalDetails: extractTechnicalDetails(content),
    filesChanged,
    userImpact,
    commits,
    labels: inferLabelsFromContent(content),
    migrationId: `sprint:${slugify(sprintName)}`,
  };

  features.push(mainFeature);

  // Add sub-features for significant user stories
  for (const story of userStories) {
    if (story.title && story.title.length > 10) {
      features.push({
        title: `[${sprintName}] ${story.title}`,
        description: story.description,
        filesChanged: story.files || [],
        commits: [], // Will be part of main sprint commits
        labels: inferLabelsFromContent(story.description),
        migrationId: `sprint:${slugify(sprintName)}-${slugify(story.title)}`,
      });
    }
  }

  return features;
}

/**
 * Extract user stories from sprint content
 */
function extractUserStories(content: string): Array<{ title: string; description: string; files?: string[] }> {
  const stories: Array<{ title: string; description: string; files?: string[] }> = [];

  // Pattern for user stories like "**US3.1**: ..."
  const usPattern = /\*\*US[\d.]+\*\*:\s*(.+?)(?=\n)/g;
  const matches = [...content.matchAll(usPattern)];

  for (const match of matches) {
    stories.push({
      title: match[1].trim(),
      description: match[1].trim(),
    });
  }

  return stories;
}

/**
 * Extract files changed from sprint content
 */
function extractFilesChanged(content: string): string[] {
  const files: string[] = [];

  // Look for file paths in backticks
  const fileMatches = content.match(/`(?:frontend|backend|app|src)\/[^`]+`/g);
  if (fileMatches) {
    for (const file of fileMatches) {
      const cleanFile = file.replace(/`/g, '');
      if (!files.includes(cleanFile)) {
        files.push(cleanFile);
      }
    }
  }

  return files;
}

/**
 * Extract user impact (before/after)
 */
function extractUserImpact(content: string): { before: string; after: string } | undefined {
  const beforeMatch = content.match(/\*\*Before[^*]*\*\*:?\s*\n?([\s\S]*?)(?=\*\*After|\n##|$)/i);
  const afterMatch = content.match(/\*\*After[^*]*\*\*:?\s*\n?([\s\S]*?)(?=\n##|$)/i);

  if (beforeMatch && afterMatch) {
    return {
      before: cleanBulletPoints(beforeMatch[1]),
      after: cleanBulletPoints(afterMatch[1]),
    };
  }

  return undefined;
}

/**
 * Clean bullet point content
 */
function cleanBulletPoints(text: string): string {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('-'))
    .map(line => line.slice(1).trim())
    .join('; ');
}

/**
 * Extract technical details section
 */
function extractTechnicalDetails(content: string): string {
  const sections = [
    'Implementation Summary',
    'Technical Highlights',
    'Key Decisions',
    'Key Technical Decisions',
  ];

  for (const sectionName of sections) {
    const pattern = new RegExp(`### ${sectionName}([\\s\\S]*?)(?=\\n###|\\n##|$)`, 'i');
    const match = content.match(pattern);
    if (match) {
      return match[1].trim().slice(0, 1000); // Limit length
    }
  }

  return '';
}

/**
 * Infer labels from content
 */
function inferLabelsFromContent(content: string): string[] {
  const labels: string[] = ['feature'];
  const lower = content.toLowerCase();

  if (lower.includes('recipe')) labels.push('recipes');
  if (lower.includes('grocery') || lower.includes('groceries')) labels.push('groceries');
  if (lower.includes('meal plan')) labels.push('meal-plans');
  if (lower.includes('household') || lower.includes('member') || lower.includes('preference')) labels.push('household');
  if (lower.includes('frontend') || lower.includes('.tsx') || lower.includes('react')) labels.push('frontend');
  if (lower.includes('backend') || lower.includes('.py') || lower.includes('endpoint')) labels.push('backend');
  if (lower.includes('claude') || lower.includes('ai') || lower.includes('prompt')) labels.push('ai/claude');
  if (lower.includes('incident') || lower.includes('recovery')) {
    labels.push('incident');
    // Remove 'feature' for incidents
    const featureIndex = labels.indexOf('feature');
    if (featureIndex > -1) labels.splice(featureIndex, 1);
  }

  return [...new Set(labels)];
}

/**
 * Create URL-safe slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/**
 * Format sprint feature as Linear issue description
 */
export function formatSprintDescription(feature: SprintFeature): string {
  let description = `## Summary\n${feature.description}\n`;

  if (feature.technicalDetails) {
    description += `\n## Technical Details\n${feature.technicalDetails}\n`;
  }

  if (feature.filesChanged.length > 0) {
    description += `\n## Files Changed\n`;
    for (const file of feature.filesChanged.slice(0, 15)) { // Limit to 15 files
      description += `- \`${file}\`\n`;
    }
    if (feature.filesChanged.length > 15) {
      description += `- ... and ${feature.filesChanged.length - 15} more files\n`;
    }
  }

  if (feature.commits.length > 0) {
    description += `\n## Related Commits\n`;
    for (const commit of feature.commits.slice(0, 10)) { // Limit to 10 commits
      description += `- \`${commit.sha.slice(0, 7)}\` ${commit.message}\n`;
    }
    if (feature.commits.length > 10) {
      description += `- ... and ${feature.commits.length - 10} more commits\n`;
    }
  }

  if (feature.userImpact) {
    description += `\n## User Impact\n`;
    description += `**Before**: ${feature.userImpact.before}\n`;
    description += `**After**: ${feature.userImpact.after}\n`;
  }

  description += `\n## Source\nMigrated from sprint history documentation`;

  return description;
}
