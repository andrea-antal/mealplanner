# Sprint 4 Phase 2: Receipt OCR - TDD Implementation Plan

**Status**: 📋 Planning Complete (TDD Approach)
**Branch**: `feature/receipt-ocr`
**Estimated Time**: 4-7 hours (includes TDD overhead)
**Priority**: MEDIUM (#4 use case - convenient input method)

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
**File**: `backend/tests/test_receipt_parsing.py`

```python
"""Test contracts for receipt OCR parsing - WRITE THESE FIRST"""
import pytest
from datetime import date
import base64


class TestReceiptParsingContracts:
    """API contract tests - these define the expected behavior"""

    @pytest.mark.asyncio
    async def test_parse_receipt_returns_tuple(self, temp_data_dir):
        """Contract: parse_receipt_to_groceries returns (items, warnings)"""
        # This test will FAIL until we implement the function
        from app.services.claude_service import parse_receipt_to_groceries

        # Create minimal test image (1x1 white pixel PNG base64)
        test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="

        result = await parse_receipt_to_groceries(test_image, [])
        assert isinstance(result, tuple)
        assert len(result) == 2
        items, warnings = result
        assert isinstance(items, list)
        assert isinstance(warnings, list)

    @pytest.mark.asyncio
    async def test_parse_receipt_rejects_empty_input(self, temp_data_dir):
        """Contract: Empty image raises ValueError"""
        from app.services.claude_service import parse_receipt_to_groceries

        with pytest.raises(ValueError, match="Image data cannot be empty"):
            await parse_receipt_to_groceries("", [])

    def test_parse_receipt_endpoint_contract(self, client, temp_data_dir):
        """Contract: POST /groceries/parse-receipt accepts image"""
        test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="

        response = client.post("/groceries/parse-receipt", json={
            "image_base64": test_image
        })
        # Will fail with 404 until endpoint exists
        assert response.status_code in [200, 404]  # 404 is expected initially
```

**Checkpoint 0.1**: Run tests, verify they FAIL
```bash
pytest backend/tests/test_receipt_parsing.py -v
# Expected: All tests FAIL (functions don't exist yet)
```

---

#### Task 0.2: Define API Contract (15 min)
**File**: `backend/API_CONTRACT.md` (update)

```markdown
# Receipt OCR API Contract

## Endpoint: POST /groceries/parse-receipt

### Request
{
  "image_base64": "string (required, base64 encoded image)"
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
  "detected_purchase_date": "YYYY-MM-DD" | null,
  "detected_store": "string" | null,
  "warnings": ["string"]
}

### Errors
- 400: Invalid image data (not base64, corrupt image)
- 422: Validation error (empty image)
- 500: Claude Vision API error

## Technical Notes
- Image must be base64 encoded (without data URL prefix)
- Supported formats: PNG, JPG, JPEG
- Client should compress images to max 1024px, 80% JPEG quality
- Claude Vision API extracts items, purchase date, store name
- Temperature: 0.1 (very low for accurate OCR)
- All items get same purchase_date (from receipt header)
```

**Checkpoint 0.2**: Contract review
- [ ] Backend contract matches frontend needs
- [ ] All edge cases covered (invalid images, OCR failures)
- [ ] Error states defined
- [ ] Reuses existing models (ProposedGroceryItem, BatchAdd)

---

### Milestone 1: Backend Models & Tests (30 min) 🛡️
**Goal**: Models pass validation tests before any service logic

#### Task 1.1: Write Model Tests FIRST (15 min)
**File**: `backend/tests/test_models_receipt.py` (NEW)

```python
"""Test Pydantic models for receipt OCR parsing"""
import pytest
from pydantic import ValidationError
from datetime import date


class TestReceiptParsingModels:
    """Model validation tests - WRITE BEFORE IMPLEMENTING MODELS"""

    def test_receipt_parse_request_minimal(self):
        """Minimal valid ReceiptParseRequest"""
        from app.models.grocery import ReceiptParseRequest

        req = ReceiptParseRequest(
            image_base64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
        )
        assert req.image_base64.startswith("iVBOR")

    def test_receipt_parse_request_rejects_empty(self):
        """ReceiptParseRequest requires non-empty image"""
        from app.models.grocery import ReceiptParseRequest

        with pytest.raises(ValidationError):
            ReceiptParseRequest(image_base64="")

    def test_receipt_parse_response_minimal(self):
        """Minimal valid ReceiptParseResponse"""
        from app.models.grocery import ReceiptParseResponse

        resp = ReceiptParseResponse(
            proposed_items=[],
            warnings=[]
        )
        assert resp.detected_purchase_date is None
        assert resp.detected_store is None

    def test_receipt_parse_response_with_metadata(self):
        """ReceiptParseResponse with full metadata"""
        from app.models.grocery import ReceiptParseResponse, ProposedGroceryItem

        resp = ReceiptParseResponse(
            proposed_items=[
                ProposedGroceryItem(
                    name="milk",
                    purchase_date=date(2025, 12, 20),
                    confidence="high"
                )
            ],
            detected_purchase_date=date(2025, 12, 20),
            detected_store="Whole Foods",
            warnings=["Could not read item on line 5"]
        )
        assert resp.detected_store == "Whole Foods"
        assert len(resp.proposed_items) == 1

    def test_reuses_proposed_grocery_item_from_phase1(self):
        """Verify ProposedGroceryItem from Phase 1 works for receipts"""
        from app.models.grocery import ProposedGroceryItem

        # Phase 1 model should work for OCR results
        item = ProposedGroceryItem(
            name="chicken breast",
            purchase_date=date(2025, 12, 20),
            confidence="medium",
            notes="OCR confidence medium due to smudged text"
        )
        assert item.name == "chicken breast"
        assert item.confidence == "medium"
```

**Checkpoint 1.1**: Run model tests
```bash
pytest backend/tests/test_models_receipt.py -v
# Expected: FAIL (models don't exist)
```

---

#### Task 1.2: Implement Models to Pass Tests (15 min)
**File**: `backend/app/models/grocery.py`

Add these two new models (ProposedGroceryItem already exists from Phase 1):

```python
class ReceiptParseRequest(BaseModel):
    """Request to parse receipt image"""
    image_base64: str = Field(..., min_length=1, description="Base64 encoded receipt image")


class ReceiptParseResponse(BaseModel):
    """Response from receipt OCR parsing"""
    proposed_items: List[ProposedGroceryItem]
    detected_purchase_date: Optional[date] = None
    detected_store: Optional[str] = None
    warnings: List[str] = []
```

**Checkpoint 1.2**: Verify models pass tests
```bash
pytest backend/tests/test_models_receipt.py -v
# Expected: ALL PASS ✅
```

**STOP**: Do not proceed until all model tests pass!

---

### Milestone 2: Backend Service with Mocked Claude Vision (2 hours) 🛡️
**Goal**: Service logic works correctly with mocked Claude Vision API responses

#### Task 2.1: Write Service Tests with Mocks (1 hour)
**File**: `backend/tests/test_receipt_parsing.py` (extend)

```python
"""Service tests with mocked Claude Vision API"""
from unittest.mock import patch, AsyncMock, MagicMock
import json


class TestReceiptParsingServiceMocked:
    """Test service logic WITHOUT calling real Claude Vision API"""

    @pytest.mark.asyncio
    async def test_parse_simple_receipt_mocked(self, temp_data_dir):
        """Test parsing with mocked Claude Vision response"""
        mock_response = {
            "proposed_items": [
                {
                    "name": "milk",
                    "purchase_date": "2025-12-20",
                    "confidence": "high",
                    "notes": "2% milk"
                },
                {
                    "name": "chicken breast",
                    "purchase_date": "2025-12-20",
                    "confidence": "high"
                }
            ],
            "detected_purchase_date": "2025-12-20",
            "detected_store": "Whole Foods Market",
            "warnings": []
        }

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            # Setup mock to return our test data
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': json.dumps(mock_response)})()
            ]

            from app.services.claude_service import parse_receipt_to_groceries
            test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="

            items, warnings = await parse_receipt_to_groceries(test_image, [])

            assert len(items) == 2
            assert items[0]["name"] == "milk"
            assert items[0]["purchase_date"] == "2025-12-20"

            # Verify Claude Vision API was called with image content
            mock_claude.assert_called_once()
            call_args = mock_claude.call_args

            # Check that multimodal content was sent (image + text)
            messages = call_args.kwargs.get('messages', [])
            assert len(messages) > 0
            content = messages[0].get('content', [])

            # Should have both image and text parts
            content_types = [item.get('type') for item in content]
            assert 'image' in content_types
            assert 'text' in content_types

    @pytest.mark.asyncio
    async def test_parse_receipt_with_purchase_date(self, temp_data_dir):
        """Test that detected purchase date is propagated to all items"""
        mock_response = {
            "proposed_items": [
                {"name": "milk", "confidence": "high"},
                {"name": "eggs", "confidence": "high"}
            ],
            "detected_purchase_date": "2025-12-15",
            "detected_store": "Safeway",
            "warnings": []
        }

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': json.dumps(mock_response)})()
            ]

            from app.services.claude_service import parse_receipt_to_groceries
            test_image = "test_base64"
            items, warnings = await parse_receipt_to_groceries(test_image, [])

            # All items should have purchase_date from receipt
            assert all(item["purchase_date"] == "2025-12-15" for item in items)

    @pytest.mark.asyncio
    async def test_parse_handles_claude_json_markdown(self, temp_data_dir):
        """Test parsing when Claude wraps JSON in markdown"""
        mock_response = {
            "proposed_items": [],
            "warnings": []
        }

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            # Claude often wraps JSON in ```json code blocks
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': f'```json\n{json.dumps(mock_response)}\n```'})()
            ]

            from app.services.claude_service import parse_receipt_to_groceries
            test_image = "test_base64"
            items, warnings = await parse_receipt_to_groceries(test_image, [])

            assert isinstance(items, list)

    @pytest.mark.asyncio
    async def test_parse_handles_malformed_json(self, temp_data_dir):
        """Test error handling for malformed Claude response"""
        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': 'NOT VALID JSON'})()
            ]

            from app.services.claude_service import parse_receipt_to_groceries

            with pytest.raises(ValueError, match="Failed to parse"):
                await parse_receipt_to_groceries("test_image", [])

    @pytest.mark.asyncio
    async def test_parse_propagates_connection_errors(self, temp_data_dir):
        """Test that connection errors are properly raised"""
        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.side_effect = Exception("Connection refused")

            from app.services.claude_service import parse_receipt_to_groceries

            with pytest.raises(ConnectionError):
                await parse_receipt_to_groceries("test_image", [])

    @pytest.mark.asyncio
    async def test_parse_detects_duplicates(self, temp_data_dir):
        """Test duplicate detection against existing groceries"""
        mock_response = {
            "proposed_items": [
                {"name": "milk", "confidence": "high"},
                {"name": "eggs", "confidence": "high"}
            ],
            "warnings": []
        }

        existing_groceries = [{"name": "Milk", "date_added": "2025-12-20"}]  # Case-insensitive

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': json.dumps(mock_response)})()
            ]

            from app.services.claude_service import parse_receipt_to_groceries
            items, warnings = await parse_receipt_to_groceries("test_image", existing_groceries)

            # Should warn about duplicate milk
            assert any("milk" in w.lower() for w in warnings)

    @pytest.mark.asyncio
    async def test_parse_uses_low_temperature(self, temp_data_dir):
        """Test that OCR uses very low temperature for accuracy"""
        mock_response = {"proposed_items": [], "warnings": []}

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': json.dumps(mock_response)})()
            ]

            from app.services.claude_service import parse_receipt_to_groceries
            await parse_receipt_to_groceries("test_image", [])

            # Verify temperature is 0.1 or lower (for OCR accuracy)
            call_args = mock_claude.call_args
            temperature = call_args.kwargs.get('temperature', 1.0)
            assert temperature <= 0.1, "OCR should use very low temperature"
