// Types for Linear migration script

export interface LinearIssueInput {
  title: string;
  description: string;
  labels: string[];
  state: 'backlog' | 'todo' | 'done';
  priority?: 1 | 2 | 3 | 4; // 1 = Urgent, 4 = Low
  cycleId?: string;
  projectId?: string;
  migrationId: string; // For idempotency
}

export interface ParsedTodo {
  title: string;
  category: 'feature' | 'bug' | 'discuss' | 'meta' | 'devops';
  details?: string[];
  priority: 1 | 2 | 3 | 4;
  labels: string[];
  migrationId: string;
}

export interface ParsedBug {
  number: number;
  title: string;
  priority: 1 | 2 | 3 | 4;
  description: string;
  status: 'open' | 'resolved';
  discoveredDate: string;
  relatedFiles: string[];
  workaround?: string;
  proposedFix?: string;
  labels: string[];
  migrationId: string;
}

export interface ParsedSprint {
  name: string;
  cycleName: string;
  dateRange: { start: string; end: string };
  status: 'complete' | 'in-progress' | 'deferred';
  features: SprintFeature[];
}

export interface SprintFeature {
  title: string;
  description: string;
  technicalDetails?: string;
  filesChanged: string[];
  userImpact?: { before: string; after: string };
  commits: CommitInfo[];
  labels: string[];
  migrationId: string;
}

export interface CommitInfo {
  sha: string;
  message: string;
  type: 'feat' | 'fix' | 'docs' | 'chore' | 'refactor' | 'test' | 'other';
}

export interface CycleConfig {
  name: string;
  startDate: string;
  endDate: string;
}

export interface LabelConfig {
  name: string;
  color?: string;
  description?: string;
}

export interface MigrationContext {
  teamId: string;
  projectId?: string;
  labelIds: Map<string, string>; // name -> id
  cycleIds: Map<string, string>; // name -> id
  stateIds: {
    backlog: string;
    todo: string;
    done: string;
  };
  dryRun: boolean;
}
