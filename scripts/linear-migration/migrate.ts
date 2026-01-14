#!/usr/bin/env npx tsx

/**
 * Linear Migration Script for Meal Planner Project
 *
 * Migrates project history and planned work into Linear:
 * - Phase 1: Planned work (to-do.md, KNOWN_ISSUES.md) -> Backlog
 * - Phase 2: Historical work (sprints, changelog) -> Done with Cycles
 *
 * Usage:
 *   LINEAR_API_KEY=xxx npx tsx migrate.ts           # Run migration
 *   LINEAR_API_KEY=xxx npx tsx migrate.ts --dry-run # Preview without changes
 */

import { LinearClient } from '@linear/sdk';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import {
  parseTodoMd,
  parseKnownIssues,
  parseSprintHistory,
  formatTodoDescription,
  formatBugDescription,
  formatSprintDescription,
  getCommitCount,
} from './parsers/index.js';

import {
  RateLimiter,
  getWorkflowStates,
  getOrCreateLabel,
  getOrCreateCycle,
  getOrCreateProject,
  createIssueIfNotExists,
  progressBar,
} from './utils.js';

import { LABELS, CYCLES, PROJECT_NAME, PROJECT_DESCRIPTION, SOURCE_FILES } from './config.js';
import type { MigrationContext, LinearIssueInput } from './types.js';

// Get project root (two levels up from scripts/linear-migration)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..', '..');

