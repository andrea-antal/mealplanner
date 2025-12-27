---
**Summary**: Original 8-phase implementation plan from project inception (v0.1). Contains backend, RAG pipeline, Claude integration, and API endpoints. Historical reference only.
**Last Updated**: 2025-12-03
**Status**: Archived
**Archived**: 2025-12-25
**Reason**: Original implementation complete (Phases 1-6); now historical planning document
**Read This If**: You want to understand the original project architecture and phased approach
---

# Meal Planner v0.1 - Implementation Plan

## Project Overview
Build a RAG-powered meal planning application that generates weekly meal plans based on household constraints, available groceries, and cooking preferences.

**Tech Stack:**
- Backend: FastAPI (Python)
- Frontend: Lovable/Figma Make (or React fallback)
- Vector DB: Chroma (recipe embeddings)
- User Data: JSON files
- LLM: Claude API
- Deployment: Vercel (frontend) + Render (backend)

---

## Architecture Design

### Directory Structure
```
mealplanner/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI app entry point
│   │   ├── config.py                  # Configuration & environment variables
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── recipe.py              # Recipe Pydantic models
│   │   │   ├── household.py           # Household profile models
│   │   │   ├── meal_plan.py           # Meal plan models
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── rag_service.py         # RAG pipeline (retrieve_relevant_context)
│   │   │   ├── meal_plan_service.py   # Meal plan generation (generate_meal_plan)
│   │   │   ├── recipe_service.py      # Recipe CRUD operations
│   │   │   ├── claude_service.py      # Claude API integration
│   │   ├── data/
│   │   │   ├── __init__.py
│   │   │   ├── data_manager.py        # JSON file I/O abstraction
│   │   │   ├── chroma_manager.py      # Chroma DB operations
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── recipes.py             # Recipe endpoints
│   │   │   ├── household.py           # Household profile endpoints
│   │   │   ├── meal_plans.py          # Meal plan generation endpoints
│   ├── data/
│   │   ├── recipes/                   # Recipe JSON files
│   │   ├── household_profile.json     # Household config
│   │   ├── groceries.json             # Current groceries
│   │   ├── chroma_db/                 # Chroma persistence
│   ├── scripts/
│   │   ├── seed_recipes.py            # Seed Chroma with recipe embeddings
│   │   ├── create_sample_data.py      # Generate sample data for testing
│   ├── tests/
│   │   ├── test_rag_service.py
│   │   ├── test_meal_plan_service.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── README.md
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── HouseholdSetup.jsx     # Input household preferences
│   │   │   ├── GroceryInput.jsx       # Input available groceries
│   │   │   ├── RecipeManager.jsx      # Add/edit recipes
│   │   │   ├── MealPlanView.jsx       # Display generated meal plan
│   │   ├── services/
│   │   │   ├── api.js                 # Backend API client
│   │   ├── App.jsx
│   │   ├── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example
│
├── PROJECT_CONTEXT.md
├── PRODUCT_REQUIREMENTS.md
├── AGENTS.md
├── .gitignore
```

---

## Backend Architecture

### 1. Data Models (Pydantic)

**models/recipe.py**
```python
from pydantic import BaseModel
from typing import List

class Recipe(BaseModel):
    id: str
    title: str
    ingredients: List[str]
    instructions: str
    tags: List[str]  # toddler-friendly, quick, daycare-safe, husband-approved, batch-cookable
    prep_time_minutes: int
    active_cooking_time_minutes: int
    serves: int
    required_appliances: List[str]  # oven, instant_pot, blender, microwave, food_processor
```

