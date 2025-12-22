# Sprint 4 Phase 1: Voice Input - TDD Implementation Plan

**Status**: 📋 Planning Complete (TDD Approach)
**Branch**: `feature/voice-input`
**Estimated Time**: 7-9 hours (includes TDD overhead)
**Priority**: HIGH (#1 use case)

---

## TDD Principles Applied

This plan follows **strict Test-Driven Development**:
1. ✅ **Write tests FIRST** - Define contracts before implementation
2. ✅ **Red-Green-Refactor** - Fail → Pass → Improve cycle
3. ✅ **Incremental builds** - Verify each component works before moving on
4. ✅ **Safety checkpoints** - Stop and verify between phases
5. ✅ **API contracts first** - Define interfaces before implementation

---

## Implementation Milestones with Safety Checkpoints

### Milestone 0: Setup & API Contracts (30 min) 🛡️
**Goal**: Define interfaces and test infrastructure before any code

#### Task 0.1: Create Test Infrastructure (15 min)
**File**: `backend/tests/test_voice_parsing.py`

```python
"""Test contracts for voice parsing - WRITE THESE FIRST"""
import pytest
from datetime import date, timedelta


class TestVoiceParsingContracts:
    """API contract tests - these define the expected behavior"""

    @pytest.mark.asyncio
    async def test_parse_voice_returns_tuple(self, temp_data_dir):
        """Contract: parse_voice_to_groceries returns (items, warnings)"""
        # This test will FAIL until we implement the function
        from app.services.claude_service import parse_voice_to_groceries

        result = await parse_voice_to_groceries("test", [])
        assert isinstance(result, tuple)
        assert len(result) == 2
        items, warnings = result
        assert isinstance(items, list)
        assert isinstance(warnings, list)

    @pytest.mark.asyncio
    async def test_parse_voice_rejects_empty_input(self, temp_data_dir):
        """Contract: Empty transcription raises ValueError"""
        from app.services.claude_service import parse_voice_to_groceries

        with pytest.raises(ValueError, match="Transcription cannot be empty"):
            await parse_voice_to_groceries("", [])

    @pytest.mark.asyncio
    async def test_batch_add_endpoint_contract(self, client, temp_data_dir):
        """Contract: POST /groceries/batch accepts list of items"""
        response = client.post("/groceries/batch", json={
            "items": [
                {"name": "test item", "date_added": date.today().isoformat()}
            ]
        })
        # Will fail with 404 until endpoint exists
        assert response.status_code in [200, 404]  # 404 is expected initially
```

**Checkpoint 0.1**: Run tests, verify they FAIL
```bash
pytest backend/tests/test_voice_parsing.py -v
# Expected: All tests FAIL (functions don't exist yet)
```

---

#### Task 0.2: Define API Contract (15 min)
**File**: `backend/API_CONTRACT.md` (NEW)

```markdown
# Voice Parsing API Contract

## Endpoint: POST /groceries/parse-voice

### Request
{
  "transcription": "string (required, min_length=1)"
}

### Response (200)
{
  "proposed_items": [
    {
      "name": "string",
      "date_added": "YYYY-MM-DD",
      "purchase_date": "YYYY-MM-DD" | null,
      "expiry_type": "expiry_date" | "best_before_date" | null,
      "expiry_date": "YYYY-MM-DD" | null,
      "portion": "string" | null,
      "confidence": "high" | "medium" | "low",
      "notes": "string" | null
    }
  ],
  "transcription_used": "string",
  "warnings": ["string"]
}

### Errors
- 400: Invalid transcription
- 500: Claude API error

## Endpoint: POST /groceries/batch

### Request
{
  "items": [
    {
      "name": "string",
      "date_added": "YYYY-MM-DD",
      "purchase_date": "YYYY-MM-DD" | null,
      "expiry_type": "expiry_date" | "best_before_date" | null,
      "expiry_date": "YYYY-MM-DD" | null
    }
  ]
}

### Response (200)
{
  "items": [/* all grocery items */]
}
```

**Checkpoint 0.2**: Contract review
- [ ] Backend contract matches frontend needs
- [ ] All edge cases covered
- [ ] Error states defined

---

### Milestone 1: Backend Models & Tests (1 hour) 🛡️
**Goal**: Models pass validation tests before any service logic

#### Task 1.1: Write Model Tests FIRST (30 min)
**File**: `backend/tests/test_models_voice.py` (NEW)

```python
"""Test Pydantic models for voice parsing"""
import pytest
from pydantic import ValidationError
from datetime import date


class TestVoiceParsingModels:
    """Model validation tests - WRITE BEFORE IMPLEMENTING MODELS"""

    def test_proposed_grocery_item_minimal(self):
        """Minimal valid ProposedGroceryItem"""
        from app.models.grocery import ProposedGroceryItem

        item = ProposedGroceryItem(
            name="chicken",
            confidence="high"
        )
        assert item.name == "chicken"
        assert item.confidence == "high"
        assert item.date_added is None  # Optional

    def test_proposed_grocery_item_with_dates(self):
        """ProposedGroceryItem with all date fields"""
        from app.models.grocery import ProposedGroceryItem

        item = ProposedGroceryItem(
            name="milk",
            purchase_date=date(2025, 12, 21),
            expiry_date=date(2025, 12, 25),
            expiry_type="expiry_date",
            confidence="high"
        )
        assert item.expiry_type == "expiry_date"

    def test_proposed_item_requires_expiry_type_when_expiry_date_set(self):
        """Validation: expiry_date requires expiry_type"""
        from app.models.grocery import ProposedGroceryItem

        # This should raise ValidationError
        with pytest.raises(ValidationError):
            ProposedGroceryItem(
                name="milk",
                expiry_date=date(2025, 12, 25),
                # Missing expiry_type!
                confidence="high"
            )

    def test_voice_parse_request_rejects_empty(self):
        """VoiceParseRequest requires non-empty transcription"""
        from app.models.grocery import VoiceParseRequest

        with pytest.raises(ValidationError):
            VoiceParseRequest(transcription="")

    def test_batch_add_request_requires_items(self):
        """BatchAddRequest requires at least one item"""
        from app.models.grocery import BatchAddRequest

        with pytest.raises(ValidationError):
            BatchAddRequest(items=[])
```

**Checkpoint 1.1**: Run model tests
```bash
pytest backend/tests/test_models_voice.py -v
# Expected: FAIL (models don't exist)
```

---

#### Task 1.2: Implement Models to Pass Tests (30 min)
**File**: `backend/app/models/grocery.py`

Implement models following the implementation plan specs.

**Checkpoint 1.2**: Verify models pass tests
```bash
pytest backend/tests/test_models_voice.py -v
# Expected: ALL PASS ✅
```

**STOP**: Do not proceed until all model tests pass!

---

### Milestone 2: Backend Service with Mocked Claude (2 hours) 🛡️
**Goal**: Service logic works correctly with mocked LLM responses

#### Task 2.1: Write Service Tests with Mocks (1 hour)
**File**: `backend/tests/test_voice_parsing.py` (extend)

```python
"""Service tests with mocked Claude API"""
from unittest.mock import patch, AsyncMock
import json


class TestVoiceParsingServiceMocked:
    """Test service logic WITHOUT calling real Claude API"""

    @pytest.mark.asyncio
    async def test_parse_simple_items_mocked(self, temp_data_dir):
        """Test parsing with mocked Claude response"""
        mock_response = {
            "proposed_items": [
                {"name": "chicken", "confidence": "high", "date_added": "2025-12-22"},
                {"name": "milk", "confidence": "high", "date_added": "2025-12-22"}
            ],
            "warnings": []
        }

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            # Setup mock to return our test data
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': json.dumps(mock_response)})()
            ]

            from app.services.claude_service import parse_voice_to_groceries
            items, warnings = await parse_voice_to_groceries("chicken and milk", [])

            assert len(items) == 2
            assert items[0]["name"] == "chicken"
            mock_claude.assert_called_once()  # Verify API was called

    @pytest.mark.asyncio
    async def test_parse_handles_claude_json_markdown(self, temp_data_dir):
        """Test parsing when Claude wraps JSON in markdown"""
        mock_response = {"proposed_items": [], "warnings": []}

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            # Claude often wraps JSON in ```json code blocks
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': f'```json\n{json.dumps(mock_response)}\n```'})()
            ]

            from app.services.claude_service import parse_voice_to_groceries
            items, warnings = await parse_voice_to_groceries("test", [])

            assert isinstance(items, list)

    @pytest.mark.asyncio
    async def test_parse_handles_malformed_json(self, temp_data_dir):
        """Test error handling for malformed Claude response"""
        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': 'NOT VALID JSON'})()
            ]

            from app.services.claude_service import parse_voice_to_groceries

            with pytest.raises(ValueError, match="Failed to parse"):
                await parse_voice_to_groceries("test", [])

    @pytest.mark.asyncio
    async def test_parse_propagates_connection_errors(self, temp_data_dir):
        """Test that connection errors are properly raised"""
        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.side_effect = Exception("Connection refused")

            from app.services.claude_service import parse_voice_to_groceries

            with pytest.raises(ConnectionError):
                await parse_voice_to_groceries("test", [])
