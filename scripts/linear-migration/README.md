# Linear Migration Script

Migrates the Meal Planner project history and planned work into Linear.

## What It Does

### Phase 1: Planned Work -> Backlog
- Parses `to-do.md` for feature ideas and backlog items
- Parses `docs/KNOWN_ISSUES.md` for active bugs
- Creates issues in Linear's Backlog state

### Phase 2: Historical Work -> Done
- Parses `docs/archive/sprints/SPRINT_HISTORY.md` for completed sprints
- Extracts commit SHAs from git history by date range
- Creates issues in Linear's Done state, organized by cycles

## Setup

1. Install dependencies:
   ```bash
   cd scripts/linear-migration
   npm install
   ```

2. Get your Linear API key:
   - Go to Linear Settings > API > Personal API keys
   - Create a new key with appropriate permissions
   - Copy the key

## Usage

### Dry Run (Preview)
```bash
LINEAR_API_KEY=your_key npm run migrate:dry-run
```

This shows what would be created without making any changes.

### Live Migration
```bash
LINEAR_API_KEY=your_key npm run migrate
```

## Idempotency

The script is safe to re-run. It embeds a unique migration ID in each issue's description and skips issues that already exist.

## Configuration

Edit `config.ts` to customize:
- `PROJECT_NAME` - Name of the Linear project
- `LABELS` - Labels to create (type + area labels)
- `CYCLES` - Sprint cycles with date ranges
- `SOURCE_FILES` - Paths to source documentation

## Output

The script creates:
- **Labels**: feature, bug, enhancement, devops, incident, backend, frontend, recipes, groceries, meal-plans, household, ai/claude
- **Cycles**: One per sprint/version (Sprint 1, Sprint 2, etc.)
- **Project**: "Meal Planner" to group all issues
- **Issues**: ~8 backlog + ~15-18 historical issues

## Troubleshooting

### "No teams found"
Create a team in Linear before running the migration.

### Rate limiting
The script automatically throttles to 5 requests/second. If you hit limits, wait a minute and re-run (idempotent).

### Missing labels
If labels don't appear on issues, check that the label names in `config.ts` match exactly (case-insensitive).
