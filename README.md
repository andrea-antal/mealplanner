# Meal Planner

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

AI-powered meal planning for busy families. Tell it what's in your fridge, who's eating, and any allergies - it creates a week of meals that actually work.

## What You Can Do

- **Generate weekly meal plans** that account for everyone's dietary needs
- **Snap photos of recipes** from cookbooks or handwritten cards
- **Speak your groceries** and it adds them to your list
- **Track expiring food** so nothing goes to waste
- **Set up daycare/school rules** (nut-free, cold meals only, etc.)
- **Rate recipes** so the app learns what your family likes
- **Swap meals** in your plan and get smart alternatives

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)
- An [Anthropic API key](https://console.anthropic.com/) for Claude

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/andrea-antal/mealplanner.git
   cd mealplanner
   ```

2. **Set up the backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt

   # Copy and configure environment variables
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Set up the frontend**
   ```bash
   cd frontend
   npm install

   # Copy and configure environment variables
   cp .env.example .env.local
   # Edit .env.local with your Supabase keys
   ```

4. **Set up Supabase**
   - Create a new Supabase project
   - Run the SQL migrations in `backend/migrations/` (if any)
   - Enable Google OAuth in Authentication > Providers (optional)
   - Copy your project URL and keys to the `.env` files

5. **Run locally**
   ```bash
   # Terminal 1: Backend
   cd backend
   source venv/bin/activate
   uvicorn app.main:app --reload
   # API runs at http://localhost:8000

   # Terminal 2: Frontend
   cd frontend
   npm run dev
   # App runs at http://localhost:5173
   ```

## Built With

**Frontend**: React 18 with TypeScript, Vite, TanStack Query for server state, and shadcn/ui components (Radix + Tailwind).

**Backend**: FastAPI with Pydantic models. Uses Claude for AI generation and Chroma as a vector database for semantic recipe search (RAG pattern).

**Deployment**: Vercel (frontend) and Railway (backend), both auto-deploy from GitHub on push to main.

## Documentation

- [Current State](docs/CURRENT_STATE.md) - What's working now
- [Product Requirements](docs/PRODUCT_REQUIREMENTS.md) - Feature specifications
- [Changelog](docs/CHANGELOG.md) - Release history

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
