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

---

## Endpoint: POST /groceries/parse-receipt

Parse receipt image using OCR to extract grocery items with purchase date and store info.

### Request

```json
{
  "image_base64": "string (required, base64 encoded image)"
}
```

**Validation Rules**:
- `image_base64` must be non-empty base64 string
- Must NOT include data URL prefix (e.g., "data:image/jpeg;base64,")
- Image should be compressed client-side (max 1024px, 80% JPEG quality)

**Example**:
```json
{
  "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
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
  "detected_purchase_date": "YYYY-MM-DD | null (optional)",
  "detected_store": "string | null (optional)",
  "warnings": ["string"]
}
```

**Field Descriptions**:
- `proposed_items`: Array of parsed grocery items from receipt (uses ProposedGroceryItem model)
- `detected_purchase_date`: Purchase date extracted from receipt header (if found)
- `detected_store`: Store name extracted from receipt header (if found)
- `warnings`: Array of OCR warnings (e.g., unreadable items, low confidence)

**Behavior**:
- Purchase date from receipt header is propagated to all items automatically
- Items are standardized (brand names removed, e.g., "CHKN BRST" → "chicken breast")
- Confidence scores reflect OCR text clarity (blurry = low confidence)
- Non-food items filtered out (bags, tax, totals, store info lines)

**Example**:
```json
{
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
      "confidence": "high",
      "notes": null
    },
    {
      "name": "bananas",
      "purchase_date": "2025-12-20",
      "confidence": "medium",
      "notes": "Text partially blurred"
    }
  ],
  "detected_purchase_date": "2025-12-20",
  "detected_store": "Whole Foods Market",
  "warnings": ["Could not read item on line 5 (smudged text)"]
}
```

### Error Responses

#### 400 Bad Request - Invalid Image
```json
{
  "detail": "Invalid image data: not valid base64"
}
```

**Causes**:
- Not valid base64 encoding
- Corrupt image data
- Empty or whitespace-only image_base64

#### 422 Unprocessable Entity - Pydantic Validation
```json
{
  "detail": [
    {
      "loc": ["body", "image_base64"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

**Causes**:
- Missing required field
- Wrong field type

#### 500 Internal Server Error - Claude Vision API Failure
```json
{
  "detail": "Claude Vision API error: ..."
}
```

**Causes**:
- Claude Vision API connection error
- Claude Vision API rate limit
- Malformed Claude Vision response (invalid JSON)

---

## Data Models (Phase 2 Additions)

### ReceiptParseRequest

```python
class ReceiptParseRequest(BaseModel):
    image_base64: str = Field(..., min_length=1)
```

### ReceiptParseResponse

```python
class ReceiptParseResponse(BaseModel):
    proposed_items: list[ProposedGroceryItem]
    detected_purchase_date: Optional[Date] = None
    detected_store: Optional[str] = None
    warnings: list[str] = Field(default_factory=list)
```

**Note**: Reuses `ProposedGroceryItem` from Phase 1 (voice parsing). Same model works for both OCR and voice input.

---

## Integration Notes (Phase 2)

### Frontend Flow

1. User clicks "Upload Receipt" button
2. File picker opens (accepts PNG/JPG/JPEG)
3. User selects receipt image
4. Frontend compresses image (1024px max, 80% JPEG quality) using canvas
5. Frontend converts compressed image to base64 (strips data URL prefix)
6. Frontend calls `POST /groceries/parse-receipt` with base64 image
7. Backend returns proposed items with confidence scores and receipt metadata
8. Frontend shows same confirmation dialog as voice input (reused component)
9. User can edit/remove items before confirming
10. User confirms → Frontend calls `POST /groceries/batch` (same as voice flow)
11. Backend returns updated grocery list
12. Frontend invalidates cache and shows success toast

### Backend Flow

1. `POST /groceries/parse-receipt` receives base64 image
2. Load existing groceries for duplicate detection
3. Call `parse_receipt_to_groceries(image_base64, existing_groceries)`
4. Claude Vision API (multimodal) performs OCR and parsing:
   - Extracts grocery item names
   - Detects purchase date from receipt header
   - Detects store name from receipt header
   - Assigns confidence scores based on text clarity
   - Standardizes item names (removes brands)
5. Purchase date propagated to all items
6. Return `ReceiptParseResponse` with proposed items, metadata, warnings
7. Frontend confirms items (same flow as voice input)
8. `POST /groceries/batch` adds confirmed items (same endpoint as Phase 1)

### Error Handling

**Frontend**:
- Invalid file type → Show "Please upload PNG or JPEG" toast
- File too large (>10MB) → Show "Image too large" toast
- Compression failure → Show "Failed to process image" toast
- 400/422 → Show validation error toast
- 500 → Show "OCR service unavailable, please try again" toast
- Network error → Show "Connection failed" toast

**Backend**:
- Empty image_base64 → 400 with clear message
- Invalid base64 → 400 "Invalid image data"
- Claude Vision API error → 500 with user-facing message (log technical details)
- Malformed Claude Vision JSON → 500 "Failed to parse receipt"
- No items extracted → Return empty proposed_items array (not an error)

### Claude Vision API Details

**Temperature**: 0.1 (very low for accurate OCR, vs. 0.7 for creative voice parsing)

**Model**: claude-3-5-sonnet-20241022 (vision-capable)

**Content Format** (multimodal):
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
            {"type": "text", "text": "Extract all grocery items from this receipt..."}
        ],
    }
]
```

**Cost**: ~$0.01 per receipt (with client-side compression reducing cost by ~70%)

**Expected Performance**:
- Accuracy: 80-90% on standard receipts
- Speed: < 5 seconds (including image upload)
- Works with: Grocery store receipts, supermarket receipts
- Struggles with: Very blurry images, handwritten receipts, non-English text

---

## Test Cases (Phase 2)

### Parse Receipt Endpoint

✅ **Success Cases**:
- Standard receipt → Multiple items extracted with high confidence
- Receipt with purchase date → detected_purchase_date populated, propagated to items
- Receipt with store name → detected_store populated
- Blurry receipt → Items with medium/low confidence, warnings added
- Receipt with duplicate items → Warnings about duplicates
- Receipt with non-food items → Non-food items filtered out

❌ **Error Cases**:
- Empty image_base64 → 422
- Invalid base64 → 400
- Missing field → 422
- Claude Vision API error → 500
- Corrupt image data → 400

### Image Compression (Frontend)

✅ **Success Cases**:
- 5MB image → Compressed to ~300KB
- 3000x4000px image → Resized to 1024x1365px
- PNG image → Converted to JPEG 80% quality
- Data URL prefix → Stripped before sending to API

❌ **Error Cases**:
- Non-image file → File type validation error
- >10MB file → Size validation error
- Corrupt image → Compression failure error

---

## Version History

- **v1.0** (2025-12-22): Initial contract for Sprint 4 Phase 1 (Voice Input)
- **v1.1** (2025-12-24): Added Sprint 4 Phase 2 (Receipt OCR) contract
