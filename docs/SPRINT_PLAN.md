# Sprint Plan - v0.2 Feature Development

This document outlines the sprint-based development plan for v0.2+ features beyond the core v0.1 meal planning application.

---

## Sprint Overview

| Sprint | Feature | Status | Target |
|--------|---------|--------|--------|
| Sprint 1 | Dynamic Recipe Generation | ✅ Complete | 2025-12-04 |
| Sprint 2 | Smart Grocery Management | ✅ Complete | 2025-12-10 |
| Sprint 2.1 | Critical Bug Fixes - Chroma DB Integration | ✅ Complete | 2025-12-10 |
| Sprint 2.2 | Recipe Generation from Meal Plan Suggestions | ✅ Complete | 2025-12-11 |
| Sprint 3 | Household Preferences & Recipe Relationships | 🔜 Planned | TBD |
| Sprint 4 | Enhanced Meal Plan Customization | 🔜 Planned | TBD |
| Sprint 5 | Shopping List Generation | 🔜 Planned | TBD |
| Sprint 6 | Recipe Library Expansion Tools | 🔜 Planned | TBD |
| Sprint 7 | Meal Plan History & Favorites | 🔜 Planned | TBD |

---

## ✅ Sprint 1: Dynamic Recipe Generation (Complete)

**Status**: Complete (2025-12-04)
**Goal**: Allow users to select ingredients from their grocery list and generate AI-powered recipes on demand

### User Stories
- **US1**: As a user, I can select ingredients from my grocery list and generate a custom recipe using AI
  - Select multiple ingredients via checkboxes
  - Configure meal type, servings, cooking time, ingredient portions
  - AI generates recipe and saves to library with "AI" badge

### Implementation Summary
- **Backend**: POST /recipes/generate endpoint with DynamicRecipeRequest model
- **Frontend**: Ingredient selection UI + DynamicRecipeModal component
- **Integration**: Generated recipes saved to main recipe library with `is_generated` flag

