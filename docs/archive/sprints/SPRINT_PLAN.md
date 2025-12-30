---
**Summary**: Original sprint planning document for Sprints 1-8. Contains detailed phase breakdowns and time estimates. Now historical; current sprints tracked in CHANGELOG.md.
**Last Updated**: 2025-12-30
**Status**: Archived
**Archived**: 2025-12-25
**Reason**: Historical planning document; Sprint 4+ planning evolved to TDD approach
**Read This If**: You need to see original sprint planning methodology
---

# Sprint Plan - Active & Planned Features

This document outlines active and planned sprints for the Meal Planner project. For completed sprints, see [SPRINT_HISTORY.md](SPRINT_HISTORY.md).

---

## Sprint Overview

| Sprint | Feature | Status | Target |
|--------|---------|--------|--------|
| Sprint 4 | Multi-Modal Grocery Input (Phases 1-2) | ✅ Complete | Dec 2025 |
| Sprint 5 | Enhanced Meal Plan Customization | 🔜 Next Up | TBD |
| Sprint 6 | Shopping List Generation | 🔜 Deferred | TBD |
| Sprint 7 | Recipe Library Expansion Tools | 🔜 Planned | TBD |
| Sprint 8 | Meal Plan History & Favorites | 🔜 Planned | TBD |

**Completed Sprints**: See [SPRINT_HISTORY.md](SPRINT_HISTORY.md)
- Sprint 1: Dynamic Recipe Generation ✅
- Sprint 1.1-1.3: Enhancements & Bug Fixes ✅
- Sprint 2: Smart Grocery Management ✅
- Sprint 2.1-2.2: Critical Fixes ✅
- Sprint 3: Recipe Ratings & Filtering ✅ (Dec 17-22, 2025)
- **Sprint 4: Multi-Modal Grocery Input (Phases 1-2) ✅ (Dec 2025)**

---

## ✅ Sprint 3: Recipe Ratings & Filtering (COMPLETE)

**Status**: ✅ Complete (2025-12-22) - All 3 phases finished
**Goal**: Enable personalized meal planning with per-person recipe ratings and filtering

### Completed User Stories

**US3.1**: Individual Dietary Preferences ✅ (Phase 1 - Dec 17)
- Users can add individual preferences per family member
- Preferences included in meal plan generation
- Full UI for editing in Household page

**US3.2**: Recipe Rating System ✅ (Phase 2 - Dec 21)
- Users can rate recipes with 👍/👎 for each household member
- Aggregate ratings displayed on recipe cards
- Recipe ratings influence meal plan generation

**US3.3**: Recipe Filtering by Preferences ✅ (Phase 3 - Dec 22)
- Users can filter recipes by household member favorites
- Users can view family favorites (liked by all)
- Users can find unrated recipes
- Combined search + filter functionality

**See [SPRINT_HISTORY.md](SPRINT_HISTORY.md) for complete implementation details, technical highlights, and learnings.**

---

## ✅ Sprint 4: Multi-Modal Grocery Input (Phases 1-2 Complete)

**Status**: Phases 1-2 Complete (Dec 2025) | Phase 3 Deferred to Backlog
**Goal**: Enable voice, OCR receipt, and image-based grocery input for faster, more natural data entry

**Target User Story**: "I'm standing at the fridge, rattling off what I see without remembering what's already in my list"

### Overview

Add 3 new grocery input methods beyond existing manual text entry:

