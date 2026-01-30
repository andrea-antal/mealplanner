# ADR-001: Starter Recipe Title Selection

**Status**: Accepted
**Date**: 2026-01-14
**Author**: Claude + Andrea

## Context

During onboarding, users can choose to have starter recipes added to their library. We need to decide how to select which recipes to generate for them.

The system knows:
- User's cuisine preferences (e.g., Hungarian, Italian, Mediterranean)
- User's skill level, equipment, dietary patterns
- We have Claude available for generation

## Decision

**Hardcode recipe titles per cuisine, then have Claude generate the full recipe content.**

Implementation in `backend/app/services/starter_content_service.py`:

```python
STARTER_RECIPES_BY_CUISINE = {
    "hungarian": [
        ("Chicken Paprikash", "dinner"),
        ("Hungarian Goulash", "dinner"),
        # ... curated list
    ],
    # ... other cuisines
}
```

Recipe selection logic:
- **Single cuisine selected**: Use all recipes from that cuisine (up to 5)
- **Multiple cuisines**: Distribute evenly (~2 per cuisine)
- **Fill with defaults**: Generic crowd-pleasers if not enough cuisine-specific recipes

Claude generates the full recipe (ingredients, instructions, timing) from each title.

## Alternatives Considered

### Alternative 1: Claude Selects Titles Dynamically

Have Claude pick recipe titles based on the full onboarding profile (skill level, equipment, dietary restrictions, cuisines).

- **Pros**:
  - More personalized (e.g., beginner-friendly recipes for beginners)
  - Could avoid recipes requiring equipment user doesn't have
  - Dietary patterns could influence selection
- **Cons**:
  - Extra API call (~5-10s latency)
  - Unpredictable results (might suggest obscure dishes)
  - Risk of hallucinated recipe names
  - Harder to test/debug

### Alternative 2: Fully Dynamic Generation

Ask Claude to generate complete recipes from scratch based on preferences.

- **Pros**: Maximum personalization
- **Cons**:
  - Very slow (minutes per recipe)
  - Highly unpredictable quality
  - No quality control over titles

## Consequences

### Positive
- **Predictable quality**: Every "Hungarian" user gets classic Hungarian dishes
- **Fast**: Skip title-selection API call, go straight to recipe generation
- **Testable**: Known inputs make testing easier
- **Cultural accuracy**: Curated titles are real dishes, not AI inventions

### Negative
- **Less personalized**: Doesn't consider skill level or equipment for title selection
- **Maintenance**: Need to manually add recipes for new cuisines
- **Limited variety**: Users who re-run get same titles

### Neutral
- Claude still generates full recipe content, so ingredients/instructions are dynamic
- Can evolve to hybrid approach later if needed

## Related

- `backend/app/services/starter_content_service.py` - Implementation
- `backend/app/services/claude_service.py:generate_recipe_from_title()` - Recipe generation
- ADR-002 - Background task pattern for generation
