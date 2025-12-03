# Meal Planner Agent Instructions

## Project Overview

A personal meal planning app that uses RAG to generate weekly meal plans based on household dietary constraints, available groceries, and a curated recipe database.

Read PROJECT_CONTEXT.md for full background on why this project exists and what success looks like.

## Tech Stack

- Frontend: [TBD - Lovable or React]
- Backend: Python
- Vector DB: Chroma (local)
- LLM: Claude API
- Deployment: Vercel

## Project Structure

```
/src              - application code
/data             - recipe JSON files and preference documents for RAG seeding
/scripts          - utility scripts (e.g., seed_chroma.py)
/docs             - documentation and case study
```

## Architecture Notes

The app separates retrieval and planning into distinct functions to allow future refactoring into a multi-agent setup if needed.

```
retrieve_relevant_context(query, constraints) → returns recipes + preferences

generate_meal_plan(context, user_input) → returns meal plan
```

For v0.1, these are called sequentially by the main app. Multi-agent orchestration is a potential v0.2 enhancement.

**Why this separation matters:**
- Retrieval and planning are different cognitive jobs with different failure modes
- Retrieval agent can fail by returning irrelevant recipes
- Planner agent can fail by generating repetitive or impractical schedules
- Separation allows debugging and improving each independently
- Keeps refactoring options open without premature complexity

## RAG Pipeline

1. User inputs query (e.g., "plan meals for this week, I have chicken and broccoli")
2. Embed query using Chroma's built-in embedding (or OpenAI embeddings)
3. Retrieve top-k relevant recipes + preferences from Chroma
4. Construct prompt with retrieved context + user constraints
5. Call Claude API for meal plan generation
6. Return formatted meal plan

## Key Data Concepts

- **Recipes**: Stored in Chroma with fields: title, ingredients, instructions, tags (e.g., "toddler-friendly", "quick", "daycare-safe", "husband-approved")
- **Preferences**: Household constraints document (allergies, dislikes, daycare lunch rules)
- **Meal Plan**: Weekly output with breakfast/lunch/dinner/snacks, accounting for all constraints

## Agent Guidelines

### When writing code:
- Keep functions small and single-purpose
- Add comments explaining RAG-related logic (retrieval, embedding, context construction)
- This is a learning project — prioritize readability over optimization
- Bias toward simplicity; this is v0.1

### When making decisions:
- If unsure between options, choose the one easier to explain in an interview
- Don't add features beyond v0.1 scope without asking
- When in doubt, ask for clarification rather than guessing on domain logic (meal planning rules, daycare requirements, etc.)

### Out of scope for v0.1:
- Recipe scraping/import from URLs
- Grocery delivery integration
- Calendar integration
- Multi-user support
- Mobile app
- Production-grade error handling

### When stuck:
- Check PROJECT_CONTEXT.md for background and scope decisions
- Check /docs for architectural decisions made along the way
- Ask for clarification on domain logic

## Testing Approach

- Manual testing for v0.1
- Seed data includes real family recipes to test realistic outputs
- Success = generates usable meal plans that respect stated constraints

## Common Commands

```bash
# Install Chroma
pip install chromadb

# Seed the vector database (once script exists)
python scripts/seed_chroma.py

# Run the app locally
[TBD once frontend is decided]

# Deploy to Vercel
[TBD]
```

## First Tasks

1. Set up project structure (folders as outlined above)
2. Create sample recipe data in /data (5-10 recipes in JSON to start)
3. Create preferences document in /data
4. Write seed_chroma.py script to load recipes + preferences into Chroma
5. Write retrieve_relevant_context() function
6. Write generate_meal_plan() function
7. Create minimal UI to test the pipeline
8. Iterate on prompts until output is usable