### Documentation
- [CHANGELOG.md](CHANGELOG.md#sprint-1-complete-dynamic-recipe-generation-from-ingredients) - Full implementation details
- [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md#dynamic-recipe-generation-us1---v02-feature) - User story documentation

---

## ✅ Sprint 1.1: Enhanced Recipe Generation (Complete)

**Status**: Complete (2025-12-04)
**Goal**: Add cuisine selection and recipe regeneration features

### Features Implemented

1. **Cuisine Type Selection**
   - 9 cuisine options: Italian, Mexican, Chinese, Korean, Japanese, Greek, Indian, Healthy, Other (custom)
   - Custom cuisine text input for "Other" option
   - Backend integration with Claude prompt

2. **Recipe Regeneration**
   - "Generate Again" button for AI-generated recipes only
   - Confirmation dialog before regeneration
   - Deletes current recipe and navigates to Groceries page for fresh ingredient selection

### Files Modified
- `backend/app/models/recipe.py` - Added cuisine_type field
- `backend/app/services/claude_service.py` - Updated prompt with cuisine
- `backend/app/routers/recipes.py` - Added cuisine_type parameter
- `frontend/src/lib/api.ts` - Updated DynamicRecipeRequest interface
- `frontend/src/components/DynamicRecipeModal.tsx` - Cuisine dropdown + validation
- `frontend/src/components/RecipeModal.tsx` - Regeneration button + dialog
- `frontend/src/pages/Recipes.tsx` - Simplified (removed complex state)

### Key Decisions
- Regeneration navigates to Groceries page (simpler than ingredient extraction)
- Used 'none' as default cuisine value (avoids controlled/uncontrolled Select warning)
- Map 'none' to undefined when sending to backend

---

## ✅ Sprint 1.2: Bug Fixes (Complete)

**Status**: Complete (2025-12-04)
**Goal**: Fix meal plan generation and UI spacing issues

### Issues Fixed

1. **Meal Plan Generation Pydantic Validation Error**
   - Problem: Claude returned null recipe_id for simple snacks, causing validation error
   - Solution: Made recipe_id Optional[str] in Meal model
   - Updated Claude prompt to allow null for simple snacks

2. **RecipeModal Button Spacing**
   - Problem: Delete button too close to modal close button
   - Solution: Added padding-right to DialogTitle, adjusted button gaps

### Files Modified
- `backend/app/models/meal_plan.py` - Changed recipe_id to Optional[str]
- `backend/app/services/claude_service.py` - Updated prompt for null recipe_id
- `frontend/src/lib/api.ts` - Updated Meal interface
- `frontend/src/components/RecipeModal.tsx` - Improved button spacing

---

## ✅ Sprint 1.3: Meal Plan UX Improvements (Complete)

**Status**: Complete (2025-12-09)
**Goal**: Improve meal plan user experience and add model configuration

### Features Implemented

1. **Clickable Recipe Titles in Meal Plan**
   - Recipe titles in MealCard now clickable to view full details
   - Opens RecipeModal with recipe data
   - Loading state while fetching
   - Simple snacks (no recipe_id) remain non-clickable
   - Visual feedback: cursor-pointer, hover effects

2. **Meal Plan Persistence**
   - Added localStorage persistence (temporary solution)
   - Meal plan survives page navigation and reloads
   - Note: Proper database storage deferred to Sprint 5

3. **Removed Non-Functional Buttons**
   - Removed Export and Print buttons from UI
   - Deferred feature to future sprint

4. **Configurable Claude Model**
   - Added MODEL_NAME environment variable
   - Supports: Opus 4, Sonnet 4.5, Sonnet 3.5, Haiku
   - Enables cost savings during testing (80-95% cheaper with alternate models)
   - Updated both meal plan and recipe generation functions

5. **Improved RecipeModal Layout**
   - Moved "Generate Again" and "Delete Recipe" buttons to bottom
   - Added button labels for clarity
   - Resolved spacing conflict with modal close button

### Files Modified
- `frontend/src/pages/MealPlans.tsx` - Removed Export/Print, added localStorage
- `frontend/src/components/MealCard.tsx` - Made clickable with RecipeModal
- `frontend/src/components/RecipeModal.tsx` - Moved buttons to bottom with labels
- `backend/app/config.py` - Added MODEL_NAME setting
- `backend/app/services/claude_service.py` - Use settings.MODEL_NAME
- `backend/.env.example` - Documented model options

### Key Decisions
- localStorage for temporary persistence (proper DB in Sprint 5)
- Export/Print deferred - not critical for MVP
- Model configuration via env var for testing flexibility
- Bottom-positioned action buttons for better UX

---

## ✅ Sprint 2: Smart Grocery Management

**Status**: Complete (v0.3)
**Goal**: Transform Groceries into the primary workflow starting point with expiry tracking and smart reminders

**User Persona**: A busy mother who shops for fresh, available, good-deal groceries first, then uses the app to plan meals around what she bought + existing inventory.

### User Stories

**US2.1**: Quick Grocery Entry with Dates
- As a user, I can quickly add groceries I just purchased
- As a user, I can optionally add Purchase Date (defaults to today)
- As a user, I can optionally add expiry type (Expiry Date or Best Before Date) with date
- Only grocery name is required; dates are optional

**US2.2**: View Groceries by Purchase Date
- As a user, I see groceries grouped/sorted by when they were entered (Default) or Purchase Date
- As a user, I can see at a glance which groceries are expiring soon
- Groceries with expiry dates within 1 day show a warning indicator

**US2.3**: Expiry Date Reminders
- As a user, I receive a reminder 1 day before a grocery item expires
- Reminders only show if Purchase Date < Expiry Date
- Reminders surface expired/expiring items prominently in UI

**US2.4**: Expiry-Aware Meal Planning
- When I generate a meal plan, the algorithm prioritizes ingredients expiring soonest
- Claude receives grocery expiry dates and is prompted to use those ingredients first
- Meal plan suggests recipes that help me use up expiring groceries

**US2.5**: Enhanced Groceries Navigation
- Groceries tab becomes primary navigation (moved to first/prominent position)
- Clear workflow: Add groceries → Generate meal plan → View recipes
- Simplified "Add Grocery" flow for quick entry after shopping

### Technical Requirements

#### Backend Tasks

**Grocery Model Updates:**
- [x] Update `GroceryItem` Pydantic model with new fields:
  - `purchase_date: Optional[date]` (defaults to today)
  - `expiry_type: Optional[str]` (enum: "expiry_date", "best_before_date")
  - `expiry_date: Optional[date]`
  - `date_added: date` (auto-generated, tracks when item was entered)
- [x] Add validation: if expiry_date exists, ensure expiry_type is set
- [x] Update grocery list JSON schema to support new fields

**API Endpoints:**
- [x] Update `POST /groceries` to accept new date fields
- [x] Update `GET /groceries` to return items with date metadata
- [x] Create `GET /groceries/expiring-soon` endpoint
  - Query param: `days_ahead: int = 1` (default 1 day)
  - Returns groceries expiring within N days
  - Filters out items where purchase_date >= expiry_date

**Meal Plan Integration:**
- [x] Update meal plan service to accept grocery expiry data
- [x] Modify Claude prompt to include grocery expiry information
- [x] Update prompt to prioritize ingredients expiring soonest
- [x] Pass expiry context: "Chicken expires in 2 days, use it soon!" (with ⚠️ USE SOON markers)

**Data Migration:**
- [x] Add migration logic to handle existing groceries (set date_added to today)

#### Frontend Tasks

**Groceries Page Enhancements:**
- [x] Redesign "Add Grocery" form with:
  - Grocery name input (required)
  - Purchase date input (optional, defaults to today)
  - Expiry type dropdown (optional: Expiry Date, Best Before Date)
  - Expiry date input (conditional, shows when expiry type selected)
- [x] Add progressive disclosure pattern (Advanced button toggles date fields)
- [x] Update grocery list display to show:
  - Date purchased/added
  - Expiry date with visual indicator (color-coded: green=fresh, yellow=soon, red=expired)
  - Days until expiry badge with smart text
- [ ] Sort groceries by date_added (newest first) or Purchase Date (future enhancement)
- [ ] Add filter/view toggle: All | Expiring Soon | Fresh (future enhancement)

**Expiry Warnings:**
- [x] Add visual indicators for groceries expiring within 1 day (red badges)
- [x] Create "Expiring Soon" banner at top of Groceries page
  - Shows count of items expiring in next 24 hours
  - Displays item names in banner
- [x] Real-time updates for expiring items (refetch every minute)
- [ ] Add reminder notification badge on Groceries nav tab when items expiring (future enhancement)

**Navigation Updates:**
- [ ] Move Groceries tab to first position in navigation (future enhancement)
- [ ] Update landing page/dashboard to emphasize grocery-first workflow (future enhancement)
- [ ] Add visual flow indicator: "Add Groceries → Plan Meals → Cook" (future enhancement)

**API Client Updates:**
- [x] Update `groceriesAPI.add()` to accept date fields
- [x] Add `groceriesAPI.getExpiringSoon()` method
- [x] Update TypeScript interfaces for GroceryItem with new date fields

#### Testing
- [x] Test grocery entry with all date field combinations
- [x] Test expiry date validation (expiry_type required when expiry_date set)
- [x] Test expiring-soon endpoint returns correct items
- [x] Test meal plan generation includes expiring ingredients context
- [x] Test reminder logic doesn't trigger if purchase_date >= expiry_date
- [ ] Test grocery sorting by date_added vs purchase_date (not implemented - future enhancement)
- [x] Test visual indicators for expiry states (fresh, soon, expired)

### Acceptance Criteria
- [x] Users can add groceries with optional purchase date (defaults to today)
- [x] Users can add optional expiry type + date to grocery items
- [x] Groceries display with date metadata (date added, purchase date)
- [x] Visual indicators show which groceries are expiring soon (within 1-3 days)
- [x] Expiring items highlighted prominently with warning colors (red/yellow/green badges)
- [x] Meal plan generation prioritizes using groceries expiring soonest (via Claude prompt)
- [x] Claude prompt includes expiry context with ⚠️ USE SOON markers
- [ ] Groceries tab is primary navigation entry point (future enhancement)
- [x] Quick add flow supports rapid grocery entry (progressive disclosure pattern)
- [x] Reminders only show when purchase_date < expiry_date

### Design Notes
- Keep entry flow simple - only grocery name required
- Date fields should be easy to skip for quick entry
- Expiry indicators should be color-coded and intuitive
- "Expiring Soon" should be prominently visible but not alarming
- Workflow emphasizes: Shop → Add → Plan → Cook

### Implementation Summary

**What Was Built:**

**Backend (Session 1)**:
- Created `GroceryItem` Pydantic model with date fields and validation
- New `/groceries` REST API with individual item operations (POST, DELETE)
- `GET /groceries/expiring-soon` endpoint with configurable days_ahead
- Data migration logic for backward compatibility with string format
- Updated data manager to handle GroceryItem objects

**Frontend (Session 2)**:
- Completely redesigned Groceries page with enhanced form
- Progressive disclosure pattern (Advanced button toggles date fields)
- TypeScript interfaces updated for GroceryItem
- New groceriesAPI client methods
- Expiring soon banner with real-time updates (refetch every 60s)
- Color-coded expiry badges (red/yellow/green)
- Smart expiry text ("Expires tomorrow", "X days until expiry")
- Purchase date display with calendar icons

**Meal Plan Integration (Session 3)**:
- RAG service updated to accept `List[GroceryItem]` and extract names
- Claude prompt enhanced with expiry context
- Groceries formatted with ⚠️ "USE SOON" markers for items expiring ≤2 days
- System prompt updated to prioritize expiring ingredients
- Full GroceryItem data serialized in context (dates included)

**Key Files Changed:**
- `backend/app/models/grocery.py` (NEW)
- `backend/app/routers/groceries.py` (NEW)
- `backend/app/data/data_manager.py` (UPDATED)
- `backend/app/services/rag_service.py` (UPDATED)
- `backend/app/services/claude_service.py` (UPDATED)
- `frontend/src/lib/api.ts` (UPDATED)
- `frontend/src/pages/Groceries.tsx` (COMPLETE REDESIGN)

**Testing Results:**
- ✅ Data migration from old format successful
- ✅ All CRUD operations working
- ✅ Expiry validation enforced
- ✅ Expiring-soon endpoint returns correct items
- ✅ Visual indicators display correctly
- ✅ Claude receives expiry context in prompts

**Future Enhancements (Deferred):**
- Grocery sorting/filtering by expiry date
- Navigation badge for expiring items count
- Move Groceries tab to primary navigation position
- Visual workflow indicator

---

## ✅ Sprint 2.1: Critical Bug Fixes - Chroma DB Integration (Complete)

**Status**: Complete (2025-12-10)
**Goal**: Fix recipe embedding and deletion to ensure Chroma vector database stays synchronized with recipe storage

### Issues Discovered

During Sprint 2 testing, critical bugs were discovered where the Chroma vector database (used for RAG recipe retrieval during meal plan generation) was not staying synchronized with the recipe JSON files:

**Bug 1: Generated Recipes Not Embedded in Chroma**
- **Problem**: When users generate recipes from the Groceries view, the recipe is saved to JSON but NOT added to the Chroma vector database
- **Impact**: Generated recipes can never appear in meal plans because RAG retrieval queries Chroma, not the JSON files directly
- **Example**: User-generated recipe "Asian-Style Eggplant and Green Onion Stir-Fry" exists in `backend/data/recipes/generated_eggplant_green_onion_stir_fry_001.json` but is not in Chroma DB
- **Evidence**: Chroma DB contains only 4 recipes (recipe_001, recipe_002, recipe_003, test_recipe) while 3+ generated recipe files exist

**Bug 2: Recipe Deletion Creates Orphaned Chroma Entries**
- **Problem**: When users delete recipes, the JSON file is removed but the Chroma vector database entry remains
- **Impact**: Orphaned entries in Chroma can appear in meal plan RAG results, pointing to non-existent recipes
- **Example**: `test_recipe` exists in Chroma DB but has no corresponding JSON file (was deleted at some point)
- **Evidence**: Chroma query returns 4 recipes but only 3 recipe files exist in `backend/data/recipes/`

### Root Cause Analysis

**Recipe Creation Flow ([recipes.py:207-210](../backend/app/routers/recipes.py#L207-L210))**:
```python
# Save the generated recipe
save_recipe(recipe)
logger.info(f"Generated and saved recipe: {recipe.id} - {recipe.title}")
# ❌ MISSING: No call to embed_recipes([recipe]) to add to Chroma
```

**Recipe Deletion Flow ([data_manager.py:213-232](../backend/app/data/data_manager.py#L213-L232))**:
```python
def delete_recipe(recipe_id: str) -> bool:
    filepath = DATA_DIR / "recipes" / f"{recipe_id}.json"
    if not filepath.exists():
        return False
    try:
        filepath.unlink()  # Only deletes JSON file
        logger.info(f"Deleted recipe: {recipe_id}")
        return True
    except Exception as e:
        logger.error(f"Error deleting recipe {recipe_id}: {e}")
        return False
    # ❌ MISSING: No removal from Chroma vector database
```

**How Chroma Embedding Should Work ([chroma_manager.py:70-129](../backend/app/data/chroma_manager.py#L70-L129))**:
```python
def embed_recipes(recipes: List[Recipe]) -> int:
    """Embed a list of recipes into the Chroma vector database."""
    collection = get_recipes_collection()

    # Create text representation for semantic search
    for recipe in recipes:
        text_representation = (
            f"{recipe.title} - "
            f"Tags: {', '.join(recipe.tags)} - "
            f"Ingredients: {', '.join(recipe.ingredients)}"
        )
        # Store in Chroma with metadata
        collection.add(documents=[text], ids=[recipe.id], metadatas=[...])
```

### Solution: Option 1 - Fix at Creation/Deletion Points (RECOMMENDED)

**Why Option 1**: Simplest approach, fixes the problem at its source, ensures consistency going forward.

#### Backend Tasks

**Task 1: Fix Recipe Creation Endpoint**
- **File**: `backend/app/routers/recipes.py`
- **Location**: Lines 207-210 (POST /recipes/generate endpoint)
- **Change**:
```python
# Save the generated recipe
save_recipe(recipe)
logger.info(f"Generated and saved recipe: {recipe.id} - {recipe.title}")

# ✅ NEW: Embed the recipe in Chroma for RAG retrieval
from app.data.chroma_manager import embed_recipes
embed_recipes([recipe])
logger.info(f"Embedded recipe in Chroma DB: {recipe.id}")
```

**Task 2: Fix Recipe Deletion Function**
- **File**: `backend/app/data/data_manager.py`
- **Location**: Lines 213-232 (delete_recipe function)
- **Change**:
```python
def delete_recipe(recipe_id: str) -> bool:
    """Delete a recipe from both JSON storage and Chroma DB"""
    filepath = DATA_DIR / "recipes" / f"{recipe_id}.json"
    if not filepath.exists():
        logger.warning(f"Recipe file not found: {recipe_id}")
        # Still try to remove from Chroma in case it's orphaned

    try:
        # Delete JSON file if it exists
        if filepath.exists():
            filepath.unlink()
            logger.info(f"Deleted recipe file: {recipe_id}")

        # ✅ NEW: Remove from Chroma DB
        from app.data.chroma_manager import get_recipes_collection
        collection = get_recipes_collection()
        try:
            collection.delete(ids=[recipe_id])
            logger.info(f"Removed recipe from Chroma DB: {recipe_id}")
        except Exception as e:
            logger.warning(f"Could not remove {recipe_id} from Chroma (may not exist): {e}")

        return True
    except Exception as e:
        logger.error(f"Error deleting recipe {recipe_id}: {e}")
        return False
```

**Task 3: Create Chroma Cleanup Utility (Optional)**
- **File**: `backend/app/data/chroma_manager.py`
- **New Function**:
```python
def sync_chroma_with_storage() -> Dict[str, int]:
    """
    Sync Chroma DB with JSON storage (cleanup utility).

    Removes orphaned Chroma entries and adds missing recipe embeddings.
    Returns stats about what was cleaned up.
    """
    collection = get_recipes_collection()
    all_recipes = load_recipes()  # Load from JSON
    recipe_ids_in_storage = {r.id for r in all_recipes}

    # Get all IDs in Chroma
    chroma_results = collection.get()
    chroma_ids = set(chroma_results['ids']) if chroma_results['ids'] else set()

    # Find orphaned entries (in Chroma but not in storage)
    orphaned = chroma_ids - recipe_ids_in_storage
    if orphaned:
        collection.delete(ids=list(orphaned))
        logger.info(f"Removed {len(orphaned)} orphaned entries from Chroma: {orphaned}")

    # Find missing embeddings (in storage but not in Chroma)
    missing = recipe_ids_in_storage - chroma_ids
    if missing:
        missing_recipes = [r for r in all_recipes if r.id in missing]
        embed_recipes(missing_recipes)
        logger.info(f"Added {len(missing)} missing recipes to Chroma: {missing}")

    return {
        "orphaned_removed": len(orphaned),
        "missing_added": len(missing),
        "total_in_sync": len(recipe_ids_in_storage)
    }
```

**Task 4: Create Admin Endpoint for Cleanup (Optional)**
- **File**: `backend/app/routers/recipes.py`
- **New Endpoint**:
```python
@router.post("/admin/sync-chroma", tags=["admin"])
async def sync_chroma_db():
    """
    Admin endpoint to sync Chroma DB with recipe storage.
    Removes orphaned entries and adds missing embeddings.
    """
    from app.data.chroma_manager import sync_chroma_with_storage

    stats = sync_chroma_with_storage()
    return {
        "message": "Chroma DB synchronized with recipe storage",
        "stats": stats
    }
```

#### Testing Tasks

- [x] Verify current state: Chroma has 4 recipes, storage has ~6-7 recipes
- [ ] Test recipe generation adds to both JSON and Chroma
- [ ] Test recipe deletion removes from both JSON and Chroma
- [ ] Test cleanup utility finds and fixes orphaned/missing entries
- [ ] Test meal plan generation includes newly generated recipes
- [ ] Verify no orphaned entries remain after cleanup

#### Acceptance Criteria

- [ ] POST /recipes/generate saves recipe to JSON AND adds to Chroma DB
- [ ] DELETE /recipes/{id} removes recipe from JSON AND Chroma DB
- [ ] Newly generated recipes appear in meal plan RAG results
- [ ] Deleted recipes do not appear in meal plan RAG results
- [ ] Cleanup utility can fix existing inconsistencies
- [ ] Admin endpoint available for manual sync if needed

### Alternative Solutions Considered

**Option 2: Lazy Loading with Fallback**
- **Approach**: When RAG queries Chroma and finds a missing recipe, auto-embed it
- **Pros**: Fixes itself over time, no migration needed
- **Cons**: Slower first query, doesn't fix orphaned entries, complex error handling
- **Decision**: Rejected in favor of fixing at source

**Option 3: Scheduled Background Sync**
- **Approach**: Periodic job (e.g., daily) that syncs Chroma with JSON storage
- **Pros**: Handles any inconsistencies automatically
- **Cons**: Recipes unavailable until next sync, adds complexity
- **Decision**: Could be added later as defense-in-depth, but not primary fix

### Implementation Priority

**Immediate (This Sprint)**:
1. Fix recipe creation endpoint (Task 1)
2. Fix recipe deletion function (Task 2)
3. Run manual cleanup to fix existing data

**Optional (Future)**:
4. Add sync utility function (Task 3)
5. Add admin endpoint (Task 4)
6. Consider scheduled sync as defense measure

### Current Status

- [x] Bugs identified and root cause analyzed
- [x] Solution designed (Option 1)
- [x] Recipe creation endpoint updated
- [x] Recipe deletion function updated
- [x] Cleanup utility implemented
- [x] Admin endpoint created
- [x] Initial sync run (1 orphaned removed, 4 missing added)
- [x] Testing completed
- [x] Documentation updated

### Implementation Summary

All fixes have been successfully implemented and deployed:

1. **Recipe Creation Fix**: [recipes.py:211-214](../backend/app/routers/recipes.py#L211-L214)
   - Added `embed_recipes([recipe])` call after `save_recipe(recipe)`
   - Newly generated recipes now immediately available for RAG retrieval

2. **Recipe Deletion Fix**: [data_manager.py:236-243](../backend/app/data/data_manager.py#L236-L243)
   - Added Chroma deletion logic to `delete_recipe()` function
   - Prevents orphaned entries in vector database

3. **Sync Utility**: [chroma_manager.py:216-256](../backend/app/data/chroma_manager.py#L216-L256)
   - Created `sync_chroma_with_storage()` function
   - Finds and fixes orphaned/missing entries automatically

4. **Admin Endpoint**: [recipes.py:240-268](../backend/app/routers/recipes.py#L240-L268)
   - POST `/recipes/admin/sync-chroma` endpoint
   - Returns statistics on sync operations

**Verification Results:**
- Initial sync: 1 orphaned entry removed (test_recipe), 4 missing recipes added
- All 7 recipes now synchronized between JSON storage and Chroma DB
- Second sync: 0 orphaned, 0 missing - confirms full synchronization
- Generated recipes (e.g., "Asian-Style Eggplant and Green Onion Stir-Fry") now appear in meal plans

---

## ✅ Sprint 2.2: Recipe Generation from Meal Plan Suggestions (Complete)

**Status**: Complete (2025-12-11)
**Goal**: Allow users to generate full recipes from meal plan suggestions that don't have associated recipe_id

### Feature Overview

During meal plan generation, Claude often suggests meals without linking them to existing recipes (e.g., "Roasted butternut squash soup", "Banana yogurt muffins"). Previously, these suggestions were non-clickable and users couldn't create recipes from them. This sprint adds a "+" icon to these meal cards that generates a complete recipe from the suggestion.

### User Stories

**US2.2.1**: Generate Recipe from Meal Plan Suggestion
- As a user, I can see a "+" icon on meal cards that don't have an associated recipe
- As a user, I can click the "+" icon to generate a complete recipe from the meal title
- The system prevents creating duplicate recipes with the same title
- Generated recipes are immediately available in my recipe library and future meal plans

### Implementation

#### 1. Frontend - MealCard Component ([MealCard.tsx:101-129](../frontend/src/components/MealCard.tsx#L101-L129))

**Changes**:
- Added "+" icon button that appears only when `!meal.recipe_id`
- Button opens GenerateFromTitleModal
- After successful generation, automatically opens the new recipe in RecipeModal

```typescript
{!meal.recipe_id && (
  <button
    onClick={handleGenerateRecipe}
    className="flex-shrink-0 p-2 rounded-full bg-primary/10 hover:bg-primary/20 text-primary"
    title="Generate recipe"
  >
    <Plus className="h-4 w-4" />
  </button>
)}
```

#### 2. Frontend - GenerateFromTitleModal Component (NEW)

**File**: `frontend/src/components/GenerateFromTitleModal.tsx`

**Features**:
- Displays recipe title and meal type for user confirmation
- Shows duplicate warning if recipe already exists (409 Conflict)
- Calls `/recipes/generate-from-title` endpoint
- Invalidates recipe and meal plan queries after generation
- Passes generated recipe ID back to MealCard for immediate viewing

**Key Logic**:
```typescript
const generateMutation = useMutation({
  mutationFn: async () => {
    const request: GenerateFromTitleRequest = {
      recipe_title: recipeTitle,
      meal_type: mealType,
      servings: 4,
    };
    return await recipesAPI.generateFromTitle(request);
  },
  onSuccess: (recipe) => {
    toast.success(`Recipe "${recipeTitle}" generated successfully!`);
    onRecipeGenerated(recipe.id);
  },
  onError: (error: any) => {
    if (error.status === 409) {
      setDuplicateError(error.message);
      toast.error('A recipe with this title already exists');
    }
  },
});
```

#### 3. Backend - Claude Service ([claude_service.py:533-660](../backend/app/services/claude_service.py#L533-L660))

**New Function**: `generate_recipe_from_title()`

**Purpose**: Generates a complete recipe from just a title and meal type

**Prompt Strategy**:
```python
prompt = f"""Create a complete recipe for "{recipe_title}".

This is a {meal_type} recipe that should serve {servings} people.

Requirements:
- Create a practical, delicious version of this dish
- Include all necessary ingredients with precise quantities
- Provide clear step-by-step instructions
- Add appropriate tags (quick, healthy, family-friendly, etc.)
- Use the exact title provided: "{recipe_title}"
```

**Response Parsing**:
- Uses existing `_parse_recipe_response()` function
- Ensures `is_generated=True` flag is set
- Generates unique ID with "generated_" prefix

#### 4. Backend - API Endpoint ([recipes.py:248-318](../backend/app/routers/recipes.py#L248-L318))

**Endpoint**: `POST /recipes/generate-from-title`

**Request Model**:
```python
class GenerateFromTitleRequest(BaseModel):
    recipe_title: str
    meal_type: str = "dinner"
    servings: int = 4
```

**Duplicate Title Check**:
```python
# Check if a recipe with this title already exists
all_recipes = list_all_recipes()
for existing_recipe in all_recipes:
    if existing_recipe.title.lower() == request.recipe_title.strip().lower():
        raise HTTPException(
            status_code=409,
            detail=f"A recipe with the title '{request.recipe_title}' already exists"
        )
```

**Response**: Returns generated Recipe object (201 Created)

**Error Codes**:
- 400: Invalid request (empty title)
- 409: Duplicate title exists
- 500: Generation failed
- 503: Claude API unavailable

#### 5. Frontend - API Client ([api.ts:77-81, 237-244](../frontend/src/lib/api.ts#L77-L81))

**New Interface**:
```typescript
export interface GenerateFromTitleRequest {
  recipe_title: string;
  meal_type?: string;
  servings?: number;
}
```

**New Method**:
```typescript
async generateFromTitle(request: GenerateFromTitleRequest): Promise<Recipe> {
  const response = await fetch(`${API_BASE_URL}/recipes/generate-from-title`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return handleResponse<Recipe>(response);
}
```

### Key Features

✅ **Visual Indicator**: "+" icon appears on meals without recipe_id
✅ **Duplicate Prevention**: Returns 409 Conflict if title already exists
✅ **Automatic Chroma Embedding**: Generated recipes immediately available for RAG retrieval
✅ **Seamless UX**: Recipe modal opens automatically after generation
✅ **Error Handling**: Clear error messages for duplicates and API failures
✅ **Query Invalidation**: Updates recipe library and meal plan views

### Testing Completed

- [x] "+" icon appears only on meals without recipe_id
- [x] Modal displays correct recipe title and meal type
- [x] Duplicate detection prevents creating recipes with same title
- [x] Generated recipes saved to JSON storage
- [x] Generated recipes embedded in Chroma DB
- [x] Recipe modal opens automatically after generation
- [x] Recipe library updates without manual refresh
- [x] Error handling for duplicate titles (409)
- [x] Error handling for API failures

### Example Usage

1. User generates meal plan for the week
2. Meal plan includes "Roasted butternut squash soup" (no recipe_id)
3. User clicks "+" icon on the meal card
4. Modal shows: "Create a full recipe for 'Roasted butternut squash soup'"
5. User clicks "Generate Recipe"
6. Claude creates complete recipe with ingredients, instructions, tags
7. Recipe is saved to library and embedded in Chroma
8. Recipe modal opens showing the new recipe
9. Recipe now appears in meal library and is available for future meal plans

### Files Changed

**Backend**:
- `backend/app/services/claude_service.py` - Added `generate_recipe_from_title()` function
- `backend/app/routers/recipes.py` - Added POST `/recipes/generate-from-title` endpoint
- `backend/app/routers/recipes.py` - Added `GenerateFromTitleRequest` model

**Frontend**:
- `frontend/src/components/MealCard.tsx` - Added "+" icon button and modal integration
- `frontend/src/components/GenerateFromTitleModal.tsx` - New modal component (152 lines)
- `frontend/src/lib/api.ts` - Added `GenerateFromTitleRequest` interface and `generateFromTitle()` method

### Future Enhancements

- Allow editing title before generation
- Add more generation options (cuisine type, cooking time)
- Batch generate multiple meal suggestions at once
- Show preview of similar existing recipes before generating

---

## 🔜 Sprint 3: Household Preferences & Recipe Relationships

**Status**: Phase 1 Complete ✅ (2025-12-17) | Phase 2-3 Planned
**Goal**: Enable personalized meal planning with per-person dietary preferences and recipe ratings

### User Stories

**US3.1**: Individual Dietary Preferences
- As a user, I can add dietary preferences for each household member (e.g., "lactose-intolerant", "mostly pescetarian", "no eggs")
- As a user, I can edit and save preferences as short text strings (similar to recipe tags)
- Preferences are displayed on the Household page for quick reference
- Claude considers these preferences when generating meal plans

**US3.2**: Recipe Rating System
- As a user, I can rate recipes on behalf of each household member (like 👍 / dislike 👎)
- As a user, I can see per-person ratings displayed on recipe cards
- Recipe ratings influence meal plan generation (prioritize "liked" recipes)

**US3.3**: Recipe Filtering by Household Preferences
- As a user, I can view favorite recipes per person (those they've liked)
- As a user, I can filter recipes by rating (e.g., "show recipes liked by everyone")
- As a user, I can see which recipes are most popular in the household (liked by all members)
- Recipe list shows aggregate ratings (e.g., "👍 2 | 👎 1" - 2 liked, 1 disliked)

### Technical Requirements

#### Backend Tasks

**Household Model Updates:**
- [x] **Phase 1 ✅** Update `FamilyMember` Pydantic model:
  - Add `preferences: List[str]` field (e.g., ["lactose-intolerant", "mostly pescetarian"])
  - Keep existing `allergies` and `dislikes` fields
- [ ] **Phase 2** Create `RecipeRating` Pydantic model:
  - `recipe_id: str`
  - `ratings: Dict[str, str]` (e.g., {"Andrea": "like", "Toddler": "dislike"})
  - Rating values: "like", "dislike", or null (not rated)
- [x] **Phase 1 ✅** Update household storage to persist preferences
- [ ] **Phase 2** Create separate `recipe_ratings.json` storage file

**API Endpoints:**
- [x] **Phase 1 ✅** Update `PUT /household` to accept updated preferences field
- [ ] Create `GET /recipes/ratings` endpoint (returns all recipe ratings)
- [ ] Create `POST /recipes/{recipe_id}/rating` endpoint
  - Request: `{"member_name": "Andrea", "rating": "like"}` or `{"member_name": "Andrea", "rating": "dislike"}`
  - Updates rating for specific person
  - Passing `null` for rating removes the rating
- [ ] Create `GET /recipes/favorites/{member_name}` endpoint
  - Returns recipes with "like" rating for that person
  - Sorted by recipe title or recent activity
- [ ] Create `GET /recipes/popular` endpoint
  - Returns recipes with "like" ratings from all household members (no dislikes)
  - Sorted by number of likes

**Meal Plan Integration:**
- [x] **Phase 1 ✅** Update Claude prompt to include household member preferences
- [x] **Phase 1 ✅** Add preference context: "Andrea is lactose-intolerant and mostly pescetarian"
- [ ] **Phase 2** Include recipe rating data in RAG retrieval
- [ ] **Phase 2** Prioritize recipes with "like" ratings in meal plan suggestions
- [ ] **Phase 2** Avoid recipes with "dislike" ratings unless necessary

**Data Storage:**
- [ ] Create `backend/data/recipe_ratings.json` file structure:
```json
{
  "ratings": [
    {
      "recipe_id": "recipe_001",
      "ratings": {
        "Andrea": "like",
        "Toddler": "dislike"
      }
    },
    {
      "recipe_id": "recipe_002",
      "ratings": {
        "Andrea": "like",
        "Toddler": "like"
      }
    }
  ]
}
```

#### Frontend Tasks

**Household Page Enhancements:**
- [x] **Phase 1 ✅** Add "Preferences" field to each family member
  - Text input with comma-separated parsing
  - Badge display when preferences exist
  - Placeholder: "lactose-intolerant, mostly pescetarian"
- [x] **Phase 1 ✅** Save preferences to backend on update (via Save Profile button)
- [x] **Phase 1 ✅** Display existing allergies/dislikes alongside preferences

**Recipe Rating UI:**
- [ ] Add rating component to RecipeModal
  - Show all household members with individual like/dislike buttons
  - Options: Like 👍 / Dislike 👎 / Not Rated (neutral/default state)
  - Active state highlighting (e.g., blue for like, gray for dislike)
- [ ] Display aggregate ratings on RecipeCard
  - Badge showing: "👍 2 | 👎 1" (2 liked, 1 disliked)
  - Special badge: "⭐ Family Favorite" if everyone liked it (no dislikes/neutrals)
- [ ] Add rating persistence (call rating API on button click)

**Recipe Filtering:**
- [ ] Add filter dropdown to Recipes page:
  - "All Recipes"
  - "Liked by [Member Name]" (one option per household member)
  - "Family Favorites" (liked by everyone, no dislikes)
  - "Most Popular" (highest number of likes)
- [ ] Update recipe list query based on filter selection
- [ ] Show rating badges on filtered recipes

**API Client Updates:**
- [x] **Phase 1 ✅** Update `householdAPI.update()` to include preferences (no changes needed - Pydantic auto-handled)
- [ ] **Phase 2** Add `recipesAPI.getRatings()` method
- [ ] **Phase 2** Add `recipesAPI.rateRecipe(recipeId, memberName, rating)` method
- [ ] **Phase 2** Add `recipesAPI.getFavorites(memberName)` method
- [ ] **Phase 2** Add `recipesAPI.getPopular()` method
- [x] **Phase 1 ✅** Update TypeScript interfaces for FamilyMember (added `preferences: string[]`)
- [ ] **Phase 2** Add TypeScript interface for RecipeRating

#### Testing
- [x] **Phase 1 ✅** Test preference CRUD operations per household member
- [ ] **Phase 2** Test like/dislike rating save/update for multiple members
- [ ] **Phase 2** Test removing ratings (setting to null/neutral)
- [ ] **Phase 2** Test recipe filtering returns correct results
- [ ] **Phase 3** Test "Family Favorites" filter shows only recipes liked by all members
- [x] **Phase 1 ✅** Test meal plan generation considers preferences (verified in Claude prompt)
- [ ] **Phase 2** Test aggregate rating calculation (count of likes vs dislikes)

### Acceptance Criteria

#### Phase 1 (Preferences) - ✅ Complete
- [x] Users can add/edit dietary preferences for each household member
- [x] Preferences display on Household page (as badges + editable input)
- [x] Meal plan generation considers household preferences
- [x] Preferences persist across sessions

#### Phase 2 (Ratings) - Planned
- [ ] Users can rate recipes on behalf of each family member
- [ ] Recipe cards show aggregate ratings across household
- [ ] Recipe ratings persist across sessions

#### Phase 3 (Filtering) - Planned
- [ ] Users can filter recipes by per-person favorites
- [ ] "Family Favorites" filter shows recipes liked by all members

### Design Notes

**Preferences vs. Allergies/Dislikes:**
- Allergies: Strict exclusions (safety)
- Dislikes: Strong preferences to avoid
- Preferences: Dietary patterns/guidelines (e.g., "mostly pescetarian", "low-carb")
- All three inform meal planning but with different weights

**Rating System:**
- Simple 2-point scale: Like 👍 / Dislike 👎
- Not rated = neutral/default (doesn't affect filtering or meal planning)
- "Family Favorite" = all members rated Like (no Dislike or neutral ratings)
- Aggregate display shows distribution (e.g., "👍 2 | 👎 1" means 2 liked, 1 disliked)

**Meal Plan Integration:**
- Preferences included in Claude system prompt
- Ratings influence RAG retrieval ranking
- Avoid recipes with "dislike" ratings unless necessary
- Prioritize recipes with "like" ratings for variety
- Consider "Family Favorite" recipes (liked by all) as top choices

### Implementation Priority

**Phase 1: Preferences (Simpler)**
1. Update FamilyMember model with preferences field
2. Add preference UI to Household page
3. Update meal plan prompt with preferences

**Phase 2: Recipe Ratings (More Complex)**
1. Create RecipeRating model and storage
2. Build rating UI component
3. Add rating API endpoints
4. Integrate ratings into RecipeModal and RecipeCard

**Phase 3: Advanced Filtering**
1. Add recipe filtering by ratings
2. Implement "Family Favorites" logic
3. Popular recipes algorithm

---

## 🔜 Sprint 4: Enhanced Meal Plan Customization

**Status**: Planned
**Goal**: Give users more control over meal plan generation with specific preferences and constraints

### User Stories

**US4.1**: Customize Meal Plan Generation Settings
- As a user, I can specify which days of the week to generate meals for (skip weekends, etc.)
- As a user, I can specify which meal types to include (breakfast only, dinner only, etc.)
- As a user, I can set a preference for variety vs. batch cooking

**US4.2**: Regenerate Individual Days
- As a user, I can regenerate a single day in my meal plan without regenerating the entire week
- As a user, I can lock specific days/meals and regenerate around them

**US4.3**: Swap Recipes in Meal Plan
- As a user, I can swap a recipe in the meal plan with a different recipe from my library
- The system suggests alternative recipes that meet the same constraints

### Technical Requirements

**Note**: Detailed technical requirements to be added when this sprint is prioritized.

---

## 🔜 Sprint 5: Shopping List Generation (Deferred)

**Status**: Planned (deferred)
**Goal**: Automatically generate shopping lists from meal plans, accounting for groceries already on hand

**Note**: This sprint conflicts with the primary workflow (shop first, then plan). May be redesigned as "Meal Plan → Missing Ingredients" feature instead.

### User Stories

**US5.1**: Generate Shopping List from Meal Plan
- As a user, I can generate a shopping list based on my current meal plan
- The system deducts ingredients I already have from the list
- Ingredients are grouped by category (produce, dairy, meat, pantry, etc.)

**US5.2**: Smart Quantity Aggregation
- When multiple recipes use the same ingredient, quantities are aggregated
- Common conversions are handled (e.g., "1 lb chicken" + "2 cups diced chicken")
- Overlapping portions are intelligently combined

**US5.3**: Shopping List Management
- As a user, I can check off items as I shop
- As a user, I can add additional items to the shopping list manually
- As a user, I can save the shopping list and mark groceries as "purchased"
- Purchased items automatically added to my grocery inventory

### Technical Requirements

#### Backend Tasks
- [ ] Create `ShoppingList` Pydantic model
  - `id: str`
  - `meal_plan_id: str`
  - `generated_date: date`
  - `items: List[ShoppingListItem]`
  - `custom_items: List[str]` (user-added items)
- [ ] Create `ShoppingListItem` model
  - `ingredient: str`
  - `quantity: str` (aggregated from recipes)
  - `category: str` (produce, dairy, meat, pantry, etc.)
  - `recipe_sources: List[str]` (which recipes need this ingredient)
  - `checked: bool` (for shopping)
- [ ] Create `POST /shopping-lists/generate` endpoint
  - Request: `{"meal_plan_id": "..."}`
  - Process: Parse all recipes in meal plan, aggregate ingredients
  - Deduct groceries already on hand
  - Categorize ingredients
  - Response: ShoppingList object
- [ ] Create `PUT /shopping-lists/{id}` endpoint to update checked items
- [ ] Create `POST /shopping-lists/{id}/mark-purchased` endpoint
  - Adds all unchecked items to grocery inventory
  - Marks shopping list as complete
- [ ] Implement ingredient aggregation logic
  - Simple string matching for exact matches
  - Quantity parsing and aggregation (cups, lbs, etc.)
  - Category classification (basic heuristics or manual tags)
- [ ] Add shopping list storage to data manager

#### Frontend Tasks
- [ ] Create `ShoppingList.tsx` page
  - Display shopping list grouped by category
  - Checkboxes for each item
  - Shows which recipes need each ingredient (expandable)
- [ ] Add "Generate Shopping List" button to Meal Plans page
  - Appears after meal plan is generated
  - Navigates to shopping list page
- [ ] Add "Add Custom Item" input to shopping list
- [ ] Add "Mark as Purchased" button
  - Shows confirmation: "This will add N items to your grocery inventory"
  - Calls mark-purchased endpoint
- [ ] Update navigation to include Shopping Lists
- [ ] Show shopping list history (past lists linked to meal plans)
- [ ] Update API client with shopping list endpoints

#### Testing
- [ ] Test shopping list generation with simple meal plan
- [ ] Test ingredient aggregation for duplicate ingredients
- [ ] Test grocery deduction (items already owned not listed)
- [ ] Test category grouping
- [ ] Test mark-purchased flow updates grocery inventory

### Acceptance Criteria
- [ ] Users can generate shopping lists from meal plans
- [ ] Ingredients are grouped by category (produce, dairy, meat, etc.)
- [ ] Duplicate ingredients are aggregated with combined quantities
- [ ] Items already in grocery inventory are excluded from list
- [ ] Users can check off items while shopping
- [ ] Users can add custom items to shopping list
- [ ] "Mark as Purchased" adds items to grocery inventory
- [ ] Shopping list history is accessible

---

## 🔜 Sprint 6: Recipe Library Expansion Tools

**Status**: Planned
**Goal**: Make it easier to add and manage recipes in the library

### User Stories

**US6.1**: Recipe Creation Wizard
- As a user, I can add new recipes through a guided form
- The form auto-suggests tags based on ingredients and cooking method
- Required appliances are auto-detected from instructions

**US6.2**: Bulk Recipe Import
- As a user, I can paste multiple recipes in a structured format (JSON/CSV)
- The system validates and imports all recipes at once

**US6.3**: Recipe Editing and Versioning
- As a user, I can edit existing recipes
- Changes are saved with a timestamp
- AI-generated recipes can be edited to become "manual" recipes

**US6.4**: Recipe Search and Filtering
- As a user, I can filter recipes by tags, appliances, cooking time
- As a user, I can see which recipes are AI-generated vs. manually added

### Technical Requirements

#### Backend Tasks
- [ ] Create `PUT /recipes/{id}` endpoint (currently missing)
- [ ] Create `DELETE /recipes/{id}` endpoint
- [ ] Add auto-tagging suggestions service
  - Analyze ingredients to suggest "toddler-friendly", "quick", etc.
  - Parse instructions to detect appliances
- [ ] Create `POST /recipes/bulk-import` endpoint
  - Accepts array of recipes
  - Validates each recipe
  - Returns success/failure for each
- [ ] Add recipe search endpoint `GET /recipes/search`
  - Query parameters: tags, appliances, max_time, is_generated
- [ ] Update Recipe model with `created_at` and `updated_at` timestamps
- [ ] Update data manager to handle recipe updates

#### Frontend Tasks
- [ ] Create `RecipeForm.tsx` component
  - Multi-step wizard (basic info → ingredients → instructions → tags)
  - Auto-suggest tags based on ingredients
  - Auto-detect appliances from instructions
- [ ] Add "Add Recipe" button to Recipes page
  - Opens RecipeForm in modal or new page
- [ ] Add edit functionality to RecipeModal
  - Shows edit button for all recipes
  - Opens RecipeForm pre-filled with existing data
- [ ] Add delete confirmation dialog
- [ ] Create bulk import UI
  - Text area for pasting JSON/CSV
  - Validation feedback
  - Import progress indicator
- [ ] Add filter panel to Recipes page
  - Tag checkboxes
  - Appliance checkboxes
  - Cooking time slider
  - "AI Generated" toggle
- [ ] Update RecipeCard to show created/updated dates

#### Testing
- [ ] Test recipe creation through form
- [ ] Test auto-tagging suggestions are helpful
- [ ] Test recipe editing preserves all fields
- [ ] Test bulk import with valid and invalid data
- [ ] Test filtering returns correct results
- [ ] Test delete removes recipe and updates Chroma DB

### Acceptance Criteria
- [ ] Users can add new recipes through guided form
- [ ] Auto-suggestions for tags work reasonably well
- [ ] Users can edit existing recipes
- [ ] Users can delete recipes (with confirmation)
- [ ] Bulk import handles 10+ recipes at once
- [ ] Recipe search/filter returns relevant results
- [ ] AI-generated recipes can be edited to remove "generated" flag

---

## 🔜 Sprint 7: Meal Plan History & Favorites

**Status**: Planned
**Goal**: Allow users to save, review, and reuse successful meal plans

### User Stories

**US7.1**: Meal Plan History
- As a user, I can view all previously generated meal plans
- Each meal plan shows the date range and recipes used
- I can view the full details of past meal plans

**US7.2**: Favorite Meal Plans
- As a user, I can mark a meal plan as "favorite"
- I can quickly regenerate favorite meal plans
- Favorite plans are prioritized in history view

**US7.3**: Meal Plan Templates
- As a user, I can save a meal plan as a template
- Templates can be used as starting points for new plans
- I can customize templates before generating

### Technical Requirements

#### Backend Tasks
- [ ] Update MealPlan model with metadata fields
  - `created_at: datetime`
  - `is_favorite: bool`
  - `is_template: bool`
  - `template_name: Optional[str]`
- [ ] Create `GET /meal-plans` endpoint to list all meal plans
  - Query params: `is_favorite`, `is_template`, `start_date`, `end_date`
  - Returns list of meal plan summaries
- [ ] Create `GET /meal-plans/{id}` endpoint for full meal plan details
- [ ] Create `PUT /meal-plans/{id}/favorite` endpoint to toggle favorite
- [ ] Create `POST /meal-plans/{id}/save-as-template` endpoint
  - Request: `{"template_name": "Weekly Family Dinner Plan"}`
- [ ] Create `POST /meal-plans/from-template` endpoint
  - Request: `{"template_id": "...", "week_start_date": "2025-12-10"}`
  - Regenerates plan based on template structure
- [ ] Update data manager to store meal plans with metadata
- [ ] Implement meal plan listing with pagination

#### Frontend Tasks
- [ ] Create `MealPlanHistory.tsx` page
  - List view of all meal plans (most recent first)
  - Shows date range, number of meals, favorite status
  - Click to expand and view full plan
- [ ] Add "Favorite" star icon to meal plans
  - Toggle favorite status
  - Visual indicator on MealPlanView
- [ ] Add "Save as Template" button to meal plans
  - Opens dialog to name the template
- [ ] Create "Templates" section in Meal Plans page
  - Shows saved templates
  - "Use Template" button to generate from template
- [ ] Add navigation link to "History" page
- [ ] Update API client with meal plan history endpoints

#### Testing
- [ ] Test meal plan history displays all plans
- [ ] Test favorite toggle persists across sessions
- [ ] Test template creation and usage
- [ ] Test template generation with different start dates
- [ ] Test pagination for users with many meal plans

### Acceptance Criteria
- [ ] Users can view all previously generated meal plans
- [ ] Users can mark meal plans as favorites
- [ ] Favorites appear at the top of history
- [ ] Users can save meal plans as reusable templates
- [ ] Templates can be used to generate new meal plans
- [ ] Meal plan history is paginated for performance

---

## Future Sprint Ideas (Backlog)

### Sprint 8: Nutrition Tracking
- Add nutritional information to recipes
- Show nutrition summary for meal plans
- Filter recipes by nutritional criteria (high protein, low carb, etc.)

### Sprint 9: Calendar Integration
- Sync meal plans with Google Calendar
- Set reminders for meal prep
- Adjust plans based on calendar events

### Sprint 10: Recipe Scaling
- Scale recipe servings up or down
- Adjust ingredient quantities automatically
- Save scaled versions as new recipes

### Sprint 11: Cost Optimization
- Add cost estimates to recipes
- Generate budget-friendly meal plans
- Track grocery spending over time

### Sprint 12: Mobile Optimization
- Responsive design improvements
- Offline support for grocery lists
- Quick add via mobile camera (OCR for ingredients)

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
- [ ] Documentation updated (README, PRODUCT_REQUIREMENTS, CHANGELOG)
- [ ] User acceptance testing completed
- [ ] Code reviewed and merged

### Sprint Retrospective Template
After each sprint, document:
1. **What went well**: Successes and wins
2. **What didn't go well**: Challenges and blockers
3. **What to improve**: Action items for next sprint
4. **Technical learnings**: New patterns, libraries, or approaches discovered

---

## Notes

- This sprint plan is a living document - adjust priorities based on user feedback
- Each sprint should ship a usable feature, not just code
- Testing and documentation are part of the sprint, not afterthoughts
- Sprint numbering continues from Sprint 1 (Dynamic Recipe Generation)