**models/household.py**
```python
from pydantic import BaseModel
from typing import List

class FamilyMember(BaseModel):
    name: str
    age_group: str  # toddler, child, adult
    allergies: List[str]
    dislikes: List[str]

class DaycareRules(BaseModel):
    no_nuts: bool
    no_honey: bool
    must_be_cold: bool

class CookingPreferences(BaseModel):
    available_appliances: List[str]
    preferred_methods: List[str]  # one_pot, sheet_pan, minimal_prep
    skill_level: str  # beginner, intermediate, advanced
    max_active_cooking_time_weeknight: int
    max_active_cooking_time_weekend: int

class Preferences(BaseModel):
    weeknight_priority: str  # quick, batch-cookable, etc.
    weekend_priority: str

class HouseholdProfile(BaseModel):
    family_members: List[FamilyMember]
    daycare_rules: DaycareRules
    cooking_preferences: CookingPreferences
    preferences: Preferences
```

**models/meal_plan.py**
```python
from pydantic import BaseModel
from typing import List
from datetime import date

class Meal(BaseModel):
    meal_type: str  # breakfast, lunch, dinner, snack
    for_who: str
    recipe_id: str
    recipe_title: str
    notes: str = ""

class Day(BaseModel):
    date: date
    meals: List[Meal]

class MealPlan(BaseModel):
    week_start_date: date
    days: List[Day]
```

### 2. Core Services

**services/rag_service.py**
- `retrieve_relevant_context(constraints: dict, available_groceries: List[str], num_recipes: int = 10) -> List[Recipe]`
  - Query Chroma DB with embeddings of constraints + groceries
  - Filter by appliances, dietary restrictions, tags
  - Return top N relevant recipes

**services/meal_plan_service.py**
- `generate_meal_plan(household: HouseholdProfile, groceries: List[str], week_start: date) -> MealPlan`
  - Call `retrieve_relevant_context()` to get candidate recipes
  - Build structured prompt with constraints + recipes
  - Call Claude API via `claude_service`
  - Parse response into MealPlan model
  - Validate constraints are satisfied

**services/claude_service.py**
- `generate_plan_with_claude(prompt: str) -> str`
  - Anthropic API client
  - Structured prompt for meal plan generation
  - Error handling and retries

**data/data_manager.py**
- `load_household_profile() -> HouseholdProfile`
- `save_household_profile(profile: HouseholdProfile)`
- `load_groceries() -> List[str]`
- `save_groceries(items: List[str])`
- `load_recipe(recipe_id: str) -> Recipe`
- `save_recipe(recipe: Recipe)`
- `list_all_recipes() -> List[Recipe]`

(Abstraction layer - can swap JSON for DB later)

**data/chroma_manager.py**
- `initialize_chroma() -> ChromaClient`
- `embed_recipes(recipes: List[Recipe])`
- `query_recipes(query_text: str, filters: dict, n_results: int) -> List[Recipe]`

### 3. API Endpoints

**routers/recipes.py**
- `GET /recipes` - List all recipes
- `GET /recipes/{recipe_id}` - Get single recipe
- `POST /recipes` - Create new recipe
- `PUT /recipes/{recipe_id}` - Update recipe
- `DELETE /recipes/{recipe_id}` - Delete recipe

**routers/household.py**
- `GET /household` - Get household profile
- `PUT /household` - Update household profile
- `GET /groceries` - Get current groceries
- `PUT /groceries` - Update groceries list

**routers/meal_plans.py**
- `POST /meal-plans/generate` - Generate new meal plan
  - Body: `{ "week_start_date": "2025-12-03" }`
  - Returns: MealPlan object

### 4. Configuration

**config.py**
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str
    DATA_DIR: str = "./data"
    CHROMA_PERSIST_DIR: str = "./data/chroma_db"
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "https://your-app.vercel.app"]

    class Config:
        env_file = ".env"

settings = Settings()
```

**.env.example**
```
ANTHROPIC_API_KEY=your_api_key_here
DATA_DIR=./data
CHROMA_PERSIST_DIR=./data/chroma_db
CORS_ORIGINS=http://localhost:5173,https://your-app.vercel.app
```

---

## RAG Pipeline Design

### Flow: Recipe Retrieval
```
1. User initiates meal plan generation
   ↓