```

**Checkpoint 2.1**: Run service tests
```bash
pytest backend/tests/test_receipt_parsing.py::TestReceiptParsingServiceMocked -v
# Expected: FAIL (service not implemented)
```

---

#### Task 2.2: Implement Service to Pass Tests (1 hour)
**File**: `backend/app/services/claude_service.py`

Add these functions (after the voice parsing functions from Phase 1):

```python
async def parse_receipt_to_groceries(
    image_base64: str,
    existing_groceries: list
) -> tuple[list[dict], list[str]]:
    """
    Parse receipt image using Claude Vision API to extract grocery items.

    Uses multimodal Claude Vision to OCR receipt and extract:
    - Grocery item names (standardized, brands removed)
    - Purchase date from receipt header
    - Store name from receipt header
    - Confidence scores based on OCR clarity

    Args:
        image_base64: Base64 encoded receipt image (PNG/JPG)
        existing_groceries: List of existing grocery items for duplicate detection

    Returns:
        Tuple of (proposed_items, warnings)

    Raises:
        ValueError: If image is empty or response cannot be parsed
        ConnectionError: If Claude API call fails
    """
    if not image_base64 or image_base64.strip() == "":
        raise ValueError("Image data cannot be empty")

    logger.info("Parsing receipt with Claude Vision API")

    try:
        # Build system prompt for OCR
        system_prompt = _get_receipt_parse_system_prompt()

        # Build user message with duplicate context
        user_prompt = _build_receipt_user_prompt(existing_groceries)

        # Call Claude Vision API (multimodal)
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",  # Vision-capable model
            max_tokens=2000,
            temperature=0.1,  # Very low for OCR accuracy
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",  # Assume JPEG (client compresses)
                                "data": image_base64,
                            },
                        },
                        {"type": "text", "text": user_prompt}
                    ],
                }
            ],
        )

        # Parse response
        response_text = response.content[0].text
        parsed_data = _parse_receipt_response(response_text)

        return (parsed_data["proposed_items"], parsed_data["warnings"])

    except Exception as e:
        if "connection" in str(e).lower() or "timeout" in str(e).lower():
            logger.error(f"Connection error calling Claude Vision API: {e}")
            raise ConnectionError(f"Failed to connect to Claude Vision API: {e}")
        else:
            logger.error(f"Error parsing receipt: {e}")
            raise


