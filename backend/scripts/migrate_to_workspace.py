#!/usr/bin/env python3
"""
Migration script to move existing production data to a workspace.

This script:
1. Checks for data files at the root of DATA_DIR (old structure)
2. Creates a workspace directory (default: 'andrea')
3. Moves existing files to the workspace directory
4. Updates Chroma database to add workspace_id metadata to existing recipes

Usage:
    python scripts/migrate_to_workspace.py [workspace_id]

Example:
    python scripts/migrate_to_workspace.py andrea
"""

import sys
import shutil
from pathlib import Path
import json

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings
from app.data.chroma_manager import get_recipes_collection

def migrate_to_workspace(workspace_id: str = "andrea"):
    """Migrate existing data to a workspace directory."""

    data_dir = Path(settings.DATA_DIR)
    workspace_dir = data_dir / workspace_id

    print(f"=== Migration to workspace '{workspace_id}' ===")
    print(f"DATA_DIR: {data_dir}")
    print(f"Target workspace directory: {workspace_dir}")
    print()

    # Files to migrate
    files_to_migrate = [
        "household_profile.json",
        "groceries.json",
        "recipe_ratings.json",
        "generated_meal_plan.json"
    ]

    # Check if workspace already exists
    if workspace_dir.exists():
        print(f"⚠️  Workspace directory '{workspace_id}' already exists!")
        response = input("Do you want to continue? This may overwrite files. (y/N): ")
        if response.lower() != 'y':
            print("Migration cancelled.")
            return
        print()
    else:
        print(f"✓ Creating workspace directory: {workspace_dir}")
        workspace_dir.mkdir(parents=True, exist_ok=True)

    # Migrate data files
    print("\n📁 Migrating data files...")
    migrated_count = 0

    for filename in files_to_migrate:
        source = data_dir / filename
        if source.exists() and source.is_file():
            dest = workspace_dir / filename
            print(f"  Moving: {filename}")
            shutil.copy2(source, dest)  # Copy instead of move to be safe
            migrated_count += 1
        else:
            print(f"  Skipping: {filename} (not found)")

    # Migrate recipes directory
    recipes_source = data_dir / "recipes"
    if recipes_source.exists() and recipes_source.is_dir():
        recipes_dest = workspace_dir / "recipes"
        print(f"\n  Copying recipes directory...")
        if recipes_dest.exists():
            print(f"    Recipes directory already exists in workspace, merging...")
        else:
            recipes_dest.mkdir(exist_ok=True)

        # Copy all recipe files
        recipe_count = 0
        for recipe_file in recipes_source.glob("*.json"):
            dest_file = recipes_dest / recipe_file.name
            shutil.copy2(recipe_file, dest_file)
            recipe_count += 1

        print(f"    Copied {recipe_count} recipe files")
        migrated_count += recipe_count

    print(f"\n✓ Migrated {migrated_count} files/items")

    # Update Chroma database
    print(f"\n🗄️  Updating Chroma database...")
    try:
        collection = get_recipes_collection()

        # Get all existing documents
        all_docs = collection.get()

        if not all_docs['ids']:
            print("  No recipes found in Chroma database")
        else:
            print(f"  Found {len(all_docs['ids'])} recipes in Chroma")

            # Check if any recipes already have workspace_id
            has_workspace = any(
                doc.get('workspace_id') for doc in all_docs.get('metadatas', [])
            )

            if has_workspace:
                print(f"  ⚠️  Some recipes already have workspace_id metadata")
                response = input(f"  Update all recipes to workspace '{workspace_id}'? (y/N): ")
                if response.lower() != 'y':
                    print("  Skipping Chroma update")
                    return

            # Update all recipes to have workspace_id
            updated_metadatas = []
            updated_ids = []

            for doc_id, metadata in zip(all_docs['ids'], all_docs['metadatas']):
                # If ID already has workspace prefix, skip
                if ':' in doc_id:
                    print(f"  Skipping {doc_id} (already has workspace prefix)")
                    continue

                # Update metadata to include workspace_id
                updated_metadata = metadata.copy() if metadata else {}
                updated_metadata['workspace_id'] = workspace_id

                # Create new ID with workspace prefix
                new_id = f"{workspace_id}:{doc_id}"

                updated_metadatas.append(updated_metadata)
                updated_ids.append((doc_id, new_id))

            if not updated_ids:
                print("  No recipes to update (all already have workspace)")
            else:
                # Note: ChromaDB doesn't support ID updates directly
                # We need to delete old entries and add new ones
                print(f"  Updating {len(updated_ids)} recipes...")

                for i, (old_id, new_id) in enumerate(updated_ids):
                    # Get the full document
                    doc = collection.get(ids=[old_id])

                    if doc['ids']:
                        # Add with new ID and updated metadata
                        collection.add(
                            ids=[new_id],
                            documents=doc['documents'],
                            metadatas=[updated_metadatas[i]],
                            embeddings=doc['embeddings'][0] if doc.get('embeddings') else None
                        )

                        # Delete old entry
                        collection.delete(ids=[old_id])

                        if (i + 1) % 10 == 0:
                            print(f"    Updated {i + 1}/{len(updated_ids)} recipes...")

                print(f"  ✓ Updated {len(updated_ids)} recipes in Chroma")

    except Exception as e:
        print(f"  ❌ Error updating Chroma database: {e}")
        print("  You may need to re-embed recipes for this workspace")

    print(f"\n✅ Migration complete!")
    print(f"\n📝 Next steps:")
    print(f"   1. Verify the workspace '{workspace_id}' has all expected data")
    print(f"   2. Test the application with workspace_id='{workspace_id}'")
    print(f"   3. Once verified, you can safely delete the old data files at the root")
    print(f"\n   ⚠️  Old files were COPIED (not moved) for safety")
    print(f"   You can manually delete them after verification:")
    for filename in files_to_migrate:
        source = data_dir / filename
        if source.exists():
            print(f"      rm {source}")
    if (data_dir / "recipes").exists():
        print(f"      rm -r {data_dir / 'recipes'}")


if __name__ == "__main__":
    # Get workspace_id from command line or use default
    workspace_id = sys.argv[1] if len(sys.argv) > 1 else "andrea"

    # Validate workspace_id format
    import re
    if not re.match(r'^[a-z0-9-]+$', workspace_id) or len(workspace_id) > 50:
        print(f"❌ Invalid workspace_id: {workspace_id}")
        print("   Must be lowercase letters, numbers, and hyphens only (1-50 characters)")
        sys.exit(1)

    migrate_to_workspace(workspace_id)