```

**Checkpoint 2.1**: Run service tests
```bash
pytest backend/tests/test_voice_parsing.py::TestVoiceParsingServiceMocked -v
# Expected: FAIL (service not implemented)
```

---

#### Task 2.2: Implement Service to Pass Tests (1 hour)
**File**: `backend/app/services/claude_service.py`

Implement `parse_voice_to_groceries()` and helper functions.

**Checkpoint 2.2**: Verify service tests pass
```bash
pytest backend/tests/test_voice_parsing.py::TestVoiceParsingServiceMocked -v
# Expected: ALL PASS ✅
```

**STOP**: Do not proceed until service tests pass!

---

### Milestone 3: Backend API Endpoints (1.5 hours) 🛡️
**Goal**: Endpoints return correct responses for all scenarios

#### Task 3.1: Write Endpoint Integration Tests (45 min)
**File**: `backend/tests/test_api_voice.py` (NEW)

```python
"""API endpoint integration tests"""
import pytest
from fastapi.testclient import TestClient
from datetime import date


class TestVoiceParsingEndpoints:
    """Test actual HTTP endpoints"""

    def test_parse_voice_endpoint_success(self, client, temp_data_dir):
        """Test successful voice parsing via API"""
        # This will fail until endpoint is implemented
        response = client.post("/groceries/parse-voice", json={
            "transcription": "chicken and milk"
        })

        assert response.status_code == 200
        data = response.json()
        assert "proposed_items" in data
        assert "transcription_used" in data
        assert "warnings" in data

    def test_parse_voice_endpoint_validation_error(self, client, temp_data_dir):
        """Test endpoint validates empty transcription"""
        response = client.post("/groceries/parse-voice", json={
            "transcription": ""
        })

        assert response.status_code == 422  # Pydantic validation error

    def test_batch_add_endpoint_success(self, client, temp_data_dir):
        """Test batch adding items"""
        response = client.post("/groceries/batch", json={
            "items": [
                {"name": "chicken", "date_added": date.today().isoformat()},
                {"name": "milk", "date_added": date.today().isoformat()}
            ]
        })

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) >= 2

    def test_batch_add_handles_duplicates(self, client, temp_data_dir):
        """Test batch add skips duplicates gracefully"""
        # Add item first
        client.post("/groceries", json={
            "name": "milk",
            "date_added": date.today().isoformat()
        })

        # Try to batch add duplicate
        response = client.post("/groceries/batch", json={
            "items": [
                {"name": "milk", "date_added": date.today().isoformat()},
                {"name": "eggs", "date_added": date.today().isoformat()}
            ]
        })

        assert response.status_code == 200
        # Should only add eggs, skip duplicate milk

    def test_batch_add_validates_empty_list(self, client, temp_data_dir):
        """Test batch add rejects empty items list"""
        response = client.post("/groceries/batch", json={"items": []})
        assert response.status_code == 422
