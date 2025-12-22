#!/usr/bin/env python3
"""
Verify token usage for Phase 2.0 test.
Estimates the prompt size with ratings data included.
"""
import sys
import json
from pathlib import Path
from datetime import date, timedelta

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.data.data_manager import load_household_profile, load_groceries, load_recipe_ratings
from app.services.rag_service import retrieve_relevant_recipes, prepare_context_for_llm
from app.services.claude_service import _get_system_prompt, _build_meal_plan_prompt

def estimate_tokens(text: str) -> int:
    """Rough estimate: 1 token ≈ 4 characters"""
    return len(text) // 4

def main():
    print("=" * 60)
    print("Phase 2.0 Token Usage Verification")
    print("=" * 60)

    # Load data
    household = load_household_profile()
    groceries = load_groceries()
    recipe_ratings = load_recipe_ratings()

    print(f"\n📊 Data Loaded:")
    print(f"   - Family members: {len(household.family_members)}")
    print(f"   - Groceries: {len(groceries)}")
    print(f"   - Recipes with ratings: {len(recipe_ratings)}")

    # Retrieve recipes
    recipes = retrieve_relevant_recipes(household, groceries, num_recipes=10)
    print(f"   - Retrieved recipes: {len(recipes)}")

    # Prepare context
    context = prepare_context_for_llm(household, recipes, groceries, recipe_ratings)

    # Build prompt
    week_start = date.today()
    system_prompt = _get_system_prompt()
    user_prompt = _build_meal_plan_prompt(context, week_start.isoformat())

    # Estimate tokens
    system_tokens = estimate_tokens(system_prompt)
    user_tokens = estimate_tokens(user_prompt)
    total_tokens = system_tokens + user_tokens

    print(f"\n📏 Token Estimates:")
    print(f"   - System prompt: ~{system_tokens} tokens")
    print(f"   - User prompt: ~{user_tokens} tokens")
    print(f"   - Total: ~{total_tokens} tokens")
    print(f"   - Claude Sonnet 4.5 limit: 200,000 tokens")
    print(f"   - Remaining: ~{200000 - total_tokens} tokens")

    if total_tokens < 3500:
        print(f"\n✅ Token usage is EXCELLENT (~{total_tokens} << 3500 target)")
    elif total_tokens < 10000:
        print(f"\n✅ Token usage is GOOD (~{total_tokens} tokens, well within limit)")
    else:
        print(f"\n⚠️  Token usage is higher than expected but still acceptable")

    # Show sample rating data
    print(f"\n📋 Sample Rating Data in Context:")
    sample_recipe = context['candidate_recipes'][0]
    print(f"   Recipe: {sample_recipe['title']}")
    print(f"   Ratings: {sample_recipe.get('household_ratings', {})}")

    # Count recipes with ratings
    recipes_with_ratings = sum(
        1 for r in context['candidate_recipes']
        if r.get('household_ratings')
    )
    print(f"\n   Recipes with ratings in context: {recipes_with_ratings}/{len(context['candidate_recipes'])}")

    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
