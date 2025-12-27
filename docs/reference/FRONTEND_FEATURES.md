---
**Summary**: Frontend tech stack and feature specifications for v0.1. Contains React, TypeScript, shadcn-ui details, and page-by-page feature breakdown. Reference doc for frontend architecture.
**Last Updated**: 2025-12-03
**Status**: Reference
**Read This If**: You need frontend tech stack details or component library information
---

# Meal Planner v0.1 - Product Features for Frontend

## Overview
RAG-powered meal planning app that generates personalized weekly meal plans based on household dietary constraints, available groceries, and a curated recipe database.

## Core Features
### 1. Meal Plan Generation

**Primary Use Case**: Generate a 7-day meal plan with one click 

User Flow:
* User clicks "Generate Meal Plan" button
* System retrieves relevant recipes based on household profile + groceries
* Claude AI generates personalized 7-day plan
* Display results in calendar/card view

**API Endpoint**: `POST /meal-plans/generate`

```
Request: {"week_start_date": "2025-12-08", "num_recipes": 15}
 Response: {
   "week_start_date": "2025-12-08",
   "days": [
     {
       "date": "2025-12-08",
       "meals": [
         {
           "meal_type": "breakfast",
           "for_who": "Andrea",
           "recipe_title": "Cheesy Scrambled Eggs",
           "notes": "Quick weekday breakfast"
        }
         // ... more meals
       ]
     }
     // ... 7 days total
   ]
 }
 ```

#### Display Requirements:
* Show 7 days in a weekly calendar view
* Each day shows: breakfast, lunch, dinner, snacks
* Display recipe title, who it's for, and notes
* Show which meals use leftovers


### 2. Household Profile Management
**Purpose**: Configure family dietary constraints and cooking preferences 

**Data to Collect**: 
Family Members (repeatable):
- Name (text)
- Age group (dropdown: toddler, child, adult)
- Allergies (multi-select or tags)
- Dislikes (multi-select or tags)
  
Daycare Rules:
- No nuts (checkbox)
- No honey (checkbox)
- Must be served cold (checkbox)

Cooking Preferences:
- Available appliances (multi-select: oven, instant pot, blender, food processor, microwave)
- Preferred cooking methods (multi-select: one-pot, sheet pan, minimal prep)
- Skill level (dropdown: beginner, intermediate, advanced)
- Max active cooking time - weeknight (number input, minutes)
- Max active cooking time - weekend (number input, minutes)

Preferences:
- Weeknight priority (dropdown: quick, batch-cookable, minimal-prep)
- Weekend priority (dropdown: batch-cookable, slow-cooked, special)

**API Endpoints**:
`GET /household/profile` - Load existing profile
`PUT /household/profile` - Save updates

### 3. Grocery List Management
**Purpose**: Track what groceries are currently available UI 

**Components**:
- Text input with "Add" button to add items
- List view of current groceries
- Delete button for each item (X icon)
- "Clear All" button

**API Endpoints**:
`GET /household/groceries` - Get current list
`PUT /household/groceries` - Update entire list

**Example Data**:
```
{
  "items": ["chicken breast", "rice", "broccoli", "eggs", "milk"]
}
```

### 4. Recipe Management
**Purpose**: View and manage recipe library 

**Recipe Display (List View)**:
- Recipe title
- Tags (badges: toddler-friendly, quick, daycare-safe, etc.)
- Prep time + Active cooking time
- Serves X people
- Recipe Details (Modal/Card View):
- Title
- Ingredients list
- Step-by-step instructions
- Tags
- Time estimates
- Required appliances

**API Endpoints**:
`GET /recipes` - List all recipes
`GET /recipes/{id}` - Get single recipe
`POST /recipes` - Create new recipe
`PUT /recipes/{id}` - Update recipe

**Recipe Data Structure**:
```
{
  "id": "recipe_001",
  "title": "One-Pot Chicken and Rice",
  "ingredients": [
    "2 lbs chicken breast",
    "2 cups rice",
    "4 cups chicken broth"
  ],
  "instructions": "1. Heat oil... 2. Add chicken...",
  "tags": ["toddler-friendly", "quick", "one-pot"],
  "prep_time_minutes": 10,
  "active_cooking_time_minutes": 25,
  "serves": 6,
  "required_appliances": ["oven"]
}
```

### Suggested UI Layout
#### Home Page
**Hero Section**: "Generate Your Weekly Meal Plan"

**Quick Stats:**
- X recipes in library
- Y family members
- Z groceries on hand

**Primary CTA**: "Generate Meal Plan" button
**Secondary Links**: Manage Recipes, Update Profile, Edit Groceries

**Navigation**
- Home / Dashboard
- Meal Plans (view current/past plans)
- Recipes (browse/add/edit)
- Household (profile + groceries)
- Settings

#### Meal Plan View

**Weekly Calendar Layout:**
```
┌─────────────────────────────────────────────┐
│  Week of December 8, 2025                   │
│  [Generate New Plan] [Export] [Print]       │
├─────────────────────────────────────────────┤
│  Sunday    │ Breakfast: Scrambled Eggs      │
│  Dec 8     │ Lunch: Pasta                   │
│            │ Dinner: Chicken & Rice         │
│            │ Snack: Fruit                   │
├─────────────────────────────────────────────┤
│  Monday    │ Breakfast: Oatmeal             │
│  Dec 9     │ Lunch: Chicken & Rice (leftover)│
│  ...       │ ...                            │
```
**Card View Alternative:**
- Each day as a card
- Collapsible sections for each meal type
- Click recipe to see full details
- Color/Tag System for Tags
```
🍎 toddler-friendly - Green
⚡ quick - Yellow
🏫 daycare-safe - Blue
👍 husband-approved - Purple
🍲 one-pot - Orange
🥘 batch-cookable - Teal
🍳 breakfast - Pink
```

**API Base URL**
http://localhost:8000

**Swagger Docs (for reference):**
http://localhost:8000/docs

#### User Flows
**First-Time Setup Flow**
- Welcome screen
- Set up household profile (family members, allergies, cooking preferences)
- Add available groceries
- (Optional) Browse/add recipes
- Generate first meal plan

**Weekly Planning Flow**
- Update grocery list (what's in the fridge)
- Review/update household profile if needed
- Click "Generate Meal Plan"
- Review generated plan
- (Optional) Regenerate if not satisfied
- Export or print meal plan

**Nice-to-Have Features (v0.2)**
- Save favorite meal plans
- Shopping list generation (from meal plan)
- Recipe scaling (adjust serving sizes)
- Meal plan history
- Recipe import from URL
- Recipe ratings/notes
- Mobile-responsive design