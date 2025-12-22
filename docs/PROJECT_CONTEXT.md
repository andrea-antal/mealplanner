# Meal Planner with RAG - Project Context

## Project Philosophy

**Ship fast, iterate quickly.** This project prioritizes:
- Working software over perfect architecture
- Rapid iteration over extensive planning
- Readability over cleverness
- Functional completeness over feature bloat

## The Problem

Generate weekly meal plans tailored to complex household constraints:
- Toddler requiring daycare lunches and snacks (different rules than home meals)
- Dietary preferences and restrictions across family members
- What groceries are currently available
- Picky eaters and food preferences
- Changing routines (illness, schedule changes)

This is a multi-constraint optimization problem with real-world messiness and edge cases.

## Current Scope

### Core Workflow
**Primary User Persona**: Busy mother who shops for fresh/available/good-deal groceries first, then plans meals around what she bought.

**Workflow**: Shop → Add Groceries (with expiry dates) → Generate Meal Plan → Cook

### Core Features
1. Input and store household dietary constraints/preferences
2. Manage groceries with purchase dates and expiry tracking
3. Generate weekly meal plans that prioritize expiring ingredients
4. RAG retrieval from curated recipe database
5. Dynamic recipe generation from selected ingredients

### Tech Stack

- **Frontend**: React 18 + TypeScript
  - Vite, shadcn-ui, TailwindCSS, React Router v6, TanStack Query
- **Backend**: FastAPI (Python) + Pydantic
- **Vector DB**: Chroma (local, open source)
- **LLM**: Claude Opus 4 (Anthropic)
- **Deployment**: Vercel (frontend) + Render (backend)

## Out of Scope

- Recipe scraping/import from URLs
- Grocery delivery integration
- Calendar/schedule awareness
- Multi-user household support
- Mobile app
- Production-grade error handling

## Architecture Principles

1. **RAG Pipeline**: Embeddings → Vector storage → Retrieval → Context construction → LLM generation
2. **Prompt Engineering**: Structured prompts with JSON schemas for reliable outputs
3. **Separation of Concerns**: Retrieval and planning as distinct functions, ready for multi-agent refactoring
4. **API-First Design**: Backend exposes RESTful API, frontend consumes it cleanly

---

## Development Status

### ✅ Phase 1 Complete: Backend Foundation
**Timestamp**: 2025-12-03 10:31 AM PST
**Duration**: ~1 hour
**Status**: All checkpoints passed, ready for Phase 2

**What was built**:
- FastAPI backend with Pydantic models (Recipe, HouseholdProfile, MealPlan)
- JSON data layer with abstraction for future DB migration
- Configuration management with environment variables
- Unit tests for core data operations (8 tests passing)
- Sample data: 3 recipes, household profile, groceries list
- Health check endpoint verified working

**Key decisions**:
- FastAPI over Flask (better for API-first, type safety)
- Pydantic 2.10.3 (Python 3.13 compatible)
- JSON storage with data_manager abstraction (easy DB migration later)
- Lightweight testing: checkpoints + critical unit tests only
- Gating mechanism working: prevented moving forward with bugs

**Files created**:
- `backend/app/models/` - Pydantic models
- `backend/app/data/data_manager.py` - JSON I/O layer
- `backend/app/main.py` - FastAPI app
- `backend/tests/test_data_manager.py` - Unit tests

### ✅ Phase 2 Complete: RAG Pipeline
**Timestamp**: 2025-12-03 11:03 AM PST
**Duration**: ~1 hour (10:45 AM - 11:03 AM)
**Status**: All checkpoints passed, ready for Phase 3

**What was built**:
- Chroma vector database integration with persistent storage
- Recipe embedding system using semantic search (all-MiniLM-L6-v2 model)
- RAG service for retrieving relevant recipes based on household constraints
- Context preparation for LLM prompts
- Seed script to populate Chroma with recipe embeddings
- Test scripts validating semantic search accuracy

**Key decisions**:
- PersistentClient for disk-based Chroma storage (vs in-memory)
- NumPy <2.0.0 pinned for ChromaDB 0.4.18 compatibility
- Simple text embedding: "title - tags - ingredients" (optimize later if needed)
- No hard filters on appliances yet (insufficient recipe data for v0.1)
- Metadata stored for future filtering (prep time, appliances, tags)

