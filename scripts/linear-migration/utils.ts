import type { LinearClient, Issue, IssueLabel } from '@linear/sdk';
import type { LinearIssueInput, MigrationContext } from './types.js';

/**
 * Rate limiter to avoid hitting Linear API limits
 * Linear allows ~50 requests per minute for most operations
 */
export class RateLimiter {
  private lastRequest = 0;
  private minInterval: number;

  constructor(requestsPerSecond = 5) {
    this.minInterval = 1000 / requestsPerSecond; // Default: 200ms between requests
  }

  async throttle(): Promise<void> {
    const elapsed = Date.now() - this.lastRequest;
    if (elapsed < this.minInterval) {
      await sleep(this.minInterval - elapsed);
    }
    this.lastRequest = Date.now();
  }
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an issue with this migration ID already exists
 */
export async function issueExists(
  client: LinearClient,
  teamId: string,
  migrationId: string
): Promise<boolean> {
  try {
    // Search for issues containing our migration ID marker
    const issues = await client.issues({
      filter: {
        team: { id: { eq: teamId } },
        description: { contains: `[Migration ID: ${migrationId}]` },
      },
      first: 1,
    });

    return issues.nodes.length > 0;
  } catch (error) {
    console.error(`Error checking for existing issue ${migrationId}:`, error);
    return false;
  }
}

/**
 * Create an issue if it doesn't already exist (idempotent)
 */
export async function createIssueIfNotExists(
  client: LinearClient,
  context: MigrationContext,
  input: LinearIssueInput,
  rateLimiter: RateLimiter
): Promise<Issue | null> {
  await rateLimiter.throttle();

  // Check for existing issue
  const exists = await issueExists(client, context.teamId, input.migrationId);
  if (exists) {
    console.log(`  [SKIP] Already exists: ${input.title}`);
    return null;
  }

  if (context.dryRun) {
    console.log(`  [DRY-RUN] Would create: ${input.title}`);
    console.log(`    Labels: ${input.labels.join(', ')}`);
    console.log(`    State: ${input.state}`);
    return null;
  }

  // Append migration ID to description
  const descriptionWithId = `${input.description}\n\n---\n[Migration ID: ${input.migrationId}]`;

  // Get state ID
  const stateId = context.stateIds[input.state];

  // Get label IDs
  const labelIds: string[] = [];
  for (const labelName of input.labels) {
    const labelId = context.labelIds.get(labelName);
    if (labelId) {
      labelIds.push(labelId);
    }
  }

  // Get cycle ID if specified
  let cycleId: string | undefined;
  if (input.cycleId) {
    cycleId = context.cycleIds.get(input.cycleId);
  }

  try {
    await rateLimiter.throttle();

    const issuePayload = await client.createIssue({
      teamId: context.teamId,
      title: input.title,
      description: descriptionWithId,
      stateId,
      labelIds: labelIds.length > 0 ? labelIds : undefined,
      priority: input.priority,
      cycleId,
      projectId: context.projectId,
    });

    const issue = await issuePayload.issue;
    if (issue) {
      console.log(`  [CREATED] ${issue.identifier}: ${input.title}`);
      return issue;
    }

    return null;
  } catch (error) {
    console.error(`  [ERROR] Failed to create: ${input.title}`, error);
    return null;
  }
}

/**
 * Get or create a label
 */
export async function getOrCreateLabel(
  client: LinearClient,
  teamId: string,
  name: string,
  color?: string,
  description?: string,
  dryRun = false,
  rateLimiter?: RateLimiter
): Promise<string | null> {
  if (rateLimiter) await rateLimiter.throttle();

  try {
    // Check if label exists
    const team = await client.team(teamId);
    const labels = await team.labels();

    const existingLabel = labels.nodes.find(
      (l: IssueLabel) => l.name.toLowerCase() === name.toLowerCase()
    );

    if (existingLabel) {
      return existingLabel.id;
    }

    if (dryRun) {
      console.log(`  [DRY-RUN] Would create label: ${name}`);
      return `dry-run-${name}`;
    }

    // Create new label
    if (rateLimiter) await rateLimiter.throttle();

    const payload = await client.createIssueLabel({
      teamId,
      name,
      color: color || generateColor(name),
      description,
    });

    const label = await payload.issueLabel;
    if (label) {
      console.log(`  [CREATED] Label: ${name}`);
      return label.id;
    }

    return null;
  } catch (error) {
    console.error(`  [ERROR] Failed to get/create label "${name}":`, error);
    return null;
  }
}

/**
 * Get workflow state IDs for a team
 */
export async function getWorkflowStates(
  client: LinearClient,
  teamId: string
): Promise<{ backlog: string; todo: string; done: string }> {
  const team = await client.team(teamId);
  const states = await team.states();

  let backlog = '';
  let todo = '';
  let done = '';

  for (const state of states.nodes) {
    const name = state.name.toLowerCase();
    const type = state.type.toLowerCase();

    if (type === 'backlog' || name === 'backlog') {
      backlog = state.id;
    } else if (type === 'unstarted' || name === 'todo') {
      todo = state.id;
    } else if (type === 'completed' || name === 'done') {
      done = state.id;
    }
  }

  // Fallbacks
  if (!backlog && states.nodes.length > 0) {
    backlog = states.nodes[0].id;
  }
  if (!todo) {
    todo = backlog;
  }
  if (!done && states.nodes.length > 0) {
    done = states.nodes[states.nodes.length - 1].id;
  }

  return { backlog, todo, done };
}

/**
 * Get or create a cycle
 */
export async function getOrCreateCycle(
  client: LinearClient,
  teamId: string,
  name: string,
  startDate: string,
  endDate: string,
  dryRun = false,
  rateLimiter?: RateLimiter
): Promise<string | null> {
  if (rateLimiter) await rateLimiter.throttle();

  try {
    const team = await client.team(teamId);
    const cycles = await team.cycles();

    const existingCycle = cycles.nodes.find(c => c.name === name);

    if (existingCycle) {
      return existingCycle.id;
    }

    if (dryRun) {
      console.log(`  [DRY-RUN] Would create cycle: ${name}`);
      return `dry-run-cycle-${name}`;
    }

    if (rateLimiter) await rateLimiter.throttle();

    const payload = await client.createCycle({
      teamId,
      name,
      startsAt: new Date(startDate),
      endsAt: new Date(endDate),
    });

    const cycle = await payload.cycle;
    if (cycle) {
      console.log(`  [CREATED] Cycle: ${name}`);
      return cycle.id;
    }

    return null;
  } catch (error) {
    console.error(`  [ERROR] Failed to get/create cycle "${name}":`, error);
    return null;
  }
}

/**
 * Get or create a project
 */
export async function getOrCreateProject(
  client: LinearClient,
  teamId: string,
  name: string,
  description?: string,
  dryRun = false,
  rateLimiter?: RateLimiter
): Promise<string | null> {
  if (rateLimiter) await rateLimiter.throttle();

  try {
    const projects = await client.projects({
      filter: {
        name: { eq: name },
      },
      first: 1,
    });

    if (projects.nodes.length > 0) {
      return projects.nodes[0].id;
    }

    if (dryRun) {
      console.log(`  [DRY-RUN] Would create project: ${name}`);
      return `dry-run-project`;
    }

    if (rateLimiter) await rateLimiter.throttle();

    const payload = await client.createProject({
      teamIds: [teamId],
      name,
      description,
    });

    const project = await payload.project;
    if (project) {
      console.log(`  [CREATED] Project: ${name}`);
      return project.id;
    }

    return null;
  } catch (error) {
    console.error(`  [ERROR] Failed to get/create project "${name}":`, error);
    return null;
  }
}

/**
 * Generate a color based on label name (for consistency)
 */
function generateColor(name: string): string {
  const colors = [
    '#10B981', // green
    '#3B82F6', // blue
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#F59E0B', // amber
    '#EF4444', // red
    '#14B8A6', // teal
    '#6366F1', // indigo
  ];

  // Simple hash to pick a consistent color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Format progress bar for console output
 */
export function progressBar(current: number, total: number, width = 30): string {
  const percentage = Math.floor((current / total) * 100);
  const filled = Math.floor((current / total) * width);
  const empty = width - filled;

  return `[${'='.repeat(filled)}${' '.repeat(empty)}] ${percentage}% (${current}/${total})`;
}