2. meal_plan_service.generate_meal_plan() is called
   ↓
3. Build query context:
   - Household constraints (allergies, dislikes, daycare rules)
   - Available groceries
   - Cooking preferences (appliances, time constraints)
   ↓
4. rag_service.retrieve_relevant_context()
   - Convert constraints to query text
   - Query Chroma DB with semantic search
   - Apply filters (appliances, tags)
   - Return top 10-15 candidate recipes
   ↓
5. Build Claude prompt:
   - System: "You are a meal planning assistant"
   - Context: Household profile + constraints
   - Recipes: JSON of candidate recipes
   - Task: "Generate a 7-day meal plan..."
   ↓
6. claude_service.generate_plan_with_claude()
   - Call Anthropic API
   - Parse JSON response
   ↓
7. Validate & return MealPlan
```

### Embedding Strategy
- Embed each recipe as: `"{title} - {tags} - {ingredients}"`
- Store in Chroma with metadata: `{id, tags, required_appliances, prep_time, active_time}`
- Use metadata filters for hard constraints (appliances, time)
- Use semantic search for soft preferences (ingredient matching, cooking methods)

### Prompt Engineering
```
System: You are a meal planning assistant specializing in family meal planning with complex dietary constraints.

Context:
- Household: {family_members with allergies/dislikes}
- Daycare Rules: {no_nuts, no_honey, must_be_cold}
- Available Groceries: {grocery_list}
- Cooking Preferences: {appliances, max_time_weeknight, max_time_weekend}

Candidate Recipes:
{JSON array of 10-15 recipes}

Task:
Generate a 7-day meal plan starting {week_start_date}. For each day, provide:
- Breakfast, lunch (specify if for daycare or home), dinner, snacks
- Specify which family member(s) each meal is for
- MUST respect all allergies and daycare rules
- Prioritize available groceries
- Respect cooking time constraints (weeknight vs weekend)
- Only use recipes from the candidate list provided

