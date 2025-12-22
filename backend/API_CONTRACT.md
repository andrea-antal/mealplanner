# Voice Parsing API Contract

**Version**: 1.0
**Feature**: Sprint 4 Phase 1 - Voice Input
**Created**: 2025-12-22

This document defines the API contract for voice-based grocery input. Both frontend and backend implementations must adhere to this contract.

---

## Endpoint: POST /groceries/parse-voice

Parse voice transcription into structured grocery items with confidence scores.

### Request

```json
{
  "transcription": "string (required, min_length=1)"
}
```

**Validation Rules**:
- `transcription` must be non-empty string
- Leading/trailing whitespace is acceptable (will be trimmed)

**Example**:
```json
{
  "transcription": "Chicken breast bought yesterday, milk expires tomorrow"
}
```

### Response (200 OK)

```json
{
  "proposed_items": [
    {
      "name": "string (required)",
      "date_added": "YYYY-MM-DD (optional)",
      "purchase_date": "YYYY-MM-DD (optional)",
      "expiry_type": "expiry_date | best_before_date (optional)",
      "expiry_date": "YYYY-MM-DD (optional)",
      "portion": "string (optional)",
      "confidence": "high | medium | low (required)",
      "notes": "string (optional)"
    }
  ],
  "transcription_used": "string (required)",
  "warnings": ["string"]
}
```

**Field Descriptions**:
- `proposed_items`: Array of parsed grocery items (may be empty if nothing parsed)
- `transcription_used`: The exact transcription that was parsed (for debugging)
- `warnings`: Array of user-facing warning messages (e.g., duplicates detected)

**Example**:
```json
{
  "proposed_items": [
    {
      "name": "chicken breast",
      "date_added": "2025-12-22",
      "purchase_date": "2025-12-21",
      "confidence": "high",
      "notes": "Inferred purchase date from 'yesterday'"
    },
    {
      "name": "milk",
      "date_added": "2025-12-22",
      "expiry_date": "2025-12-23",
      "expiry_type": "expiry_date",
      "confidence": "high",
      "notes": "Inferred expiry from 'tomorrow'"
    }
  ],
  "transcription_used": "Chicken breast bought yesterday, milk expires tomorrow",
  "warnings": []
}
```

### Error Responses

#### 400 Bad Request - Validation Error
```json
{
  "detail": "Transcription cannot be empty"
}
```

**Causes**:
- Empty or whitespace-only transcription
- Invalid request format

