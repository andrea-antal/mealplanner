# Meal Planner with RAG

A RAG-powered meal planning application that generates weekly meal plans based on complex household constraints, available groceries, and cooking preferences.

## Overview

A RAG-powered meal planning application that solves the multi-constraint optimization problem of weekly meal planning:
- Complex dietary restrictions and preferences
- Available groceries and pantry items
- Time constraints and cooking capabilities
- Picky eaters and daycare lunch rules

**Tech Stack**: FastAPI + React + Chroma + Claude Opus 4

## Documentation

- **[Claude Code Guide](docs/CLAUDE.md)** - Development modes, best practices, and patterns
- **[Project Context](docs/PROJECT_CONTEXT.md)** - Current state, philosophy, and recent work
- **[Sprint Plan](docs/SPRINT_PLAN.md)** - Feature roadmap and upcoming sprints
- **[Product Requirements](docs/PRODUCT_REQUIREMENTS.md)** - Detailed specs and data schemas
- **[Implementation Plan](docs/IMPLEMENTATION_PLAN.md)** - v0.1 architecture and phases
- **[Changelog](docs/CHANGELOG.md)** - Technical decisions and development history

## Features

### v0.1 (Complete)
- ✅ Input household dietary constraints (allergies, dislikes, daycare rules)
- ✅ Input available groceries
- ✅ Input cooking preferences and available appliances
- ✅ Generate weekly meal plans with RAG-powered recipe retrieval
- ✅ Admin UI to manage recipes
- ✅ Constraint satisfaction across multiple competing requirements

### v0.2 - Dynamic Recipe Generation (Complete)
- ✅ **Sprint 1**: Cook with Selected Ingredients
  - Select ingredients from your grocery list via checkboxes
  - Configure meal type, servings, cooking time, and ingredient portions
  - AI-powered recipe generation using Claude Opus 4
  - Generated recipes automatically saved to recipe library
  - Auto-open generated recipe with navigation state

- ✅ **Sprint 1.1**: Enhanced Recipe Generation
  - Cuisine type selection (Italian, Mexican, Chinese, Korean, Japanese, Greek, Healthy, or custom)
  - "Generate Again" button for AI-generated recipes
  - Confirmation dialog before recipe deletion
  - Navigate to Groceries page to select fresh ingredients for regeneration

- ✅ **Sprint 1.2**: Bug Fixes
  - Fixed meal plan generation Pydantic validation error (recipe_id can now be null for simple snacks)
  - Fixed RecipeModal button spacing issue

- ✅ **Sprint 1.3**: Meal Plan UX Improvements
  - Recipe titles in meal plan now clickable to view full recipe details
  - Meal plan persists across navigation using localStorage
  - Removed non-functional Export/Print buttons (deferred to future sprint)
  - Added configurable Claude model via MODEL_NAME environment variable

## Project Status

✅ **v0.1 Backend Complete** (2025-12-03 12:30 PM PST)
- 4 phases complete: Backend Foundation, RAG Pipeline, Claude Integration, API Endpoints
- 11 REST API endpoints operational
- 12 unit + integration tests passing

🎨 **v0.1 Frontend Complete** (2025-12-03 3:45 PM PST)
- Built with Lovable, merged from pixel-perfect-clone repo
- 5 pages: Home, Meal Plans, Recipes, Household, Groceries
- Full shadcn-ui component library integrated
- Fully connected to backend API with React Query

✨ **v0.3 Smart Grocery Management Complete** (2025-12-10)
- Sprint 2: Full grocery expiry tracking and expiry-aware meal planning
- Backend: GroceryItem model with dates, `/groceries` REST API, expiry validation
- Frontend: Redesigned Groceries page with progressive disclosure form
- Claude prompts enhanced with ⚠️ "USE SOON" markers for expiring items
- Visual expiry indicators (red/yellow/green badges) and "Expiring Soon" banner

**Previous Milestones**:
- v0.2 (2025-12-04): Dynamic Recipe Generation - "Cook with Selected" feature
- v0.1 (2025-12-03): RAG-Powered Meal Planning - Core meal plan generation

**Next Steps**:
- 🚀 **Sprint 3+**: Future enhancements (navigation improvements, sorting/filtering, etc.)
- See [Sprint Plan](docs/SPRINT_PLAN.md) for full roadmap

See [Project Context](docs/PROJECT_CONTEXT.md) for detailed timeline.

## Development Setup

### Option 1: GitHub Codespaces (Recommended)

The easiest way to get started - no local setup required!

1. **Create a GitHub repository** and push this code
2. **Open in Codespaces**:
   - Go to your repo on GitHub
   - Click "Code" → "Codespaces" → "Create codespace on main"
3. **Set environment secrets**:
   - In your repo: Settings → Secrets and variables → Codespaces
   - Add secret: `ANTHROPIC_API_KEY` with your Claude API key
4. **Start development**:
   ```bash
   # Terminal 1: Backend
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000

   # Terminal 2: Frontend
   cd frontend
   npm install
   npm run dev
   ```

Codespaces automatically forwards ports 8000 (backend) and 5173 (frontend) to your browser!

### Option 2: Local Development

If you prefer to run locally:

**Prerequisites:**
- Python 3.11+
- Node.js 18+
- Anthropic API key

**Backend Setup:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY
uvicorn app.main:app --reload --port 8000
```

**Frontend Setup:**
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with VITE_API_URL=http://localhost:8000
npm run dev
```

## Architecture Highlights

- **Clean separation of concerns**: Two-function RAG design (`retrieve_relevant_context` + `generate_meal_plan`) allows future multi-agent refactoring
- **Type-safe data models**: Pydantic models match JSON schemas exactly
- **Future-proof storage**: JSON file abstraction layer makes DB migration simple
- **Readable code**: Optimized for learning and interview discussions over cleverness

## Success Metrics

1. ✅ Generates usable meal plans for real household use
2. ✅ Demonstrates explainable RAG architecture
3. ✅ Can be demoed and discussed intelligently in interviews
4. ✅ Documentation covers problem, solution, learnings, trade-offs
5. ✅ Code is readable for technical reviewers

## License

Private portfolio project - not licensed for public use

---

**Note**: This is a learning project prioritizing shipping working software over perfect code. Readability > cleverness, working > perfect.
