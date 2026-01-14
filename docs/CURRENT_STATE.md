---
**Summary**: Quick snapshot of what's working right now (Deployed to production). Updated after each sprint. Use this to quickly understand current capabilities.
**Last Updated**: 2026-01-14
**Status**: Current
**Read This If**: You need a quick feature inventory or tech stack summary
---

# Current State - Meal Planner

**As of**: Production Deployment (2026-01-14)
**Branch**: `main`
**Version**: v0.9.0 (production)
**Status**: 🚀 **LIVE IN PRODUCTION**

## 🌐 Production URLs
- **Frontend**: https://frontend-iota-orcin-18.vercel.app
- **Backend API**: https://mealplanner-backend-production-3e88.up.railway.app
- **API Docs**: https://mealplanner-backend-production-3e88.up.railway.app/docs

---

## 🎯 What's Working Now

### Core Features (Production Ready)
1. ✅ **Household Management**
   - Family member profiles with allergies, dislikes, individual preferences
   - Daycare rules configuration

2. ✅ **Grocery Management**
   - Manual entry with expiry date tracking
   - **Voice input** - Speak groceries, Claude parses them
   - **Receipt OCR** - Upload receipt photo, Claude Vision extracts items
   - Visual expiry indicators (red/yellow/green badges)
   - Expiring soon warnings

3. ✅ **Shopping List** (NEW - v0.9.0)
   - Interactive checklist for shopping trips
   - **Templates** - Save recurring items (e.g., "Weekly Essentials")
   - Quick-add from templates to current list
   - Optional prompt to add purchased items to inventory
   - Tab-based UI on Groceries page (Inventory | Shopping List)

4. ✅ **Recipe Library**
   - 40+ recipes with tags and ratings
   - Per-person 👍/👎 ratings
   - Filter by member favorites, all-member liked, tags
   - **AI recipe generation** from selected ingredients
   - **Recipe URL import** - Import recipes from 50+ cooking websites
   - Recipe source display with badges and external links

5. ✅ **Meal Plan Generation**
   - AI-powered weekly meal plans using Claude Sonnet 4.5
   - Prioritizes expiring groceries
   - Respects dietary constraints and preferences
   - Considers recipe ratings

6. ✅ **Beta Testing Feedback**
   - Floating bug button on all pages
   - Submit feedback, bugs, and feature requests
   - Automatic browser info and workspace ID collection
   - Linear issue creation via API

### In Development
- **Onboarding Wizard** (~70% complete): Multi-step wizard for new users collecting cooking preferences, household composition, and dietary goals

### Latest Features (January 2026)
- **Shopping List V1** (Jan 14): Checklist UI with templates for recurring items
- **Supabase Migration** (Jan 12): Moved from JSON to PostgreSQL with RLS
- **Onboarding Wizard Backend**: API endpoints for status, submit, and skip
- **Linear Integration**: Feedback now creates Linear issues automatically
- **Receipt Import UI**: Improved item cards with excluded items recovery

### Recent Features (December 2025)
- **Meal Plan Customization (v0.8.0)**: Swap meals with alternatives, undo functionality
- **Recipe Editing**: Edit existing recipes in library
- **Recipe URL Import (v0.5.0)**: Import recipes from 50+ cooking websites
- **Release Notes System**: Automatic "What's New" modal on version updates

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build**: Vite 7.2.6
- **UI**: shadcn-ui + Tailwind CSS (custom theme)
- **State**: TanStack Query v5
- **Routing**: React Router v6
- **Auth**: Supabase Auth (`@supabase/supabase-js`)
- **Deployment**: Vercel (Global CDN)
- **URL**: https://frontend-iota-orcin-18.vercel.app

### Backend
- **Framework**: FastAPI 0.104.1 (Python 3.11)
- **Server**: Uvicorn with auto-reload
- **Validation**: Pydantic v2
- **Database**: Supabase PostgreSQL with Row-Level Security
- **Vector DB**: ChromaDB 0.4.18 (for recipe embeddings)
- **AI**: Anthropic Claude API
  - Claude Sonnet 4.5 (claude-sonnet-4-5-20250929) for general operations
  - Claude Opus 4.5 for high-accuracy tasks (receipt OCR, voice parsing)
- **Deployment**: Railway (Containerized with Docker)
- **URL**: https://mealplanner-backend-production-3e88.up.railway.app

### Data
- **Database**: Supabase PostgreSQL (https://kydcpdwdhfvwbggfqtlq.supabase.co)
- **Tables**: household_profiles, recipes, meal_plans, groceries, recipe_ratings, shopping_lists, shopping_templates
- **Multi-tenancy**: RLS policies filter by `workspace_id`
- **Vector Store**: ChromaDB (recipe embeddings for similarity search)

---

## 📂 Project Structure

```
mealplanner/
├── backend/
│   ├── app/
│   │   ├── models/       # Pydantic models
│   │   ├── routers/      # API endpoints
│   │   ├── services/     # Business logic (Claude, RAG, meal planning)
│   │   └── data/         # JSON storage + Chroma manager
│   ├── tests/            # 69 tests passing
│   └── data/             # JSON data files
│
├── frontend/
│   ├── src/
│   │   ├── pages/        # 5 pages (Household, Groceries, Recipes, MealPlans, Index)
│   │   ├── components/   # 50+ shadcn-ui components
│   │   └── lib/          # API client, utils
│   └── package.json
│
└── docs/
    ├── INDEX.md          # Documentation index (start here!)
    ├── HANDOFF.md        # Latest session summary
    ├── CURRENT_STATE.md  # This file
    ├── CHANGELOG.md      # Feature history
    ├── reference/        # Tech stack references
    └── archive/          # Historical planning docs
```

---

## 📊 Test Coverage

### Backend
- **Total**: 69 tests passing
- **Phase 1 (Voice)**: 35 tests
- **Phase 2 (Receipt OCR)**: 21 tests
- **Pre-existing**: 13 tests (data manager, core services)

### Frontend
- **Recipe URL Import**: 37 tests (TDD approach)
- **Build**: TypeScript compilation successful
- **Manual testing**: All features tested end-to-end

---

## 🚀 Quick Start

### Backend
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
# → http://localhost:8000
# → API docs: http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm run dev
# → http://localhost:5173
```

### Tests
```bash
cd backend
pytest  # Run all 69 tests
```

---

## 🎯 Known Limitations

1. **Voice input**: Requires Chrome/Edge (Web Speech API not in Firefox/Safari)
2. **Receipt OCR**: Works best with grocery receipts, not restaurant receipts
3. **Data storage**: File-based JSON (not scalable, no transactions)
4. **Daycare rules**: Hardcoded, not user-editable
5. **No multi-user auth**: Single household per deployment

See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for active bugs.

---

## 📈 What's Next

### Immediate (Ready to Start)
- **Shopping List V1.1** (AA-166): Integration polish, inventory bridge improvements
- **Onboarding Wizard Completion**: Finish remaining 30%, add tests
- **Produce Image Recognition**: AI-powered produce identification

### Future (Backlog)
- Shopping list generation from meal plan
- Recipe library expansion tools
- Meal plan history & favorites
- Mobile PWA enhancements

See [CHANGELOG.md](CHANGELOG.md) for detailed sprint history.

---

**For More Details**:
- Full project history: [CHANGELOG.md](CHANGELOG.md)
- Latest session: [HANDOFF.md](HANDOFF.md)
- All docs: [INDEX.md](INDEX.md)
