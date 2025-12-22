"""
Data manager for JSON file I/O operations.

This module provides an abstraction layer for data persistence,
making it easy to swap JSON files for a database in the future.
"""
import json
import logging
from pathlib import Path
from typing import List, Optional, Dict
from datetime import date as Date
from app.models import Recipe, HouseholdProfile
from app.models.grocery import GroceryItem, GroceryList

logger = logging.getLogger(__name__)

# Data directory - default to ./data relative to backend root
DATA_DIR = Path(__file__).parent.parent.parent / "data"


def _ensure_data_dir():
    """Ensure data directory and subdirectories exist"""
    DATA_DIR.mkdir(exist_ok=True)
    (DATA_DIR / "recipes").mkdir(exist_ok=True)
    logger.info(f"Data directory ensured at: {DATA_DIR}")


# ===== Household Profile =====

def load_household_profile() -> Optional[HouseholdProfile]:
    """
    Load household profile from JSON file.

    Returns:
        HouseholdProfile if file exists, None otherwise
    """
    _ensure_data_dir()
    filepath = DATA_DIR / "household_profile.json"

    if not filepath.exists():
        logger.warning(f"Household profile not found at {filepath}")
        return None

    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        profile = HouseholdProfile(**data)
        logger.info(f"Loaded household profile with {len(profile.family_members)} members")
        return profile
    except Exception as e:
        logger.error(f"Error loading household profile: {e}")
        raise


def save_household_profile(profile: HouseholdProfile) -> None:
    """
    Save household profile to JSON file.

    Args:
        profile: HouseholdProfile to save
    """
    _ensure_data_dir()
    filepath = DATA_DIR / "household_profile.json"

    try:
        with open(filepath, 'w') as f:
            json.dump(profile.model_dump(), f, indent=2, default=str)
        logger.info(f"Saved household profile to {filepath}")
    except Exception as e:
        logger.error(f"Error saving household profile: {e}")
        raise


# ===== Groceries =====

def load_groceries() -> List[GroceryItem]:
    """
    Load available groceries from JSON file.

    Supports backward compatibility with old string-based format.
    Old format will be automatically migrated to new GroceryItem format.

    Returns:
        List of GroceryItem objects, empty list if file doesn't exist
    """
    _ensure_data_dir()
    filepath = DATA_DIR / "groceries.json"

    if not filepath.exists():
        logger.warning(f"Groceries file not found at {filepath}")
        return []

    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        items_data = data.get("items", [])

        # Check if migration needed (old string format)
        if items_data and isinstance(items_data[0], str):
            logger.info(f"Migrating {len(items_data)} groceries from old string format")
            items = [
                GroceryItem(name=item, date_added=Date.today())
                for item in items_data
            ]
            # Save migrated data immediately
            save_groceries(items)
        else:
            # Parse as GroceryItem objects
            items = [GroceryItem(**item) for item in items_data]

        logger.info(f"Loaded {len(items)} grocery items")
        return items
    except Exception as e:
        logger.error(f"Error loading groceries: {e}")
        raise


def save_groceries(items: List[GroceryItem]) -> None:
    """
    Save groceries list to JSON file.

    Args:
        items: List of GroceryItem objects
    """
    _ensure_data_dir()
    filepath = DATA_DIR / "groceries.json"

    try:
        # Convert GroceryItem objects to dicts for JSON serialization
        items_data = [item.model_dump(mode='json') for item in items]
        with open(filepath, 'w') as f:
            json.dump({"items": items_data}, f, indent=2, default=str)
        logger.info(f"Saved {len(items)} grocery items to {filepath}")
    except Exception as e:
        logger.error(f"Error saving groceries: {e}")
        raise


# ===== Recipe Ratings =====

