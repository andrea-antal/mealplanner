# ADR-003: Progress Modal Simulation vs Real Progress

**Status**: Accepted
**Date**: 2026-01-14
**Author**: Claude + Andrea

## Context

When generating starter recipes or meal plans, users see a progress modal. Since generation happens via BackgroundTasks (ADR-002), there's no direct way for the frontend to know actual progress.

We need to decide how to handle the progress UI.

## Decision

**Simulate progress with client-side timers.**

The modal shows animated steps based on elapsed time, not actual backend progress. Progress caps at 95% and waits indefinitely (user can close anytime).

Implementation in `frontend/src/components/RecipeGenerationModal.tsx`:

```typescript
const GENERATION_STEPS = [
  { label: 'Analyzing your cuisine preferences', duration: 5000 },
  { label: 'Generating recipe 1 of 5...', duration: 25000 },
  // ...
];

useEffect(() => {
  const interval = setInterval(() => {
    elapsedTime += 100;
    const progressPercent = (elapsedTime / TOTAL_DURATION) * 100;
    setProgress(Math.min(progressPercent, 95)); // Cap at 95%
  }, 100);
}, [open]);
```

User can click "Continue in Background" anytime to close the modal.

## Alternatives Considered

### Alternative 1: Polling Backend Status

Add a `/generation-status` endpoint that frontend polls every few seconds.

- **Pros**:
  - Real progress
  - Knows when actually complete
  - Can show which recipe is being generated
- **Cons**:
  - Requires backend changes (status tracking in DB)
  - Polling overhead
  - More complex error states

### Alternative 2: Server-Sent Events (SSE)

Backend streams progress events to frontend.

- **Pros**:
  - Real-time updates
  - No polling
  - Lower latency than polling
- **Cons**:
  - Significant backend refactor
  - Connection management complexity
  - BackgroundTasks can't easily emit SSE events

### Alternative 3: WebSocket Connection

Bidirectional real-time communication.

- **Pros**: Most flexible
- **Cons**: Overkill, complex infrastructure

### Alternative 4: No Progress Modal

Just show a toast and let user proceed.

- **Pros**: Simplest
- **Cons**: Poor UX for 2-3 minute wait, user uncertainty

## Consequences

### Positive
- **Simple implementation**: No backend changes needed
- **Good UX illusion**: Users feel like something is happening
- **Non-blocking**: "Continue in Background" respects user's time
- **Consistent pattern**: Same approach as meal plan generation modal

### Negative
- **Fake progress**: Doesn't reflect actual backend state
- **No completion detection**: Modal doesn't know when recipes are ready
- **Potential mismatch**: Progress might finish before/after actual generation

### Neutral
- Matches user expectations from other apps (many use simulated progress)
- Can evolve to real progress later if needed

## Technical Notes

**Bug fixed during implementation**: Initial version recalculated `GENERATION_STEPS` on every render, causing `useEffect` to restart constantly (progress stuck at 0%). Fixed with `useMemo`:

```typescript
const GENERATION_STEPS = useMemo(() => generateSteps(recipeCount), [recipeCount]);
```

## Future Considerations

To add real progress:
1. Store generation status in Supabase
2. Update status as each recipe completes
3. Frontend polls `/generation-status?workspace_id=X`
4. Modal shows actual completion

## Related

- `frontend/src/components/RecipeGenerationModal.tsx` - Recipe progress modal
- `frontend/src/components/MealPlanGenerationModal.tsx` - Original pattern
- ADR-002 - Why we use background tasks
