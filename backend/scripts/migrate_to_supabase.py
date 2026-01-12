#!/usr/bin/env python3
"""
Migration script to move data from JSON files to Supabase.

This script:
1. Reads all workspaces from the JSON file storage
2. Migrates recipes, meal plans, groceries, household profiles, and ratings
3. Migrates invite codes and redemptions
4. Generates embeddings for recipes (optional)

Usage:
    cd backend
    python scripts/migrate_to_supabase.py

Environment variables required:
    SUPABASE_URL
    SUPABASE_SECRET_KEY (service role key for bypassing RLS)
    OPENAI_API_KEY (optional, for generating embeddings)
"""
import os
import sys
import json
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from supabase import create_client, Client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Data directory (relative to backend/)
DATA_DIR = Path(__file__).parent.parent / "data"


def get_supabase_client() -> Client:
    """Create Supabase admin client."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SECRET_KEY")

    if not url or not key:
        raise RuntimeError(
            "Missing environment variables. Set SUPABASE_URL and SUPABASE_SECRET_KEY"
        )

    return create_client(url, key)


def list_workspaces() -> List[str]:
    """List all workspace directories."""
    if not DATA_DIR.exists():
        logger.warning(f"Data directory not found: {DATA_DIR}")
        return []

    skip_dirs = {'chroma_db', 'users', '.DS_Store'}
    workspaces = []

    for item in DATA_DIR.iterdir():
        if item.is_dir() and item.name not in skip_dirs and not item.name.startswith('.'):
            workspaces.append(item.name)

    return sorted(workspaces)


def load_json_file(filepath: Path) -> Optional[Dict]:
    """Load a JSON file, returning None if it doesn't exist."""
    if not filepath.exists():
        return None
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading {filepath}: {e}")
        return None


def migrate_household_profile(supabase: Client, workspace_id: str) -> bool:
    """Migrate household profile for a workspace."""
    filepath = DATA_DIR / workspace_id / "household_profile.json"
    data = load_json_file(filepath)

    if not data:
        logger.info(f"  No household profile for {workspace_id}")
        return False

    try:
        record = {
            "workspace_id": workspace_id,
            "family_members": data.get("family_members", []),
            "daycare_rules": data.get("daycare_rules", {}),
            "cooking_preferences": data.get("cooking_preferences", {}),
            "preferences": data.get("preferences", {}),
            "onboarding_status": data.get("onboarding_status", {}),
            "onboarding_data": data.get("onboarding_data", {}),
            "updated_at": datetime.now().isoformat()
        }

        supabase.table("household_profiles").upsert(
            record, on_conflict="workspace_id"
        ).execute()

        logger.info(f"  Migrated household profile for {workspace_id}")
        return True

    except Exception as e:
        logger.error(f"  Error migrating household profile for {workspace_id}: {e}")
        return False


def migrate_recipes(supabase: Client, workspace_id: str) -> int:
    """Migrate all recipes for a workspace."""
    recipes_dir = DATA_DIR / workspace_id / "recipes"

    if not recipes_dir.exists():
        logger.info(f"  No recipes directory for {workspace_id}")
        return 0

    count = 0
    for recipe_file in recipes_dir.glob("*.json"):
        data = load_json_file(recipe_file)
        if not data:
            continue

        try:
            record = {
                "id": data.get("id"),
                "workspace_id": workspace_id,
                "title": data.get("title"),
                "ingredients": data.get("ingredients", []),
                "instructions": data.get("instructions"),
                "tags": data.get("tags", []),
                "meal_types": data.get("meal_types", []),
                "prep_time_minutes": data.get("prep_time_minutes"),
                "active_cooking_time_minutes": data.get("active_cooking_time_minutes"),
                "serves": data.get("serves"),
                "required_appliances": data.get("required_appliances", []),
                "is_generated": data.get("is_generated", False),
                "source_url": data.get("source_url"),
                "source_name": data.get("source_name"),
                "notes": data.get("notes"),
                "created_at": data.get("created_at", datetime.now().isoformat()),
                "updated_at": datetime.now().isoformat()
            }

            supabase.table("recipes").upsert(record, on_conflict="id").execute()
            count += 1

        except Exception as e:
            logger.error(f"  Error migrating recipe {recipe_file.name}: {e}")

    logger.info(f"  Migrated {count} recipes for {workspace_id}")
    return count


