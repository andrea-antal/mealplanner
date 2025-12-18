#!/usr/bin/env python3
"""
Quick test script to verify Chroma query functionality.

Tests semantic search for recipes based on natural language queries.
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.data.chroma_manager import query_recipes, get_recipe_count

def main():
    print("=" * 60)
    print("Chroma Query Test")
    print("=" * 60)

    # Check recipe count
    count = get_recipe_count()
    print(f"\n✓ Found {count} recipes in Chroma DB\n")

    # Test queries
    test_queries = [
        "quick chicken dinner",
        "toddler breakfast",
        "easy pasta meal",
        "one pot dish"
    ]

    for query in test_queries:
        print(f"\nQuery: '{query}'")
        print("-" * 60)

        results = query_recipes(query, n_results=3)

        if results:
            for i, result in enumerate(results, 1):
                print(f"{i}. {result['title']}")
                print(f"   Tags: {', '.join(result['tags'])}")
                print(f"   Distance: {result['distance']:.4f} (lower = more similar)")
        else:
            print("No results found")

    print("\n" + "=" * 60)
    print("Query test complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
