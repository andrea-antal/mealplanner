# Claude Model Migration: Opus 4 → Sonnet 4.5

**Date**: December 27, 2025
**Status**: Implemented
**Decision**: Migrate all AI features from Claude Opus 4 to Claude Sonnet 4.5

## Executive Summary

Migrated from `claude-opus-4-20250514` to `claude-sonnet-4-5-20250929` for all AI features to achieve significant cost savings and performance improvements while maintaining or improving quality.

**Expected Impact**:
- **Cost**: ~70% reduction across all API calls
- **Speed**: 2-3x faster response times
- **Quality**: Same or better for structured tasks

## Background

### Problem Statement
User observation: "API calls are cheap but slow"

### Current State (Before Migration)
All features used `claude-opus-4-20250514` (Opus 4):

| Feature | Model | Temperature | Max Tokens | Use Case |
|---------|-------|-------------|------------|----------|
| Receipt OCR | Opus 4 | 0.1 | 2000 | Extract grocery items from receipt images |
| Voice Parsing | Opus 4 | 0.3 | 1500 | Parse voice transcriptions into grocery items |
| Recipe Gen (ingredients) | Opus 4 | 0.8 | 2048 | Generate recipes from selected ingredients |
| Recipe Gen (title) | Opus 4 | 0.7 | 2048 | Generate full recipe from title only |
| Meal Plan Generation | Opus 4 | 0.7 | 4096 | Create 7-day meal plans with complex constraints |

### Analysis

**Observation**: Opus 4 is overpowered for most tasks
- **Receipt OCR** (temp=0.1): Deterministic extraction doesn't need advanced reasoning
- **Voice parsing** (temp=0.3): Structured parsing is straightforward
- **Recipe generation** (temp=0.7-0.8): Creative but not complex reasoning
- **Meal planning** (temp=0.7): Complex multi-constraint task, but Sonnet 4.5 should handle it

**Sonnet 4.5 Strengths**:
- Excels at **structured output** tasks (JSON generation, extraction)
- Faster inference speed (2-3x vs Opus)
- ~70% lower cost
- Strong performance on creative tasks with appropriate temperature

## Decision Rationale

### Why Sonnet 4.5 for Everything?

1. **Cost Efficiency**: ~70% reduction in API costs
2. **Performance**: 2-3x faster responses improves UX
3. **Quality**: Sonnet 4.5 excels at structured tasks
4. **Simplicity**: Single model reduces complexity

### Alternative Considered: Multi-Model Strategy

**Not chosen** (but documented for future):
- Sonnet 4.5 for OCR/parsing/recipes
- Keep Opus 4 for meal planning only
- **Pros**: Maximum quality for complex meal planning
- **Cons**: More complexity, minimal cost savings since meal planning is core feature

## Implementation

### Changes Made

**File**: `backend/app/config.py`

```python
# Before
MODEL_NAME: str = "claude-opus-4-20250514"

# After
MODEL_NAME: str = "claude-sonnet-4-5-20250929"
```

This single change affects all features since `backend/app/services/claude_service.py` uses `settings.MODEL_NAME` throughout.

### No Code Changes Required
All service methods already accept optional `model` parameter, so they seamlessly use the new default.

## Expected Results by Feature

### Receipt OCR
- **Quality**: Same or better (Sonnet excels at vision + structured extraction)
- **Cost**: ~70% reduction per receipt
- **Speed**: 2-3x faster
- **Risk**: Low - OCR is straightforward extraction

### Voice-to-Grocery Parsing
- **Quality**: Same or better (structured parsing)
- **Cost**: ~70% reduction per parse
- **Speed**: 2-3x faster
- **Risk**: Low - simple NLP task

### Recipe Generation
- **Quality**: Should be excellent (Sonnet is creative at temp=0.7-0.8)
- **Cost**: ~70% reduction per recipe
- **Speed**: 2-3x faster
- **Risk**: Low-Medium - monitor creativity and practicality

### Meal Plan Generation
- **Quality**: Should be good (complex but well-structured)
- **Cost**: ~70% reduction per meal plan
- **Speed**: 2-3x faster
- **Risk**: Medium - most complex feature, needs monitoring

**Key Risk**: Meal planning has strict constraints (allergies, daycare rules, preferences). Monitor quality closely.

## Testing Plan

### Manual Testing (Recommended)
1. **Receipt OCR**: Test with sample receipts, verify item extraction accuracy
2. **Meal Planning**: Generate plans, verify:
   - Allergy constraints respected
   - Daycare lunch rules followed
   - Cooking time limits observed
   - Recipe ratings considered
3. **Recipe Generation**: Generate recipes, check creativity and quality
4. **Voice Parsing**: Test natural language input parsing

### Quality Metrics to Monitor
- OCR accuracy (% of items correctly extracted)
- Meal plan constraint violations (should be 0)
- Recipe creativity and practicality (subjective)
- User satisfaction with generation quality

## Rollback Plan

If quality issues arise:

1. **Immediate Rollback** (if critical issues):
   ```python
   MODEL_NAME: str = "claude-opus-4-20250514"  # Revert to Opus 4
   ```

2. **Targeted Rollback** (if only meal planning has issues):
   - Implement multi-model strategy
   - Keep Sonnet 4.5 for OCR/parsing/recipes
   - Use Opus 4 only for meal planning
   - File: `backend/app/services/meal_plan_service.py:96` - pass `model="claude-opus-4-20250514"`

3. **Document Issues**: Record specific quality problems for future model selection

## Cost Impact Estimate

Assuming monthly usage:
- 500 receipt OCRs
- 500 voice parses
- 200 recipe generations
- 100 meal plans

**Before** (all Opus 4):
- ~1,300 Opus 4 API calls
- Cost: $$$

**After** (all Sonnet 4.5):
- ~1,300 Sonnet 4.5 API calls
- Cost: $$ (~30% of previous)
- **Savings**: ~70% reduction

## Future Enhancements

Not implemented now, but documented for consideration:

1. **Multi-Model Strategy**
   - Per-feature model configuration
   - Opus 4 for complex reasoning (meal planning)
   - Sonnet 4.5 for structured tasks (OCR, parsing)
   - Haiku for simple queries

2. **Prompt Caching**
   - Cache household profiles across meal plan generations
   - Cache recipe libraries in RAG context
   - Huge cost savings on repeated data

3. **User-Selectable Model Quality**
   - Power users can opt for Opus 4 for premium quality
   - Default users get Sonnet 4.5 (fast + affordable)
   - Pricing tiers based on model selection

4. **A/B Testing Framework**
   - Compare Sonnet vs Opus quality metrics
   - Data-driven model selection per feature

## References

- Claude API Documentation: https://docs.anthropic.com/
- Model comparison: Opus 4.5 > Opus 4 > Sonnet 4.5 > Haiku (reasoning capability)
- Sonnet 4.5 strengths: Structured output, speed, cost efficiency

## Change Log

- **2025-12-27**: Initial migration from Opus 4 to Sonnet 4.5 for all features