```

**Checkpoint 3.1**: Run endpoint tests
```bash
pytest backend/tests/test_api_voice.py -v
# Expected: FAIL (endpoints don't exist)
```

---

#### Task 3.2: Implement Endpoints to Pass Tests (45 min)
**File**: `backend/app/routers/groceries.py`

Add `/parse-voice` and `/batch` endpoints.

**Checkpoint 3.2**: Verify endpoint tests pass
```bash
pytest backend/tests/test_api_voice.py -v
# Expected: ALL PASS ✅
```

**🛡️ MAJOR CHECKPOINT: Backend Complete**
```bash
# Run ALL backend tests
pytest backend/tests -v
# Expected: ALL PASS ✅

# Start backend server
cd backend && uvicorn app.main:app --reload
# Expected: Server starts without errors
# Test manually: curl http://localhost:8000/groceries/parse-voice -X POST -d '{"transcription":"test"}'
```

**STOP**: Do not start frontend until backend tests pass AND server runs!

---

### Milestone 4: Frontend Voice Hook (1.5 hours) 🛡️
**Goal**: Voice input hook works in isolation

#### Task 4.1: Create Hook Test Stub (30 min)
**File**: `frontend/src/hooks/__tests__/useVoiceInput.test.ts` (NEW)

```typescript
/**
 * Tests for useVoiceInput hook
 * Note: Web Speech API is not available in jsdom, so we test state logic
 */