Return response as JSON matching this schema:
{MealPlan schema}
```

---

## Frontend Architecture

### Components

**HouseholdSetup.jsx**
- Form to input family members, allergies, dislikes, daycare rules
- Cooking preferences (appliances, time constraints)
- Calls `PUT /household`

**GroceryInput.jsx**
- Simple text area or tag input for grocery items
- Calls `PUT /groceries`

**RecipeManager.jsx**
- List view of all recipes
- Form to add/edit recipes
- Calls `GET /recipes`, `POST /recipes`, `PUT /recipes/{id}`

**MealPlanView.jsx**
- Button: "Generate Meal Plan"
- Calls `POST /meal-plans/generate`
- Displays 7-day plan in calendar/table format
- Shows recipe details on click

### State Management
- Use React Context or simple useState for v0.1
- Store: household profile, groceries, current meal plan
- Fetch from backend on load

### API Client (services/api.js)
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = {
  // Household
  getHousehold: () => fetch(`${API_BASE_URL}/household`).then(r => r.json()),
  updateHousehold: (data) => fetch(`${API_BASE_URL}/household`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),

  // Groceries
  getGroceries: () => fetch(`${API_BASE_URL}/groceries`).then(r => r.json()),
  updateGroceries: (items) => fetch(`${API_BASE_URL}/groceries`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  }).then(r => r.json()),

  // Recipes
  getRecipes: () => fetch(`${API_BASE_URL}/recipes`).then(r => r.json()),
  createRecipe: (recipe) => fetch(`${API_BASE_URL}/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipe)
  }).then(r => r.json()),

  // Meal Plans
  generateMealPlan: (weekStartDate) => fetch(`${API_BASE_URL}/meal-plans/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ week_start_date: weekStartDate })
  }).then(r => r.json()),
};
```

---

## Data Storage Strategy

### JSON File Structure

**data/household_profile.json**
```json
{
  "family_members": [
    {
      "name": "Andrea",
      "age_group": "adult",
      "allergies": [],
      "dislikes": ["cilantro"]
    },
    {
      "name": "Husband",
      "age_group": "adult",
      "allergies": [],
      "dislikes": ["spicy_food", "mushrooms"]
    },
    {
      "name": "Toddler",
      "age_group": "toddler",
      "allergies": [],
      "dislikes": []
    }
  ],
  "daycare_rules": {
    "no_nuts": true,
    "no_honey": true,
    "must_be_cold": false
  },
  "cooking_preferences": {
    "available_appliances": ["instant_pot", "oven", "blender", "food_processor", "microwave"],
    "preferred_methods": ["one_pot", "sheet_pan", "minimal_prep"],
    "skill_level": "intermediate",
    "max_active_cooking_time_weeknight": 30,
    "max_active_cooking_time_weekend": 60
  },
  "preferences": {
    "weeknight_priority": "quick",
    "weekend_priority": "batch-cookable"
  }
}
```

**data/groceries.json**
```json
{
  "items": [
    "chicken breast",
    "ground beef",
    "eggs",
    "milk",
    "cheddar cheese",
    "carrots",
    "broccoli",
    "rice",
    "pasta"
  ]
}
```

**data/recipes/recipe_001.json**
```json
{
  "id": "recipe_001",
  "title": "One-Pot Chicken and Rice",
  "ingredients": [
    "2 lbs chicken breast",
    "2 cups rice",
    "4 cups chicken broth",
    "1 cup frozen peas",
    "1 onion, diced",
    "2 cloves garlic, minced"
  ],
  "instructions": "1. Sauté onion and garlic. 2. Add chicken, brown. 3. Add rice and broth. 4. Simmer 20 min. 5. Stir in peas.",
  "tags": ["toddler-friendly", "quick", "husband-approved", "batch-cookable"],
  "prep_time_minutes": 10,
  "active_cooking_time_minutes": 25,
  "serves": 6,
  "required_appliances": ["oven"]
}
```

### Future DB Migration Path
- Keep all DB operations in `data_manager.py`
- When ready to migrate, create `db_manager.py` with same interface
- Swap implementation in `main.py` dependency injection
- Data models (Pydantic) stay the same

---

## Development Workflow

### Local Setup

1. **Backend Setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY
```

2. **Seed Data**
```bash
python scripts/create_sample_data.py  # Creates sample household + groceries
python scripts/seed_recipes.py        # Embeds recipes into Chroma
```

3. **Run Backend**
```bash
uvicorn app.main:app --reload --port 8000
```

4. **Frontend Setup**
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with VITE_API_URL=http://localhost:8000
npm run dev
```

### Testing
```bash
cd backend
pytest tests/
```

---

## Deployment Strategy

### Backend (Render)

1. **Render Configuration** (`render.yaml`)
```yaml
services:
  - type: web
    name: mealplanner-backend
    env: python
    buildCommand: "pip install -r requirements.txt"
    startCommand: "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: ANTHROPIC_API_KEY
        sync: false
      - key: PYTHON_VERSION
        value: 3.11
```

2. **Environment Variables** (Set in Render dashboard)
- `ANTHROPIC_API_KEY`: Your Claude API key
- `CORS_ORIGINS`: Your Vercel frontend URL

3. **Persistence**
- Chroma DB persists to Render's disk (not ideal for production, but OK for v0.1)
- For v0.1, re-seed recipes on each deploy via startup script
- Future: Move Chroma to persistent volume or hosted vector DB

### Frontend (Vercel)

1. **Vercel Configuration** (`vercel.json`)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

2. **Environment Variables** (Set in Vercel dashboard)
- `VITE_API_URL`: Your Render backend URL (e.g., `https://mealplanner-backend.onrender.com`)

3. **Deployment**
```bash
cd frontend
vercel --prod
```

---

## Implementation Checklist with Gating

> **Testing Philosophy**: Lightweight validation points + critical unit tests only. Each phase has a "gate" - you cannot proceed until all checkpoint criteria pass.

### Phase 1: Backend Foundation

#### 1.1 Project Setup
- [ ] Create directory structure (`backend/app/models`, `backend/app/services`, etc.)
- [ ] Create `requirements.txt` with dependencies
- [ ] Create `.env.example` template
- **Checkpoint**: `pip install -r requirements.txt` succeeds without errors
- **Test**: Run `python --version` (should be 3.11+)

#### 1.2 Data Models (Pydantic)
- [ ] Create `app/models/__init__.py`
- [ ] Create `app/models/recipe.py` with Recipe model
- [ ] Create `app/models/household.py` with HouseholdProfile, FamilyMember, etc.
- [ ] Create `app/models/meal_plan.py` with MealPlan, Day, Meal models
- **Checkpoint**: Can import models and create instances with valid data
- **Test**: Pydantic validation rejects invalid data (e.g., missing required fields)

#### 1.3 Data Manager (JSON I/O)
- [ ] Create `app/data/__init__.py`
- [ ] Implement `app/data/data_manager.py` with all CRUD functions
- [ ] Create `data/household_profile.json` with sample data
- [ ] Create `data/groceries.json` with sample grocery list
- [ ] Create 3 sample recipe files in `data/recipes/`
- **Checkpoint**: Can load and save all data types successfully
- **Test**: Write `tests/test_data_manager.py` - test load/save for each data type
- **Manual Test**: Run `pytest tests/test_data_manager.py -v`

#### 1.4 Basic FastAPI App
- [ ] Create `app/config.py` with Settings class
- [ ] Create `app/main.py` with FastAPI app + health check endpoint
- [ ] Add logging configuration
- **Checkpoint**: `uvicorn app.main:app --reload` starts without errors
- **Test**: `curl http://localhost:8000/health` returns `{"status": "ok"}`

**🚪 GATE TO PHASE 2**
- ✅ All Phase 1 checkpoints pass
- ✅ Can load household profile, groceries, and recipes from JSON
- ✅ FastAPI server runs and health check responds
- ✅ `pytest tests/test_data_manager.py` passes

---

### Phase 2: RAG Pipeline

#### 2.1 Chroma DB Setup
- [ ] Add chromadb to `requirements.txt`
- [ ] Create `app/data/chroma_manager.py`
- [ ] Implement `initialize_chroma()` function
- **Checkpoint**: Chroma DB initializes without errors
- **Test**: Create collection, verify it persists to `data/chroma_db/`

#### 2.2 Recipe Embedding
- [ ] Implement `embed_recipes()` in `chroma_manager.py`
- [ ] Create `scripts/seed_recipes.py` to populate Chroma
- [ ] Run seed script with sample recipes
- **Checkpoint**: All recipes embedded successfully
- **Test**: Query Chroma directly, get non-empty results

#### 2.3 RAG Service
- [ ] Create `app/services/__init__.py`
- [ ] Implement `app/services/rag_service.py`
- [ ] Implement `retrieve_relevant_context()` function
- [ ] Add metadata filtering (appliances, tags, time constraints)
- **Checkpoint**: Can retrieve recipes based on query + filters
- **Test**: Write `tests/test_rag_service.py` - test retrieval with different constraints
- **Manual Test**: Query "toddler-friendly chicken recipes" → returns relevant results

**🚪 GATE TO PHASE 3**
- ✅ Chroma DB persists embeddings correctly
- ✅ Can retrieve recipes semantically (not just keyword match)
- ✅ Metadata filters work (e.g., filter by required_appliances)
- ✅ `pytest tests/test_rag_service.py` passes

---

### Phase 3: Claude Integration

#### 3.1 Claude Service
- [ ] Add anthropic SDK to `requirements.txt`
- [ ] Implement `app/services/claude_service.py`
- [ ] Implement `generate_plan_with_claude()` function
- [ ] Add error handling and retries
- **Checkpoint**: Can call Claude API successfully
- **Test**: Send simple prompt, get response

#### 3.2 Prompt Engineering
- [ ] Design meal plan generation prompt template
- [ ] Include household constraints in prompt
- [ ] Include candidate recipes in prompt
- [ ] Request structured JSON response
- **Checkpoint**: Claude returns valid JSON matching MealPlan schema
- **Test**: Parse response into MealPlan Pydantic model

#### 3.3 Meal Plan Service
- [ ] Implement `app/services/meal_plan_service.py`
- [ ] Implement `generate_meal_plan()` function
- [ ] Integrate RAG retrieval + Claude generation
- [ ] Add constraint validation
- **Checkpoint**: Can generate complete 7-day meal plan
- **Test**: Write `tests/test_meal_plan_service.py` - test full flow
- **Manual Test**: Generate plan, verify it respects daycare "no nuts" rule

**🚪 GATE TO PHASE 4**
- ✅ Claude API integration works reliably
- ✅ Generated meal plans are valid MealPlan objects
- ✅ At least 1 hard constraint is respected (e.g., allergies, daycare rules)
- ✅ `pytest tests/test_meal_plan_service.py` passes

---

### Phase 4: API Endpoints

#### 4.1 Recipe Endpoints
- [ ] Create `app/routers/__init__.py`
- [ ] Implement `app/routers/recipes.py` with CRUD endpoints
- [ ] Add endpoints: GET /recipes, GET /recipes/{id}, POST /recipes, PUT /recipes/{id}
- **Checkpoint**: All recipe endpoints return correct status codes
- **Test**: Use `curl` to create, read, update recipe

#### 4.2 Household & Groceries Endpoints
- [ ] Implement `app/routers/household.py`
- [ ] Add endpoints: GET /household, PUT /household, GET /groceries, PUT /groceries
- **Checkpoint**: Can retrieve and update household data via API
- **Test**: Use `curl` to update household profile

#### 4.3 Meal Plan Generation Endpoint
- [ ] Implement `app/routers/meal_plans.py`
- [ ] Add endpoint: POST /meal-plans/generate
- [ ] Add CORS middleware to `main.py`
- **Checkpoint**: POST request returns complete meal plan
- **Test**: Write `tests/test_api_endpoints.py` - smoke test each endpoint

**🚪 GATE TO PHASE 5**
- ✅ All API endpoints return 200 for valid requests
- ✅ Can generate meal plan via POST /meal-plans/generate
- ✅ CORS configured for frontend origin
- ✅ FastAPI auto-docs accessible at /docs

---

### Phase 5: Frontend

#### 5.1 Frontend Setup
- [ ] Initialize Vite + React project (or use Lovable)
- [ ] Create `frontend/package.json`
- [ ] Create `frontend/.env.example`
- [ ] Set up basic routing (if needed)
- **Checkpoint**: `npm run dev` starts frontend successfully

#### 5.2 API Client
- [ ] Implement `src/services/api.js` with all backend calls
- **Checkpoint**: Can fetch data from backend API

#### 5.3 UI Components
- [ ] Build `HouseholdSetup.jsx` - form for family members, constraints
- [ ] Build `GroceryInput.jsx` - input for available groceries
- [ ] Build `RecipeManager.jsx` - list/add/edit recipes
- [ ] Build `MealPlanView.jsx` - display generated meal plan
- [ ] Wire up `App.jsx` with all components
- **Checkpoint**: Can interact with all features via UI
- **Manual Test**: Full user flow - set household → add groceries → generate plan

**🚪 GATE TO PHASE 6**
- ✅ Frontend connects to backend successfully
- ✅ Can generate meal plan through UI
- ✅ Meal plan displays correctly in browser
- ✅ No console errors

---

### Phase 6: Recipe Library
- [ ] Add 20-30 real family recipes as JSON files
- [ ] Tag each recipe appropriately (toddler-friendly, daycare-safe, husband-approved, etc.)
- [ ] Re-run `scripts/seed_recipes.py` to embed all recipes
- [ ] Test meal plan generation with full recipe library
- **Checkpoint**: Generated plans use variety of recipes
- **Manual Test**: Generate 3 different meal plans, verify diversity

**🚪 GATE TO PHASE 7**
- ✅ At least 20 recipes in library
- ✅ Meal plans are practical and usable
- ✅ Constraint satisfaction works with real data

---

### Phase 7: Deployment

#### 7.1 Backend Deployment (Render)
- [ ] Create `render.yaml` configuration
- [ ] Deploy backend to Render
- [ ] Set environment variables in Render dashboard
- [ ] Test backend API in production
- **Checkpoint**: Production API responds successfully

#### 7.2 Frontend Deployment (Vercel)
- [ ] Create `vercel.json` configuration
- [ ] Deploy frontend to Vercel
- [ ] Set VITE_API_URL environment variable
- [ ] Test end-to-end in production
- **Checkpoint**: Can generate meal plan in production

**🚪 GATE TO PHASE 8**
- ✅ Both frontend and backend deployed successfully
- ✅ Production app works end-to-end
- ✅ No CORS errors

---

### Phase 8: Documentation
- [ ] Write backend README with setup instructions
- [ ] Write frontend README
- [ ] Update root README with deployment links
- [ ] Create case study document (problem, solution, learnings, trade-offs)
- [ ] Prepare demo script for interviews
- [ ] Document architectural decisions

**✅ PROJECT COMPLETE**
- All phases complete
- App is usable in daily life
- Portfolio materials ready

---

## Critical Files to Create (In Order)

### Backend
1. `backend/requirements.txt`
2. `backend/app/config.py`
3. `backend/app/models/recipe.py`
4. `backend/app/models/household.py`
5. `backend/app/models/meal_plan.py`
6. `backend/app/data/data_manager.py`
7. `backend/app/data/chroma_manager.py`
8. `backend/app/services/rag_service.py`
9. `backend/app/services/claude_service.py`
10. `backend/app/services/meal_plan_service.py`
11. `backend/app/routers/recipes.py`
12. `backend/app/routers/household.py`
13. `backend/app/routers/meal_plans.py`
14. `backend/app/main.py`
15. `backend/scripts/seed_recipes.py`

### Frontend
1. `frontend/package.json`
2. `frontend/src/services/api.js`
3. `frontend/src/components/HouseholdSetup.jsx`
4. `frontend/src/components/GroceryInput.jsx`
5. `frontend/src/components/RecipeManager.jsx`
6. `frontend/src/components/MealPlanView.jsx`
7. `frontend/src/App.jsx`

---

## Key Architectural Decisions & Rationale

1. **FastAPI over Flask**: Better for API-first design, auto-docs, Pydantic integration, future scalability
2. **Pydantic Models**: Type safety, validation, matches JSON schemas exactly
3. **JSON File Storage**: Simplest for v0.1, easy to migrate to DB later via data_manager abstraction
4. **Chroma DB**: Open source, local, easy to deploy, good for learning RAG
5. **Separate Frontend/Backend Deployment**: Easier to debug, scale independently, better for learning
6. **Two-Function RAG Design**: Clean separation allows future multi-agent refactoring without rewrite

---

## Success Metrics Reminder

✅ Can generate a usable meal plan for Andrea's actual household
✅ RAG system correctly retrieves relevant recipes based on constraints
✅ Can demo the app and explain the architecture in interviews
✅ Documentation exists explaining: problem, solution, learnings, trade-offs
✅ Code is readable enough for technical reviewers to understand
