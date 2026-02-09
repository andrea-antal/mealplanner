---
**Summary**: Quick snapshot of what's working right now (Deployed to production). Updated after each sprint. Use this to quickly understand current capabilities.
**Last Updated**: 2026-02-08
**Status**: Current
**Read This If**: You need a quick feature inventory or tech stack summary
---

# Current State - Meal Planner

**As of**: Production Deployment (2026-02-08)
**Branch**: `main`
**Version**: v0.14.0 (production)
**Status**: 🚀 **LIVE IN PRODUCTION**

## 🌐 Production URLs
- **Frontend**: https://frontend-iota-orcin-18.vercel.app
- **Backend API**: https://mealplanner-backend-production-3e88.up.railway.app
- **API Docs**: https://mealplanner-backend-production-3e88.up.railway.app/docs

---

## 🎯 What's Working Now

### Core Features (Production Ready)

1. ✅ **User Authentication** (NEW - v0.10.0)
   - **Google OAuth** as primary sign-in method (one-tap, fast)
   - **Magic link** fallback for users who prefer email
   - **Invite code gate** for new signups (beta access control)
   - Separate `/signup` (new users) and `/login` (returning users) flows
   - **Hamburger menu** with user email and sign-out option
   - **Workspace migration** for existing beta users to new accounts

2. ✅ **Household Management**
   - Family member profiles with allergies, dislikes, individual preferences
   - Daycare rules configuration
   - **Onboarding Wizard** - 10-step wizard for new users with:
     - Cooking experience/frequency assessment
     - Kitchen equipment and pantry evaluation
     - Cuisine and dietary preferences
     - Starter content generation (meal plan or recipes)

3. ✅ **Grocery Management**
   - Manual entry with expiry date tracking
   - **Voice input** - Speak groceries, Claude parses them
   - **Receipt OCR** - Upload receipt photo, Claude Vision extracts items
   - Visual expiry indicators (red/yellow/green badges)
   - Expiring soon warnings

4. ✅ **Shopping List** (v0.9.0)
   - Interactive checklist for shopping trips
   - **Templates** - Save recurring items (e.g., "Weekly Essentials")
   - Quick-add from templates to current list
   - Optional prompt to add purchased items to inventory
   - Tab-based UI on Groceries page (Inventory | Shopping List)

