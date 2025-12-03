# Meal Planner with RAG - Project Context

## Why This Project Exists

This is a portfolio artifact for a job search. The builder (Andrea) is a Senior PM with 8+ years in operationally complex products (logistics, telecom, marketplaces) who is positioning as "operationally complex products + AI implementation expertise." This project demonstrates hands-on RAG implementation and the ability to solve messy real-world problems.

The goal is a functional demo that can be shown in interviews and discussed intelligently — not a polished consumer product.

## The Problem

Generate weekly meal plans tailored to complex household constraints:
- Toddler requiring daycare lunches and snacks (different rules than home meals)
- Dietary preferences and restrictions across family members
- What groceries are currently available
- Picky eaters (husband is the pickiest)
- Changing routines (illness, schedule changes throwing wrenches into plans)

This is a legitimately hard problem with multiple constraints, changing inputs, and real-world messiness — exactly the kind of operational complexity Andrea has solved professionally in other domains.

## v0.1 Scope (Target: ~1 week)

### Core Features
1. Input and store household dietary constraints/preferences
2. Input available groceries or shopping list
3. Generate a weekly meal plan that respects all constraints
4. RAG retrieval from a curated recipe + preferences knowledge base

### What Success Looks Like
- Working app that generates usable meal plans
- Can demo the RAG pipeline and explain architectural decisions
- README/case study documenting: the problem, architecture, learnings, what I'd do differently

## Tech Stack

- **Frontend**: Lovable or basic React (TBD)
- **Backend**: Python
- **Vector DB**: Chroma (local, open source)
- **LLM**: Claude API
- **Deployment**: Vercel

## Out of Scope for v0.1

- Recipe scraping/import from URLs
- Grocery delivery integration
- Calendar/schedule awareness
- Multi-user household support
- Mobile app
- Production-grade error handling

## Data to Seed

### Recipes (20-30 to start)
Real family recipes, manually curated. Each recipe needs:
- Title
- Ingredients list
- Instructions
- Tags: "toddler-friendly", "quick", "daycare-safe", "husband-approved", "batch-cookable", etc.

### Preferences Document
- Allergies and hard restrictions
- Strong dislikes by family member
- Daycare lunch rules (what's allowed/not allowed)
- General preferences (e.g., "prefer one-pot meals on weeknights")

## Interview Talking Points This Project Enables

1. **RAG architecture**: Embeddings, vector storage, retrieval strategies, context construction
2. **Prompt engineering**: How to structure context so the LLM generates useful, constraint-respecting outputs
3. **Operationally complex problem-solving**: Multiple constraints, real-world messiness, edge cases
4. **Separation of concerns**: Designed for potential multi-agent refactoring without over-engineering upfront
5. **Shipping mindset**: Scoped aggressively, built something functional, iterated

## Owner Context

Andrea is a Senior PM learning AI implementation through building, not a professional developer. Code quality matters but shipping matters more. Optimize for:
- Readability over cleverness
- Working over perfect
- Learning over best practices she doesn't understand yet
