# Meal Planner - Project Instructions

## Linear Integration

**Linear is the source of truth for all planned work.** The `to-do.md` file is deprecated.

### Creating Issues

When I mention new work, features, bugs, or ideas, create a Linear issue:

1. **Confirm before creating** - Summarize what you'll create and ask for approval
2. **Use the MCP tool** - `mcp__linear.create_issue()`
3. **Apply conventions**:
   - Team: `AA`
   - Project: `Meal Planner`
   - State: `Backlog` (unless assigned to me, then `Todo`)

### Label Mapping

Infer labels from context:
- `recipes` - Recipe generation, editing, ratings
- `groceries` - Grocery list, expiry tracking, voice input
- `meal-plans` - Meal plan generation, customization
- `household` - Family members, preferences, daycare rules
- `ai/claude` - Prompts, Claude API, model changes
- `frontend` - React, UI, components
- `backend` - FastAPI, endpoints, services
- `bug` / `feature` / `enhancement` / `devops`

### Quick Capture

If I say "quick:" or "capture:", create the issue immediately without confirmation:
```
quick: add dark mode toggle
```

### Viewing Issues

Use `/linear` skill or MCP tools to query:
- My issues: `list_issues({ assignee: "me" })`
- Backlog: `list_issues({ project: "Meal Planner", state: "Backlog" })`

## API Key

The Linear API key is required for SDK scripts. It's stored in `~/.bash_profile` as `LINEAR_API_KEY`.

## Development Conventions

- Follow TDD (see `~/.claude/processes/new-feature.dot`)
- Commit messages: conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- Run tests after changes: `pytest backend/` and `npm run build` in frontend

## Deployment (CI/CD)

**Both Railway and Vercel are integrated with GitHub.** Deployments are automatic once code is pushed to `main`.

- **Frontend (Vercel)**: Auto-deploys on push to `main`. Usually ready in ~1 minute.
- **Backend (Railway)**: Auto-deploys on push to `main`. Takes 3-5 minutes for build + restart.

**To deploy:**
1. Merge feature branch to `main`
2. Push to GitHub: `git push origin main`
3. That's it - CI/CD handles the rest

**Do NOT:**
- Run `vercel --prod` manually (it's automatic)
- Try to link Railway CLI (it's already connected via GitHub)

**Verify deployments:**
- Frontend: Check https://frontend-iota-orcin-18.vercel.app
- Backend: Check https://mealplanner-backend-production-3e88.up.railway.app/health

## Admin Endpoints

### Chroma Sync (Recipe Vector DB)

If recipes exist in JSON storage but meal plan generation fails with "No recipes retrieved", the Chroma vector DB may be out of sync.

**Sync a single workspace:**
```bash
curl -X POST "https://mealplanner-backend-production-3e88.up.railway.app/recipes/admin/sync-chroma?workspace_id=<workspace>"
```

**Sync ALL workspaces:**
```bash
curl -X POST "https://mealplanner-backend-production-3e88.up.railway.app/recipes/admin/sync-all-workspaces"
```

Returns stats showing orphaned entries removed and missing recipes added.

## GitHub

- **Repository**: https://github.com/andrea-antal/mealplanner
- **Username**: andrea-antal (changed from dreachan)