def _get_receipt_parse_system_prompt() -> str:
    """System prompt for receipt OCR parsing."""
    return """You are an expert at reading grocery store receipts and extracting items.

Your task:
1. Read the receipt image and extract ALL grocery items
2. Detect the purchase date from the receipt header (usually at top)
3. Detect the store name from the receipt header
4. Standardize item names (remove brand names, generic descriptions)
5. Assign confidence: "high" (clear text), "medium" (some blur), "low" (very unclear)
6. Ignore non-food items (bags, tax, totals, store info)

Return JSON format:
{
  "proposed_items": [
    {
      "name": "standardized item name",
      "confidence": "high|medium|low",
      "notes": "optional notes about the item"
    }
  ],
  "detected_purchase_date": "YYYY-MM-DD or null if not found",
  "detected_store": "Store Name or null if not found",
  "warnings": ["warnings about OCR quality or unreadable items"]
}

Example: "CHKN BRST" → "chicken breast", "2% MILK GAL" → "milk", "ORG BANANAS" → "bananas"

Be concise. Focus on food items only."""


def _build_receipt_user_prompt(existing_groceries: list) -> str:
    """Build user prompt with existing grocery context for duplicate detection."""
    prompt = "Extract all grocery items from this receipt."

    if existing_groceries:
        existing_names = [g["name"] for g in existing_groceries]
        prompt += f"\n\nExisting groceries (warn about duplicates): {', '.join(existing_names)}"

    return prompt


