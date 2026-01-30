# Meal Planner — C4 Architecture Diagrams

This document describes the Meal Planner system architecture using C4 model diagrams (Context, Container, Component). Each level zooms in further, from the bird's-eye view down to internal backend and frontend structure.

> **Rendering:** These diagrams use Mermaid syntax. View them in GitHub's markdown preview, VS Code with a Mermaid extension, or paste into [mermaid.live](https://mermaid.live).

---

## Level 1: System Context

The system context shows who interacts with the Meal Planner and what external services it depends on.

```mermaid
C4Context
    title Meal Planner - System Context

    Person(user, "Household Member", "Plans meals, manages groceries, rates recipes")
    Person(admin, "Admin", "Monitors workspaces, manages invites, views analytics")

    System(mealplanner, "Meal Planner", "AI-powered meal planning app with recipe management, grocery tracking, and shopping lists")

    System_Ext(supabase, "Supabase", "PostgreSQL database + Auth (JWT, OAuth, magic links)")
    System_Ext(claude, "Anthropic Claude API", "LLM for meal plan generation, recipe parsing, OCR, voice-to-grocery")
    System_Ext(linear, "Linear", "Issue tracker for user feedback")

    Rel(user, mealplanner, "Uses", "HTTPS")
    Rel(admin, mealplanner, "Manages", "HTTPS + Admin Key")
    Rel(mealplanner, supabase, "Reads/writes data, authenticates users")
    Rel(mealplanner, claude, "Generates content, parses recipes/receipts")
    Rel(mealplanner, linear, "Creates feedback issues", "GraphQL API")
```

---

## Level 2: Container Diagram

The container diagram breaks the system into its major deployable units — the React SPA on Vercel, the FastAPI backend on Railway, embedded ChromaDB for vector search, and the external services.

```mermaid
C4Container
    title Meal Planner - Container Diagram

    Person(user, "Household Member")
    Person(admin, "Admin")

    System_Boundary(mp, "Meal Planner") {
        Container(frontend, "Frontend SPA", "React 18, TypeScript, Vite, Tailwind, shadcn/ui", "Single-page app deployed on Vercel. Mobile-first responsive UI.")
        Container(backend, "Backend API", "Python, FastAPI, Uvicorn", "REST API deployed on Railway (Docker). Handles business logic, AI orchestration, multi-tenant data access.")
        ContainerDb(chroma, "ChromaDB", "Embedded vector DB", "Recipe embeddings for semantic search (RAG). Disk-persisted on Railway.")
    }

    System_Ext(supabase_auth, "Supabase Auth", "Google OAuth, magic links, JWT sessions")
    System_Ext(supabase_db, "Supabase PostgreSQL", "Persistent storage with Row-Level Security. Tables: recipes, meal_plans, groceries, shopping_lists, household_profiles, etc.")
    System_Ext(claude, "Anthropic Claude API", "Sonnet 4.5 (default) + Opus 4.5 (high-accuracy OCR)")
    System_Ext(linear, "Linear API", "Feedback issue creation")

    Rel(user, frontend, "Uses", "HTTPS")
    Rel(admin, frontend, "Admin panel at /a", "HTTPS")
    Rel(frontend, supabase_auth, "Auth flows (OAuth, magic link, session)", "HTTPS")
    Rel(frontend, backend, "API calls with JWT + workspace_id", "HTTPS / REST")
    Rel(backend, supabase_db, "CRUD with RLS", "HTTPS")
    Rel(backend, supabase_auth, "Validates JWT, fetches user", "HTTPS")
    Rel(backend, claude, "Meal plans, recipe parsing, OCR, voice parsing", "HTTPS")
    Rel(backend, chroma, "Embed & search recipes", "In-process")
    Rel(backend, linear, "Create feedback issues", "HTTPS / GraphQL")
```

---

## Level 3: Component — Backend

This diagram shows the internal structure of the FastAPI backend, organized into three layers: API routers, services, and data/middleware.

