---
**Summary**: Development workflow guide for Claude Code when working on this project. Contains philosophy, development modes, commit patterns, and best practices.
**Last Updated**: 2025-12-04
**Status**: Reference
**Read This If**: You're using Claude Code on this project or establishing development patterns
---

# Claude Code - Development Guide

## Core Philosophy

**Ship fast, iterate quickly, document as you go.**

This guide helps Claude Code work efficiently by providing:
- Clear working modes for different types of work
- Best practices for documentation and testing
- Gating mechanisms to ensure quality
- Strategies for managing context windows

---

## Working Modes

Use different modes to organize work cleanly and maintain focus. Each mode has specific responsibilities and constraints.

### 🔨 Developer Mode (Default)

**Purpose**: Write code, implement features, fix bugs

**Responsibilities**:
- Implement features according to specifications
- Write clean, readable code
- Fix bugs and handle edge cases
- Update inline documentation (comments, docstrings)

**Constraints**:
- Focus on ONE feature/bug at a time
- Read existing code before modifying
- Avoid over-engineering (YAGNI principle)
- Don't add features beyond requirements
- Don't skip error handling at system boundaries

**Workflow**:
1. Read relevant files to understand context
2. Implement the change
3. Verify TypeScript/Python compilation
4. Mark task complete in TodoWrite

**When to switch modes**:
- Before deploying → QA Mode
- After completing major feature → Documentation Mode
- Planning large changes → Architect Mode

---

### 🧪 QA Mode

**Purpose**: Test features, verify functionality, catch bugs

**Responsibilities**:
- Test all acceptance criteria
- Verify edge cases and error handling
- Check TypeScript compilation
- Test end-to-end user flows
- Validate API responses

**Gating Checklist**:
```
□ Feature works as specified
□ Error handling implemented
□ No TypeScript/Python errors
□ Edge cases handled
□ User feedback (toasts/errors) working
□ No console errors
□ Data persists correctly
```

**Testing Strategy**:
- Start dev servers (frontend + backend)
- Test happy path first
- Test error cases (empty inputs, invalid data)
- Test edge cases (very long strings, special characters)
- Verify state management (data persists after refresh)

**When to switch modes**:
- Bugs found → Developer Mode
- All tests pass → Documentation Mode
- Need architecture review → Architect Mode

---

### 📝 Documentation Mode

**Purpose**: Update documentation, record decisions, maintain context

**Responsibilities**:
- Update PROJECT_CONTEXT.md with completed work
- Update CHANGELOG.md with technical decisions
- Update SPRINT_PLAN.md with progress
- Update this file (CLAUDE.md) with new patterns
- Create/update README sections

**Documentation Checkpoints**:

**After completing a feature**:
1. Update PROJECT_CONTEXT.md:
   - Mark sprint/phase as complete
   - Summarize what was built
   - List files modified
   - Document key decisions

2. Update CHANGELOG.md:
   - Add dated entry
   - Explain technical decisions
   - Note any architectural changes

3. Update SPRINT_PLAN.md:
   - Mark user stories complete
   - Update status

**Context Window Management**:
- Update docs when context hits 75% (150k tokens)
- Consolidate repeated information
- Move historical details to CHANGELOG
- Keep PROJECT_CONTEXT focused on current state

**When to switch modes**:
- Documentation complete → Developer Mode (next feature)
- Need to test → QA Mode
- Planning next sprint → Architect Mode

---

### 🏗️ Architect Mode

**Purpose**: Plan features, design architecture, make technical decisions

**Responsibilities**:
- Break down large features into phases
- Design data models and API contracts
- Identify technical risks and dependencies
- Create implementation plans
- Evaluate architectural trade-offs

**Planning Workflow**:
1. **Understand requirements**:
   - Read user stories and acceptance criteria
   - Ask clarifying questions if needed
   - Identify ambiguities

2. **Design solution**:
   - Sketch data models
   - Design API endpoints
   - Plan component hierarchy
   - Identify reusable patterns

3. **Create implementation plan**:
   - Break into phases/tasks
   - Identify dependencies
   - Set checkpoints for testing
   - Document in SPRINT_PLAN.md or TodoWrite

4. **Review with user** (if needed):
   - Present options and trade-offs
   - Get approval before implementing
   - Document decisions

**When to switch modes**:
- Plan approved → Developer Mode (implement)
- Need to validate approach → QA Mode (prototype)
- Complete major milestone → Documentation Mode

---

## Best Practices

### Save and Document Frequently

**After each feature/bug fix**:
```bash
# 1. Run tests
npm run build              # Frontend
pytest                     # Backend

# 2. Git commit
git add .
git commit -m "Add cuisine selection to recipe generation

- Added cuisine dropdown with 8 options
- Implemented custom cuisine text input
- Updated backend to accept cuisine_type parameter

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# 3. Update documentation
# → Switch to Documentation Mode
```

**Documentation cadence**:
- **After each feature**: Update PROJECT_CONTEXT.md
- **After each sprint**: Update CHANGELOG.md and SPRINT_PLAN.md
- **When context hits 75%**: Consolidate docs, archive old details
- **Before major changes**: Review CLAUDE.md for patterns

### Use Gating Mechanisms

**Prevent moving forward with bugs or incomplete work:**

```python
# Example: Backend gating
def test_api_endpoint():
    """Gate: API must return 200 and valid data"""
    response = requests.post("/api/recipes/generate", json=request)
    assert response.status_code == 200
    assert "title" in response.json()
    assert "ingredients" in response.json()
    # Don't proceed to next feature until this passes
```

```typescript
// Example: Frontend gating
// Before marking feature complete:
// 1. Run `npm run build` - must succeed
// 2. Check browser console - must be clear
// 3. Test user flow - must work end-to-end
```