**Files created**:
- `backend/app/data/chroma_manager.py` - Vector DB operations
- `backend/app/services/rag_service.py` - Recipe retrieval logic
- `backend/scripts/seed_recipes.py` - Recipe embedding script
- `backend/scripts/test_query.py` - Semantic search validation
- `backend/scripts/test_rag_service.py` - End-to-end RAG test

**Validation results**:
- 4 recipes successfully embedded in Chroma
- Semantic search accuracy verified:
  - "quick chicken dinner" → One-Pot Chicken and Rice (1.05 distance)
  - "toddler breakfast" → Scrambled Eggs (0.75 distance)
  - "easy pasta meal" → Pasta (0.66 distance)
- Context preparation working: bundles household + groceries + recipes

### ✅ Phase 3 Complete: Claude Integration
**Timestamp**: 2025-12-03 11:20 AM PST
**Duration**: ~15 minutes (11:05 AM - 11:20 AM)
**Status**: All checkpoints passed, end-to-end pipeline working

**What was built**:
- Claude API service with prompt engineering for meal planning
- Meal plan service orchestrating RAG + Claude generation
- End-to-end test script validating full pipeline
- Successful 7-day meal plan generation with 23 meals

**Key decisions**:
- Upgraded Anthropic SDK to 0.39.0+ for Messages API support
- Selected Claude Opus 4 model (most capable for complex constraints)
- Structured prompt engineering (system + user prompts with JSON schema)
- JSON parsing handles markdown-wrapped responses from LLM
- Temperature 0.7 for creativity while maintaining consistency

**Files created**:
- `backend/app/services/claude_service.py` - Claude API integration
- `backend/app/services/meal_plan_service.py` - Main orchestration
- `backend/scripts/test_meal_plan_generation.py` - E2E validation

**Validation results**:
- ✅ Full pipeline successful: Load data → RAG → Context → Claude → MealPlan
- ✅ Generated realistic 7-day plan with variety and leftovers strategy
- ✅ Meal plan saved to JSON with proper Pydantic validation
- ✅ Notes on each meal explain reasoning and grocery usage

### ✅ Phase 4 Complete: API Endpoints
**Timestamp**: 2025-12-03 11:30 AM PST
**Duration**: ~10 minutes (11:20 AM - 11:30 AM)
**Status**: All checkpoints passed, v0.1 backend complete

**What was built**:
- REST API with 3 resource routers (meal plans, household, recipes)
- 11 endpoints for full CRUD operations
- Request/response validation with Pydantic models
- Auto-generated Swagger UI documentation at `/docs`
- Tested end-to-end meal plan generation via API

**Key decisions**:
- RESTful design with standard HTTP methods
- Pydantic models for all request/response validation
- HTTPException for consistent error handling
- No DELETE operations in v0.1 (safety first)
- Swagger UI for interactive API testing

**Files created**:
- `backend/app/routers/meal_plans.py` - Meal plan generation endpoint
- `backend/app/routers/household.py` - Profile and grocery management
- `backend/app/routers/recipes.py` - Recipe CRUD operations

**Validation results**:
- ✅ All 11 endpoints tested and working
- ✅ POST /meal-plans/generate creates 7-day plans
- ✅ GET /recipes returns recipe library
- ✅ PUT /household/groceries updates shopping list
- ✅ API documentation accessible at localhost:8000/docs

---

## 🎯 v0.1 Backend Complete!

**Total Development Time**: ~2.5 hours (10:00 AM - 12:30 PM PST)
**Phases Completed**: 4 of 4 (Backend Foundation, RAG Pipeline, Claude Integration, API Endpoints)

**Functional System:**
- ✅ RAG-powered meal plan generation working end-to-end
- ✅ REST API for all operations
- ✅ 4 sample recipes embedded in vector database
- ✅ Household profile and grocery management
- ✅ Claude Opus 4 generating realistic 7-day meal plans
- ✅ Auto-generated API documentation

**Ready For:**
- Deployment to production (Render for backend)
- Frontend development (optional - API-first design complete)
- Recipe library expansion (add 20-30 real family recipes)
- Portfolio case study documentation