def load_recipe_ratings() -> dict:
    """
    Load recipe ratings from JSON file.

    Returns:
        Dict mapping recipe_id to ratings dict (member_name -> rating).
        Returns empty dict if file doesn't exist.

    Example:
        {
            "recipe_001": {"Andrea": "like", "Adam": "dislike", "Nathan": "like"},
            "recipe_002": {"Andrea": "dislike", "Adam": "like"}
        }
    """
    _ensure_data_dir()
    filepath = DATA_DIR / "recipe_ratings.json"

    if not filepath.exists():
        logger.info(f"Recipe ratings file not found at {filepath}, returning empty ratings")
        return {}

    try:
        with open(filepath, 'r') as f:
            data = json.load(f)

        # Convert list of rating objects to dict format
        ratings_dict = {}
        for rating in data.get("ratings", []):
            recipe_id = rating.get("recipe_id")
            if recipe_id:
                ratings_dict[recipe_id] = rating.get("ratings", {})

        logger.info(f"Loaded ratings for {len(ratings_dict)} recipes")
        return ratings_dict
    except Exception as e:
        logger.error(f"Error loading recipe ratings: {e}")
        return {}


def save_recipe_rating(recipe_id: str, member_name: str, rating: Optional[str]) -> Dict[str, Optional[str]]:
    """
    Save or update a rating for a specific recipe and household member.

    Args:
        recipe_id: Recipe identifier
        member_name: Household member name
        rating: Rating value ('like', 'dislike', or None to clear)

    Returns:
        Updated ratings dict for this recipe

    Example:
        >>> save_recipe_rating("recipe_001", "Andrea", "like")
        {"Andrea": "like", "Adam": "dislike"}
    """
    _ensure_data_dir()
    filepath = DATA_DIR / "recipe_ratings.json"

    # Load existing ratings
    try:
        if filepath.exists():
            with open(filepath, 'r') as f:
                data = json.load(f)
        else:
            data = {"ratings": []}
    except Exception as e:
        logger.error(f"Error loading ratings for update: {e}")
        data = {"ratings": []}

    # Find or create rating entry for this recipe
    recipe_rating = None
    for rating_entry in data["ratings"]:
        if rating_entry.get("recipe_id") == recipe_id:
            recipe_rating = rating_entry
            break

    if recipe_rating is None:
        # Create new rating entry
        recipe_rating = {"recipe_id": recipe_id, "ratings": {}}
        data["ratings"].append(recipe_rating)

    # Update the member's rating
    if rating is None:
        # Remove rating if None
        recipe_rating["ratings"].pop(member_name, None)
    else:
        recipe_rating["ratings"][member_name] = rating

    # Save back to file
    try:
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        logger.info(f"Saved rating for {recipe_id} by {member_name}: {rating}")
    except Exception as e:
        logger.error(f"Error saving recipe rating: {e}")
        raise

    return recipe_rating["ratings"]


def get_recipe_rating(recipe_id: str) -> Dict[str, Optional[str]]:
    """
    Get ratings for a specific recipe.

    Args:
        recipe_id: Recipe identifier

    Returns:
        Dict mapping member_name to rating, empty dict if no ratings exist

    Example:
        >>> get_recipe_rating("recipe_001")
        {"Andrea": "like", "Adam": "dislike", "Nathan": "like"}
    """
    ratings_dict = load_recipe_ratings()
    return ratings_dict.get(recipe_id, {})


def delete_recipe_rating(recipe_id: str) -> None:
    """
    Delete all ratings for a recipe.

    Called when a recipe is deleted to clean up orphaned rating data.

    Args:
        recipe_id: Recipe identifier to delete ratings for
    """
    _ensure_data_dir()
    filepath = DATA_DIR / "recipe_ratings.json"

    if not filepath.exists():
        logger.info(f"No ratings file exists, nothing to delete for {recipe_id}")
        return

    try:
        with open(filepath, 'r') as f:
            data = json.load(f)

        # Filter out ratings for this recipe
        original_count = len(data.get("ratings", []))
        data["ratings"] = [
            rating for rating in data.get("ratings", [])
            if rating.get("recipe_id") != recipe_id
        ]
        deleted_count = original_count - len(data["ratings"])

        # Save back to file
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)

        if deleted_count > 0:
            logger.info(f"Deleted ratings for recipe {recipe_id}")
        else:
            logger.info(f"No ratings found for recipe {recipe_id}")

    except Exception as e:
        logger.error(f"Error deleting recipe ratings: {e}")
        raise