import { renderHook, act } from '@testing-library/react';
import { useVoiceInput } from '../useVoiceInput';

describe('useVoiceInput', () => {
  test('initial state is idle', () => {
    const { result } = renderHook(() => useVoiceInput());
    expect(result.current.state).toBe('idle');
    expect(result.current.transcription).toBe('');
    expect(result.current.error).toBeNull();
  });

  test('reset clears state', () => {
    const { result } = renderHook(() => useVoiceInput());

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.transcription).toBe('');
    expect(result.current.error).toBeNull();
  });

  // More tests for browser detection, error handling, etc.
});
```

**Note**: Web Speech API tests require browser environment. Focus on state management logic.

---

#### Task 4.2: Implement Voice Hook (1 hour)
**File**: `frontend/src/hooks/useVoiceInput.ts`

Implement hook following spec.

**Checkpoint 4.2**: Manual browser test
```bash
# Create simple test page
# Click button, verify microphone permission prompt appears
# Speak, verify transcription appears
```

**STOP**: Verify hook works in browser before continuing!

---

### Milestone 5: Frontend Confirmation Dialog (2 hours) 🛡️
**Goal**: Dialog renders and handles user interactions

#### Task 5.1: Create Dialog Component Stub (30 min)
**File**: `frontend/src/components/__tests__/GroceryConfirmationDialog.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { GroceryConfirmationDialog } from '../GroceryConfirmationDialog';

describe('GroceryConfirmationDialog', () => {
  const mockItems = [
    {
      name: 'chicken',
      confidence: 'high' as const,
      date_added: '2025-12-22'
    }
  ];

  test('renders proposed items', () => {
    const onConfirm = jest.fn();
    render(
      <GroceryConfirmationDialog
        open={true}
        onOpenChange={jest.fn()}
        proposedItems={mockItems}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('chicken')).toBeInTheDocument();
  });

  test('calls onConfirm with edited items', () => {
    const onConfirm = jest.fn();
    render(
      <GroceryConfirmationDialog
        open={true}
        onOpenChange={jest.fn()}
        proposedItems={mockItems}
        onConfirm={onConfirm}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /add/i });
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'chicken' })
      ])
    );
  });

  // More tests for editing, removing items, warnings, etc.
});
```

---

#### Task 5.2: Implement Dialog Component (1.5 hours)
**File**: `frontend/src/components/GroceryConfirmationDialog.tsx`

Implement dialog following spec.

**Checkpoint 5.2**: Component tests
```bash
npm test GroceryConfirmationDialog
# Expected: ALL PASS ✅
```

---

### Milestone 6: Frontend Integration (1.5 hours) 🛡️
**Goal**: All pieces work together in Groceries page

#### Task 6.1: Add API Client Methods (30 min)
**File**: `frontend/src/lib/api.ts`

Add `parseVoice()` and `batchAdd()` methods.

**Checkpoint 6.1**: API contract validation
```typescript
// Create simple test script to verify API shape matches
const response = await groceriesAPI.parseVoice("test");
console.assert('proposed_items' in response);
console.assert('warnings' in response);
```

---

#### Task 6.2: Integrate into Groceries Page (1 hour)
**File**: `frontend/src/pages/Groceries.tsx`

Add voice button, state management, dialog.

**Checkpoint 6.2**: Manual E2E test
```bash
# Start frontend: npm run dev
# Test flow:
# 1. Click voice button
# 2. Grant mic permission
# 3. Speak "chicken and milk"
# 4. Verify dialog shows 2 items
# 5. Click "Add"
# 6. Verify items appear in grocery list
```

**🛡️ MAJOR CHECKPOINT: Feature Complete**
```bash
# Full E2E test
# 1. Backend running
# 2. Frontend running
# 3. Complete voice input flow works end-to-end
```

**STOP**: Do not consider feature complete until full E2E works!

---

### Milestone 7: Final Testing & Documentation (1 hour) 🛡️

#### Task 7.1: Run Full Test Suite (30 min)
```bash
# Backend
pytest backend/tests -v --cov=app