**Checkpoint questions before proceeding**:
- [ ] Does this work as specified?
- [ ] Have I tested error cases?
- [ ] Are there TypeScript/Python errors?
- [ ] Did I update documentation?
- [ ] Is this ready for the user to see?

### Consolidate Work Using Modes

**Single-mode focus prevents context thrashing:**

❌ **Bad** (mode switching mid-task):
```
1. Write code
2. Update docs
3. Write more code
4. Test
5. Update docs
6. Fix bug
7. Update docs
```

✅ **Good** (complete mode before switching):
```
Developer Mode:
  1. Implement Feature A completely
  2. Implement Feature B completely
  3. Implement Feature C completely

QA Mode:
  4. Test all three features
  5. Fix bugs found
  6. Verify fixes

Documentation Mode:
  7. Update all docs at once
  8. Record all decisions
```

---

## Context Window Management

**Current limit**: 200k tokens

### When Context Hits 150k (75%)

**Consolidation checklist**:

1. **Update PROJECT_CONTEXT.md**:
   - Move old sprint details to CHANGELOG.md
   - Keep only current sprint + last sprint
   - Archive completed phase details

2. **Clean up CHANGELOG.md**:
   - Keep detailed recent history
   - Summarize older entries
   - Archive to separate file if needed

3. **Update this file (CLAUDE.md)**:
   - Add new patterns learned
   - Remove outdated information
   - Keep focused on current practices

4. **Clear TodoWrite**:
   - Remove completed tasks
   - Keep only active/pending work

### Information Hierarchy

**What to keep in each file**:

**PROJECT_CONTEXT.md** (Current state):
- Current scope and features
- Current sprint status
- Recent development history (last 2 sprints)
- Active technical decisions

**CHANGELOG.md** (Historical record):
- All sprint summaries
- Technical decisions with dates
- Architecture changes
- Lessons learned

**SPRINT_PLAN.md** (Future work):
- Upcoming sprints
- User stories
- Acceptance criteria
- Not started work

**CLAUDE.md** (How to work):
- Working modes
- Best practices
- Code patterns
- Development workflows

---

## Common Patterns

### React Component Pattern

```typescript
// 1. Read existing similar component first
// 2. Follow established patterns
// 3. Use existing UI components from shadcn-ui
// 4. Handle loading and error states
// 5. Use React Query for server state

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function MyComponent() {
  const [state, setState] = useState<Type>(initial);

  const { data, isLoading, error } = useQuery({
    queryKey: ['key'],
    queryFn: api.fetch,
  });

  const mutation = useMutation({
    mutationFn: api.update,
    onSuccess: () => toast.success('Success!'),
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {/* Component UI */}
    </div>
  );
}
```

### FastAPI Endpoint Pattern

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services import service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["tag"])

class Request(BaseModel):
    """Request model with validation"""
    field: str

class Response(BaseModel):
    """Response model"""
    result: str

@router.post("/endpoint", response_model=Response)
async def endpoint(request: Request):
    """
    Endpoint description.

    Raises:
        HTTPException 400: Invalid request
        HTTPException 500: Server error
    """
    try:
        logger.info(f"Processing request: {request.field}")
        result = await service.process(request)
        return Response(result=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

### Error Handling Pattern

```typescript
// Frontend: Always show user feedback
try {
  const result = await api.call();
  toast.success('Operation completed!');
  return result;
} catch (error) {
  toast.error(`Failed: ${error.message}`);
  throw error; // Let React Query handle it
}
```

```python
# Backend: Validate inputs, log errors, return HTTP errors
try:
    validate_input(data)
    result = process(data)
    logger.info(f"Success: {result}")
    return result
except ValueError as e:
    # User error - return 400
    logger.warning(f"Invalid input: {e}")
    raise HTTPException(status_code=400, detail=str(e))
except Exception as e:
    # Server error - return 500
    logger.error(f"Unexpected error: {e}", exc_info=True)
    raise HTTPException(status_code=500, detail="Internal server error")
```

---

## Mode Transition Checklist

### Developer → QA
- [ ] All code written and saved
- [ ] TypeScript/Python compiles
- [ ] Git commit created
- [ ] Ready to test

### QA → Documentation
- [ ] All tests passed
- [ ] No bugs found
- [ ] Ready to record work

### Documentation → Developer
- [ ] All docs updated
- [ ] Context window checked
- [ ] Ready for next feature

### Any Mode → Architect
- [ ] Large feature coming
- [ ] Need to plan approach
- [ ] Multiple options to evaluate

---

## Quick Reference

**Check current mode**: What am I doing right now?
- Writing code → Developer Mode
- Testing features → QA Mode
- Updating docs → Documentation Mode
- Planning work → Architect Mode

**Stuck?** Switch to Architect Mode and plan it out

**Feature complete?** Developer → QA → Documentation

**Context window filling?** Switch to Documentation Mode and consolidate

**Ready to ship?** QA Mode final check → Documentation Mode → Git commit

---

## Sprint Workflow Example

```
Architect Mode (1 hour):
  - Read user stories
  - Break into phases
  - Write to TodoWrite
  - Get user approval

Developer Mode (4 hours):
  - Phase 1: Backend changes
  - Phase 2: Frontend component
  - Phase 3: Integration
  - Phase 4: Polish

QA Mode (1 hour):
  - Test happy paths
  - Test error cases
  - Test edge cases
  - Fix bugs (back to Developer Mode if needed)

Documentation Mode (30 min):
  - Update PROJECT_CONTEXT.md
  - Update CHANGELOG.md
  - Git commit
  - Mark sprint complete

Total: ~6.5 hours for a medium feature
```