def migrate_meal_plans(supabase: Client, workspace_id: str) -> int:
    """Migrate all meal plans for a workspace."""
    meal_plans_dir = DATA_DIR / workspace_id / "meal_plans"

    if not meal_plans_dir.exists():
        logger.info(f"  No meal plans directory for {workspace_id}")
        return 0

    count = 0
    for plan_file in meal_plans_dir.glob("*.json"):
        data = load_json_file(plan_file)
        if not data:
            continue

        try:
            record = {
                "id": data.get("id"),
                "workspace_id": workspace_id,
                "week_start_date": data.get("week_start_date"),
                "days": data.get("days", []),
                "created_at": data.get("created_at", datetime.now().isoformat()),
                "updated_at": datetime.now().isoformat()
            }

            supabase.table("meal_plans").upsert(record, on_conflict="id").execute()
            count += 1

        except Exception as e:
            logger.error(f"  Error migrating meal plan {plan_file.name}: {e}")

    logger.info(f"  Migrated {count} meal plans for {workspace_id}")
    return count


def migrate_groceries(supabase: Client, workspace_id: str) -> bool:
    """Migrate groceries for a workspace."""
    filepath = DATA_DIR / workspace_id / "groceries.json"
    data = load_json_file(filepath)

    if not data:
        logger.info(f"  No groceries for {workspace_id}")
        return False

    try:
        items = data.get("items", [])
        if not items and isinstance(data, list):
            # Old format: data is directly the items list
            items = data

        record = {
            "workspace_id": workspace_id,
            "items": items,
            "updated_at": datetime.now().isoformat()
        }

        supabase.table("groceries").upsert(
            record, on_conflict="workspace_id"
        ).execute()

        logger.info(f"  Migrated {len(items)} grocery items for {workspace_id}")
        return True

    except Exception as e:
        logger.error(f"  Error migrating groceries for {workspace_id}: {e}")
        return False


def migrate_recipe_ratings(supabase: Client, workspace_id: str) -> int:
    """Migrate recipe ratings for a workspace."""
    filepath = DATA_DIR / workspace_id / "recipe_ratings.json"
    data = load_json_file(filepath)

    if not data:
        logger.info(f"  No recipe ratings for {workspace_id}")
        return 0

    count = 0
    ratings_list = data.get("ratings", [])

    for rating_entry in ratings_list:
        try:
            recipe_id = rating_entry.get("recipe_id")
            ratings = rating_entry.get("ratings", {})

            if not recipe_id:
                continue

            record = {
                "workspace_id": workspace_id,
                "recipe_id": recipe_id,
                "ratings": ratings,
                "updated_at": datetime.now().isoformat()
            }

            supabase.table("recipe_ratings").upsert(
                record, on_conflict="workspace_id,recipe_id"
            ).execute()
            count += 1

        except Exception as e:
            logger.error(f"  Error migrating rating for {rating_entry}: {e}")

    logger.info(f"  Migrated ratings for {count} recipes in {workspace_id}")
    return count


def migrate_invites(supabase: Client) -> int:
    """Migrate invite codes and redemptions."""
    # Migrate invite codes
    invites_file = DATA_DIR / "invites.json"
    invites_data = load_json_file(invites_file)
    invite_count = 0

    if invites_data:
        for code, invite in invites_data.items():
            try:
                record = {
                    "code": code,
                    "created_at": invite.get("created_at", datetime.now().isoformat()),
                    "created_by": invite.get("created_by"),
                    "max_uses": invite.get("max_uses", 10),
                    "uses": invite.get("uses", 0),
                    "expires_at": invite.get("expires_at"),
                    "note": invite.get("note"),
                    "disabled": invite.get("disabled", False)
                }

                supabase.table("invite_codes").upsert(
                    record, on_conflict="code"
                ).execute()
                invite_count += 1

            except Exception as e:
                logger.error(f"Error migrating invite code {code}: {e}")

    logger.info(f"Migrated {invite_count} invite codes")

    # Migrate invite redemptions
    redemptions_file = DATA_DIR / "invite_redemptions.json"
    redemptions_data = load_json_file(redemptions_file)
    redemption_count = 0

    if redemptions_data and isinstance(redemptions_data, list):
        for redemption in redemptions_data:
            try:
                record = {
                    "code": redemption.get("code"),
                    "email": redemption.get("email"),
                    "redeemed_at": redemption.get("redeemed_at", datetime.now().isoformat())
                }

                # Insert without conflict handling (each redemption is unique)
                supabase.table("invite_redemptions").insert(record).execute()
                redemption_count += 1

            except Exception as e:
                # Might fail on duplicates, which is fine
                if "duplicate" not in str(e).lower():
                    logger.error(f"Error migrating redemption: {e}")

    logger.info(f"Migrated {redemption_count} invite redemptions")
    return invite_count