**Next Steps (Optional v0.2):**
- ~~Frontend UI (React or Lovable)~~ ✅ Complete
- Deployment to Render + Vercel
- Recipe library expansion
- Advanced features (shopping list generation, recipe scaling)

---

### ✅ Phase 5 Complete: Frontend Integration
**Timestamp**: 2025-12-03 3:45 PM PST
**Duration**: ~15 minutes
**Status**: Frontend merged from pixel-perfect-clone repo

**What was built**:
- Cloned Lovable-generated frontend from https://github.com/dreachan/pixel-perfect-clone
- Merged frontend/ directory into mealplanner monorepo
- Created comprehensive frontend README with tech stack details
- Updated main README and PROJECT_CONTEXT with frontend status
- Documented architecture alignment (Lovable → React matches IMPLEMENTATION_PLAN)

**Key decisions**:
- Used Lovable to build frontend (AI-powered UI builder per original plan)
- Lovable generates production-ready React + TypeScript + shadcn-ui code
- Kept original Lovable repo separate for continued Lovable edits
- Frontend merged as monorepo structure: mealplanner/{frontend, backend, docs}
- Removed .git directory from frontend/ to integrate with main repo

**Files created/updated**:
- `frontend/` - Full React application (5 pages, shadcn-ui components, routing)
- `frontend/README.md` - Comprehensive frontend documentation
- `README.md` - Updated with frontend tech stack and completion status
- `docs/PROJECT_CONTEXT.md` - Added Phase 5 completion details

**Frontend structure**:
- 5 pages: Index (home), MealPlans, Recipes, Household, Groceries
- 50+ shadcn-ui components (buttons, cards, forms, dialogs, etc.)
- React Router v6 for client-side routing
- TanStack Query for server state management
- React Hook Form + Zod for form validation
- Fully typed with TypeScript

**Validation checklist**:
- ✅ Frontend files copied to mealplanner/frontend/
- ✅ .git directory removed (no nested repos)
- ✅ README updated with accurate tech stack details
- ✅ Architecture alignment verified (Lovable output matches original plan)
- ✅ Documentation updated across README.md, PROJECT_CONTEXT.md, frontend/README.md

---

## 🎯 v0.1 Backend + Frontend Complete!

**Total Development Time**:
- Backend: ~2.5 hours (10:00 AM - 12:30 PM PST)
- Frontend (Lovable): Built separately, merged in 15 min
- **Total**: ~3 hours of backend dev + Lovable UI building

**Phases Completed**: 6 of 8
1. ✅ Backend Foundation
2. ✅ RAG Pipeline
3. ✅ Claude Integration
4. ✅ API Endpoints
5. ✅ Frontend (Lovable)
6. ✅ API Integration (ALL pages) - COMPLETE!
7. ⏭️ Recipe Library (future)
8. ⏭️ Deployment (future)

**Ready For:**
- End-to-end user flow testing
- Recipe library expansion (add real family recipes)
- Deployment to production (Render + Vercel)
- Home page stats integration

---

### ✅ Phase 6 Complete: Full Frontend-Backend API Integration
**Timestamp**: 2025-12-03 4:45 PM PST
**Duration**: ~1.5 hours total (3:15 PM - 4:45 PM)
**Status**: All pages fully connected to backend

**What was built:**
- API client library with TypeScript types (`frontend/src/lib/api.ts`)
- React Query integration for server state management on all pages
- **Household page**: Full profile management with save functionality
- **Groceries page**: Add/remove items with backend persistence
- **Recipes page**: Display recipe library from backend with search
- **Meal Plans page**: Generate meal plans via backend API
- Updated all components to use API types (RecipeCard, RecipeModal, DayCard, MealCard)
- Updated daycare rules to hardcoded requirements ("No chocolate", "No nuts")
- Complete error handling and loading states across all pages

**Key decisions:**
- Backend is source of truth - frontend uses snake_case to match Python conventions
- React Query for automatic caching and optimistic updates across all pages
- Centralized API client with typed functions for all endpoints
- Toast notifications for user feedback on save/error
- Manual save pattern for Household and Groceries (user controls when to persist)
- Generate-on-demand pattern for Meal Plans
- Hardcoded daycare rules for v0.1 (not user-editable)