# ===== Recipes =====

def load_recipe(recipe_id: str) -> Optional[Recipe]:
    """
    Load a single recipe by ID.

    Args:
        recipe_id: Unique recipe identifier

    Returns:
        Recipe if found, None otherwise
    """
    _ensure_data_dir()
    filepath = DATA_DIR / "recipes" / f"{recipe_id}.json"

    if not filepath.exists():
        logger.warning(f"Recipe {recipe_id} not found at {filepath}")
        return None

    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        recipe = Recipe(**data)
        logger.info(f"Loaded recipe: {recipe.title}")
        return recipe
    except Exception as e:
        logger.error(f"Error loading recipe {recipe_id}: {e}")
        raise


def save_recipe(recipe: Recipe) -> None:
    """
    Save a recipe to JSON file.

    Args:
        recipe: Recipe to save
    """
    _ensure_data_dir()
    filepath = DATA_DIR / "recipes" / f"{recipe.id}.json"

    try:
        with open(filepath, 'w') as f:
            json.dump(recipe.model_dump(), f, indent=2)
        logger.info(f"Saved recipe: {recipe.title} to {filepath}")
    except Exception as e:
        logger.error(f"Error saving recipe {recipe.id}: {e}")
        raise


def list_all_recipes() -> List[Recipe]:
    """
    Load all recipes from the recipes directory.
    Recipes are sorted by modification time (most recent first).

    Returns:
        List of all Recipe objects, sorted by creation/modification time
    """
    _ensure_data_dir()
    recipes_dir = DATA_DIR / "recipes"
    recipe_files = []

    # Collect recipe files with their modification times
    for filepath in recipes_dir.glob("*.json"):
        try:
            mtime = filepath.stat().st_mtime
            recipe_files.append((filepath, mtime))
        except Exception as e:
            logger.error(f"Error accessing file {filepath}: {e}")

    # Sort by modification time (most recent first)
    recipe_files.sort(key=lambda x: x[1], reverse=True)

    # Load recipes in sorted order
    recipes = []
    for filepath, _ in recipe_files:
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
            recipe = Recipe(**data)
            recipes.append(recipe)
        except Exception as e:
            logger.error(f"Error loading recipe from {filepath}: {e}")
            # Continue loading other recipes even if one fails

    logger.info(f"Loaded {len(recipes)} recipes (sorted by most recent)")
    return recipes


def delete_recipe(recipe_id: str) -> bool:
    """
    Delete a recipe by ID from both JSON storage and Chroma DB.

    Args:
        recipe_id: Unique recipe identifier

    Returns:
        True if deleted, False if recipe didn't exist
    """
    _ensure_data_dir()
    filepath = DATA_DIR / "recipes" / f"{recipe_id}.json"

    if not filepath.exists():
        logger.warning(f"Recipe {recipe_id} not found in storage")
        # Still try to remove from Chroma in case it's orphaned

    try:
        # Delete JSON file if it exists
        if filepath.exists():
            filepath.unlink()
            logger.info(f"Deleted recipe file: {recipe_id}")

        # Remove from Chroma DB
        from app.data.chroma_manager import get_recipes_collection
        collection = get_recipes_collection()
        try:
            collection.delete(ids=[recipe_id])
            logger.info(f"Removed recipe from Chroma DB: {recipe_id}")
        except Exception as e:
            logger.warning(f"Could not remove {recipe_id} from Chroma (may not exist): {e}")

        return True
    except Exception as e:
        logger.error(f"Error deleting recipe {recipe_id}: {e}")
        raise