def generate_embeddings(supabase: Client, workspace_id: str) -> int:
    """Generate embeddings for recipes (optional)."""
    openai_key = os.environ.get("OPENAI_API_KEY")
    if not openai_key:
        logger.warning("OPENAI_API_KEY not set, skipping embedding generation")
        return 0

    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_key)
    except ImportError:
        logger.warning("OpenAI package not installed, skipping embedding generation")
        return 0

    # Get recipes without embeddings
    response = supabase.table("recipes").select("id, title, tags, ingredients").eq(
        "workspace_id", workspace_id
    ).is_("embedding", "null").execute()

    if not response.data:
        logger.info(f"  No recipes need embeddings in {workspace_id}")
        return 0

    count = 0
    for recipe in response.data:
        try:
            # Build text for embedding
            text_parts = [recipe["title"]]
            if recipe.get("tags"):
                text_parts.extend(recipe["tags"])
            if recipe.get("ingredients"):
                for ing in recipe["ingredients"]:
                    if isinstance(ing, str):
                        text_parts.append(ing)
                    elif isinstance(ing, dict):
                        text_parts.append(ing.get("name", str(ing)))

            text = " ".join(text_parts)

            # Generate embedding
            embedding_response = client.embeddings.create(
                model="text-embedding-3-small",
                input=text
            )
            embedding = embedding_response.data[0].embedding

            # Update recipe with embedding
            supabase.table("recipes").update({
                "embedding": embedding
            }).eq("id", recipe["id"]).execute()

            count += 1

        except Exception as e:
            logger.error(f"  Error generating embedding for {recipe['id']}: {e}")

    logger.info(f"  Generated embeddings for {count} recipes in {workspace_id}")
    return count


def main():
    """Main migration function."""
    logger.info("=" * 60)
    logger.info("Starting Supabase migration")
    logger.info("=" * 60)

    # Initialize Supabase client
    try:
        supabase = get_supabase_client()
        logger.info("Connected to Supabase")
    except Exception as e:
        logger.error(f"Failed to connect to Supabase: {e}")
        sys.exit(1)

    # Get all workspaces
    workspaces = list_workspaces()
    logger.info(f"Found {len(workspaces)} workspaces: {workspaces}")

    # Track stats
    stats = {
        "workspaces": len(workspaces),
        "household_profiles": 0,
        "recipes": 0,
        "meal_plans": 0,
        "groceries": 0,
        "ratings": 0,
        "embeddings": 0,
        "invites": 0
    }

    # Migrate each workspace
    for workspace_id in workspaces:
        logger.info(f"\nMigrating workspace: {workspace_id}")
        logger.info("-" * 40)

        if migrate_household_profile(supabase, workspace_id):
            stats["household_profiles"] += 1

        stats["recipes"] += migrate_recipes(supabase, workspace_id)
        stats["meal_plans"] += migrate_meal_plans(supabase, workspace_id)

        if migrate_groceries(supabase, workspace_id):
            stats["groceries"] += 1

        stats["ratings"] += migrate_recipe_ratings(supabase, workspace_id)

        # Generate embeddings (optional)
        stats["embeddings"] += generate_embeddings(supabase, workspace_id)

    # Migrate invite codes (global, not per-workspace)
    logger.info("\nMigrating invite codes")
    logger.info("-" * 40)
    stats["invites"] = migrate_invites(supabase)

    # Print summary
    logger.info("\n" + "=" * 60)
    logger.info("Migration complete!")
    logger.info("=" * 60)
    logger.info(f"Workspaces processed: {stats['workspaces']}")
    logger.info(f"Household profiles: {stats['household_profiles']}")
    logger.info(f"Recipes: {stats['recipes']}")
    logger.info(f"Meal plans: {stats['meal_plans']}")
    logger.info(f"Grocery lists: {stats['groceries']}")
    logger.info(f"Recipe ratings: {stats['ratings']}")
    logger.info(f"Embeddings generated: {stats['embeddings']}")
    logger.info(f"Invite codes: {stats['invites']}")


if __name__ == "__main__":
    main()
