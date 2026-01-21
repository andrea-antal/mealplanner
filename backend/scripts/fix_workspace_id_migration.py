#!/usr/bin/env python3
"""
Fix workspace ID migration: Update legacy string IDs to Supabase UUIDs.

Problem:
  Data was migrated with workspace_id = directory name (e.g., "andrea")
  But users log in with workspace_id = Supabase UUID

Solution:
  1. Query Supabase Auth to get all users (UUID + email)
  2. Derive legacy workspace_id from email (same logic as old system)
  3. Update all tables from old workspace_id to UUID

Usage:
    cd backend
    python scripts/fix_workspace_id_migration.py --dry-run   # Preview changes
    python scripts/fix_workspace_id_migration.py             # Execute migration

Environment variables required:
    SUPABASE_URL
    SUPABASE_SECRET_KEY (service role key for bypassing RLS)
"""
import os
import sys
import re
import logging
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from supabase import create_client, Client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Tables that need workspace_id migration
TABLES = [
    "household_profiles",
    "recipes",
    "meal_plans",
    "groceries",
    "recipe_ratings",
    "shopping_lists",
    "shopping_templates"
]

# Manual mapping: legacy_workspace_id -> email
# For workspaces that don't match the email-derived ID pattern
# (e.g., "andrea" was used as workspace, but email is "hi@andrea-antal.com")
MANUAL_WORKSPACE_TO_EMAIL = {
    "andrea": "hi@andrea-antal.com",
    # Add more mappings as needed:
    # "ibolya": "ibolya@example.com",
}