```mermaid
C4Component
    title Meal Planner Backend - Component Diagram

    Container_Boundary(api, "API Layer (FastAPI Routers)") {
        Component(auth_router, "Auth Router", "/auth", "Login, invite validation, workspace migration")
        Component(meal_plan_router, "Meal Plans Router", "/meal-plans", "Generate, list, swap, undo")
        Component(recipe_router, "Recipes Router", "/recipes", "CRUD, import URL, parse text, OCR photo, generate, ratings")
        Component(household_router, "Household Router", "/household", "Profile, groceries, onboarding")
        Component(grocery_router, "Groceries Router", "/groceries", "Inventory CRUD, voice parse, receipt OCR, expiry tracking")
        Component(shopping_router, "Shopping Router", "/shopping-list, /shopping-templates", "Shopping lists, templates, check-off-to-inventory bridge")
        Component(admin_router, "Admin Router", "/workspaces, /admin", "Workspace stats, error logs, account deletion, analytics")
        Component(feedback_router, "Feedback Router", "/feedback", "Submit feedback as Linear issue")
        Component(invites_router, "Invites Router", "/invites", "Create/list/disable invite codes")
    }

    Container_Boundary(services, "Service Layer") {
        Component(claude_svc, "Claude Service", "claude_service.py", "All Anthropic API calls: meal plans, recipe generation, parsing, OCR")
        Component(meal_plan_svc, "Meal Plan Service", "meal_plan_service.py", "Orchestrates: load household + groceries, RAG retrieval, Claude generation")
        Component(rag_svc, "RAG Service", "rag_service.py", "Semantic recipe search via pgvector/Supabase, builds LLM context")
        Component(filter_svc, "Recipe Filter Service", "recipe_filter_service.py", "Alternative recipe suggestions with constraint filtering")
        Component(starter_svc, "Starter Content Service", "starter_content_service.py", "Background generation of starter recipes and meal plans during onboarding")
        Component(onboarding_log, "Onboarding Logger", "onboarding_logger.py", "Funnel analytics: completion, skip, answer distributions")
        Component(storage_cat, "Storage Categories", "storage_categories.py", "Infer fridge/pantry location from item name")
        Component(url_fetch, "URL Fetcher", "url_fetcher.py", "Fetch recipe HTML with print-friendly detection")
    }

    Container_Boundary(data, "Data & Middleware Layer") {
        Component(supabase_client, "Supabase Client", "db/supabase_client.py", "Regular (RLS) + Admin (bypass RLS) + User-scoped clients")
        Component(chroma_mgr, "ChromaDB Manager", "data/chroma_manager.py", "Embed, search, delete recipe vectors")
        Component(req_logger, "Request Logger Middleware", "middleware/", "Logs all requests to request_log.jsonl")
        Component(api_tracker, "API Call Tracker", "middleware/", "Tracks Claude/OpenAI calls to api_calls.jsonl")
    }

    Rel(meal_plan_router, meal_plan_svc, "Calls")
    Rel(meal_plan_svc, rag_svc, "Retrieves relevant recipes")
    Rel(meal_plan_svc, claude_svc, "Generates meal plan")
    Rel(recipe_router, claude_svc, "Parse/generate recipes")
    Rel(grocery_router, claude_svc, "Voice & receipt parsing")
    Rel(household_router, starter_svc, "Triggers background content gen")
    Rel(rag_svc, supabase_client, "pgvector semantic search")
    Rel(rag_svc, chroma_mgr, "Fallback vector search")
    Rel(claude_svc, api_tracker, "Logs API calls")
```

---

## Level 3: Component — Frontend

The frontend is a React SPA organized into pages, state management, an API client layer, and shared components/hooks.

```mermaid
C4Component
    title Meal Planner Frontend - Component Diagram

    Container_Boundary(pages, "Pages (React Router)") {
        Component(index_page, "Index / Dashboard", "/", "Home with onboarding entry, quick stats")
        Component(mealplan_page, "Meal Plans", "/meal-plans", "Generate, view, swap recipes in plans")
        Component(recipe_page, "Recipes", "/recipes", "Browse, create, import, rate recipes")
        Component(grocery_page, "Groceries", "/groceries", "Inventory tab + Shopping List tab")
        Component(household_page, "Household", "/household", "Family members, preferences, daycare rules")
        Component(cook_page, "Cook", "/cook", "Cooking preferences")
        Component(admin_page, "Admin", "/a", "Workspace analytics, error logs")
        Component(auth_pages, "Auth Pages", "/login, /signup, /auth/*", "Login, signup, OAuth callback, email verify")
    }

    Container_Boundary(state, "State Management") {
        Component(auth_ctx, "Auth Context", "AuthContext.tsx", "Session, user, workspace_id, login/logout")
        Component(react_query, "React Query", "TanStack Query v5", "Server state: queries + mutations per domain")
    }

    Container_Boundary(api_layer, "API Client Layer") {
        Component(api_client, "API Client", "lib/api.ts", "Fetch-based HTTP client. Modules: household, groceries, shopping, recipes, mealPlans, onboarding, admin")
        Component(auth_lib, "Auth Library", "lib/auth.ts", "Google OAuth, magic links, invite code validation, session management")
        Component(supa_client, "Supabase Client", "lib/supabase.ts", "Direct Supabase JS SDK for auth flows")
    }

    Container_Boundary(shared, "Shared Components & Hooks") {
        Component(layout, "AppLayout", "layout/AppLayout.tsx", "Header, desktop nav, mobile bottom nav, feedback modal")
        Component(guard, "WorkspaceGuard", "workspace/WorkspaceGuard.tsx", "Redirects unauthenticated users to /login")
        Component(hooks, "Custom Hooks", "hooks/", "useAutoSave, useVoiceInput, useNukeWithUndo, useMobile")
        Component(ui_lib, "shadcn/ui + Radix", "ui/", "50+ accessible UI primitives")
    }

    Rel(pages, react_query, "useQuery / useMutation")
    Rel(react_query, api_client, "Calls API functions")
    Rel(auth_pages, auth_lib, "Auth flows")
    Rel(auth_lib, supa_client, "Supabase Auth SDK")
    Rel(pages, auth_ctx, "useAuth()")
    Rel(pages, hooks, "Shared behavior")
    Rel(pages, ui_lib, "UI components")
    Rel(layout, guard, "Wraps protected routes")
```

---

## Data Flow Summary

A simplified end-to-end view of how a request flows from the browser through all system components.

```mermaid
flowchart LR
    subgraph User
        B[Browser]
    end

    subgraph Vercel
        F[React SPA]
    end

    subgraph Supabase
        SA[Auth]
        SP[PostgreSQL + pgvector]
    end

    subgraph Railway
        API[FastAPI]
        CV[ChromaDB]
    end

    subgraph Anthropic
        CL[Claude API]
    end

    subgraph Linear
        LN[Issue Tracker]
    end

    B -->|HTTPS| F
    F -->|OAuth / Magic Link| SA
    F -->|REST + JWT| API
    API -->|JWT validation| SA
    API -->|CRUD + RLS| SP
    API -->|Semantic search| SP
    API -->|Vector embed/search| CV
    API -->|Generate / Parse / OCR| CL
    API -->|Feedback issues| LN
```
