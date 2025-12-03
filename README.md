# Meal Planner with RAG

A RAG-powered meal planning application that generates weekly meal plans based on complex household constraints, available groceries, and cooking preferences.

## Overview

This is a portfolio project demonstrating:
- RAG (Retrieval Augmented Generation) implementation
- Operational complexity problem-solving with AI
- Full-stack development with modern tech stack

**Built by**: Andrea (Senior PM learning AI implementation)
**Purpose**: Portfolio artifact for job search + functional daily meal planning tool

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: Lovable/Figma Make (or React)
- **Vector DB**: Chroma (local, open source)
- **LLM**: Claude API (Anthropic)
- **Deployment**: Vercel (frontend) + Render (backend)

## Quick Links

- [Project Context](docs/PROJECT_CONTEXT.md) - Why this project exists and what it demonstrates
- [Product Requirements](docs/PRODUCT_REQUIREMENTS.md) - Detailed feature specs and data schemas
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) - Architecture and development roadmap
- [Agent Instructions](docs/AGENTS.md) - Instructions for AI coding assistants

## Features (v0.1)

- ✅ Input household dietary constraints (allergies, dislikes, daycare rules)
- ✅ Input available groceries
- ✅ Input cooking preferences and available appliances
- ✅ Generate weekly meal plans with RAG-powered recipe retrieval
- ✅ Admin UI to manage recipes
- ✅ Constraint satisfaction across multiple competing requirements

## Project Status

🚧 **In Development** - Phase 0: Project setup and planning complete

See [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) for detailed roadmap.

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
