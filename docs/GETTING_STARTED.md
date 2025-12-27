---
**Summary**: Quick setup guide for new developers. Covers prerequisites, installation, running locally, and where to find things. Your first stop when joining the project.
**Last Updated**: 2025-12-25
**Status**: Current
**Read This If**: First time setting up the project or onboarding a new developer
---

# Getting Started - Meal Planner

Welcome! This guide will get you up and running in ~15 minutes.

---

## 📋 Prerequisites

- **Python 3.11+** (backend)
- **Node.js 18+** (frontend)
- **Anthropic API key** (for Claude AI)
- **Git** (for cloning)

---

## 🚀 Quick Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd mealplanner
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Add your Anthropic API key to .env:
# ANTHROPIC_API_KEY=sk-ant-...

# Run backend
uvicorn app.main:app --reload
```

**Backend will be at**: http://localhost:8000
**API docs**: http://localhost:8000/docs

### 3. Frontend Setup
```bash
# In a new terminal
cd frontend

# Install dependencies
npm install

# Create .env file (optional, for API URL override)
cp .env.example .env

# Run frontend
npm run dev
```

**Frontend will be at**: http://localhost:5173

---

## ✅ Verify It's Working

1. **Backend health check**: http://localhost:8000 should show `{"status":"healthy"}`
2. **Frontend loads**: http://localhost:5173 should show the home page
3. **Test meal plan generation**:
   - Go to Groceries page
   - Add a few items (or use voice/receipt upload)
   - Go to Meal Plans page
   - Click "Generate New Meal Plan"
   - Should see a 7-day meal plan

---

## 📂 Project Structure

```
mealplanner/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── main.py      # FastAPI app entry point
│   │   ├── models/      # Pydantic models (data schemas)
│   │   ├── routers/     # API endpoints (meal_plans, recipes, groceries, household)
│   │   ├── services/    # Business logic (claude_service, rag_service, meal_plan_service)
│   │   └── data/        # Data layer (JSON storage, Chroma vector DB)
│   ├── data/            # JSON data files (groceries, recipes, etc.)
│   ├── tests/           # 69 tests (run with `pytest`)
│   └── requirements.txt # Python dependencies
│
├── frontend/            # React + TypeScript frontend
│   ├── src/
│   │   ├── pages/       # 5 pages (Index, Household, Groceries, Recipes, MealPlans)
│   │   ├── components/  # 50+ shadcn-ui components
│   │   └── lib/         # API client, utils
│   └── package.json     # Node dependencies
│
└── docs/                # Documentation (start with INDEX.md)
    ├── INDEX.md         # Master table of contents
    ├── CURRENT_STATE.md # Quick feature inventory
    ├── HANDOFF.md       # Latest session summary
    └── CHANGELOG.md     # Feature history
```

---

## 🧭 Where to Find Things

**For complete documentation navigation, see [INDEX.md](INDEX.md)** - master table of contents for all docs.

**Quick links:**
- **Current features**: [CURRENT_STATE.md](CURRENT_STATE.md)
- **Latest session**: [HANDOFF.md](HANDOFF.md)
- **Full history**: [CHANGELOG.md](CHANGELOG.md)
- **Active bugs**: [KNOWN_ISSUES.md](KNOWN_ISSUES.md)
- **Product requirements**: [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md)

**Code locations:**
- API endpoints: `backend/app/routers/`
- Frontend pages: `frontend/src/pages/`
- Claude AI integration: `backend/app/services/claude_service.py`
- RAG pipeline: `backend/app/services/rag_service.py`

---

## 🔧 Common Tasks

### Add a new recipe (manually)
```bash
# Create a JSON file in backend/data/recipes/
# Example: backend/data/recipes/my-recipe.json
{
  "id": "my-recipe",
  "title": "My Recipe",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "instructions": "Step-by-step...",
  "tags": ["quick", "toddler-friendly"],
  "prep_time_minutes": 15,
  "serves": 4
}

# Re-embed recipes in Chroma
cd backend
python scripts/seed_recipes.py
```

### Run backend tests
```bash
cd backend
source venv/bin/activate
pytest                    # All tests
pytest tests/test_*.py -v # Specific test file with verbose output
```

### Check API documentation
Navigate to: http://localhost:8000/docs (Swagger UI)

### Access data files
- **Recipes**: `backend/data/recipes/*.json`
- **Groceries**: `backend/data/groceries.json`
- **Household**: `backend/data/household_profile.json`
- **Ratings**: `backend/data/recipe_ratings.json`
- **Meal Plan**: `backend/data/meal_plan.json`

---

## 💡 Development Tips

1. **Use the API docs**: http://localhost:8000/docs is your friend for testing endpoints

2. **Check HANDOFF.md**: Before starting work, read [HANDOFF.md](HANDOFF.md) for latest session context

3. **Follow DOC_STANDARDS**: Before creating new docs, read [DOC_STANDARDS.md](DOC_STANDARDS.md)

4. **Read CHANGELOG for examples**: Want to see how a feature was implemented? Search [CHANGELOG.md](CHANGELOG.md)

5. **Tests first**: Sprint 4 used TDD approach - write tests before implementation

---

## 🤝 Contributing Workflow

1. **Check latest**: Read [HANDOFF.md](HANDOFF.md) and [CURRENT_STATE.md](CURRENT_STATE.md)
2. **Create branch**: `git checkout -b feature/your-feature`
3. **Write tests** (if applicable): See `backend/tests/` for examples
4. **Implement**: Follow existing patterns in codebase
5. **Update docs**: Update CHANGELOG.md and relevant docs
6. **Commit**: Use descriptive messages, include "🤖 Generated with Claude Code" footer
7. **Test**: Run `pytest` (backend) and `npm run build` (frontend)

---

## 🆘 Troubleshooting

**Backend won't start**:
- Check `.env` has valid `ANTHROPIC_API_KEY`
- Verify virtual environment is activated: `which python` should show `venv/bin/python`
- Check port 8000 isn't in use: `lsof -i :8000`

**Frontend won't start**:
- Run `npm install` again
- Check port 5173 isn't in use: `lsof -i :5173`
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

**Tests failing**:
- Make sure backend is NOT running (tests use same data files)
- Check `conftest.py` has `temp_data_dir` fixture for isolation

**Claude API errors**:
- Verify API key is valid
- Check rate limits (wait 60 seconds if rate-limited)
- See logs in terminal where backend is running

---

## 📚 Next Steps

1. **Explore the app**: Run locally and try all features
2. **Read CURRENT_STATE.md**: Understand what's working
3. **Review CHANGELOG.md**: See how features were built
4. **Check HANDOFF.md**: See what's planned next

**Questions?** Check [INDEX.md](INDEX.md) for all documentation.

---

**Welcome to the team! 🎉**
