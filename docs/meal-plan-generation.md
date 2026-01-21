# Meal Plan Generation System

Technical documentation for the meal plan generation pipeline.

## Overview

The meal plan generator creates personalized 7-day meal plans using a **RAG (Retrieval Augmented Generation)** architecture. It combines user-specific data (household profiles, recipes, groceries) with Claude AI to generate context-aware meal suggestions.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MEAL PLAN GENERATION FLOW                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Frontend                API Layer              Service Layer              │
│   ────────              ─────────              ──────────────              │
│                                                                             │
│   ┌─────────┐    POST    ┌──────────────┐      ┌─────────────────────┐    │
│   │ Request │──────────▶│ /meal-plans  │─────▶│ meal_plan_service   │    │
│   │ Form    │           │   /generate  │      │   generate_meal_plan│    │
│   └─────────┘           └──────────────┘      └──────────┬──────────┘    │
│                                                          │                 │
│                                                          ▼                 │
│                         ┌────────────────────────────────────────────┐    │
│                         │           Data Loading Phase               │    │
│                         │  ┌─────────────────────────────────────┐  │    │
│                         │  │ load_household_profile(workspace_id)│  │    │
│                         │  │ load_groceries(workspace_id)        │  │    │
│                         │  │ load_recipe_ratings(workspace_id)   │  │    │
│                         │  └─────────────────────────────────────┘  │    │
│                         └────────────────────────────────────────────┘    │
│                                                          │                 │
│                                                          ▼                 │
│                         ┌────────────────────────────────────────────┐    │
│                         │           RAG Retrieval Phase              │    │
│                         │  ┌─────────────────────────────────────┐  │    │
│                         │  │ retrieve_relevant_recipes()         │  │    │
│                         │  │   → Build query from household +    │  │    │
│                         │  │     groceries                       │  │    │
│                         │  │   → query_recipes() with semantic   │  │    │
│                         │  │     or text search                  │  │    │
│                         │  │   → Return top N recipes            │  │    │
│                         │  └─────────────────────────────────────┘  │    │
│                         └────────────────────────────────────────────┘    │
│                                                          │                 │
│                                                          ▼                 │
│                         ┌────────────────────────────────────────────┐    │
│                         │           Context Preparation              │    │
│                         │  ┌─────────────────────────────────────┐  │    │
│                         │  │ prepare_context_for_llm()           │  │    │
│                         │  │   → household (members, allergies,  │  │    │
│                         │  │     dislikes, daycare rules)        │  │    │
│                         │  │   → available_groceries (with       │  │    │
│                         │  │     expiry dates)                   │  │    │
│                         │  │   → candidate_recipes (with ratings)│  │    │
│                         │  └─────────────────────────────────────┘  │    │
│                         └────────────────────────────────────────────┘    │
│                                                          │                 │
│                                                          ▼                 │
│                         ┌────────────────────────────────────────────┐    │
│                         │           LLM Generation Phase             │    │
│                         │  ┌─────────────────────────────────────┐  │    │
│                         │  │ generate_meal_plan_with_claude()    │  │    │
│                         │  │   → Build system prompt             │  │    │
│                         │  │   → Build user prompt with context  │  │    │
│                         │  │   → Call Claude API                 │  │    │
│                         │  │   → Parse JSON response             │  │    │
│                         │  │   → Validate MealPlan object        │  │    │
│                         │  └─────────────────────────────────────┘  │    │
│                         └────────────────────────────────────────────┘    │
│                                                          │                 │
│                                                          ▼                 │
│   ┌─────────┐           ┌──────────────┐      ┌─────────────────────┐    │
│   │ Display │◀──────────│   MealPlan   │◀─────│    Return JSON      │    │
│   │ Plan    │           │   Response   │      │                     │    │
│   └─────────┘           └──────────────┘      └─────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Architecture Layers

### 1. API Layer (`app/routers/meal_plans.py`)

REST endpoints for meal plan operations:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/meal-plans/generate` | POST | Generate new 7-day meal plan |
| `/meal-plans/alternatives` | POST | Get alternative recipes for swapping |
| `/meal-plans/readiness` | GET | Check if workspace has enough recipes |
| `/meal-plans/{id}` | GET | Retrieve a specific meal plan |
| `/meal-plans/{id}` | PATCH | Swap a recipe in the plan |
| `/meal-plans/{id}/undo-swap` | POST | Undo a recipe swap |
| `/meal-plans` | GET | List all meal plans |
| `/meal-plans` | POST | Save a meal plan |
| `/meal-plans/{id}` | DELETE | Delete a meal plan |

**Generate Request Schema:**
```python
class GenerateMealPlanRequest:
    week_start_date: str      # ISO format: "2025-12-08"
    num_recipes: int = 15     # Candidate recipes to retrieve
    week_context: str = None  # Optional: user's schedule/preferences
