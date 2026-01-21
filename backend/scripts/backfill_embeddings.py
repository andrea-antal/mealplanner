#!/usr/bin/env python3
"""
Backfill embeddings for existing recipes that don't have them.

Usage:
    cd backend
    python scripts/backfill_embeddings.py                    # All workspaces
    python scripts/backfill_embeddings.py --workspace abc123 # Specific workspace
    python scripts/backfill_embeddings.py --dry-run          # Preview only

Environment variables required:
    SUPABASE_URL
    SUPABASE_SECRET_KEY
    OPENAI_API_KEY
"""
import os
import sys
import logging
import argparse
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def backfill_workspace_embeddings(workspace_id: str, dry_run: bool = False) -> dict:
    """
    Backfill embeddings for recipes in a workspace.

    Returns:
        Dict with stats: total, already_embedded, newly_embedded, failed
    """
    from supabase import create_client
    from openai import OpenAI

    # Initialize clients
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SECRET_KEY"]
    )
    openai_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

    stats = {
        "total": 0,
        "already_embedded": 0,
        "newly_embedded": 0,
        "failed": 0
    }

    # Get all recipes for workspace
    response = supabase.table("recipes").select(
        "id, title, description, tags, ingredients, embedding"
    ).eq("workspace_id", workspace_id).execute()

    recipes = response.data
    stats["total"] = len(recipes)

    logger.info(f"Found {len(recipes)} recipes in workspace '{workspace_id}'")

    for recipe in recipes:
        recipe_id = recipe["id"]
        title = recipe["title"]

        # Check if already has embedding
        if recipe.get("embedding"):
            stats["already_embedded"] += 1
            logger.debug(f"  {title}: already has embedding")
            continue

        if dry_run:
            logger.info(f"  [DRY RUN] Would generate embedding for: {title}")
            stats["newly_embedded"] += 1
            continue

        try:
            # Build text for embedding (same logic as _generate_recipe_embedding)
            parts = [title]
            if recipe.get("description"):
                parts.append(recipe["description"])
            if recipe.get("tags"):
                parts.append(" ".join(recipe["tags"]))
            if recipe.get("ingredients"):
                # Handle both string and list ingredients
                ingredients = recipe["ingredients"]
                if isinstance(ingredients, list):
                    parts.append(" ".join(str(i) for i in ingredients[:10]))
                else:
                    parts.append(str(ingredients)[:500])

            text_for_embedding = " | ".join(parts)

            # Generate embedding
            response = openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=text_for_embedding
            )
            embedding = response.data[0].embedding

            # Update recipe with embedding
            supabase.table("recipes").update({
                "embedding": embedding
            }).eq("workspace_id", workspace_id).eq("id", recipe_id).execute()

            stats["newly_embedded"] += 1
            logger.info(f"  Generated embedding for: {title}")

        except Exception as e:
            stats["failed"] += 1
            logger.error(f"  Failed to generate embedding for {title}: {e}")

    return stats


def get_all_workspaces() -> list:
    """Get all unique workspace IDs from recipes table."""
    from supabase import create_client

    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SECRET_KEY"]
    )

    response = supabase.table("recipes").select("workspace_id").execute()

    # Get unique workspace IDs
    workspace_ids = set(r["workspace_id"] for r in response.data if r.get("workspace_id"))
    return sorted(workspace_ids)


def main():
    parser = argparse.ArgumentParser(
        description="Backfill embeddings for recipes without them"
    )
    parser.add_argument(
        "--workspace",
        type=str,
        help="Specific workspace ID to process (default: all workspaces)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without generating embeddings"
    )
    args = parser.parse_args()

    # Validate environment
    required_vars = ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "OPENAI_API_KEY"]
    missing = [v for v in required_vars if not os.environ.get(v)]
    if missing:
        logger.error(f"Missing environment variables: {', '.join(missing)}")
        sys.exit(1)

    logger.info("=" * 60)
    logger.info("Recipe Embedding Backfill")
    logger.info("=" * 60)

    if args.dry_run:
        logger.info("MODE: DRY RUN (no changes will be made)")
    else:
        logger.info("MODE: LIVE (embeddings will be generated)")

    # Get workspaces to process
    if args.workspace:
        workspaces = [args.workspace]
    else:
        workspaces = get_all_workspaces()
        logger.info(f"Found {len(workspaces)} workspaces with recipes")

    # Process each workspace
    total_stats = {
        "total": 0,
        "already_embedded": 0,
        "newly_embedded": 0,
        "failed": 0
    }

    for workspace_id in workspaces:
        logger.info(f"\n--- Processing workspace: {workspace_id} ---")
        stats = backfill_workspace_embeddings(workspace_id, args.dry_run)

        for key in total_stats:
            total_stats[key] += stats[key]

    # Print summary
    logger.info("\n" + "=" * 60)
    logger.info("SUMMARY")
    logger.info("=" * 60)
    logger.info(f"Total recipes:      {total_stats['total']}")
    logger.info(f"Already embedded:   {total_stats['already_embedded']}")
    logger.info(f"Newly embedded:     {total_stats['newly_embedded']}")
    logger.info(f"Failed:             {total_stats['failed']}")

    if args.dry_run:
        logger.info("\n[DRY RUN] No changes were made. Run without --dry-run to generate embeddings.")


if __name__ == "__main__":
    main()