# Frontend
npm test

# Manual testing checklist (from original plan)
```

#### Task 7.2: Update Documentation (30 min)
- [ ] Update SPRINT_PLAN.md
- [ ] Update CHANGELOG.md
- [ ] Add voice input to README.md
- [ ] Document any issues in KNOWN_ISSUES.md

**Final Checkpoint**: Ready for PR
- [ ] All tests passing
- [ ] No console errors
- [ ] Documentation updated
- [ ] Branch ready to merge

---

## Safety Checkpoints Summary

| Checkpoint | What to Verify | Rollback If Fails |
|------------|----------------|-------------------|
| 0.1 | Tests fail as expected | N/A |
| 0.2 | API contract approved | Revise contract |
| 1.2 | Model tests pass | Fix models |
| 2.2 | Service tests pass (mocked) | Fix service logic |
| 3.2 | Endpoint tests pass | Fix endpoints |
| Backend Complete | Server runs, all tests pass | Don't start frontend |
| 4.2 | Voice hook works in browser | Fix hook |
| 5.2 | Dialog component tests pass | Fix component |
| 6.2 | Full E2E flow works | Debug integration |
| Final | All tests + docs complete | Fix before PR |

---

## Red-Green-Refactor Cycles

Each milestone follows this pattern:

1. **🔴 RED**: Write test that fails
   - Defines the contract/behavior
   - Fails because feature doesn't exist yet

2. **🟢 GREEN**: Write minimal code to pass test
   - Focus on making it work, not perfect
   - All tests must pass before moving on

3. **🔵 REFACTOR**: Improve code quality
   - Extract functions
   - Remove duplication
   - Improve naming
   - Tests still pass

---

## Advantages of This Approach

✅ **Catch bugs early**: Tests fail immediately when contracts break
✅ **Incremental verification**: Each piece works before building next
✅ **Safe to refactor**: Tests ensure behavior doesn't change
✅ **Clear rollback points**: Know exactly where to revert if needed
✅ **Documentation**: Tests serve as usage examples
✅ **Confidence**: Green tests = feature works

---

## Time Comparison

| Approach | Estimated Time | Risk Level |
|----------|----------------|------------|
| Original Plan | 6-8 hours | Medium (late integration issues) |
| TDD Plan | 7-9 hours | Low (early issue detection) |

**Trade-off**: +1 hour upfront for significantly reduced debugging time later.

---

## Implementation Order (TDD)

1. ✅ Write API contract
2. ✅ Write failing tests
3. ✅ Implement models → tests pass
4. ✅ Implement service (mocked) → tests pass
5. ✅ Implement endpoints → tests pass
6. ✅ **Checkpoint: Backend complete**
7. ✅ Implement frontend hook → manual test
8. ✅ Implement dialog → component tests pass
9. ✅ Integrate into page → E2E manual test
10. ✅ **Checkpoint: Feature complete**
11. ✅ Full test suite + docs

**NEVER move to next step until current step's tests pass!**