```

### 2. Orchestration Layer (`app/services/meal_plan_service.py`)

The `generate_meal_plan()` function orchestrates the entire flow:

```python
def generate_meal_plan(
    workspace_id: str,
    week_start_date: Date,
    household: Optional[HouseholdProfile] = None,
    num_recipes: int = 15,
    week_context: Optional[str] = None
) -> Optional[MealPlan]:
```

**Steps:**
1. Load household profile (if not provided)
2. Load available groceries
3. Load recipe ratings
4. Retrieve relevant recipes via RAG
5. Prepare context for LLM
6. Call Claude to generate meal plan
7. Return validated MealPlan

### 3. RAG Layer (`app/services/rag_service.py`)

Retrieval Augmented Generation for recipe selection.

#### Recipe Retrieval

```python
def retrieve_relevant_recipes(
    workspace_id: str,
    household: HouseholdProfile,
    available_groceries: List[GroceryItem],
    num_recipes: int = 15
) -> List[Recipe]:
```

**Query Building (`_build_query_text`):**
- Extracts grocery names (limited to first 10)
- Includes cooking preferences (preferred methods)
- Adds weeknight priority from household preferences
- Combines into natural language query

Example query:
```
"recipes using Chicken breast, Rice, Broccoli, Carrots one-pot quick weeknight"
```

#### Context Preparation

```python
def prepare_context_for_llm(
    household: HouseholdProfile,
    recipes: List[Recipe],
    available_groceries: List[GroceryItem],
    recipe_ratings: Optional[Dict[str, Dict[str, str]]] = None
) -> Dict:
```

**Context Structure:**
```python
{
    "household": {
        "family_members": [...],    # name, age_group, allergies, dislikes
        "all_allergies": [...],     # deduplicated
        "all_dislikes": [...],      # deduplicated
        "daycare_rules": {...},     # no_nuts, no_honey, must_be_cold
        "cooking_preferences": {...} # appliances, methods, time limits
    },
    "available_groceries": [...],   # with expiry dates
    "candidate_recipes": [...],     # with household ratings
    "week_context": "..."           # optional user input
}
```

### 4. Data Layer (`app/data/data_manager.py`)

Supabase database operations with workspace isolation.

#### Recipe Search (`query_recipes`)

Two search strategies:

1. **Semantic Search** (when OpenAI configured):
   - Generate embedding for query text
   - Query pgvector for similar recipes
   - Falls back to text search on failure

2. **Text Search** (fallback):
   - Tokenizes query into individual words
   - Scores recipes by word matches in title/tags/ingredients
   - Falls back to returning most recent recipes if no matches

```python
def _text_search_recipes(
    workspace_id: str,
    query_text: str,
    n_results: int = 10,
    filters: Optional[Dict] = None
) -> List[Recipe]:
```

**Scoring Algorithm:**
- Title match: +10 points per word
- Tag match: +5 points per word
- Ingredient match: +1 point per word
- Stop words filtered: "recipes", "using", "with", "and", "or", etc.

### 5. LLM Layer (`app/services/claude_service.py`)

Claude API integration for meal plan generation.

#### System Prompt

Defines Claude's role as a meal planning assistant with expertise in:
- Creating balanced, practical weekly meal plans
- Respecting allergies, dislikes, and daycare rules
- Accommodating dietary preferences (pescetarian, low-carb, etc.)
- Maximizing use of available groceries
- Balancing weeknight vs weekend cooking time

**Key Instructions:**
- Strictly respect allergies and daycare rules (non-negotiable)
- Match recipes to appropriate meal types
- Prioritize items marked "USE SOON" (expiring within 2 days)
- Consider recipe ratings (likes/dislikes from household members)

#### User Prompt Construction

`_build_meal_plan_prompt()` builds a detailed prompt with:

1. **Family Members Section:**
   - Name, age group, allergies, dislikes, likes, diet patterns

2. **Daycare Rules Section** (if applicable):
   - No nuts, no chocolate, no honey, must be cold
   - Attendance days

3. **Cooking Preferences:**
   - Available appliances
   - Preferred methods
   - Max cooking times (weeknight vs weekend)

4. **Groceries with Expiry Context:**
   - Items marked with "USE SOON" if expiring in 2 days

5. **Candidate Recipes** (JSON):
   - Full recipe details with household ratings

6. **Week Context** (if provided):
   - User's schedule, events, dining out plans

#### Response Parsing

```python
def _parse_meal_plan_response(response_text: str, week_start_date: str) -> Optional[MealPlan]:
```

- Handles JSON wrapped in markdown code blocks
- Validates against Pydantic MealPlan model
- Returns None if parsing fails

## Data Models

### MealPlan (`app/models/meal_plan.py`)

```python
class MealPlan(BaseModel):
    id: Optional[str]              # defaults to week_start_date
    week_start_date: Date
    days: List[Day]                # exactly 7 days
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