**Files created/updated:**
- `frontend/src/lib/api.ts` - Complete API client (200+ lines)
- `frontend/src/pages/Household.tsx` - Connected to real API via React Query
- `frontend/src/pages/Groceries.tsx` - Connected to backend with save button
- `frontend/src/pages/Recipes.tsx` - Fetch and display recipes from backend
- `frontend/src/pages/MealPlans.tsx` - Generate meal plans via API
- `frontend/src/components/RecipeCard.tsx` - Updated to API Recipe type
- `frontend/src/components/RecipeModal.tsx` - Updated for API data structure
- `frontend/src/components/DayCard.tsx` - Updated to API Day type
- `frontend/src/components/MealCard.tsx` - Updated to API Meal type
- All TypeScript types aligned with backend Pydantic models

**Validation results:**
- ✅ Household page: Loads, edits, saves profile data
- ✅ Groceries page: Fetch, add, remove, save all working
- ✅ Recipes page: Display all recipes, search, view details in modal
- ✅ Meal Plans page: Generate new plans, display 7-day calendar
- ✅ All components using API types with snake_case fields
- ✅ Loading states show during API calls
- ✅ Error handling displays helpful messages
- ✅ TypeScript compiles with no errors
- ✅ All mock data dependencies removed

---

### ✅ Sprint 1 Complete: Dynamic Recipe Generation
**Timestamp**: 2025-12-04 (completed in previous session)
**Status**: Released to production

**What was built:**
- POST `/recipes/generate` endpoint for AI recipe generation from ingredients
- DynamicRecipeModal component with ingredient selection and portion inputs
- "Cook with Selected" feature on Groceries page
- Claude AI integration for generating custom recipes
- Navigation flow from Groceries → Recipes with auto-open modal

**Key features:**
- Select ingredients from grocery list
- Specify optional portions (e.g., "2 cups", "1 lb")
- Choose meal type (breakfast, lunch, dinner, snack)
- Set servings and max cooking time
- AI generates recipe and saves to library

**Files created:**
- `frontend/src/components/DynamicRecipeModal.tsx`
- Backend endpoint already existed (POST /recipes/generate)
- Updated `frontend/src/pages/Groceries.tsx` with selection UI

**Validation results:**
- ✅ Ingredients selection with checkboxes working
- ✅ Recipe generation via Claude AI successful
- ✅ Generated recipes saved to backend
- ✅ Navigation to Recipes page with auto-open modal
- ✅ All validation and error handling in place

---

### ✅ Sprint 1.1-1.3 Complete: Enhancements & Bug Fixes
**Completed**: 2025-12-04 to 2025-12-09

**Summary of improvements:**
- Cuisine type selection for recipe generation
- Recipe regeneration with confirmation dialog
- Meal plan generation bug fixes (null recipe_id support)
- Clickable recipe titles in meal plan
- localStorage persistence for meal plans
- Configurable Claude model via MODEL_NAME env var
- Improved RecipeModal layout with buttons at bottom

**See [SPRINT_PLAN.md](SPRINT_PLAN.md) for detailed implementation notes.**

---

## Current State & Next Steps

### What's Working Now (v0.3 - Sprint 2 Complete)
- ✅ Full meal plan generation with RAG-powered recipe retrieval
- ✅ Dynamic recipe generation from selected ingredients (with cuisine selection)
- ✅ Recipe library management with AI-generated recipes
- ✅ Meal plan persistence (localStorage)
- ✅ Clickable recipe titles in meal plans
- ✅ Configurable Claude model for cost optimization
- ✅ **Smart Grocery Management with expiry tracking**
  - Grocery items with purchase dates and expiry dates
  - Visual expiry indicators (red/yellow/green badges)
  - "Expiring Soon" banner for items expiring within 24 hours
  - Progressive disclosure form (simple by default, advanced on demand)
  - Individual item operations (add, delete)
  - Expiry-aware meal planning (Claude prioritizes expiring ingredients)

### Recent Updates (Sprint 2)

