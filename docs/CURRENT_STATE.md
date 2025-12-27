---
**Summary**: Quick snapshot of what's working right now (Deployed to production). Updated after each sprint. Use this to quickly understand current capabilities.
**Last Updated**: 2025-12-26
**Status**: Current
**Read This If**: You need a quick feature inventory or tech stack summary
---

# Current State - Meal Planner

**As of**: Production Deployment (2025-12-26)
**Branch**: `main`
**Version**: v0.4 (production)
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

3. ✅ **Recipe Library**
   - 40+ recipes with tags and ratings
   - Per-person 👍/👎 ratings
   - Filter by member favorites, all-member liked, tags
   - **AI recipe generation** from selected ingredients

4. ✅ **Meal Plan Generation**
   - AI-powered weekly meal plans using Claude Sonnet 3.5
   - Prioritizes expiring groceries
   - Respects dietary constraints and preferences
   - Considers recipe ratings

### Latest Features (Sprint 4)
- **Phase 1**: Voice input for groceries (Web Speech API + Claude parsing)
- **Phase 2**: Receipt OCR (Claude Vision API + image compression)
- **Phase 3**: Production deployment (Vercel + Railway)
- **Phase 4**: Mobile meal plan UX enhancement

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build**: Vite 7.2.6
- **UI**: shadcn-ui + Tailwind CSS (custom theme)
- **State**: TanStack Query v5
- **Routing**: React Router v6
- **Deployment**: Vercel (Global CDN)
- **URL**: https://frontend-iota-orcin-18.vercel.app

### Backend
- **Framework**: FastAPI 0.104.1 (Python 3.11)
- **Server**: Uvicorn with auto-reload
- **Validation**: Pydantic v2
- **Vector DB**: ChromaDB 0.4.18 (persistent)
- **AI**: Anthropic Claude API
  - Claude Sonnet 4.5 (claude-sonnet-4-5-20250929) for all operations
  - Vision capabilities for receipt OCR
- **Deployment**: Railway (Containerized with Docker)
- **URL**: https://mealplanner-backend-production-3e88.up.railway.app

### Data
- **Storage**: File-based JSON (`backend/data/`)
- **Files**: recipes/, household_profile.json, groceries.json, recipe_ratings.json
- **Vector Store**: ChromaDB (14 recipes indexed)

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
- **Sprint 4 Phase 3**: Produce image recognition (optional)
- **Sprint 5**: Enhanced meal plan customization
  - Customize which days to generate
  - Regenerate individual days
  - Swap recipes in meal plan

### Future (Backlog)
- Shopping list generation from meal plan
- Recipe library expansion tools
- Meal plan history & favorites
- Mobile PWA enhancements

See [CHANGELOG.md](CHANGELOG.md) for detailed sprint history.

---

**For More Details**:
- Full project history: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)
- Latest session: [HANDOFF.md](HANDOFF.md)
- All docs: [INDEX.md](INDEX.md)
