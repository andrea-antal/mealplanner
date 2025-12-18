# Meal Planner - Frontend

React + TypeScript frontend built with Lovable for the RAG-powered Meal Planner application.

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn-ui (Radix UI primitives)
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **Toast Notifications**: Sonner

## Project Structure

```
frontend/
├── src/
│   ├── pages/              # Page components
│   │   ├── Index.tsx       # Home/Dashboard page
│   │   ├── MealPlans.tsx   # Meal plan generation & view
│   │   ├── Recipes.tsx     # Recipe browser
│   │   ├── Household.tsx   # Household profile settings
│   │   ├── Groceries.tsx   # Grocery list management
│   │   └── NotFound.tsx    # 404 page
│   ├── components/
│   │   ├── layout/         # Layout components (AppLayout, etc.)
│   │   └── ui/             # shadcn-ui components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   ├── App.tsx             # Main app component with routing
│   ├── main.tsx            # App entry point
│   └── index.css           # Global styles
├── public/                 # Static assets
└── package.json            # Dependencies
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or bun
- Backend API running at `http://localhost:8000`

### Installation

```bash
cd frontend
npm install
```

### Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Build output will be in the `dist/` directory.

## API Integration

The frontend connects to the FastAPI backend at `http://localhost:8000`.

### Backend API Endpoints

- `POST /meal-plans/generate` - Generate weekly meal plan
- `GET /household/profile` - Get household profile
- `PUT /household/profile` - Update household profile
- `GET /household/groceries` - Get grocery list
- `PUT /household/groceries` - Update grocery list
- `GET /recipes` - List all recipes
- `GET /recipes/{id}` - Get single recipe
- `POST /recipes` - Create new recipe
- `PUT /recipes/{id}` - Update recipe

See [../docs/FRONTEND_FEATURES.md](../docs/FRONTEND_FEATURES.md) for detailed API documentation and integration guide.

## Pages Overview

### Home (Index.tsx)
Dashboard with quick access to all features. Primary CTA for meal plan generation.

### Meal Plans (MealPlans.tsx)
Generate and view weekly meal plans. Displays 7-day calendar with meals organized by type (breakfast, lunch, dinner, snacks) and household member.

### Recipes (Recipes.tsx)
Browse the recipe library. View recipe details including ingredients, instructions, tags, prep time, and required appliances.

### Household (Household.tsx)
Configure household profile:
- Family members (name, age group, dietary restrictions, dislikes)
- Daycare rules (no nuts, no honey, must be cold)
- Cooking preferences (available appliances, preferred methods, skill level, time constraints)
- Meal planning preferences (weeknight vs. weekend priorities)

### Groceries (Groceries.tsx)
Manage available ingredients. Simple interface to add/remove items from current grocery inventory.

## Development

### Adding New UI Components

This project uses shadcn-ui. To add a new component:

```bash
npx shadcn@latest add [component-name]
```

Available components: button, card, dialog, form, input, select, tabs, toast, and many more.

### Modifying with Lovable

You can continue editing this frontend using Lovable (AI-powered frontend builder):

**Lovable Project URL**: https://lovable.dev/projects/060f7347-4e6c-4ec8-8e65-f73e94433c80

Changes made in Lovable will sync to the original GitHub repo: https://github.com/dreachan/pixel-perfect-clone

**Workflow for syncing Lovable changes to mealplanner repo:**
1. Make changes in Lovable
2. Changes auto-commit to pixel-perfect-clone repo
3. Pull changes from pixel-perfect-clone: `git pull origin main`
4. Copy updated files to mealplanner/frontend/

### Code Style

- TypeScript strict mode enabled
- ESLint configured for React + TypeScript
- Prettier for code formatting
- Use functional components with hooks
- Follow React Query patterns for data fetching

## Deployment

This frontend can be deployed to:
- **Vercel** (recommended - designed for Vite/React)
- **Netlify**
- Any static hosting service

### Deploying to Vercel

```bash
cd frontend
vercel --prod
```

**Environment Variables** (set in Vercel dashboard):
- `VITE_API_URL`: Backend API URL (e.g., `https://your-backend.onrender.com`)

## Architecture Notes

### Original Design Decision
From [IMPLEMENTATION_PLAN.md](../docs/IMPLEMENTATION_PLAN.md):
- **Tech Stack**: "Frontend: Lovable/Figma Make (or React fallback)"
- **Decision**: Built with Lovable, which generates a React + Vite + TypeScript app
- **Alignment**: Lovable output matches the planned React architecture perfectly

### Integration with Backend
- Backend follows the data schemas defined in [PRODUCT_REQUIREMENTS.md](../docs/PRODUCT_REQUIREMENTS.md)
- Frontend pages map to the user stories in the PRD
- RAG pipeline (Chroma + Claude) is abstracted behind REST API
- Frontend doesn't need to know about vector embeddings or LLM prompts

### Monorepo Structure
- Frontend was originally developed in separate repo (pixel-perfect-clone)
- Merged into main mealplanner repo for easier maintenance
- Both frontend/ and backend/ live at root level
- Deployment remains separate (Vercel for frontend, Render for backend)

## Notes

- Backend must be running for full functionality
- Ensure CORS is configured in backend to allow `http://localhost:5173`
- All API calls use standard fetch (wrapped in React Query hooks)
- Recipe data, household profiles, and groceries are managed server-side
