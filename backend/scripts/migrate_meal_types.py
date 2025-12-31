#!/usr/bin/env python3
"""
Migration script to add meal_types field to all existing recipes.

This script:
1. Scans all workspaces for recipe directories
2. Also checks the legacy /data/recipes/ folder
3. For each recipe, infers meal_types based on:
   - Existing tags containing meal-type keywords
   - Title keywords (breakfast, lunch, dinner, snack)
   - Defaults to ["dinner"] if unclear
4. Saves the updated recipes

Usage:
    python scripts/migrate_meal_types.py [--dry-run]

Example:
    python scripts/migrate_meal_types.py --dry-run  # Preview changes
    python scripts/migrate_meal_types.py            # Apply changes
"""

import sys
import json
from pathlib import Path
import re

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings
from app.models.recipe import VALID_MEAL_TYPES

# Keywords to match for each meal type (case-insensitive)
MEAL_TYPE_KEYWORDS = {
    "breakfast": [
        "breakfast", "oatmeal", " oat ", "pancake", "waffle", "scrambled egg", "fried egg",
        "poached egg", "boiled egg", "eggs benedict", "cereal", " toast", "muffin",
        "smoothie", "granola", "yogurt parfait", "french toast", "bacon", "sausage",
        "hash brown", "bagel", "brunch"
    ],
    "lunch": [
        "lunch", "sandwich", "salad", "wrap", "soup", "panini", "burger",
        "quesadilla", "bowl", "pita"
    ],
    "dinner": [
        "dinner", "stir-fry", "stir fry", "stirfry", "roast", "baked",
        "casserole", "pasta", "curry", "stew", "grilled", "braised",
        "chicken", "beef", "pork", "fish", "salmon", "tilapia", "shrimp",
        "tofu dinner", "rice bowl"
    ],
    "snack": [
        "snack", "bar", "bars", "bites", "cookie", "cookies", "cracker",
        "chip", "dip", "popcorn", "nuts", "trail mix", "fruit", "veggie sticks"
    ]
}


def infer_meal_types(recipe: dict) -> list[str]:
    """
    Infer meal_types for a recipe based on its title and tags.

    Returns:
        List of meal types (at least one, defaults to ["dinner"])
    """
    meal_types = set()

    # Combine title and tags for searching
    title = recipe.get("title", "").lower()
    tags = [tag.lower() for tag in recipe.get("tags", [])]
    search_text = title + " " + " ".join(tags)

    # Check for direct meal type mentions in tags first
    for tag in tags:
        if tag in VALID_MEAL_TYPES:
            meal_types.add(tag)

    # If no direct match, check title against keywords
    if not meal_types:
        for meal_type, keywords in MEAL_TYPE_KEYWORDS.items():
            for keyword in keywords:
                if keyword in search_text:
                    meal_types.add(meal_type)
                    break  # Found match for this meal type

    # Special handling for versatile foods
    versatile_foods = ["omelette", "omelet", "frittata", "quiche"]
    for food in versatile_foods:
        if food in title:
            meal_types.update(["breakfast", "lunch"])

    # Default to dinner if no meal types found
    if not meal_types:
        meal_types.add("dinner")

    return sorted(list(meal_types))


def migrate_recipes_in_directory(recipes_dir: Path, dry_run: bool = False) -> dict:
    """
    Migrate all recipes in a directory to include meal_types.

    Returns:
        Statistics dict with counts
    """
    stats = {
        "total": 0,
        "updated": 0,
        "already_has_meal_types": 0,
        "errors": 0
    }

    if not recipes_dir.exists():
        return stats

    for recipe_file in recipes_dir.glob("*.json"):
        stats["total"] += 1

        try:
            with open(recipe_file, "r") as f:
                recipe = json.load(f)

            # Skip if already has non-empty meal_types
            if recipe.get("meal_types") and len(recipe["meal_types"]) > 0:
                stats["already_has_meal_types"] += 1
                print(f"  [skip] {recipe_file.name}: already has meal_types")
                continue

            # Infer meal types
            meal_types = infer_meal_types(recipe)
            recipe["meal_types"] = meal_types

            if dry_run:
                print(f"  [dry-run] {recipe_file.name}: would set meal_types={meal_types}")
            else:
                with open(recipe_file, "w") as f:
                    json.dump(recipe, f, indent=2)
                print(f"  [updated] {recipe_file.name}: meal_types={meal_types}")

            stats["updated"] += 1

        except Exception as e:
            stats["errors"] += 1
            print(f"  [error] {recipe_file.name}: {e}")

    return stats


def main():
    dry_run = "--dry-run" in sys.argv

    print("=" * 60)
    print("Meal Types Migration Script")
    print("=" * 60)
    print()

    if dry_run:
        print("*** DRY RUN MODE - No changes will be made ***")
        print()

    data_dir = Path(settings.DATA_DIR)
    print(f"Data directory: {data_dir}")
    print()

    total_stats = {
        "total": 0,
        "updated": 0,
        "already_has_meal_types": 0,
        "errors": 0
    }

    # 1. Migrate legacy recipes in /data/recipes/
    legacy_recipes_dir = data_dir / "recipes"
    if legacy_recipes_dir.exists():
        print(f"Processing legacy recipes: {legacy_recipes_dir}")
        stats = migrate_recipes_in_directory(legacy_recipes_dir, dry_run)
        for key in total_stats:
            total_stats[key] += stats[key]
        print()

    # 2. Find and migrate workspace recipes
    print("Searching for workspace recipe directories...")
    for item in data_dir.iterdir():
        if item.is_dir() and item.name not in ["recipes", "chroma_db", "__pycache__"]:
            workspace_recipes_dir = item / "recipes"
            if workspace_recipes_dir.exists():
                print(f"\nProcessing workspace '{item.name}': {workspace_recipes_dir}")
                stats = migrate_recipes_in_directory(workspace_recipes_dir, dry_run)
                for key in total_stats:
                    total_stats[key] += stats[key]

    # Summary
    print()
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Total recipes found:     {total_stats['total']}")
    print(f"Updated:                 {total_stats['updated']}")
    print(f"Already had meal_types:  {total_stats['already_has_meal_types']}")
    print(f"Errors:                  {total_stats['errors']}")
    print()

    if dry_run:
        print("This was a dry run. Run without --dry-run to apply changes.")
    else:
        print("Migration complete!")


if __name__ == "__main__":
    main()
