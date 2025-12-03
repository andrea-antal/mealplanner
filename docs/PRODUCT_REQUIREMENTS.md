# Product Requirements - Meal Planner v0.1

## Goal
Build a working meal planning app that generates weekly meal plans using RAG (Retrieval Augmented Generation) to demonstrate operational complexity + AI implementation skills.

**Timeline Target**: ~1 week
**Success Metric**: Functional application that can immediately be used in daily life administration

---

## User Stories

### Setup & Configuration
1. As a user, I can input household dietary constraints and preferences (allergies, dislikes by family member, daycare rules)
2. As a user, I can input what groceries I currently have available
3. As a user, I can input my cooking preferences and appliances/tools available
4. As a user, I can add/edit recipes to the knowledge base with tags (toddler-friendly, quick, daycare-safe, husband-approved, etc.)

### Meal Plan Generation
4. As a user, I can generate a weekly meal plan that:
   - Respects all dietary constraints and preferences
   - Prioritizes available groceries
   - Includes appropriate meals for different contexts (daycare lunch, home dinner, snacks)
   - Accounts for preparation complexity (weeknight vs weekend)

5. As a user, I can see the generated meal plan with:
   - Day-by-day breakdown
   - Meal type (breakfast, lunch, dinner, snacks)
   - Recipe details (ingredients, instructions)
   - Which family members each meal is for

### RAG System (Behind the Scenes)
6. The system embeds recipes and preferences into a vector database
7. The system retrieves relevant recipes based on constraints and context
8. The system uses Claude API to generate coherent weekly plans

---

## Functional Requirements

### Inputs
- **Household Preferences**: JSON/form with family members, allergies, dislikes, daycare rules
- **Available Groceries**: Simple list of what's in the fridge/pantry
- **Cooking Preferences/Gear**: Preferred cooking methods, available appliances (slow cooker, instant pot, air fryer, etc.), tools, skill level
- **Recipe Library**: 20-30 manually curated family recipes with structured data

### Processing
- Vector embeddings for recipe retrieval (Chroma DB)
- LLM-based meal plan generation (Claude API)
- Constraint satisfaction (must respect all dietary rules)

### Outputs
- Weekly meal plan (7 days)
- Organized by meal type and family member
- References specific recipes from the knowledge base

---

## Data Schema (Initial)

### Recipe
```json
{
  "id": "string",
  "title": "string",
  "ingredients": ["string"],
  "instructions": "string",
  "tags": ["toddler-friendly", "quick", "daycare-safe", "husband-approved", "batch-cookable"],
  "prep_time_minutes": "number",
  "active_cooking_time_minutes": "number",
  "serves": "number",
  "required_appliances": ["oven", "instant_pot", "blender", "microwave"]
}
```

### Household Profile
```json
{
  "family_members": [
    {
      "name": "string",
      "age_group": "toddler|child|adult",
      "allergies": ["string"],
      "dislikes": ["string"]
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

### Available Groceries
```json
{
  "items": ["string"]
}
```

### Meal Plan Output
```json
{
  "week_start_date": "date",
  "days": [
    {
      "date": "date",
      "meals": [
        {
          "meal_type": "breakfast|lunch|dinner|snack",
          "for_who": "string",
          "recipe_id": "string",
          "recipe_title": "string",
          "notes": "string"
        }
      ]
    }
  ]
}
```

---

## Non-Functional Requirements

### Performance
- Meal plan generation should complete within 30 seconds
- UI should be responsive (basic loading states)

### Usability
- Simple, clean interface (not polished, but functional)
- Clear error messages if constraints can't be satisfied

### Technical
- Code should be readable and well-commented
- RAG pipeline should be explainable for interview discussions
- Modular enough to refactor for multi-agent architecture later (but don't over-engineer now)

---

## Out of Scope for v0.1

❌ Recipe scraping from URLs
❌ Grocery delivery API integration
❌ Calendar/schedule sync
❌ Multi-user authentication
❌ Mobile app
❌ Production-grade error handling
❌ Nutritional analysis
❌ Cost optimization
❌ Recipe ratings/feedback loop

---

## MVP Feature Prioritization

**Must Have** (P0):
- Input household constraints
- Input available groceries
- Input cooking preferences and available appliances
- Generate weekly meal plan
- RAG recipe retrieval
- Basic UI to interact with the system

**Nice to Have** (P1 - if time permits):
- Edit/regenerate specific days
- Shopping list generation from meal plan
- Tag-based recipe filtering

**Future** (P2):
- Everything in "Out of Scope" section

---

## Success Criteria

✅ Can generate a usable meal plan for Andrea's actual household
✅ RAG system correctly retrieves relevant recipes based on constraints
✅ Can demo the app and explain the architecture in interviews
✅ Documentation exists explaining: problem, solution, learnings, trade-offs
✅ Code is readable enough for technical reviewers to understand

---

## Interview Talking Points This Enables

1. **RAG Implementation**: Vector embeddings, retrieval strategies, context construction
2. **Prompt Engineering**: Structuring context for constraint-respecting LLM outputs
3. **Constraint Satisfaction**: Handling multiple competing requirements
4. **Pragmatic Scoping**: Shipping working software with clear trade-offs
5. **Real-World Problem Solving**: Operational complexity similar to logistics/marketplace products
