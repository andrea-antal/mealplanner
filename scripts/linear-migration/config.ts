import type { CycleConfig, LabelConfig } from './types.js';

// Project configuration
export const PROJECT_NAME = 'Meal Planner';
export const PROJECT_DESCRIPTION = 'AI-powered meal planning app with recipe generation, grocery management, and household preferences';

// Labels to create (if they don't exist)
export const LABELS: LabelConfig[] = [
  // Type labels
  { name: 'feature', color: '#10B981', description: 'New functionality' },
  { name: 'bug', color: '#EF4444', description: 'Bug fixes' },
  { name: 'enhancement', color: '#3B82F6', description: 'Improvements to existing features' },
  { name: 'devops', color: '#8B5CF6', description: 'Infrastructure and deployment' },
  { name: 'incident', color: '#F59E0B', description: 'Incident response and recovery' },

  // Area labels
  { name: 'backend', color: '#6366F1', description: 'Backend/API changes' },
  { name: 'frontend', color: '#EC4899', description: 'UI/React changes' },
  { name: 'recipes', color: '#F97316', description: 'Recipe-related features' },
  { name: 'groceries', color: '#22C55E', description: 'Grocery management' },
  { name: 'meal-plans', color: '#14B8A6', description: 'Meal planning features' },
  { name: 'household', color: '#A855F7', description: 'Household/member features' },
  { name: 'ai/claude', color: '#0EA5E9', description: 'Claude AI integration' },
];

// Cycles for historical sprints
export const CYCLES: CycleConfig[] = [
  {
    name: 'Sprint 1 - Recipe Generation',
    startDate: '2025-12-03',
    endDate: '2025-12-04',
  },
  {
    name: 'Sprint 1.x - Enhancements',
    startDate: '2025-12-04',
    endDate: '2025-12-09',
  },
  {
    name: 'Sprint 2 - Grocery Management',
    startDate: '2025-12-09',
    endDate: '2025-12-11',
  },
  {
    name: 'Sprint 3 - Recipe Ratings',
    startDate: '2025-12-17',
    endDate: '2025-12-22',
  },
  {
    name: 'Sprint 4 - Multi-Modal Input',
    startDate: '2025-12-23',
    endDate: '2025-12-26',
  },
  {
    name: 'v0.7.0 - Mobile Optimization',
    startDate: '2025-12-30',
    endDate: '2025-12-30',
  },
  {
    name: 'v0.8.x - Recent Improvements',
    startDate: '2025-12-31',
    endDate: '2025-12-31',
  },
];

// Priority mapping from text to Linear priority numbers
export const PRIORITY_MAP: Record<string, 1 | 2 | 3 | 4> = {
  'urgent': 1,
  'high': 2,
  'medium': 3,
  'low': 4,
  'p0': 1,
  'p1': 2,
  'p2': 3,
  'p3': 4,
};

// File paths (relative to project root)
export const SOURCE_FILES = {
  todo: 'to-do.md',
  knownIssues: 'docs/KNOWN_ISSUES.md',
  sprintHistory: 'docs/archive/sprints/SPRINT_HISTORY.md',
  changelog: 'docs/CHANGELOG.md',
};