class Day(BaseModel):
    date: Date
    meals: List[Meal]              # minimum 1 meal

class Meal(BaseModel):
    meal_type: str                 # breakfast, lunch, dinner, snack
    for_who: str                   # family member or "everyone"
    recipe_id: Optional[str]       # null for simple snacks
    recipe_title: str
    notes: str = ""
    previous_recipe_id: Optional[str]     # for undo
    previous_recipe_title: Optional[str]  # for undo
```

### HouseholdProfile (Referenced)

```python
class HouseholdProfile:
    family_members: List[FamilyMember]
    daycare_rules: DaycareRules
    cooking_preferences: CookingPreferences
    preferences: HouseholdPreferences
    onboarding_status: OnboardingStatus
    onboarding_data: OnboardingData
```

## Configuration

From `app/config.py`:

| Setting | Purpose |
|---------|---------|
| `ANTHROPIC_API_KEY` | Claude API authentication |
| `MODEL_NAME` | Default model (Sonnet) |
| `HIGH_ACCURACY_MODEL_NAME` | Opus 4.5 for OCR/complex tasks |
| `OPENAI_API_KEY` | Optional: for semantic search embeddings |
| `SUPABASE_URL` | Database connection |
| `SUPABASE_SECRET_KEY` | Service role key |

## Error Handling

### Common Failure Points

1. **No Household Profile**
   - Returns None, generation fails
   - Should complete onboarding first

2. **No Recipes Retrieved**
   - Falls back to text search
   - Falls back to most recent recipes
   - Claude generates generic suggestions if still empty

3. **Claude API Failure**
   - Logged with exception details
   - Returns None to caller
   - HTTP 500 returned to client

4. **JSON Parse Failure**
   - Handles markdown-wrapped JSON
   - Logs response for debugging
   - Returns None, triggering HTTP 500

## Recipe Rating Integration

Ratings influence recipe selection in the prompt:

```python
"household_ratings": {
    "Adam": "like",
    "Andrea": "like",
    "Nathan": "dislike"
}
```

Claude instructions:
- Prioritize recipes with more "like" ratings
- Avoid recipes with more "dislike" than "like"
- Balance family preferences with variety

## Daycare Meal Handling

For households with children attending daycare:

1. **Detection**: Checks for children (toddler/child/infant) with daycare days set
2. **Rules Applied**: no_nuts, no_peanuts_only, no_chocolate, no_honey, must_be_cold
3. **Meal Structure**:
   - Daycare days: breakfast (family), lunch (child's daycare + family), dinner (family), daycare snack
   - Non-daycare days: standard family meals

## Expiry-Based Prioritization

Groceries expiring within 2 days are marked for priority use:

```
- Chicken breast ⚠️ USE SOON (expires in 1 day)
- Milk
- Rice
```

System prompt emphasizes: "Ingredients marked with ⚠️ USE SOON should be prioritized in the next 1-2 days to reduce food waste."

## Known Limitations

1. **Vector Search**: Currently falls back to text search; full pgvector RPC not implemented
2. **Recipe Matching**: Text search may miss relevant recipes if keywords don't match exactly
3. **No Constraint Validation**: Post-generation validation is minimal (trusts Claude)
4. **Single Model**: All generation uses same model; no A/B testing infrastructure

## Future Improvements

1. Implement proper pgvector similarity search via Postgres RPC
2. Add multi-model support for cost/quality optimization
3. Implement recipe constraint validation post-generation
4. Add meal plan caching for performance
5. Support partial regeneration (regenerate specific days)

## Related Files

| File | Purpose |
|------|---------|
| `app/routers/meal_plans.py` | API endpoints |
| `app/services/meal_plan_service.py` | Orchestration |
| `app/services/rag_service.py` | Recipe retrieval + context |
| `app/services/claude_service.py` | LLM integration |
| `app/data/data_manager.py` | Database operations |
| `app/models/meal_plan.py` | Data models |
| `app/models/household.py` | Household models |
| `app/models/recipe.py` | Recipe model |