5. ✅ **Recipe Library** (see #7 below for full feature list)

6. ✅ **Meal Plan Generation**
   - AI-powered weekly meal plans using Claude Sonnet 4.5
   - Prioritizes expiring groceries
   - Respects dietary constraints and preferences
   - Considers recipe ratings
   - **Generation Config** (NEW - v0.14.0): Per-member preference weights (dictatorial↔democratic), recipe source control (library/AI/mix), appliance preferences
   - **Calendar Navigation** (NEW - v0.14.0): Week-by-week browsing with prev/next arrows, "Today" button, and plan status indicators. Past weeks are read-only.

7. ✅ **Recipe Library**
   - 40+ recipes with tags and ratings
   - Per-person ratings
   - Filter by member favorites, all-member liked, tags
   - **AI recipe generation** from selected ingredients
   - **Recipe URL import** - Import recipes from 50+ cooking websites
   - **Recipe Photos** (NEW - v0.14.0): Photos from web scraping (og:image, schema.org), manual upload, stored on Cloudflare R2
   - **Portion Calculator** (NEW - v0.14.0): Scale ingredients by 0.5x/1x/2x/3x with live quantity updates
   - **Unit Conversion** (NEW - v0.14.0): Toggle between original/weight/volume units with 50+ ingredient density lookups

8. ✅ **Interactive Cook Mode** (NEW - v0.14.0)
   - Three-phase cooking session: mise en place → step-by-step → done
   - One-instruction-at-a-time with swipe navigation
   - Auto-detected timers from recipe instructions with audio alerts (Web Audio API)
   - Multiple concurrent timers with localStorage persistence
   - Claude API parses recipes into structured cooking steps

9. ✅ **Beta Testing Feedback**
   - Floating bug button on all pages
   - Submit feedback, bugs, and feature requests
   - Automatic browser info and workspace ID collection
   - Linear issue creation via API

10. ✅ **Admin Dashboard**
   - Workspace analytics and management
   - **Onboarding Analytics** - Answer distributions and per-workspace details
   - Error tracking with acknowledgment system
   - Workspace cleanup tools

### Latest Features (February 2026)
- **UI Redesign** (Feb 8): Mobile-first design with violet primary, Inter + Fraunces fonts, glassmorphic header, stacked homepage actions
- **Recipe Photos** (Feb 8): Photo display on cards/modals, upload support, web scraping extraction
- **Portion Calculator & Unit Conversion** (Feb 8): Scale recipes 0.5x-3x, toggle original/weight/volume
- **Generation Config** (Feb 8): Per-member preference weights, recipe source control, appliance prefs
- **Calendar Meal Plans** (Feb 8): Week-by-week navigation with plan status indicators
- **Interactive Cook Mode** (Feb 8): Step-by-step cooking with auto-detected timers and audio alerts

### Recent Features (January-February 2026)
- **Empty Week Grid & Manual Planning** (Feb 1): Build plans without AI
- **Google OAuth Auth** (Jan 16): User accounts with Google sign-in, invite code gate
- **Onboarding V2** (Jan 14): 10-step wizard with starter content generation
- **Shopping List V1** (Jan 14): Checklist UI with templates for recurring items

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
- **Database**: Supabase PostgreSQL
- **Tables**: household_profiles, recipes, meal_plans, groceries, recipe_ratings, shopping_lists, shopping_templates
- **Multi-tenancy**: RLS policies filter by `workspace_id`
- **Vector Store**: ChromaDB (recipe embeddings for similarity search)

---

## 📂 Project Structure

```
mealplanner/
├── backend/
│   ├── app/
│   │   ├── models/       # Pydantic models (incl. generation_config.py)
│   │   ├── routers/      # API endpoints (recipes, meal_plans, household, groceries)
│   │   ├── services/     # Business logic (Claude, RAG, photo_storage, url_fetcher)
│   │   └── data/         # JSON storage + Chroma manager
│   ├── tests/            # 69+ tests
│   └── data/             # JSON data files
│
├── frontend/
│   ├── src/
│   │   ├── pages/        # 16 pages (Index, Household, Groceries, Recipes, MealPlans, CookMode, etc.)
│   │   ├── components/   # 60+ components (35 shadcn primitives + feature components)
│   │   │   ├── cooking/  # CookMode components (MisEnPlace, StepByStep, CookingTimer)
│   │   │   ├── layout/   # AppLayout with glassmorphic header + bottom nav
│   │   │   └── ui/       # shadcn-ui primitives
│   │   └── lib/
│   │       ├── api/      # Split API client (client, types, recipes, mealPlans, household, groceries, admin)
│   │       ├── measurements.ts  # Unit conversion engine (50+ ingredient densities)
│   │       └── cookingSession.ts # Cook mode session management
│   └── package.json
│
└── docs/
    ├── INDEX.md          # Documentation index (start here!)
    ├── CURRENT_STATE.md  # This file
    ├── CHANGELOG.md      # Feature history
    ├── RELEASE_NOTES.md  # User-facing release notes
    └── KNOWN_ISSUES.md   # Active bugs
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
# → http://localhost:8080
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
3. **Daycare rules**: Hardcoded, not user-editable
4. **Beta access**: New signups require invite code

See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for active bugs.

---

## 📈 What's Next

### Immediate (Ready to Start)
- **Cook Mode Polish**: Multi-recipe timeline coordination, timer wake lock
- **Recipe Photos R2 Setup**: Configure Cloudflare R2 bucket for production photo storage
- **Shopping List V1.1**: Integration polish, inventory bridge improvements

### Future (Backlog)
- Shopping list generation from meal plan
- Multi-recipe cook mode with coordinated timeline
- Recipe library expansion tools
- Mobile PWA enhancements
- Dark mode toggle

See [CHANGELOG.md](CHANGELOG.md) for detailed sprint history.

---

**For More Details**:
- Full project history: [CHANGELOG.md](CHANGELOG.md)
- Latest session: [HANDOFF.md](HANDOFF.md)
- All docs: [INDEX.md](INDEX.md)
