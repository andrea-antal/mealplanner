# ADR-002: Onboarding Background Task Pattern

**Status**: Accepted
**Date**: 2026-01-14
**Author**: Claude + Andrea

## Context

After onboarding, we generate starter content (recipes or meal plan) for the user. This generation takes 2-3 minutes for recipes (5 Claude API calls) or 20-30 seconds for meal plans.

We need to decide whether to:
1. Block the user until generation completes
2. Generate in background and let user proceed
3. Something hybrid

## Decision

**Use FastAPI BackgroundTasks for fire-and-forget generation.**

The onboarding API returns immediately after saving the profile. Starter content generation runs asynchronously in the background.

Implementation in `backend/app/routers/household.py`:

```python
@router.post("/onboarding")
async def submit_onboarding(
    submission: OnboardingSubmission,
    background_tasks: BackgroundTasks = None
):
    # Save profile immediately
    save_household_profile(workspace_id, profile)

    # Trigger generation in background (non-blocking)
    if submission.starter_content_choice == "starter_recipes":
        background_tasks.add_task(generate_starter_recipes, workspace_id, onboarding_data)

    return profile  # Returns immediately
```

## Alternatives Considered

### Alternative 1: Synchronous Generation (Block User)

Wait for all recipes to generate before returning from the API.

- **Pros**:
  - Simple implementation
  - User sees recipes immediately after onboarding
  - Easy error handling (can show failure to user)
- **Cons**:
  - 2-3 minute wait during onboarding = terrible UX
  - Risk of HTTP timeout (most proxies timeout at 60s)
  - User might think app is broken

### Alternative 2: Job Queue (Redis/Celery)

Use a proper job queue for background processing.

- **Pros**:
  - Reliable (jobs persist across restarts)
  - Retries on failure
  - Progress tracking possible
  - Scalable to multiple workers
- **Cons**:
  - Additional infrastructure (Redis)
  - More complex deployment
  - Overkill for current scale

### Alternative 3: Streaming/SSE Progress

Stream generation progress to frontend in real-time.

- **Pros**: Real progress updates
- **Cons**: Complex implementation, connection management

## Consequences

### Positive
- **Instant onboarding completion**: User isn't blocked
- **Simple infrastructure**: No Redis/queue needed
- **Good enough for MVP**: Works for single-user scale

### Negative
- **Silent failures**: If generation fails, user doesn't know until they check recipes
- **No retry logic**: Failed recipes are lost
- **No real progress tracking**: Frontend shows simulated progress (see ADR-003)
- **Not scalable**: BackgroundTasks run in same process, limited concurrency

### Neutral
- Recipes appear "magically" a few minutes after onboarding
- User can manually generate recipes later if background task failed

## Lessons Learned

**Bug discovered**: Exceptions in BackgroundTasks are logged but don't propagate to user. We discovered a schema mismatch (`description` column missing) that failed silently for ~2 minutes before we investigated logs.

**Mitigation**: Added better logging in `starter_content_service.py` for debugging.

## Future Considerations

If we need reliability:
1. Add a `generation_status` field to track progress
2. Frontend can poll for completion
3. Or migrate to proper job queue when scale demands it

## Related

- `backend/app/routers/household.py` - Background task triggering
- `backend/app/services/starter_content_service.py` - Generation logic
- ADR-003 - Why frontend shows simulated progress