1. **Voice Input** (#2 priority) - Speak items naturally, Claude parses and proposes additions
2. **Receipt OCR** (#4 priority) - Upload receipt photo, extract items with purchase date
3. **Produce Image Recognition** (#3 priority) - Photo of fresh produce, identify items and estimate shelf life

**Architecture**: Parse + Confirm Pattern
```
Voice/Receipt/Image → Parse endpoint → Proposed items → User confirms → Batch add
```

### Token Costs (all three features)
- **Total: ~$0.35-0.60/month** (negligible)
- Voice: ~$0.30-0.45/month (~550-1100 tokens per request)
- Receipt OCR: ~$0.02-0.06/month (~1400-2800 tokens per request)
- Produce Image: ~$0.02-0.06/month (~1400-2600 tokens per request)

### Technical Specifications

#### New Pydantic Models

**File**: `backend/app/models/grocery.py`

```python
class ProposedGroceryItem(BaseModel):
    """Grocery item proposed by AI parsing with confidence score"""
    name: str
    date_added: Optional[str] = None
    purchase_date: Optional[str] = None
    expiry_type: Optional[Literal["expiry_date", "best_before_date"]] = None
    expiry_date: Optional[str] = None
    portion: Optional[str] = None  # e.g., "2 lbs"
    confidence: Literal["high", "medium", "low"] = "high"
    notes: Optional[str] = None  # AI's reasoning

class VoiceParseRequest(BaseModel):
    transcription: str

class VoiceParseResponse(BaseModel):
    proposed_items: List[ProposedGroceryItem]
    transcription_used: str
    warnings: List[str] = Field(default_factory=list)

class ReceiptParseRequest(BaseModel):
    image_base64: str

class ReceiptParseResponse(BaseModel):
    proposed_items: List[ProposedGroceryItem]
    detected_purchase_date: Optional[str] = None
    detected_store: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)

class ImageParseRequest(BaseModel):
    image_base64: str
    purchase_date: Optional[str] = None

class ImageParseResponse(BaseModel):
    proposed_items: List[ProposedGroceryItem]
    warnings: List[str] = Field(default_factory=list)

class BatchAddRequest(BaseModel):
    items: List[GroceryItem] = Field(..., min_length=1)
```

#### New Claude Service Functions

**File**: `backend/app/services/claude_service.py`

1. **`parse_voice_to_groceries()`**
   - Parses voice transcription into structured grocery items
   - Infers dates from phrases ("bought yesterday", "expires tomorrow")
   - Extracts portions ("2 pounds of chicken")
   - Detects duplicates against existing groceries
   - Assigns confidence scores

2. **`parse_receipt_to_groceries()`**
   - Uses Claude Vision API for OCR
   - Extracts purchase date from receipt header
   - Identifies store name
   - Standardizes item names (removes brands)
   - Marks confidence based on OCR clarity

3. **`parse_image_to_produce()`**
   - Identifies produce from photos
   - Estimates shelf life based on produce type
   - Calculates expiry_date = purchase_date + shelf_life
   - Assumes refrigeration for estimates

#### New API Endpoints

**File**: `backend/app/routers/groceries.py`

- `POST /groceries/parse-voice` - Parse voice transcription
- `POST /groceries/parse-receipt` - OCR receipt image
- `POST /groceries/parse-image` - Identify produce from photo
- `POST /groceries/batch` - Add multiple items at once

#### Frontend Components

**New Files**:
- `frontend/src/hooks/useVoiceInput.ts` - Web Speech API integration
- `frontend/src/components/GroceryConfirmationDialog.tsx` - Reusable confirmation dialog

**Updated Files**:
- `frontend/src/pages/Groceries.tsx` - Add voice/upload buttons
- `frontend/src/lib/api.ts` - Add parsing methods

**Key Features**:
- Voice button with listening indicator
- File upload buttons for receipts/photos
- Confirmation dialog with editable proposed items
- Confidence badges (high/medium/low)
- Duplicate warnings
- Batch add functionality

### Implementation Phases

#### Phase 1: Voice Input ✅ COMPLETE
**Priority: HIGH** (your #1 use case)

**Backend:**
1. Add models (30 min)
2. Implement `parse_voice_to_groceries()` (2 hours)
3. Add endpoints (1 hour)
4. Write tests (1 hour)

**Frontend:**
5. Create `useVoiceInput` hook (1 hour)
6. Create confirmation dialog (1.5 hours)
7. Update Groceries page (1 hour)
8. Testing (1 hour)

**Browser Support**: Chrome/Safari (desktop + mobile), Firefox fallback message

#### Phase 2: Receipt OCR ✅ COMPLETE
**Priority: MEDIUM**

**Backend:**
1. Add models (15 min)
2. Implement `parse_receipt_to_groceries()` (2 hours)
3. Add endpoint (30 min)
4. Write tests (1 hour)

**Frontend:**
5. Add upload button (30 min)
6. File-to-base64 conversion (30 min)
7. Reuse confirmation dialog (0 min)
8. Testing (1 hour)

#### Phase 3: Produce Image Recognition 📋 DEFERRED TO BACKLOG
**Priority: MEDIUM-LOW** (Deferred - see Future Sprint Ideas)

**Backend:**
1. Add models (15 min)
2. Implement `parse_image_to_produce()` (2 hours)
3. Add endpoint (30 min)
4. Write tests (1 hour)

**Frontend:**
5. Add upload button (30 min)
6. Reuse infrastructure (0 min)
7. Testing (45 min)

### Success Criteria

**Functional:**
- [ ] Voice input works on Chrome/Safari (desktop + mobile)
- [ ] Voice parsing extracts items with 80%+ accuracy
- [ ] Date inference works ("yesterday", "tomorrow", "use soon")
- [ ] Receipt OCR extracts 90%+ items from standard receipts
- [ ] Purchase date detected from receipt header
- [ ] Produce identification recognizes 15+ common items
- [ ] Shelf life estimates within ±2 days
- [ ] Confidence scores accurately reflect parsing quality
- [ ] Duplicate warnings appear correctly
- [ ] Batch add successfully adds 10+ items

**Performance:**
- [ ] Voice parsing: < 3 seconds
- [ ] Receipt OCR: < 5 seconds
- [ ] Produce recognition: < 4 seconds
- [ ] Batch add (20 items): < 1 second

**UX:**
- [ ] Clear listening state indicator
- [ ] Image upload accepts correct file types
- [ ] Loading indicators during processing
- [ ] Clear, actionable error messages
- [ ] Intuitive confirmation dialog
- [ ] Visual flagging of low-confidence items

### Key Decisions

1. **Shelf life estimation**: Generic estimates, assume refrigeration
2. **Browser support**: Chrome/Safari only for voice (v1)
3. **Error handling**: Show items with ⚠️ Low Confidence badge, let user decide
4. **Duplicates**: Show warnings, user decides (no auto-merge in v1)
5. **Image compression**: Client-side compression to 1024px, 80% JPEG quality

### Future Enhancements (Deferred)

- Camera capture (not just file upload)
- Batch voice processing (continuous listening)
- Voice command editing ("remove chicken")
- Multi-language support
- Barcode scanning for packaged goods
- Auto-categorization by type
- Smart duplicate handling (merge portions)
- Offline mode with sync

---

## 🔜 Sprint 5: Enhanced Meal Plan Customization

**Status**: Planned
**Goal**: Give users more control over meal plan generation with specific preferences and constraints

### User Stories

**US5.1**: Customize Meal Plan Generation Settings
- As a user, I can specify which days of the week to generate meals for (skip weekends, etc.)
- As a user, I can specify which meal types to include (breakfast only, dinner only, etc.)
- As a user, I can set a preference for variety vs. batch cooking

**US5.2**: Regenerate Individual Days
- As a user, I can regenerate a single day in my meal plan without regenerating the entire week
- As a user, I can lock specific days/meals and regenerate around them

**US5.3**: Swap Recipes in Meal Plan
- As a user, I can swap a recipe in the meal plan with a different recipe from my library
- The system suggests alternative recipes that meet the same constraints

**US5.4**: Daycare Meal Planning
- As a user, I can specify which days my child attends daycare
- As a user, I can specify which meals need to be packed for daycare (e.g., lunch, snacks)
- The meal plan generation accounts for daycare days and includes packable meals
- Daycare meals are flagged in the meal plan as "pack for daycare"

### Technical Requirements

**Note**: Detailed technical requirements to be added when this sprint is prioritized.

---

## 🔜 Sprint 6: Shopping List Generation (Deferred)

**Status**: Planned (deferred)
**Goal**: Automatically generate shopping lists from meal plans, accounting for groceries already on hand

**Note**: This sprint conflicts with the primary workflow (shop first, then plan). May be redesigned as "Meal Plan → Missing Ingredients" feature instead.

### User Stories

**US6.1**: Generate Shopping List from Meal Plan
- As a user, I can generate a shopping list based on my current meal plan
- The system deducts ingredients I already have from the list
- Ingredients are grouped by category (produce, dairy, meat, pantry, etc.)

**US6.2**: Smart Quantity Aggregation
- When multiple recipes use the same ingredient, quantities are aggregated
- Common conversions are handled (e.g., "1 lb chicken" + "2 cups diced chicken")

**US6.3**: Shopping List Management
- As a user, I can check off items as I shop
- As a user, I can add additional items to the shopping list manually
- Purchased items automatically added to my grocery inventory

---

## 🔜 Sprint 7: Recipe Library Expansion Tools

**Status**: Planned
**Goal**: Make it easier to add and manage recipes in the library

### User Stories

**US7.1**: Recipe Creation Wizard
- As a user, I can add new recipes through a guided form
- The form auto-suggests tags based on ingredients and cooking method
- Required appliances are auto-detected from instructions

**US7.2**: Bulk Recipe Import
- As a user, I can paste multiple recipes in a structured format (JSON/CSV)
- The system validates and imports all recipes at once

**US7.3**: Recipe Editing and Versioning
- As a user, I can edit existing recipes
- Changes are saved with a timestamp
- AI-generated recipes can be edited to become "manual" recipes

**US7.4**: Recipe Search and Filtering
- As a user, I can filter recipes by tags, appliances, cooking time
- As a user, I can see which recipes are AI-generated vs. manually added

---

## 🔜 Sprint 8: Meal Plan History & Favorites

**Status**: Planned
**Goal**: Allow users to save, review, and reuse successful meal plans

### User Stories

**US8.1**: Meal Plan History
- As a user, I can view all previously generated meal plans
- Each meal plan shows the date range and recipes used
- I can view the full details of past meal plans

**US8.2**: Favorite Meal Plans
- As a user, I can mark a meal plan as "favorite"
- I can quickly regenerate favorite meal plans
- Favorite plans are prioritized in history view

**US8.3**: Meal Plan Templates
- As a user, I can save a meal plan as a template
- Templates can be used as starting points for new plans
- I can customize templates before generating

---

## Future Sprint Ideas (Backlog)

### Deferred: Produce Image Recognition (from Sprint 4 Phase 3)
- Photo of fresh produce, identify items and estimate shelf life
- Uses Claude Vision API for produce identification
- Estimates shelf life based on produce type (assumes refrigeration)
- Calculates expiry_date = purchase_date + shelf_life
- **Deferred reason**: Lower priority compared to other features; voice input and receipt OCR cover primary use cases

### Sprint 9: Nutrition Tracking
- Add nutritional information to recipes
- Show nutrition summary for meal plans
- Filter recipes by nutritional criteria (high protein, low carb, etc.)

### Sprint 10: Calendar Integration
- Sync meal plans with Google Calendar
- Set reminders for meal prep
- Adjust plans based on calendar events

### Sprint 11: Recipe Scaling
- Scale recipe servings up or down
- Adjust ingredient quantities automatically
- Save scaled versions as new recipes

### Sprint 12: Cost Optimization
- Add cost estimates to recipes
- Generate budget-friendly meal plans
- Track grocery spending over time

### Sprint 13: Mobile Optimization ✅ PARTIAL (v0.7.0)
- ✅ Responsive design improvements for Meal Plans page
- Offline support for grocery lists (future)
- Quick add via mobile camera (OCR for ingredients) (future)

**Completed in v0.7.0 (Dec 30, 2025):**
- Mobile-optimized meal plans view with full-width cards
- Pill-style day picker with scroll indicators
- Multi-day desktop view (2-3 days side-by-side)
- Dynamic gradient fades based on scroll position

---

## Sprint Planning Guidelines

### Sprint Scope
- Each sprint should be completable in 1-2 weeks
- Focus on one major feature per sprint
- Include backend, frontend, and testing tasks
- Update documentation as part of sprint completion

### Definition of Done
For a sprint to be considered complete:
- [ ] All backend endpoints implemented and tested
- [ ] All frontend UI/UX implemented
- [ ] Integration tests passing
- [ ] Documentation updated (README, PRODUCT_REQUIREMENTS, CHANGELOG, SPRINT_HISTORY)
- [ ] User acceptance testing completed
- [ ] Code reviewed and merged

### Sprint Retrospective Template
After each sprint, document in SPRINT_HISTORY.md:
1. **What went well**: Successes and wins
2. **What didn't go well**: Challenges and blockers
3. **What to improve**: Action items for next sprint
4. **Technical learnings**: New patterns, libraries, or approaches discovered

---

## Notes

- This sprint plan is a living document - adjust priorities based on user feedback
- Each sprint should ship a usable feature, not just code
- Testing and documentation are part of the sprint, not afterthoughts
- Completed sprints are archived in [SPRINT_HISTORY.md](SPRINT_HISTORY.md)
