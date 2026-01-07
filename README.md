# Meal Planner

AI-powered meal planning for busy families. Tell it what's in your fridge, who's eating, and any allergies - it creates a week of meals that actually work.

Currently in closed beta.

## What You Can Do

- **Generate weekly meal plans** that account for everyone's dietary needs
- **Snap photos of recipes** from cookbooks or handwritten cards
- **Speak your groceries** and it adds them to your list
- **Track expiring food** so nothing goes to waste
- **Set up daycare/school rules** (nut-free, cold meals only, etc.)
- **Rate recipes** so the app learns what your family likes
- **Swap meals** in your plan and get smart alternatives

## Built With

**Frontend**: React 18 with TypeScript, Vite, TanStack Query for server state, and shadcn/ui components (Radix + Tailwind).

**Backend**: FastAPI with Pydantic models. Uses Claude for AI generation and Chroma as a vector database for semantic recipe search (RAG pattern).

**Deployment**: Vercel (frontend) and Railway (backend), both auto-deploy from GitHub on push to main.

## Links

- [Releases](https://github.com/andrea-antal/mealplanner/releases)
- [Product Requirements](docs/PRODUCT_REQUIREMENTS.md)

## License

Private project - All rights reserved
