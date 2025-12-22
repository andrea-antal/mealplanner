# Sprint History - Completed Features

This document archives all completed sprints from the Meal Planner project. For active and planned sprints, see [SPRINT_PLAN.md](SPRINT_PLAN.md).

---

## 🚨 2025-12-21 INCIDENT: Data Recovery & Test Isolation

**Type**: Critical Bug Fix | **Priority**: P0 | **Status**: Complete | **Duration**: 1 hour

### Summary
Recovered household data wiped by test suite, implemented test isolation framework to prevent recurrence.

### Root Cause
Test file `backend/tests/test_data_manager.py::test_save_and_load_household_profile()` line 32 overwrote production `household_profile.json` with test fixture, replacing family data (Andrea, Adam, Nathan) with generic "Test Person".

### Resolution Steps
1. **Investigation**: Analyzed Git history, found original data in commit e685759 (Dec 17)
2. **Backup**: Saved wiped version as `household_profile.json.WIPE_BACKUP_2025-12-21`
3. **Recovery**: Restored from commit e685759 (safer choice - preserved Andrea's allergy)
4. **Validation**: Verified all 3 family members restored with complete dietary data
5. **Test Isolation**: Created conftest.py fixture framework to isolate test data
6. **Code Updates**: Modified 3 tests to use `temp_data_dir` fixture

### Files Modified
- `backend/data/household_profile.json` (RESTORED from Git)
- `backend/data/household_profile.json.WIPE_BACKUP_2025-12-21` (NEW backup)
- `backend/tests/conftest.py` (NEW test isolation framework)
- `backend/tests/fixtures/household_test.json` (NEW test data)
- `backend/tests/test_data_manager.py` (UPDATED 3 tests)
- `docs/CHANGELOG.md` (incident documentation)
- `docs/SPRINT_HISTORY.md` (this entry)

### Prevention Measures
**Test Isolation**: All data-modifying tests now use isolated fixtures and temporary directories. Tests can no longer overwrite production data.

### Data Recovery Decision
- ✅ **Used commit e685759** (Dec 17): Has Andrea's critical allergy to raw stone/pit fruit
- ❌ **Rejected blob 9e282ed** (Dec 20): Had newer preferences but LOST Andrea's allergy (safety risk)

### Lesson Learned
Tests must use isolated fixtures (`temp_data_dir`) and NEVER modify production files. Implemented conftest.py pattern for all future tests.

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

## ✅ Sprint 2: Smart Grocery Management (Complete)

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

### Implementation Summary

**Backend**:
- Created `GroceryItem` Pydantic model with date fields and validation
- New `/groceries` REST API with individual item operations (POST, DELETE)
- `GET /groceries/expiring-soon` endpoint with configurable days_ahead
- Data migration logic for backward compatibility with string format
- Updated data manager to handle GroceryItem objects

**Frontend**:
- Completely redesigned Groceries page with enhanced form
- Progressive disclosure pattern (Advanced button toggles date fields)
- TypeScript interfaces updated for GroceryItem
- New groceriesAPI client methods
- Expiring soon banner with real-time updates (refetch every 60s)
- Color-coded expiry badges (red/yellow/green)
- Smart expiry text ("Expires tomorrow", "X days until expiry")
- Purchase date display with calendar icons

**Meal Plan Integration**:
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

---

## ✅ Sprint 2.1: Critical Bug Fixes - Chroma DB Integration (Complete)

**Status**: Complete (2025-12-10)
**Goal**: Fix recipe embedding and deletion to ensure Chroma vector database stays synchronized with recipe storage

### Issues Fixed

**Bug 1: Generated Recipes Not Embedded in Chroma**
- Problem: When users generate recipes, they're saved to JSON but NOT added to Chroma
- Impact: Generated recipes can never appear in meal plans (RAG queries Chroma only)
- Solution: Added `embed_recipes([recipe])` call after recipe generation

**Bug 2: Recipe Deletion Creates Orphaned Chroma Entries**
- Problem: Deleting recipes removes JSON but leaves Chroma entries
- Impact: Orphaned entries appear in RAG results, pointing to non-existent recipes
- Solution: Added Chroma deletion logic to `delete_recipe()` function

### Implementation Summary

1. **Recipe Creation Fix**: Added embedding step to recipe generation endpoint
2. **Recipe Deletion Fix**: Added Chroma cleanup to deletion function
3. **Sync Utility**: Created `sync_chroma_with_storage()` for manual cleanup
4. **Admin Endpoint**: POST `/recipes/admin/sync-chroma` for manual synchronization

**Verification Results:**
- Initial sync: 1 orphaned entry removed, 4 missing recipes added
- All 7 recipes now synchronized between JSON storage and Chroma DB
- Second sync: 0 orphaned, 0 missing - confirms full synchronization

---

## ✅ Sprint 2.2: Recipe Generation from Meal Plan Suggestions (Complete)

**Status**: Complete (2025-12-11)
**Goal**: Allow users to generate full recipes from meal plan suggestions that don't have associated recipe_id

### Feature Overview

During meal plan generation, Claude often suggests meals without linking them to existing recipes (e.g., "Roasted butternut squash soup"). This sprint adds a "+" icon to these meal cards that generates a complete recipe from the suggestion.

### Implementation

**Frontend:**
- Added "+" icon button to MealCard for meals without recipe_id
- Created GenerateFromTitleModal component
- Automatic recipe modal opening after generation

**Backend:**
- New `generate_recipe_from_title()` function in Claude service
- POST `/recipes/generate-from-title` endpoint
- Duplicate title detection (returns 409 Conflict)

**Key Features:**
- Visual indicator: "+" icon appears on meals without recipe_id
- Duplicate prevention: Returns 409 if title already exists
- Automatic Chroma embedding: Generated recipes immediately available for RAG
- Seamless UX: Recipe modal opens automatically after generation

---

## ✅ Sprint 3 Phase 1: Individual Dietary Preferences (Complete)

**Status**: Complete (2025-12-17)
**Goal**: Allow household members to have individual dietary preferences that Claude considers during meal planning

### What Was Built

**Backend** (38 lines total):
- Extended `FamilyMember` model with `preferences: List[str]` field
- Backward compatibility: `default_factory=list` auto-upgrades old data
- Updated `prepare_context_for_llm()` to include preferences in context dict
- Enhanced Claude system prompt to acknowledge dietary preferences
- Updated Claude user prompt: preferences appear inline with allergies/dislikes

**Frontend**:
- Extended `FamilyMember` TypeScript interface with `preferences: string[]`
- Added editable input field on Household page with comma-separated parsing
- Badge display when preferences exist
- Real-time state updates via `updateMemberPreferences()` helper
- Save via existing "Save Profile" button

**Files Modified**:
- `backend/app/models/household.py` (+4 lines)
- `backend/app/services/rag_service.py` (+1 line)
- `backend/app/services/claude_service.py` (+10 lines)
- `frontend/src/lib/api.ts` (+1 line)
- `frontend/src/pages/Household.tsx` (+22 lines)

**Example Claude Prompt Output**:
```
Before: - Andrea (adult): No allergies. Dislikes: cilantro
After:  - Andrea (adult): No allergies. Dislikes: cilantro. Preferences: lactose-intolerant, mostly pescetarian, low-carb
```

**Impact**: Claude now receives nuanced dietary patterns (e.g., "mostly pescetarian") in addition to hard constraints (allergies). Enables smarter meal suggestions without strict exclusions.

**Test Results**: 5/5 tests passed
- ✅ Backend model has preferences field
- ✅ All 7 preferences appear in Claude prompt
- ✅ API accepts and returns updated preferences
- ✅ Preferences persist in JSON across reloads
- ✅ Frontend TypeScript compiles successfully
