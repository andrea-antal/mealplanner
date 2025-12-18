#!/usr/bin/env python3
"""
Test script for RAG service.

Verifies that the RAG pipeline can:
1. Load household profile
2. Retrieve relevant recipes based on constraints
3. Prepare context for LLM
"""
import sys
import json
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.rag_service import retrieve_relevant_recipes, prepare_context_for_llm
from app.data.data_manager import load_household_profile, load_groceries


def main():
    print("=" * 60)
    print("RAG Service Test")
    print("=" * 60)

    # Load household profile
    print("\n[1/3] Loading household profile...")
    household = load_household_profile()

    if not household:
        print("✗ No household profile found")
        print("  Run from backend/ directory or check data/household_profile.json")
        sys.exit(1)

    print(f"✓ Loaded household with {len(household.family_members)} members:")
    for member in household.family_members:
        print(f"  - {member.name} ({member.age_group})")

    # Load groceries
    print("\n[2/3] Loading available groceries...")
    groceries = load_groceries()
    print(f"✓ Found {len(groceries)} groceries: {', '.join(groceries[:5])}{'...' if len(groceries) > 5 else ''}")

    # Retrieve relevant recipes
    print("\n[3/3] Retrieving relevant recipes...")
    recipes = retrieve_relevant_recipes(
        household=household,
        available_groceries=groceries,
        num_recipes=5
    )

    if not recipes:
        print("✗ No recipes found")
        print("  Ensure recipes are seeded in Chroma: python scripts/seed_recipes.py")
        sys.exit(1)

    print(f"✓ Retrieved {len(recipes)} relevant recipes:")
    for i, recipe in enumerate(recipes, 1):
        print(f"\n  {i}. {recipe.title}")
        print(f"     Tags: {', '.join(recipe.tags)}")
        print(f"     Time: {recipe.prep_time_minutes}min prep + {recipe.active_cooking_time_minutes}min active")
        print(f"     Serves: {recipe.serves}")

    # Prepare context for LLM
    print("\n[4/4] Preparing context for LLM...")
    context = prepare_context_for_llm(
        household=household,
        recipes=recipes,
        available_groceries=groceries
    )

    print(f"✓ Context prepared with:")
    print(f"  - {len(context['household']['family_members'])} family members")
    print(f"  - {len(context['available_groceries'])} groceries")
    print(f"  - {len(context['candidate_recipes'])} candidate recipes")
    print(f"  - Allergies: {', '.join(context['household']['all_allergies']) if context['household']['all_allergies'] else 'None'}")
    print(f"  - Dislikes: {', '.join(context['household']['all_dislikes']) if context['household']['all_dislikes'] else 'None'}")

    # Show sample of context (first recipe)
    print("\n" + "=" * 60)
    print("Sample Context (First Recipe):")
    print("=" * 60)
    if context['candidate_recipes']:
        first_recipe = context['candidate_recipes'][0]
        print(json.dumps(first_recipe, indent=2))

    print("\n" + "=" * 60)
    print("✅ RAG Service Test Complete!")
    print("=" * 60)
    print("\n📋 Ready for Phase 3: Claude Integration")
    print("   Next: Build claude_service.py to generate meal plans")


if __name__ == "__main__":
    main()