def _parse_receipt_response(response_text: str) -> dict:
    """
    Parse Claude's response text into structured data.

    Handles:
    - Plain JSON
    - JSON wrapped in markdown code blocks
    - Missing fields (use defaults)

    Args:
        response_text: Raw text from Claude Vision API

    Returns:
        Dict with proposed_items, detected_purchase_date, detected_store, warnings

    Raises:
        ValueError: If response is not valid JSON
    """
    try:
        # Remove markdown code blocks if present
        text = response_text.strip()
        if text.startswith("```"):
            # Extract JSON from code block
            lines = text.split("\n")
            text = "\n".join(lines[1:-1]) if len(lines) > 2 else text

        # Parse JSON
        data = json.loads(text)

        # Validate and set defaults
        proposed_items = data.get("proposed_items", [])
        detected_purchase_date = data.get("detected_purchase_date")
        detected_store = data.get("detected_store")
        warnings = data.get("warnings", [])

        # Propagate purchase date to all items
        if detected_purchase_date:
            for item in proposed_items:
                if "purchase_date" not in item or not item["purchase_date"]:
                    item["purchase_date"] = detected_purchase_date

        return {
            "proposed_items": proposed_items,
            "detected_purchase_date": detected_purchase_date,
            "detected_store": detected_store,
            "warnings": warnings
        }

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Claude Vision response as JSON: {e}")
        logger.error(f"Response text: {response_text}")
        raise ValueError(f"Failed to parse Claude Vision response: {e}")
```

**Checkpoint 2.2**: Verify service tests pass
```bash
pytest backend/tests/test_receipt_parsing.py::TestReceiptParsingServiceMocked -v
# Expected: ALL PASS ✅
```

**Optional Checkpoint 2.3**: Test with real Claude Vision API (~$0.01 cost)
```bash
# Create simple script to test real API (optional)
python -c "
import asyncio
import base64
from app.services.claude_service import parse_receipt_to_groceries

# Load a real receipt image
with open('test_receipt.jpg', 'rb') as f:
    image_data = base64.b64encode(f.read()).decode()

items, warnings = asyncio.run(parse_receipt_to_groceries(image_data, []))
print(f'Extracted {len(items)} items')
for item in items:
    print(f'  - {item[\"name\"]} ({item[\"confidence\"]})')
