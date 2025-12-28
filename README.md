# Meal Planner

AI-powered meal planning for families with complex dietary constraints. Uses RAG + Claude to generate weekly meal plans that balance allergies, preferences, available groceries, daycare rules, and cooking time limits.

**Tech Stack**: FastAPI · React · Chroma · Claude Opus 4 · TanStack Query · shadcn/ui

## Quick Start

**Prerequisites**: Python 3.11+, Node 18+, Anthropic API key

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Add ANTHROPIC_API_KEY and optionally RESEND_API_KEY
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`

## Features

### Core Meal Planning
- **RAG-Powered Recipe Selection**: Vector search finds recipes matching household needs
- **Multi-Constraint Optimization**: Balances allergies, preferences, groceries, time limits
- **Smart Grocery Management**: Expiry tracking with "USE SOON" prioritization
- **Daycare Compliance**: Ensures lunch/snack rules are met Monday-Friday

### Recipe Management
- **Recipe Library**: Browse, search, and manage recipes
- **AI Recipe Generation**: Create recipes from selected ingredients or meal plan gaps
- **Recipe Ratings**: Rate recipes per household member (👍/👎)
- **Family Favorites**: Recipes loved by everyone get highlighted

### Household Management
- **Individual Preferences**: Per-member dietary preferences (pescetarian, low-carb, etc.)
- **Flexible Constraints**: Allergies (hard rules) vs dislikes (soft preferences)
- **Cooking Profiles**: Appliances, methods, weeknight/weekend time limits

### Beta Testing Feedback
- **In-App Feedback**: Floating bug button on all pages for easy feedback submission
- **Smart Email Delivery**: Resend API integration with PST timestamps and browser detection
- **Diagnostic Info**: Automatically includes workspace ID, browser/OS details, and session context

## Current Status

**Latest**: [v0.4.0 - Recipe Rating System + UI Polish](https://github.com/dreachan/mealplanner/releases/tag/v0.4.0) (Dec 19, 2025)

**All Releases**:
- ✅ [v0.4.0](https://github.com/dreachan/mealplanner/releases/tag/v0.4.0): Recipe ratings, individual preferences, UI improvements
- ✅ [v0.3.0](https://github.com/dreachan/mealplanner/releases/tag/v0.3.0): Grocery expiry tracking
- ✅ [v0.2.0](https://github.com/dreachan/mealplanner/releases/tag/v0.2.0): Dynamic recipe generation from ingredients
- ✅ [v0.1.0](https://github.com/dreachan/mealplanner/releases/tag/v0.1.0): RAG + Claude meal plan generation

**Recent Highlights**:
- Recipe rating system (👍/👎 per household member)
- Redesigned meal plan UI with week selector and day navigation
- Fixed timezone bugs (week now correctly starts Monday)
- Progress modal for meal plan generation
- Recipe linking from meal plans

See [Releases](https://github.com/dreachan/mealplanner/releases) for detailed release notes.

## Documentation

- **[Project Context](docs/PROJECT_CONTEXT.md)** - Development history and current state
- **[Sprint Plan](docs/SPRINT_PLAN.md)** - Feature roadmap
- **[Known Issues](docs/KNOWN_ISSUES.md)** - Active bugs and workarounds
- **[Changelog](docs/CHANGELOG.md)** - Technical decisions and learnings
- **[Product Requirements](docs/PRODUCT_REQUIREMENTS.md)** - Detailed specs

## Architecture

```
Backend (FastAPI)
├── RAG Pipeline: Chroma vector DB for semantic recipe search
├── Claude Integration: Prompt engineering for meal plan generation
└── REST API: 15+ endpoints for recipes, meal plans, household data

Frontend (React)
├── TanStack Query: Server state management with caching
├── shadcn/ui: Accessible component library (Radix + Tailwind)
└── Type-safe API: TypeScript interfaces matching Pydantic models
```

**Key Patterns**:
- Clean separation: `retrieve_relevant_recipes()` + `generate_meal_plan_with_claude()`
- Type safety: Pydantic models → TypeScript interfaces
- Future-proof: JSON abstraction layer for easy DB migration
- Optimized for readability and interview discussions

## Success Metrics

- ✅ Generates usable meal plans for real family use
- ✅ Explainable RAG architecture for technical discussions
- ✅ Comprehensive documentation of decisions and trade-offs
- ✅ Readable code for portfolio/interview review

## License

Private portfolio project - All rights reserved

---

**Philosophy**: Ship working software. Readability > cleverness. Documentation > perfection.