// Parse CLI args
const DRY_RUN = process.argv.includes('--dry-run');
const LINEAR_API_KEY = process.env.LINEAR_API_KEY;

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('         Meal Planner -> Linear Migration Script');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '🚀 LIVE'}`);
  console.log(`Project Root: ${PROJECT_ROOT}`);
  console.log('');

  if (!LINEAR_API_KEY) {
    console.error('❌ Error: LINEAR_API_KEY environment variable is required');
    console.error('');
    console.error('To get your API key:');
    console.error('  1. Go to Linear Settings > API');
    console.error('  2. Create a new Personal API Key');
    console.error('  3. Run: LINEAR_API_KEY=your_key npx tsx migrate.ts');
    process.exit(1);
  }

  const client = new LinearClient({ apiKey: LINEAR_API_KEY });
  const rateLimiter = new RateLimiter(5); // 5 requests per second

  // Verify connection and get user info
  console.log('📡 Connecting to Linear...');
  const viewer = await client.viewer;
  console.log(`   Authenticated as: ${viewer.name} (${viewer.email})`);

  // Get teams and let user select if multiple
  const teams = await client.teams();
  if (teams.nodes.length === 0) {
    console.error('❌ No teams found. Please create a team in Linear first.');
    process.exit(1);
  }

  // Use first team (or could add interactive selection)
  const team = teams.nodes[0];
  console.log(`   Using team: ${team.name} (${team.key})`);
  console.log('');

  // Initialize migration context
  const context: MigrationContext = {
    teamId: team.id,
    labelIds: new Map(),
    cycleIds: new Map(),
    stateIds: { backlog: '', todo: '', done: '' },
    dryRun: DRY_RUN,
  };

  // ─────────────────────────────────────────────────────────────────
  // SETUP: Get workflow states
  // ─────────────────────────────────────────────────────────────────
  console.log('🔧 Setting up workflow states...');
  context.stateIds = await getWorkflowStates(client, team.id);
  console.log(`   Backlog: ${context.stateIds.backlog ? '✓' : '✗'}`);
  console.log(`   Todo: ${context.stateIds.todo ? '✓' : '✗'}`);
  console.log(`   Done: ${context.stateIds.done ? '✓' : '✗'}`);
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // SETUP: Create/get labels
  // ─────────────────────────────────────────────────────────────────
  console.log('🏷️  Setting up labels...');
  for (const label of LABELS) {
    const labelId = await getOrCreateLabel(
      client,
      team.id,
      label.name,
      label.color,
      label.description,
      DRY_RUN,
      rateLimiter
    );
    if (labelId) {
      context.labelIds.set(label.name, labelId);
    }
  }
  console.log(`   Total labels: ${context.labelIds.size}`);
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // SETUP: Create/get cycles
  // ─────────────────────────────────────────────────────────────────
  console.log('🔄 Setting up cycles...');
  for (const cycle of CYCLES) {
    const cycleId = await getOrCreateCycle(
      client,
      team.id,
      cycle.name,
      cycle.startDate,
      cycle.endDate,
      DRY_RUN,
      rateLimiter
    );
    if (cycleId) {
      context.cycleIds.set(cycle.name, cycleId);
    }
  }
  console.log(`   Total cycles: ${context.cycleIds.size}`);
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // SETUP: Create/get project
  // ─────────────────────────────────────────────────────────────────
  console.log('📁 Setting up project...');
  const projectId = await getOrCreateProject(
    client,
    team.id,
    PROJECT_NAME,
    PROJECT_DESCRIPTION,
    DRY_RUN,
    rateLimiter
  );
  if (projectId) {
    context.projectId = projectId;
  }
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // Parse source files
  // ─────────────────────────────────────────────────────────────────
  console.log('📖 Parsing source files...');

  const todoPath = resolve(PROJECT_ROOT, SOURCE_FILES.todo);
  const issuesPath = resolve(PROJECT_ROOT, SOURCE_FILES.knownIssues);
  const sprintPath = resolve(PROJECT_ROOT, SOURCE_FILES.sprintHistory);

  const todos = parseTodoMd(todoPath);
  console.log(`   to-do.md: ${todos.length} items`);

  const bugs = parseKnownIssues(issuesPath);
  console.log(`   KNOWN_ISSUES.md: ${bugs.length} bugs`);

  const sprints = parseSprintHistory(sprintPath, PROJECT_ROOT);
  const sprintFeatures = sprints.flatMap(s => s.features);
  console.log(`   SPRINT_HISTORY.md: ${sprints.length} sprints, ${sprintFeatures.length} features`);

  const commitCount = getCommitCount(PROJECT_ROOT);
  console.log(`   Git history: ${commitCount} commits`);
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // PHASE 1: Migrate planned work to Backlog
  // ─────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('         PHASE 1: Planned Work -> Backlog');
  console.log('═══════════════════════════════════════════════════════════════');

  const phase1Issues: LinearIssueInput[] = [];

  // Convert todos to Linear issues
  for (const todo of todos) {
    phase1Issues.push({
      title: todo.title,
      description: formatTodoDescription(todo),
      labels: todo.labels,
      state: 'backlog',
      priority: todo.priority,
      migrationId: todo.migrationId,
    });
  }

  // Convert bugs to Linear issues
  for (const bug of bugs) {
    if (bug.status === 'open') {
      phase1Issues.push({
        title: bug.title,
        description: formatBugDescription(bug),
        labels: bug.labels,
        state: 'backlog',
        priority: bug.priority,
        migrationId: bug.migrationId,
      });
    }
  }

  console.log(`📝 Creating ${phase1Issues.length} backlog issues...`);
  let phase1Created = 0;
  let phase1Skipped = 0;

  for (let i = 0; i < phase1Issues.length; i++) {
    const issue = phase1Issues[i];
    console.log(`\n${progressBar(i + 1, phase1Issues.length)}`);

    const result = await createIssueIfNotExists(client, context, issue, rateLimiter);
    if (result) {
      phase1Created++;
    } else if (!DRY_RUN) {
      phase1Skipped++;
    }
  }

  console.log('');
  console.log(`Phase 1 Summary: ${phase1Created} created, ${phase1Skipped} skipped`);
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // PHASE 2: Migrate historical work to Done
  // ─────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('         PHASE 2: Historical Work -> Done');
  console.log('═══════════════════════════════════════════════════════════════');

  const phase2Issues: LinearIssueInput[] = [];

  // Convert sprint features to Linear issues
  for (const sprint of sprints) {
    for (const feature of sprint.features) {
      phase2Issues.push({
        title: feature.title,
        description: formatSprintDescription(feature),
        labels: feature.labels,
        state: 'done',
        cycleId: sprint.cycleName,
        migrationId: feature.migrationId,
      });
    }
  }

  console.log(`📝 Creating ${phase2Issues.length} historical issues...`);
  let phase2Created = 0;
  let phase2Skipped = 0;

  for (let i = 0; i < phase2Issues.length; i++) {
    const issue = phase2Issues[i];
    console.log(`\n${progressBar(i + 1, phase2Issues.length)}`);

    const result = await createIssueIfNotExists(client, context, issue, rateLimiter);
    if (result) {
      phase2Created++;
    } else if (!DRY_RUN) {
      phase2Skipped++;
    }
  }

  console.log('');
  console.log(`Phase 2 Summary: ${phase2Created} created, ${phase2Skipped} skipped`);
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // FINAL SUMMARY
  // ─────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('         Migration Complete!');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`   Labels created/found: ${context.labelIds.size}`);
  console.log(`   Cycles created/found: ${context.cycleIds.size}`);
  console.log(`   Project: ${PROJECT_NAME}`);
  console.log('');
  console.log(`   Phase 1 (Backlog): ${phase1Created} issues created`);
  console.log(`   Phase 2 (Done):    ${phase2Created} issues created`);
  console.log(`   Total:             ${phase1Created + phase2Created} issues`);
  console.log('');

  if (DRY_RUN) {
    console.log('🔍 This was a dry run. No changes were made.');
    console.log('   Run without --dry-run to create issues in Linear.');
  } else {
    console.log('✅ All issues have been migrated to Linear!');
    console.log(`   View them at: https://linear.app/team/${team.key}`);
  }

  console.log('');
}

// Run the migration
main().catch(error => {
  console.error('');
  console.error('❌ Migration failed:', error.message);
  console.error('');
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