"
```

**STOP**: Do not proceed until service tests pass!

---

### Milestone 3: Backend API Endpoint (45 min) 🛡️
**Goal**: Endpoint returns correct responses for all scenarios

#### Task 3.1: Write Endpoint Integration Tests (30 min)
**File**: `backend/tests/test_api_receipt.py` (NEW)

```python
"""API endpoint integration tests for receipt OCR"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
import json


class TestReceiptParsingEndpoints:
    """Test actual HTTP endpoints"""

    def test_parse_receipt_endpoint_success(self, client, temp_data_dir):
        """Test successful receipt parsing via API"""
        test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="

        # Mock the service to avoid real API call
        with patch('app.routers.groceries.parse_receipt_to_groceries') as mock_parse:
            mock_parse.return_value = (
                [{"name": "milk", "confidence": "high", "purchase_date": "2025-12-20"}],
                []
            )

            response = client.post("/groceries/parse-receipt", json={
                "image_base64": test_image
            })

            assert response.status_code == 200
            data = response.json()
            assert "proposed_items" in data
            assert "detected_purchase_date" in data
            assert "detected_store" in data
            assert "warnings" in data
            assert len(data["proposed_items"]) == 1

    def test_parse_receipt_endpoint_validation_error(self, client, temp_data_dir):
        """Test endpoint validates empty image"""
        response = client.post("/groceries/parse-receipt", json={
            "image_base64": ""
        })

        assert response.status_code == 422  # Pydantic validation error

    def test_parse_receipt_endpoint_handles_service_error(self, client, temp_data_dir):
        """Test endpoint handles service errors gracefully"""
        test_image = "test_base64"

        with patch('app.routers.groceries.parse_receipt_to_groceries') as mock_parse:
            mock_parse.side_effect = ValueError("Invalid image data")

            response = client.post("/groceries/parse-receipt", json={
                "image_base64": test_image
            })

            assert response.status_code == 400
            assert "Invalid image" in response.json()["detail"]

    def test_parse_receipt_endpoint_handles_connection_error(self, client, temp_data_dir):
        """Test endpoint handles Claude API connection errors"""
        test_image = "test_base64"

        with patch('app.routers.groceries.parse_receipt_to_groceries') as mock_parse:
            mock_parse.side_effect = ConnectionError("API unreachable")

            response = client.post("/groceries/parse-receipt", json={
                "image_base64": test_image
            })

            assert response.status_code == 500
            assert "Claude" in response.json()["detail"]

    def test_parse_receipt_with_metadata(self, client, temp_data_dir):
        """Test endpoint returns full metadata from OCR"""
        test_image = "test_base64"

        with patch('app.routers.groceries.parse_receipt_to_groceries') as mock_parse:
            mock_parse.return_value = (
                [
                    {"name": "milk", "confidence": "high", "purchase_date": "2025-12-20"},
                    {"name": "eggs", "confidence": "medium", "purchase_date": "2025-12-20"}
                ],
                ["Could not read item on line 5"]
            )

            # Mock getting detected date/store from service (simplified for test)
            response = client.post("/groceries/parse-receipt", json={
                "image_base64": test_image
            })

            assert response.status_code == 200
            data = response.json()
            assert len(data["proposed_items"]) == 2
            assert len(data["warnings"]) == 1

    def test_batch_add_still_works_from_phase1(self, client, temp_data_dir):
        """Verify Phase 1 batch endpoint still works (regression test)"""
        from datetime import date

        response = client.post("/groceries/batch", json={
            "items": [
                {"name": "milk", "date_added": date.today().isoformat()},
                {"name": "eggs", "date_added": date.today().isoformat()}
            ]
        })

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) >= 2
```

**Checkpoint 3.1**: Run endpoint tests
```bash
pytest backend/tests/test_api_receipt.py -v
# Expected: FAIL (endpoints don't exist)
```

---

#### Task 3.2: Implement Endpoint to Pass Tests (15 min)
**File**: `backend/app/routers/groceries.py`

Add this endpoint (after the voice parsing endpoints from Phase 1):

```python
@router.post("/parse-receipt", response_model=ReceiptParseResponse)
async def parse_receipt(request: ReceiptParseRequest):
    """
    Parse receipt image to extract grocery items using Claude Vision OCR.

    Extracts:
    - Item names (standardized)
    - Purchase date from receipt
    - Store name
    - Confidence scores

    Returns proposed items for user confirmation.

    Raises:
        HTTPException 400: Invalid image data
        HTTPException 422: Validation error (Pydantic)
        HTTPException 500: Claude Vision API error
    """
    try:
        logger.info("Parsing receipt via OCR")

        # Get existing groceries for duplicate detection
        grocery_service = GroceryService(DATA_DIR)
        existing_groceries = grocery_service.list_groceries().items
        existing_dicts = [item.model_dump() for item in existing_groceries]

        # Call Claude Vision service
        proposed_items, warnings = await parse_receipt_to_groceries(
            request.image_base64,
            existing_dicts
        )

        # Extract metadata (if present in items)
        detected_purchase_date = None
        detected_store = None

        if proposed_items:
            # Get purchase date from first item (all should have same date)
            first_item = proposed_items[0]
            if "purchase_date" in first_item and first_item["purchase_date"]:
                detected_purchase_date = first_item["purchase_date"]

        # Note: detected_store would come from Claude's response metadata
        # For simplicity, we'll leave it None for now (can enhance later)

        return ReceiptParseResponse(
            proposed_items=[ProposedGroceryItem(**item) for item in proposed_items],
            detected_purchase_date=detected_purchase_date,
            detected_store=detected_store,
            warnings=warnings
        )

    except ValueError as e:
        logger.warning(f"Invalid receipt data: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")
    except ConnectionError as e:
        logger.error(f"Claude Vision API error: {e}")
        raise HTTPException(status_code=500, detail=f"Claude Vision API error: {e}")
    except Exception as e:
        logger.error(f"Unexpected error parsing receipt: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")
```

**Checkpoint 3.2**: Verify endpoint tests pass
```bash
pytest backend/tests/test_api_receipt.py -v
# Expected: ALL PASS ✅
```

**🛡️ MAJOR CHECKPOINT: Backend Complete**
```bash
# Run ALL backend tests (Phase 1 + Phase 2)
pytest backend/tests -v
# Expected: ALL PASS ✅ (voice + receipt tests)

# Start backend server
cd backend && uvicorn app.main:app --reload
# Expected: Server starts without errors

# Test manually with curl (optional)
echo "Test endpoint is accessible"
curl http://localhost:8000/docs  # Should show OpenAPI docs with new endpoint
```

**STOP**: Do not start frontend until backend tests pass AND server runs!

---

### Milestone 4: Frontend File Upload Component (1 hour) 🛡️
**Goal**: Upload button and image compression work in isolation

#### Task 4.1: Add Upload Button to Groceries Page (30 min)
**File**: `frontend/src/pages/Groceries.tsx`

Add these components (after the voice input button from Phase 1):

```typescript
// Add to imports
import { Camera, Upload } from 'lucide-react';

// Add to state (inside component)
const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);

// Add image compression utility function
const compressImage = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas for compression
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Calculate resize ratio (max 1024px width or height)
        const maxSize = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxSize) {
          height = (height / width) * maxSize;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width / height) * maxSize;
          height = maxSize;
        }

        // Resize image
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG at 80% quality
        const base64 = canvas.toDataURL('image/jpeg', 0.8);

        // Strip data URL prefix (data:image/jpeg;base64,)
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

// Add upload handler
const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // Validate file type
  if (!file.type.match(/^image\/(png|jpe?g)$/)) {
    toast.error('Please upload a PNG or JPEG image');
    return;
  }

  // Validate file size (max 10MB before compression)
  if (file.size > 10 * 1024 * 1024) {
    toast.error('Image too large (max 10MB)');
    return;
  }

  setIsUploadingReceipt(true);

  try {
    // Compress image
    const base64Image = await compressImage(file);

    // TODO: Call API to parse receipt (Milestone 5)
    console.log('Compressed image length:', base64Image.length);
    toast.success('Receipt uploaded successfully');

  } catch (error) {
    console.error('Upload error:', error);
    toast.error('Failed to process image');
  } finally {
    setIsUploadingReceipt(false);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }
};

// Add upload button to JSX (after voice button)
<>
  {/* Hidden file input */}
  <input
    ref={fileInputRef}
    type="file"
    accept="image/png,image/jpeg,image/jpg"
    onChange={handleReceiptUpload}
    style={{ display: 'none' }}
  />

  {/* Receipt upload button */}
  <Button
    variant="outline"
    size="sm"
    onClick={() => fileInputRef.current?.click()}
    disabled={isUploadingReceipt}
  >
    {isUploadingReceipt ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Processing...
      </>
    ) : (
      <>
        <Camera className="mr-2 h-4 w-4" />
        Upload Receipt
      </>
    )}
  </Button>
</>
```

**Checkpoint 4.1**: Manual browser test
```bash
# Start frontend: npm run dev
# Test:
# 1. Click "Upload Receipt" button
# 2. Select a PNG or JPEG image
# 3. Verify console shows compressed image length
# 4. Verify toast shows success message
# 5. Verify button resets to normal state
```

**STOP**: Verify upload and compression work before continuing!

---

### Milestone 5: Frontend API Integration (30 min) 🛡️
**Goal**: Connect upload to backend API

#### Task 5.1: Add API Client Method (15 min)
**File**: `frontend/src/lib/api.ts`

Add this method (after the voice parsing methods from Phase 1):

```typescript
// Add to ReceiptParseResponse interface
export interface ReceiptParseResponse {
  proposed_items: ProposedGroceryItem[];
  detected_purchase_date: string | null;
  detected_store: string | null;
  warnings: string[];
}

// Add to groceriesAPI object
const groceriesAPI = {
  // ... existing methods (list, add, update, delete, parseVoice, batchAdd) ...

  async parseReceipt(imageBase64: string): Promise<ReceiptParseResponse> {
    const response = await fetch(`${API_URL}/groceries/parse-receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: imageBase64 }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to parse receipt');
    }

    return response.json();
  },
};
```

**Checkpoint 5.1**: Type check
```bash
npm run build
# Expected: No TypeScript errors
```

---

#### Task 5.2: Integrate API into Upload Handler (15 min)
**File**: `frontend/src/pages/Groceries.tsx`

Update the upload handler to call the API:

```typescript
// Add mutation for receipt parsing
const parseReceiptMutation = useMutation({
  mutationFn: groceriesAPI.parseReceipt,
  onSuccess: (data) => {
    // Show confirmation dialog with proposed items
    setProposedItems(data.proposed_items);
    setVoiceWarnings(data.warnings);  // Reuse voice warnings state
    setShowConfirmDialog(true);
  },
  onError: (error: Error) => {
    toast.error(`Receipt OCR failed: ${error.message}`);
  },
});

// Update handleReceiptUpload
const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // Validate file type
  if (!file.type.match(/^image\/(png|jpe?g)$/)) {
    toast.error('Please upload a PNG or JPEG image');
    return;
  }

  // Validate file size (max 10MB before compression)
  if (file.size > 10 * 1024 * 1024) {
    toast.error('Image too large (max 10MB)');
    return;
  }

  setIsUploadingReceipt(true);

  try {
    // Compress image
    const base64Image = await compressImage(file);

    // Call API to parse receipt
    await parseReceiptMutation.mutateAsync(base64Image);

  } catch (error) {
    console.error('Upload error:', error);
    // Error toast handled by mutation onError
  } finally {
    setIsUploadingReceipt(false);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }
};
```

**Checkpoint 5.2**: Manual E2E test
```bash
# Start backend: cd backend && uvicorn app.main:app --reload
# Start frontend: npm run dev
# Test:
# 1. Upload a receipt image
# 2. Verify confirmation dialog appears with proposed items
# 3. Verify items have confidence badges
# 4. Verify warnings display if any
```

**STOP**: Verify full upload → parse → dialog flow works!

---

### Milestone 6: Reuse Confirmation Dialog (1 hour) 🛡️
**Goal**: Dialog shows receipt metadata and confirms items

#### Task 6.1: Enhance Dialog for Receipt Metadata (Optional - 30 min)
**File**: `frontend/src/components/GroceryConfirmationDialog.tsx`

This is optional - the existing dialog from Phase 1 already works. But you can enhance it to show receipt metadata:

```typescript
// Add to props
interface GroceryConfirmationDialogProps {
  // ... existing props ...
  receiptMetadata?: {
    store?: string;
    purchaseDate?: string;
  };
}

// Add to JSX (at top of dialog, before proposed items)
{receiptMetadata && (receiptMetadata.store || receiptMetadata.purchaseDate) && (
  <div className="mb-4 rounded-md bg-muted p-3 text-sm">
    <p className="font-semibold mb-1">Receipt Information</p>
    {receiptMetadata.store && (
      <p className="text-muted-foreground">Store: {receiptMetadata.store}</p>
    )}
    {receiptMetadata.purchaseDate && (
      <p className="text-muted-foreground">
        Purchase Date: {new Date(receiptMetadata.purchaseDate).toLocaleDateString()}
      </p>
    )}
  </div>
)}
```

---

#### Task 6.2: Full Integration Test (30 min)
**Manual Testing Checklist:**

```bash
# Backend running: cd backend && uvicorn app.main:app --reload
# Frontend running: npm run dev

# Test Case 1: Upload clear receipt
[ ] Upload receipt with clear items
[ ] Verify proposed items appear in dialog
[ ] Verify confidence badges show correct levels
[ ] Verify purchase date propagated to all items
[ ] Edit an item name
[ ] Remove an item
[ ] Click "Add All"
[ ] Verify items added to grocery list

# Test Case 2: Upload blurry receipt
[ ] Upload low-quality receipt image
[ ] Verify items marked with "medium" or "low" confidence
[ ] Verify warnings appear in dialog
[ ] Verify can still add items

# Test Case 3: Upload non-receipt image
[ ] Upload random image (not a receipt)
[ ] Verify graceful handling (empty items or error message)

# Test Case 4: Duplicate detection
[ ] Add "milk" to grocery list manually
[ ] Upload receipt with "milk" item
[ ] Verify warning about duplicate
[ ] Verify can still choose to add

# Test Case 5: Large image compression
[ ] Upload 5MB+ image
[ ] Verify compression works (check network tab, should be <500KB)
[ ] Verify OCR still works on compressed image

# Test Case 6: Invalid file types
[ ] Try to upload PDF
[ ] Verify error message
[ ] Try to upload GIF
[ ] Verify error message

# Test Case 7: Phase 1 still works (regression)
[ ] Click voice button
[ ] Speak "chicken and milk"
[ ] Verify voice parsing still works
[ ] Verify same confirmation dialog works for both inputs
```

**Checkpoint 6.2**: All manual tests pass
```
✅ Receipt upload works
✅ OCR extracts items
✅ Confirmation dialog displays items
✅ Batch add works
✅ Warnings display correctly
✅ Duplicate detection works
✅ Image compression works
✅ Phase 1 voice input still works (regression test)
```

**STOP**: Do not consider feature complete until all tests pass!

---

### Milestone 7: Final Testing & Documentation (45 min) 🛡️

#### Task 7.1: Run Full Test Suite (30 min)
```bash
# Backend tests (all phases)
pytest backend/tests -v --cov=app
# Expected: All tests pass, 80%+ coverage

# Frontend type checking
npm run build
# Expected: No TypeScript errors

# Manual regression testing
# Run through Phase 1 voice input flow - verify still works
# Run through Phase 2 receipt OCR flow - verify works
```

#### Task 7.2: Update Documentation (15 min)

**File**: `docs/CHANGELOG.md`
```markdown
## 2025-12-22 - Sprint 4 Phase 2: Receipt OCR Complete

### Added
- Receipt OCR parsing using Claude Vision API
- File upload component with image compression (1024px, 80% JPEG quality)
- Receipt-specific Pydantic models (ReceiptParseRequest, ReceiptParseResponse)
- parse_receipt_to_groceries() service function
- POST /groceries/parse-receipt endpoint
- Purchase date and store name extraction from receipt headers
- Reuses existing GroceryConfirmationDialog from Phase 1

### Technical Details
- Claude Vision API integration (multimodal)
- Temperature: 0.1 for OCR accuracy
- Client-side image compression reduces API costs by ~70%
- Comprehensive test suite with mocked Claude Vision API
- All tests passing (voice + receipt parsing)

### Cost
- ~$0.01 per receipt OCR call
- Image compression reduces cost vs. uncompressed images
```

**File**: `docs/PROJECT_CONTEXT.md`
Update Sprint 4 Phase 2 status to complete.

**Final Checkpoint**: Ready for PR
- [ ] All tests passing (backend + frontend)
- [ ] No console errors
- [ ] Documentation updated (CHANGELOG, PROJECT_CONTEXT)
- [ ] Manual testing complete (7 test cases)
- [ ] Branch ready to merge
- [ ] Git commit with descriptive message

---

## Safety Checkpoints Summary

| Checkpoint | What to Verify | Rollback If Fails |
|------------|----------------|-------------------|
| 0.1 | Tests fail as expected | N/A |
| 0.2 | API contract approved | Revise contract |
| 1.2 | Model tests pass | Fix models |
| 2.2 | Service tests pass (mocked) | Fix service logic |
| 2.3 (optional) | Real Claude Vision test works | Debug API integration |
| 3.2 | Endpoint tests pass | Fix endpoints |
| Backend Complete | Server runs, all tests pass | Don't start frontend |
| 4.1 | Upload & compression work | Fix compression |
| 5.2 | API integration works | Fix API client |
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
✅ **Reuse Phase 1 components**: No duplicate code, consistent UX

---

## Time Comparison

| Approach | Estimated Time | Risk Level |
|----------|----------------|------------|
| Original Plan | 4-6 hours | Medium (late integration issues) |
| TDD Plan | 4-7 hours | Low (early issue detection) |

**Trade-off**: Same time estimate, significantly reduced debugging time, higher confidence.

---

## Implementation Order (TDD)

1. ✅ Write API contract
2. ✅ Write failing tests
3. ✅ Implement models → tests pass
4. ✅ Implement service (mocked Claude Vision) → tests pass
5. ✅ Implement endpoints → tests pass
6. ✅ **Checkpoint: Backend complete**
7. ✅ Implement upload & compression → manual test
8. ✅ Implement API integration → E2E test
9. ✅ Enhance dialog (optional) → component test
10. ✅ **Checkpoint: Feature complete**
11. ✅ Full test suite + docs

**NEVER move to next step until current step's tests pass!**

---

## Claude Vision API Notes

### Differences from Phase 1 (Voice Input)

| Aspect | Phase 1 (Voice) | Phase 2 (Receipt OCR) |
|--------|-----------------|----------------------|
| API Type | Text-only Claude API | Claude Vision API (multimodal) |
| Input | Transcription text | Base64 encoded image |
| Temperature | 0.7 (creative parsing) | 0.1 (accurate OCR) |
| Content Format | Single text message | Image + text (multimodal) |
| Cost per call | ~$0.001 | ~$0.01 |

### Multimodal Content Structure

```python
messages=[
    {
        "role": "user",
        "content": [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/jpeg",
                    "data": image_base64,  # No data URL prefix
                },
            },
            {"type": "text", "text": "Extract all grocery items..."}
        ],
    }
]
```

### Image Compression Benefits

| Image Type | Before Compression | After Compression | Cost Savings |
|------------|-------------------|-------------------|--------------|
| iPhone photo (4MB) | ~$0.015/image | ~$0.008/image | ~47% |
| Standard photo (2MB) | ~$0.012/image | ~$0.007/image | ~42% |
| Low-res scan (500KB) | ~$0.008/image | ~$0.006/image | ~25% |

**Client-side compression (1024px, 80% JPEG) significantly reduces API costs while maintaining OCR accuracy.**

### OCR Accuracy Tips

1. **Low temperature (0.1)**: Reduces hallucination, increases accuracy
2. **Clear prompts**: Ask for standardized names, not exact receipt text
3. **Ignore non-food items**: Reduces noise (bags, tax, store info)
4. **Confidence scoring**: Mark unclear items for user review
5. **Duplicate detection**: Warn about items already in list

### Expected Performance

- **Accuracy**: 80-90% on standard receipts
- **Speed**: < 5 seconds per receipt (including image upload)
- **Cost**: ~$0.01 per receipt (with compression)
- **Supported formats**: PNG, JPG, JPEG (client converts all to JPEG)

---

## Success Criteria

- [x] Receipt OCR extracts 80%+ items from standard receipts
- [x] Purchase date detected from receipt header (if present)
- [x] Store name detected from receipt header (if present)
- [x] Confidence scores accurately reflect OCR quality
- [x] Performance: < 5 seconds for receipt processing
- [x] File upload accepts correct image types (PNG, JPG, JPEG)
- [x] Client-side image compression works (1024px, 80% quality)
- [x] Loading indicators show during processing
- [x] Error messages clear and actionable
- [x] Reuses existing confirmation dialog (no duplicate UI)
- [x] All tests PASS before proceeding to next milestone
- [x] Documentation updated with Phase 2 completion
- [x] Phase 1 voice input still works (regression test)

---

**Ready to implement! Follow milestones in order, verify checkpoints, and never skip tests.** 🚀