#### 422 Unprocessable Entity - Pydantic Validation
```json
{
  "detail": [
    {
      "loc": ["body", "transcription"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

**Causes**:
- Missing required field
- Wrong field type

#### 500 Internal Server Error - Claude API Failure
```json
{
  "detail": "AI service temporarily unavailable. Please try again."
}
```

**Causes**:
- Claude API connection error
- Claude API rate limit
- Malformed Claude response

---

## Endpoint: POST /groceries/batch

Add multiple grocery items at once, with duplicate detection.

### Request

```json
{
  "items": [
    {
      "name": "string (required)",
      "date_added": "YYYY-MM-DD (required)",
      "purchase_date": "YYYY-MM-DD (optional)",
      "expiry_type": "expiry_date | best_before_date (optional)",
      "expiry_date": "YYYY-MM-DD (optional)"
    }
  ]
}
```

**Validation Rules**:
- `items` array must contain at least 1 item
- Each item must have `name` and `date_added`
- If `expiry_date` is set, `expiry_type` must also be set
- `purchase_date` must be <= `expiry_date` if both set

**Example**:
```json
{
  "items": [
    {
      "name": "chicken breast",
      "date_added": "2025-12-22",
      "purchase_date": "2025-12-21"
    },
    {
      "name": "milk",
      "date_added": "2025-12-22",
      "expiry_date": "2025-12-25",
      "expiry_type": "expiry_date"
    }
  ]
}
```

### Response (200 OK)

```json
{
  "items": [
    {
      "name": "string",
      "date_added": "YYYY-MM-DD",
      "purchase_date": "YYYY-MM-DD | null",
      "expiry_type": "expiry_date | best_before_date | null",
      "expiry_date": "YYYY-MM-DD | null"
    }
  ]
}
```

**Behavior**:
- Returns the complete updated grocery list (all items, not just newly added)
- Automatically skips duplicate items (case-insensitive name matching)
- New items are appended to the list

**Example**:
```json
{
  "items": [
    {
      "name": "eggs",
      "date_added": "2025-12-20",
      "purchase_date": null,
      "expiry_type": null,
      "expiry_date": null
    },
    {
      "name": "chicken breast",
      "date_added": "2025-12-22",
      "purchase_date": "2025-12-21",
      "expiry_type": null,
      "expiry_date": null
    },
    {
      "name": "milk",
      "date_added": "2025-12-22",
      "purchase_date": null,
      "expiry_type": "expiry_date",
      "expiry_date": "2025-12-25"
    }
  ]
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "detail": "At least one item is required"
}
```

**Causes**:
- Empty items array
- Invalid item data (validation errors)

#### 422 Unprocessable Entity
```json
{
  "detail": [
    {
      "loc": ["body", "items"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

**Causes**:
- Missing required field
- Wrong field type

#### 500 Internal Server Error
```json
{
  "detail": "Failed to save groceries: ..."
}
```

**Causes**:
- File system error
- Data corruption

---

## Data Models

### ProposedGroceryItem

Grocery item proposed by AI parsing, includes confidence score and reasoning.

```python
class ProposedGroceryItem(BaseModel):
    name: str
    date_added: Optional[Date] = None
    purchase_date: Optional[Date] = None
    expiry_type: Optional[Literal["expiry_date", "best_before_date"]] = None
    expiry_date: Optional[Date] = None
    portion: Optional[str] = None  # e.g., "2 lbs"
    confidence: Literal["high", "medium", "low"] = "high"
    notes: Optional[str] = None  # AI's reasoning
```

**Differences from GroceryItem**:
- Adds `portion` field (extracted but not persisted)
- Adds `confidence` field (high/medium/low)
- Adds `notes` field (AI explanation)
- All date fields are optional (parsed from voice, may be missing)

### VoiceParseRequest

```python
class VoiceParseRequest(BaseModel):
    transcription: str = Field(..., min_length=1)
```

### VoiceParseResponse

```python
class VoiceParseResponse(BaseModel):
    proposed_items: list[ProposedGroceryItem]
    transcription_used: str
    warnings: list[str] = Field(default_factory=list)
```

### BatchAddRequest

```python
class BatchAddRequest(BaseModel):
    items: list[GroceryItem] = Field(..., min_length=1)
```

**Note**: Uses existing `GroceryItem` model, not `ProposedGroceryItem`. Frontend converts proposed items to GroceryItem before batch add.

---

## Integration Notes

### Frontend Flow

1. User clicks voice button → `useVoiceInput()` hook starts Web Speech API
2. User speaks → transcription captured
3. Frontend calls `POST /groceries/parse-voice` with transcription
4. Backend returns proposed items with confidence scores
5. Frontend shows confirmation dialog (user can edit/remove items)
6. User confirms → Frontend converts `ProposedGroceryItem[]` to `GroceryItem[]`
7. Frontend calls `POST /groceries/batch` with confirmed items
8. Backend returns updated grocery list
9. Frontend invalidates cache and shows success toast

### Backend Flow

1. `POST /groceries/parse-voice` receives transcription
2. Load existing groceries for duplicate detection
3. Call `parse_voice_to_groceries(transcription, existing_names)`
4. Claude API parses natural language into structured items
5. Return `VoiceParseResponse` with proposed items and warnings
6. Frontend confirms items
7. `POST /groceries/batch` receives confirmed items
8. Skip duplicates (case-insensitive name matching)
9. Append new items to grocery list
10. Save and return updated list

### Error Handling

**Frontend**:
- 400/422 → Show validation error toast
- 500 → Show "AI service unavailable, please try again" toast
- Network error → Show "Connection failed" toast

**Backend**:
- Empty transcription → 400 with clear message
- Claude API error → 500 with generic user-facing message (log details)
- Malformed Claude JSON → 400 "Failed to parse voice input"
- File system error → 500 "Failed to save groceries"

---

## Test Cases

### Parse Voice Endpoint

✅ **Success Cases**:
- Simple list: "chicken, milk, eggs" → 3 items, high confidence
- With dates: "bought chicken yesterday" → purchase_date set
- With expiry: "milk expires tomorrow" → expiry_date set
- With portions: "two pounds of carrots" → portion extracted
- Duplicate warning: "milk" (already exists) → warning in response

❌ **Error Cases**:
- Empty transcription → 400
- Whitespace-only → 400
- Missing field → 422
- Claude API error → 500
- Malformed JSON from Claude → 400

### Batch Add Endpoint

✅ **Success Cases**:
- Add 2 new items → list grows by 2
- Add 1 duplicate + 1 new → list grows by 1 (duplicate skipped)
- Add items with dates → dates persisted correctly
- Add items with expiry → expiry validated and saved

❌ **Error Cases**:
- Empty items array → 422
- Missing required field → 422
- Invalid date format → 422
- expiry_date without expiry_type → 400
- File system error → 500

---

## Version History

- **v1.0** (2025-12-22): Initial contract for Sprint 4 Phase 1