**Backend Changes**:
- Created `GroceryItem` Pydantic model with date fields and validation
- New `/groceries` REST API with individual item operations
- Data migration logic for backward compatibility
- Enhanced Claude prompts with ⚠️ "USE SOON" markers for expiring items
- RAG service updated to extract GroceryItem names for semantic search

**Frontend Changes**:
- Completely redesigned Groceries page with enhanced form
- TypeScript interfaces updated for GroceryItem
- New groceriesAPI client methods
- Expiring soon banner with real-time updates
- Color-coded expiry badges with smart text ("Expires tomorrow", "X days until expiry")
- Purchase date display with calendar icons

**Data Model**:
```typescript
interface GroceryItem {
  name: string;
  date_added: string;        // Auto-set
  purchase_date?: string;    // Optional
  expiry_type?: 'expiry_date' | 'best_before_date';
  expiry_date?: string;      // Optional
}
```

---

### ✅ Sprint 3 Phase 2 Complete: Recipe Rating System
**Timestamp**: 2025-12-18
**Duration**: ~4 hours
**Status**: ✅ Fully implemented and tested

**Goal**: Allow household members to rate recipes (👍 like / 👎 dislike) to personalize meal plan generation.

**What was built**:

**Backend** (~130 lines):
- Created `RecipeRating` Pydantic model with validation
- Added rating data manager functions (`save_recipe_rating`, `get_recipe_rating`, `delete_recipe_rating`)
- Implemented RESTful API endpoints: `POST /recipes/{id}/rating` and `GET /recipes/{id}/ratings`
- Updated recipe deletion to cascade-delete ratings
- Integrated ratings into meal plan generation via Claude prompt context

**Frontend** (~110 lines):
- Created `RecipeRating` component with thumbs up/down UI
- Added rating UI to `RecipeModal` (full interaction panel)
- Added aggregate rating badges to `RecipeCard` (👍 2 | 👎 1)
- Implemented toggle behavior (click same button to remove rating)
- Added API client functions with React Query mutations

**Test Results**:
- ✅ Phase 2.0 test validated prompt-based approach works effectively
- ✅ Claude prioritized liked recipes and avoided disliked ones
- ✅ Token usage: ~5,132 tokens (2.5% of 200k limit)
- ✅ "Simple Pasta" (all liked) appeared twice in generated meal plan
- ✅ "Chinese Stir-Fry" (majority disliked) correctly avoided

**Key Decisions**:
1. Prompt-based integration (simpler than metadata filtering)
2. Majority rule conflict resolution (more likes than dislikes = include)
3. Separate `recipe_ratings.json` storage
4. Two-level UI (RecipeCard overview + RecipeModal detail)
5. Toggle UX for rating removal

**Impact**: Meal plans now intelligently prioritize household-liked recipes while avoiding majority-disliked ones, creating a personalized feedback loop.

---

### ✅ Sprint 3 Phase 1 Complete: Individual Dietary Preferences
**Timestamp**: 2025-12-17
**Duration**: ~3 hours
**Status**: ✅ All tests passed, Phase 2 (Ratings) complete

**Goal**: Allow household members to have individual dietary preferences that Claude considers during meal planning (e.g., "lactose-intolerant", "mostly pescetarian", "low-carb").

**What was built**:

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
- `backend/app/models/household.py` (+4)
- `backend/app/services/rag_service.py` (+1)
- `backend/app/services/claude_service.py` (+10)
- `frontend/src/lib/api.ts` (+1)
- `frontend/src/pages/Household.tsx` (+22)

**Key Technical Decision: Context Serialization**
- Issue: Adding field to Pydantic model doesn't auto-include it in LLM context
- Root cause: `prepare_context_for_llm()` manually builds family_members dict
- Solution: Explicitly added `"preferences": member.preferences` to context
- Learning: Manual dict construction requires updates in multiple places

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

**Next**: Phase 2 (Recipe Rating System) - Add 👍/👎 ratings per household member, integrate into meal plan generation.

---

### What's Next: Future Sprints

**Potential Future Work**:
- Navigation badge for expiring items count
- Sorting/filtering groceries by expiry date
- Batch operations (clear all, mark as used)
- Shopping list generation from meal plan
- Recipe suggestions based on expiring items

See [SPRINT_PLAN.md](SPRINT_PLAN.md) for full sprint history and technical details.
