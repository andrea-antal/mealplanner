#!/usr/bin/env python3
"""
Seed script to load recipes from JSON files into Chroma vector database.

Usage:
    python scripts/seed_recipes.py [--reset]

Options:
    --reset: Delete existing embeddings and re-seed from scratch
"""
import sys
import argparse
from pathlib import Path

# Add parent directory to path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.data.data_manager import list_all_recipes
from app.data.chroma_manager import (
    embed_recipes,
    get_recipe_count,
    reset_collection,
    initialize_chroma
)


def main():
    parser = argparse.ArgumentParser(
        description="Seed Chroma DB with recipes from JSON files"
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete existing embeddings and re-seed from scratch"
    )
    args = parser.parse_args()

    print("=" * 60)
    print("Recipe Seeding Script")
    print("=" * 60)

    # Initialize Chroma
    print("\n[1/4] Initializing Chroma DB...")
    initialize_chroma()
    print("✓ Chroma DB initialized")

    # Optionally reset collection
    if args.reset:
        print("\n[2/4] Resetting recipes collection...")
        reset_collection()
        print("✓ Collection reset")
    else:
        print("\n[2/4] Using existing collection")
        existing_count = get_recipe_count()
        print(f"✓ Found {existing_count} existing recipes")

    # Load recipes from JSON files
    print("\n[3/4] Loading recipes from data/recipes/...")
    recipes = list_all_recipes()

    if not recipes:
        print("✗ No recipes found in data/recipes/")
        print("  Please add recipe JSON files to backend/data/recipes/")
        sys.exit(1)

    print(f"✓ Loaded {len(recipes)} recipes from JSON files")

    # Embed recipes
    print("\n[4/4] Embedding recipes into Chroma...")
    embedded_count = embed_recipes(recipes)
    print(f"✓ Embedded {embedded_count} recipes")

    # Final summary
    final_count = get_recipe_count()
    print("\n" + "=" * 60)
    print(f"SUCCESS: Chroma DB now contains {final_count} recipes")
    print("=" * 60)

    # Show sample recipes
    print("\nSample recipes embedded:")
    for i, recipe in enumerate(recipes[:5], 1):
        print(f"  {i}. {recipe.title}")
        print(f"     Tags: {', '.join(recipe.tags)}")
        print(f"     Appliances: {', '.join(recipe.required_appliances)}")


if __name__ == "__main__":
    main()
