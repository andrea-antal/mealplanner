#!/usr/bin/env python3
"""
End-to-end test for meal plan generation.

Tests the complete pipeline:
1. Load household profile and groceries
2. Retrieve relevant recipes via RAG
3. Generate meal plan with Claude API
4. Display formatted results
"""
import sys
import json
from pathlib import Path
from datetime import date, timedelta

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.meal_plan_service import generate_meal_plan


def main():
    print("=" * 60)
    print("End-to-End Meal Plan Generation Test")
    print("=" * 60)

    # Set week start date (next Monday)
    today = date.today()
    days_ahead = 0 - today.weekday()  # Monday is 0
    if days_ahead <= 0:
        days_ahead += 7
    week_start = today + timedelta(days=days_ahead)

    print(f"\n📅 Generating meal plan for week of {week_start}")
    print(f"   (Today is {today})\n")

    # Generate meal plan
    print("[1/3] Loading household profile and groceries...")
    print("[2/3] Retrieving relevant recipes via RAG...")
    print("[3/3] Calling Claude API to generate meal plan...")
    print()

    meal_plan = generate_meal_plan(
        week_start_date=week_start,
        num_recipes=10  # Use 10 candidate recipes
    )

    if not meal_plan:
        print("\n❌ FAILED: Meal plan generation failed")
        print("   Check logs for details")
        sys.exit(1)

    # Display results
    print("\n" + "=" * 60)
    print("✅ SUCCESS: Meal Plan Generated!")
    print("=" * 60)

    print(f"\n📋 Week of {meal_plan.week_start_date}")
    print(f"   Total days: {len(meal_plan.days)}")
    print(f"   Total meals: {sum(len(day.meals) for day in meal_plan.days)}")

    # Show each day
    for i, day in enumerate(meal_plan.days, 1):
        print(f"\n{'─' * 60}")
        print(f"Day {i}: {day.date}")
        print(f"{'─' * 60}")

        # Group meals by type
        meals_by_type = {}
        for meal in day.meals:
            if meal.meal_type not in meals_by_type:
                meals_by_type[meal.meal_type] = []
            meals_by_type[meal.meal_type].append(meal)

        # Display in order: breakfast, lunch, dinner, snack
        for meal_type in ["breakfast", "lunch", "dinner", "snack"]:
            if meal_type in meals_by_type:
                for meal in meals_by_type[meal_type]:
                    print(f"\n  {meal.meal_type.upper():12} | {meal.recipe_title}")
                    print(f"               | For: {meal.for_who}")
                    if meal.notes:
                        print(f"               | Note: {meal.notes}")

    # Save to JSON file
    output_file = Path(__file__).parent.parent / "data" / "generated_meal_plan.json"
    with open(output_file, 'w') as f:
        json.dump(meal_plan.model_dump(), f, indent=2, default=str)

    print("\n" + "=" * 60)
    print(f"📁 Meal plan saved to: {output_file}")
    print("=" * 60)

    print("\n✨ End-to-end test complete!")
    print("   Phase 3 (Claude Integration) validated ✅")


if __name__ == "__main__":
    main()