def get_supabase_client() -> Client:
    """Create Supabase admin client."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SECRET_KEY")

    if not url or not key:
        raise RuntimeError(
            "Missing environment variables. Set SUPABASE_URL and SUPABASE_SECRET_KEY"
        )

    return create_client(url, key)


def email_to_workspace_id(email: str) -> str:
    """
    Convert email to legacy workspace_id.

    Same logic as the old system:
    - Take the part before @
    - Replace non-alphanumeric with hyphens
    - Lowercase

    Example: "hi@andrea-antal.com" -> "hi"
             "Andrea.Chan@gmail.com" -> "andrea-chan"
    """
    username = email.split("@")[0]
    workspace_id = re.sub(r'[^a-z0-9]', '-', username.lower())
    return workspace_id


def get_user_uuid_mapping(supabase: Client) -> Dict[str, Tuple[str, str]]:
    """
    Get mapping from legacy workspace_id to (UUID, email).

    Combines:
    1. Manual mappings from MANUAL_WORKSPACE_TO_EMAIL
    2. Auto-derived mappings from email addresses

    Returns:
        Dict mapping legacy_workspace_id -> (uuid, email)
    """
    try:
        response = supabase.auth.admin.list_users()

        # Build email -> (uuid, email) lookup first
        email_to_user = {}
        for user in response:
            email_to_user[user.email.lower()] = (str(user.id), user.email)

        mapping = {}

        # Process manual mappings first (they take priority)
        logger.info("  Manual mappings:")
        for legacy_id, email in MANUAL_WORKSPACE_TO_EMAIL.items():
            email_lower = email.lower()
            if email_lower in email_to_user:
                uuid, actual_email = email_to_user[email_lower]
                mapping[legacy_id] = (uuid, actual_email)
                logger.info(f"    {legacy_id} -> {uuid[:8]}... ({actual_email})")
            else:
                logger.warning(f"    {legacy_id}: Email '{email}' not found in Supabase users")

        # Also add auto-derived mappings for completeness
        logger.info("  Auto-derived mappings:")
        for user in response:
            email = user.email
            uuid = str(user.id)
            auto_legacy_id = email_to_workspace_id(email)

            # Don't override manual mappings
            if auto_legacy_id not in mapping:
                mapping[auto_legacy_id] = (uuid, email)
                logger.info(f"    {auto_legacy_id} -> {uuid[:8]}... ({email})")

        return mapping

    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise


def get_legacy_workspaces(supabase: Client) -> List[str]:
    """
    Find all workspace_ids that look like legacy string IDs (not UUIDs).

    UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with dashes)
    Legacy format: short strings like "andrea", "ibolya"
    """
    legacy_ids = set()
    uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')

    for table in TABLES:
        try:
            response = supabase.table(table).select("workspace_id").execute()
            for row in response.data:
                workspace_id = row.get("workspace_id")
                if workspace_id and not uuid_pattern.match(workspace_id):
                    legacy_ids.add(workspace_id)
        except Exception as e:
            logger.warning(f"Error querying {table}: {e}")

    return sorted(legacy_ids)


def get_table_counts(supabase: Client, table: str, workspace_id: str) -> int:
    """Count records in a table for a workspace."""
    try:
        response = supabase.table(table).select("workspace_id", count="exact").eq(
            "workspace_id", workspace_id
        ).execute()
        return response.count or 0
    except Exception as e:
        logger.warning(f"Error counting {table} for {workspace_id}: {e}")
        return 0


def check_uuid_data_exists(supabase: Client, uuid: str) -> Dict[str, int]:
    """Check if data already exists under the UUID workspace_id."""
    counts = {}
    for table in TABLES:
        count = get_table_counts(supabase, table, uuid)
        if count > 0:
            counts[table] = count
    return counts


def migrate_recipe_ratings_with_merge(
    supabase: Client,
    old_workspace_id: str,
    new_workspace_id: str,
    dry_run: bool = True
) -> int:
    """
    Migrate recipe_ratings with merge handling for duplicates.

    If a rating exists under both old and new workspace_id for the same recipe,
    merge the ratings (combine member ratings from both).
    """
    try:
        # Get old ratings
        old_response = supabase.table("recipe_ratings").select("*").eq(
            "workspace_id", old_workspace_id
        ).execute()

        if not old_response.data:
            return 0

        # Get new ratings (to check for conflicts)
        new_response = supabase.table("recipe_ratings").select("*").eq(
            "workspace_id", new_workspace_id
        ).execute()

        new_ratings_by_recipe = {r["recipe_id"]: r for r in new_response.data}

        migrated = 0
        for old_rating in old_response.data:
            recipe_id = old_rating["recipe_id"]
            old_member_ratings = old_rating.get("ratings", {})

            if dry_run:
                if recipe_id in new_ratings_by_recipe:
                    logger.info(f"    [DRY RUN] Would merge ratings for {recipe_id}")
                else:
                    logger.info(f"    [DRY RUN] Would migrate ratings for {recipe_id}")
                migrated += 1
                continue

            if recipe_id in new_ratings_by_recipe:
                # Merge: combine old ratings with new ratings (new takes precedence)
                new_rating = new_ratings_by_recipe[recipe_id]
                merged_ratings = {**old_member_ratings, **new_rating.get("ratings", {})}

                supabase.table("recipe_ratings").update({
                    "ratings": merged_ratings,
                    "updated_at": datetime.now().isoformat()
                }).eq("workspace_id", new_workspace_id).eq("recipe_id", recipe_id).execute()

                # Delete the old record
                supabase.table("recipe_ratings").delete().eq(
                    "workspace_id", old_workspace_id
                ).eq("recipe_id", recipe_id).execute()

                logger.info(f"    Merged ratings for {recipe_id}")
            else:
                # No conflict, just update workspace_id
                supabase.table("recipe_ratings").update({
                    "workspace_id": new_workspace_id,
                    "updated_at": datetime.now().isoformat()
                }).eq("workspace_id", old_workspace_id).eq("recipe_id", recipe_id).execute()

                logger.info(f"    Migrated ratings for {recipe_id}")

            migrated += 1

        return migrated

    except Exception as e:
        logger.error(f"  Error migrating recipe_ratings: {e}")
        return 0


def migrate_table(
    supabase: Client,
    table: str,
    old_workspace_id: str,
    new_workspace_id: str,
    dry_run: bool = True
) -> int:
    """
    Migrate records in a table from old to new workspace_id.

    Returns:
        Number of records migrated
    """
    # Special handling for recipe_ratings (has unique constraint on workspace_id + recipe_id)
    if table == "recipe_ratings":
        return migrate_recipe_ratings_with_merge(
            supabase, old_workspace_id, new_workspace_id, dry_run
        )

    try:
        # Count records to migrate
        count = get_table_counts(supabase, table, old_workspace_id)

        if count == 0:
            return 0

        if dry_run:
            logger.info(f"  [DRY RUN] Would migrate {count} records in {table}")
            return count

        # Actually perform the migration
        supabase.table(table).update({
            "workspace_id": new_workspace_id,
            "updated_at": datetime.now().isoformat()
        }).eq("workspace_id", old_workspace_id).execute()

        logger.info(f"  Migrated {count} records in {table}")
        return count

    except Exception as e:
        logger.error(f"  Error migrating {table}: {e}")
        return 0


def migrate_workspace(
    supabase: Client,
    old_id: str,
    new_id: str,
    email: str,
    dry_run: bool = True
) -> Dict[str, int]:
    """
    Migrate all data for a workspace from old ID to new ID.

    Returns:
        Dict mapping table_name -> records_migrated
    """
    logger.info(f"\n{'='*60}")
    logger.info(f"Migrating: {old_id} -> {new_id}")
    logger.info(f"User: {email}")
    logger.info(f"{'='*60}")

    # Check if data already exists under new UUID
    existing = check_uuid_data_exists(supabase, new_id)
    if existing:
        logger.warning(f"  Data already exists under UUID {new_id}:")
        for table, count in existing.items():
            logger.warning(f"    {table}: {count} records")
        logger.warning(f"  Will merge data (old records will be updated to new workspace_id)")

    results = {}
    for table in TABLES:
        migrated = migrate_table(supabase, table, old_id, new_id, dry_run)
        if migrated > 0:
            results[table] = migrated

    return results


def trigger_chroma_sync(workspace_id: str, dry_run: bool = True) -> bool:
    """
    Trigger Chroma sync for a workspace to update recipe vectors.

    Uses the local endpoint for now - in production you'd call the deployed API.
    """
    import requests

    # Use production URL since we're syncing production data
    base_url = os.environ.get(
        "API_BASE_URL",
        "https://mealplanner-backend-production-3e88.up.railway.app"
    )
    url = f"{base_url}/recipes/admin/sync-chroma?workspace_id={workspace_id}"

    if dry_run:
        logger.info(f"  [DRY RUN] Would trigger Chroma sync: {url}")
        return True

    try:
        response = requests.post(url, timeout=60)
        if response.ok:
            logger.info(f"  Chroma sync complete for {workspace_id}")
            return True
        else:
            logger.warning(f"  Chroma sync failed: {response.status_code} {response.text}")
            return False
    except Exception as e:
        logger.warning(f"  Chroma sync error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Fix workspace ID migration from legacy strings to Supabase UUIDs"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without executing them"
    )
    parser.add_argument(
        "--skip-chroma",
        action="store_true",
        help="Skip Chroma vector DB sync after migration"
    )
    parser.add_argument(
        "--workspace",
        type=str,
        help="Only migrate a specific workspace (by legacy ID)"
    )
    args = parser.parse_args()

    dry_run = args.dry_run

    logger.info("=" * 60)
    logger.info("Workspace ID Migration Fix")
    logger.info("=" * 60)

    if dry_run:
        logger.info("MODE: DRY RUN (no changes will be made)")
    else:
        logger.info("MODE: LIVE (changes will be committed)")

    # Connect to Supabase
    try:
        supabase = get_supabase_client()
        logger.info("Connected to Supabase")
    except Exception as e:
        logger.error(f"Failed to connect: {e}")
        sys.exit(1)

    # Get user UUID mapping
    logger.info("\n--- Step 1: Building user UUID mapping ---")
    uuid_mapping = get_user_uuid_mapping(supabase)
    logger.info(f"Found {len(uuid_mapping)} users")

    # Get legacy workspace IDs from database
    logger.info("\n--- Step 2: Finding legacy workspace IDs in database ---")
    legacy_ids = get_legacy_workspaces(supabase)
    logger.info(f"Found {len(legacy_ids)} legacy workspace IDs: {legacy_ids}")

    # Filter to specific workspace if requested
    if args.workspace:
        if args.workspace in legacy_ids:
            legacy_ids = [args.workspace]
        else:
            logger.error(f"Workspace '{args.workspace}' not found in legacy IDs")
            sys.exit(1)

    # Perform migrations
    logger.info("\n--- Step 3: Migrating workspaces ---")

    total_stats = {}
    migrated_workspaces = []
    skipped_workspaces = []

    for legacy_id in legacy_ids:
        if legacy_id in uuid_mapping:
            new_uuid, email = uuid_mapping[legacy_id]
            results = migrate_workspace(supabase, legacy_id, new_uuid, email, dry_run)

            if results:
                migrated_workspaces.append((legacy_id, new_uuid, email))
                for table, count in results.items():
                    total_stats[table] = total_stats.get(table, 0) + count
        else:
            logger.warning(f"\nSkipping '{legacy_id}': No matching Supabase user found")
            skipped_workspaces.append(legacy_id)

    # Trigger Chroma sync for migrated workspaces
    if not args.skip_chroma and migrated_workspaces:
        logger.info("\n--- Step 4: Triggering Chroma sync ---")
        for legacy_id, new_uuid, email in migrated_workspaces:
            trigger_chroma_sync(new_uuid, dry_run)

    # Print summary
    logger.info("\n" + "=" * 60)
    logger.info("MIGRATION SUMMARY")
    logger.info("=" * 60)

    if dry_run:
        logger.info("[DRY RUN] No changes were made")

    logger.info(f"\nWorkspaces migrated: {len(migrated_workspaces)}")
    for legacy_id, new_uuid, email in migrated_workspaces:
        logger.info(f"  {legacy_id} -> {new_uuid[:8]}... ({email})")

    if skipped_workspaces:
        logger.info(f"\nWorkspaces skipped (no matching user): {len(skipped_workspaces)}")
        for ws in skipped_workspaces:
            logger.info(f"  {ws}")

    logger.info(f"\nRecords affected by table:")
    for table, count in sorted(total_stats.items()):
        logger.info(f"  {table}: {count}")

    logger.info(f"\nTotal records: {sum(total_stats.values())}")

    if not dry_run and migrated_workspaces:
        logger.info("\nNext steps:")
        logger.info("1. Verify meal plan generation works for affected users")
        logger.info("2. Check household data appears correctly")
        logger.info("3. Verify recipes are suggested from library")


if __name__ == "__main__":
    main()
