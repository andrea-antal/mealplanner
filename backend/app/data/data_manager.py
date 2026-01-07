"""
Data manager for JSON file I/O operations.

This module provides an abstraction layer for data persistence,
making it easy to swap JSON files for a database in the future.

All functions now require a workspace_id parameter to support multi-tenant data isolation.
"""
import json
import logging
import re
from pathlib import Path
from typing import List, Optional, Dict
from datetime import date as Date
from app.models import Recipe, HouseholdProfile
from app.models.grocery import GroceryItem, GroceryList
from app.models.meal_plan import MealPlan

logger = logging.getLogger(__name__)

# Data directory - default to ./data relative to backend root
DATA_DIR = Path(__file__).parent.parent.parent / "data"

# Workspace ID validation pattern (lowercase alphanumeric + hyphens only)
WORKSPACE_ID_PATTERN = re.compile(r'^[a-z0-9-]+$')


def _validate_workspace_id(workspace_id: str) -> None:
    """
    Validate workspace_id to prevent directory traversal attacks.

    Args:
        workspace_id: Workspace identifier to validate

    Raises:
        ValueError: If workspace_id is invalid
    """
    if not workspace_id or len(workspace_id) > 50:
        raise ValueError("workspace_id must be between 1 and 50 characters")

    if not WORKSPACE_ID_PATTERN.match(workspace_id):
        raise ValueError("workspace_id must contain only lowercase letters, numbers, and hyphens")


def _ensure_data_dir(workspace_id: str):
    """
    Ensure data directory and subdirectories exist for a workspace.

    Args:
        workspace_id: Workspace identifier
    """
    _validate_workspace_id(workspace_id)

    workspace_dir = DATA_DIR / workspace_id
    workspace_dir.mkdir(exist_ok=True, parents=True)
    (workspace_dir / "recipes").mkdir(exist_ok=True)
    logger.info(f"Data directory ensured for workspace '{workspace_id}' at: {workspace_dir}")


def list_workspaces() -> List[str]:
    """
    List all valid workspace directories.

    Returns:
        Sorted list of workspace IDs (directories matching the validation pattern)
    """
    if not DATA_DIR.exists():
        return []

    workspaces = [
        d.name for d in DATA_DIR.iterdir()
        if d.is_dir() and WORKSPACE_ID_PATTERN.match(d.name)
    ]
    return sorted(workspaces)


def get_workspace_stats(workspace_id: str) -> Dict:
    """
    Get summary statistics for a workspace.

    Returns:
        Dict with recipe_count, meal_plan_count, grocery_count, member_count,
        last_meal_plan_date, and last_activity timestamp.
    """
    from datetime import datetime

    workspace_dir = DATA_DIR / workspace_id
    if not workspace_dir.exists():
        return {"error": f"Workspace '{workspace_id}' not found"}

    stats = {
        "workspace_id": workspace_id,
        "recipe_count": 0,
        "meal_plan_count": 0,
        "grocery_count": 0,
        "member_count": 0,
        "last_meal_plan_date": None,
        "last_activity": None,
    }

    # Track most recent file modification
    latest_mtime = 0

    # Recipe count
    recipes_dir = workspace_dir / "recipes"
    if recipes_dir.exists():
        recipe_files = list(recipes_dir.glob("*.json"))
        stats["recipe_count"] = len(recipe_files)
        for f in recipe_files:
            mtime = f.stat().st_mtime
            if mtime > latest_mtime:
                latest_mtime = mtime

    # Meal plan count + most recent
    meal_plans_dir = workspace_dir / "meal_plans"
    if meal_plans_dir.exists():
        meal_plan_files = list(meal_plans_dir.glob("*.json"))
        stats["meal_plan_count"] = len(meal_plan_files)
        for f in meal_plan_files:
            mtime = f.stat().st_mtime
            if mtime > latest_mtime:
                latest_mtime = mtime
            # Try to extract created_at from meal plan
            try:
                with open(f, 'r') as fp:
                    data = json.load(fp)
                    created = data.get("created_at")
                    if created:
                        if stats["last_meal_plan_date"] is None or created > stats["last_meal_plan_date"]:
                            stats["last_meal_plan_date"] = created
            except Exception:
                pass

    # Grocery count
    groceries_file = workspace_dir / "groceries.json"
    if groceries_file.exists():
        mtime = groceries_file.stat().st_mtime
        if mtime > latest_mtime:
            latest_mtime = mtime
        try:
            with open(groceries_file, 'r') as f:
                data = json.load(f)
                stats["grocery_count"] = len(data.get("items", []))
        except Exception:
            pass

    # Household member count
    profile_file = workspace_dir / "household_profile.json"
    if profile_file.exists():
        mtime = profile_file.stat().st_mtime
        if mtime > latest_mtime:
            latest_mtime = mtime
        try:
            with open(profile_file, 'r') as f:
                data = json.load(f)
                stats["member_count"] = len(data.get("family_members", []))
        except Exception:
            pass

    # Convert latest mtime to ISO string
    if latest_mtime > 0:
        stats["last_activity"] = datetime.fromtimestamp(latest_mtime).isoformat()

    return stats


def is_workspace_empty(workspace_id: str) -> bool:
    """
    Check if a workspace has no meaningful data.

    A workspace is considered empty if it has:
    - No recipes
    - No meal plans
    - No groceries
    - No household members

    Args:
        workspace_id: Workspace identifier to check

    Returns:
        True if workspace is empty, False otherwise
    """
    stats = get_workspace_stats(workspace_id)

    # If workspace doesn't exist, consider it "empty"
    if "error" in stats:
        return True

    return (
        stats.get("recipe_count", 0) == 0 and
        stats.get("meal_plan_count", 0) == 0 and
        stats.get("grocery_count", 0) == 0 and
        stats.get("member_count", 0) == 0
    )


def delete_workspace(workspace_id: str) -> bool:
    """
    Delete an entire workspace directory and all its data.

    This permanently removes:
    - All recipes (JSON files)
    - All meal plans
    - Household profile
    - Groceries list
    - Recipe ratings
    - Chroma DB entries for this workspace

    WARNING: This operation is irreversible!

    Args:
        workspace_id: Workspace identifier to delete

    Returns:
        True if workspace was deleted, False if it didn't exist

    Raises:
        ValueError: If workspace_id is invalid
    """
    import shutil

    _validate_workspace_id(workspace_id)
    workspace_dir = DATA_DIR / workspace_id

    if not workspace_dir.exists():
        logger.warning(f"Workspace '{workspace_id}' does not exist, nothing to delete")
        return False

    # Remove from Chroma DB first (before deleting files)
    try:
        from app.data.chroma_manager import delete_workspace_from_chroma
        chroma_deleted = delete_workspace_from_chroma(workspace_id)
        logger.info(f"Removed {chroma_deleted} Chroma entries for workspace '{workspace_id}'")
    except Exception as e:
        logger.warning(f"Error cleaning Chroma for workspace '{workspace_id}': {e}")
        # Continue with directory deletion even if Chroma cleanup fails

    # Delete the entire workspace directory
    try:
        shutil.rmtree(workspace_dir)
        logger.info(f"Deleted workspace '{workspace_id}' and all its data at {workspace_dir}")
        return True
    except Exception as e:
        logger.error(f"Error deleting workspace directory '{workspace_id}': {e}")
        raise


# ===== Household Profile =====

def load_household_profile(workspace_id: str) -> Optional[HouseholdProfile]:
    """
    Load household profile from JSON file.

    Args:
        workspace_id: Workspace identifier

    Returns:
        HouseholdProfile if file exists, None otherwise
    """
    _ensure_data_dir(workspace_id)
    filepath = DATA_DIR / workspace_id / "household_profile.json"

    if not filepath.exists():
        logger.warning(f"Household profile not found at {filepath}")
        return None

    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        profile = HouseholdProfile(**data)
        logger.info(f"Loaded household profile for workspace '{workspace_id}' with {len(profile.family_members)} members")
        return profile
    except Exception as e:
        logger.error(f"Error loading household profile for workspace '{workspace_id}': {e}")
        raise


def save_household_profile(workspace_id: str, profile: HouseholdProfile) -> None:
    """
    Save household profile to JSON file.

    Args:
        workspace_id: Workspace identifier
        profile: HouseholdProfile to save
    """
    _ensure_data_dir(workspace_id)
    filepath = DATA_DIR / workspace_id / "household_profile.json"

    try:
        with open(filepath, 'w') as f:
            json.dump(profile.model_dump(), f, indent=2, default=str)
        logger.info(f"Saved household profile for workspace '{workspace_id}' to {filepath}")
    except Exception as e:
        logger.error(f"Error saving household profile for workspace '{workspace_id}': {e}")
        raise


# ===== Groceries =====

def load_groceries(workspace_id: str) -> List[GroceryItem]:
    """
    Load available groceries from JSON file.

    Supports backward compatibility with old string-based format.
    Old format will be automatically migrated to new GroceryItem format.

    Args:
        workspace_id: Workspace identifier

    Returns:
        List of GroceryItem objects, empty list if file doesn't exist
    """
    _ensure_data_dir(workspace_id)
    filepath = DATA_DIR / workspace_id / "groceries.json"

    if not filepath.exists():
        logger.warning(f"Groceries file not found at {filepath}")
        return []

    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        items_data = data.get("items", [])

        # Check if migration needed (old string format)
        if items_data and isinstance(items_data[0], str):
            logger.info(f"Migrating {len(items_data)} groceries from old string format for workspace '{workspace_id}'")
            items = [
                GroceryItem(name=item, date_added=Date.today())
                for item in items_data
            ]
            # Save migrated data immediately
            save_groceries(workspace_id, items)
        else:
            # Parse as GroceryItem objects
            items = [GroceryItem(**item) for item in items_data]

        logger.info(f"Loaded {len(items)} grocery items for workspace '{workspace_id}'")
        return items
    except Exception as e:
        logger.error(f"Error loading groceries for workspace '{workspace_id}': {e}")
        raise


def save_groceries(workspace_id: str, items: List[GroceryItem]) -> None:
    """
    Save groceries list to JSON file.

    Args:
        workspace_id: Workspace identifier
        items: List of GroceryItem objects
    """
    _ensure_data_dir(workspace_id)
    filepath = DATA_DIR / workspace_id / "groceries.json"

    try:
        # Convert GroceryItem objects to dicts for JSON serialization
        items_data = [item.model_dump(mode='json') for item in items]
        with open(filepath, 'w') as f:
            json.dump({"items": items_data}, f, indent=2, default=str)
        logger.info(f"Saved {len(items)} grocery items for workspace '{workspace_id}' to {filepath}")
    except Exception as e:
        logger.error(f"Error saving groceries for workspace '{workspace_id}': {e}")
        raise


# ===== Recipe Ratings =====

def load_recipe_ratings(workspace_id: str) -> dict:
    """
    Load recipe ratings from JSON file.

    Args:
        workspace_id: Workspace identifier

    Returns:
        Dict mapping recipe_id to ratings dict (member_name -> rating).
        Returns empty dict if file doesn't exist.

    Example:
        {
            "recipe_001": {"Andrea": "like", "Adam": "dislike", "Nathan": "like"},
            "recipe_002": {"Andrea": "dislike", "Adam": "like"}
        }
    """
    _ensure_data_dir(workspace_id)
    filepath = DATA_DIR / workspace_id / "recipe_ratings.json"

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

        logger.info(f"Loaded ratings for {len(ratings_dict)} recipes in workspace '{workspace_id}'")
        return ratings_dict
    except Exception as e:
        logger.error(f"Error loading recipe ratings for workspace '{workspace_id}': {e}")
        return {}


def save_recipe_rating(workspace_id: str, recipe_id: str, member_name: str, rating: Optional[str]) -> Dict[str, Optional[str]]:
    """
    Save or update a rating for a specific recipe and household member.

    Args:
        workspace_id: Workspace identifier
        recipe_id: Recipe identifier
        member_name: Household member name
        rating: Rating value ('like', 'dislike', or None to clear)

    Returns:
        Updated ratings dict for this recipe

    Example:
        >>> save_recipe_rating("andrea", "recipe_001", "Andrea", "like")
        {"Andrea": "like", "Adam": "dislike"}
    """
    _ensure_data_dir(workspace_id)
    filepath = DATA_DIR / workspace_id / "recipe_ratings.json"

    # Load existing ratings
    try:
        if filepath.exists():
            with open(filepath, 'r') as f:
                data = json.load(f)
        else:
            data = {"ratings": []}
    except Exception as e:
        logger.error(f"Error loading ratings for update in workspace '{workspace_id}': {e}")
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
        logger.info(f"Saved rating for {recipe_id} by {member_name} in workspace '{workspace_id}': {rating}")
    except Exception as e:
        logger.error(f"Error saving recipe rating for workspace '{workspace_id}': {e}")
        raise

    return recipe_rating["ratings"]


def get_recipe_rating(workspace_id: str, recipe_id: str) -> Dict[str, Optional[str]]:
    """
    Get ratings for a specific recipe.

    Args:
        workspace_id: Workspace identifier
        recipe_id: Recipe identifier

    Returns:
        Dict mapping member_name to rating, empty dict if no ratings exist

    Example:
        >>> get_recipe_rating("andrea", "recipe_001")
        {"Andrea": "like", "Adam": "dislike", "Nathan": "like"}
    """
    ratings_dict = load_recipe_ratings(workspace_id)
    return ratings_dict.get(recipe_id, {})


def delete_recipe_rating(workspace_id: str, recipe_id: str) -> None:
    """
    Delete all ratings for a recipe.

    Called when a recipe is deleted to clean up orphaned rating data.

    Args:
        workspace_id: Workspace identifier
        recipe_id: Recipe identifier to delete ratings for
    """
    _ensure_data_dir(workspace_id)
    filepath = DATA_DIR / workspace_id / "recipe_ratings.json"

    if not filepath.exists():
        logger.info(f"No ratings file exists for workspace '{workspace_id}', nothing to delete for {recipe_id}")
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
            logger.info(f"Deleted ratings for recipe {recipe_id} in workspace '{workspace_id}'")
        else:
            logger.info(f"No ratings found for recipe {recipe_id} in workspace '{workspace_id}'")

    except Exception as e:
        logger.error(f"Error deleting recipe ratings for workspace '{workspace_id}': {e}")
        raise


# ===== Recipes =====

def load_recipe(workspace_id: str, recipe_id: str) -> Optional[Recipe]:
    """
    Load a single recipe by ID.

    Args:
        workspace_id: Workspace identifier
        recipe_id: Unique recipe identifier

    Returns:
        Recipe if found, None otherwise
    """
    _ensure_data_dir(workspace_id)
    filepath = DATA_DIR / workspace_id / "recipes" / f"{recipe_id}.json"

    if not filepath.exists():
        logger.warning(f"Recipe {recipe_id} not found at {filepath}")
        return None

    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        recipe = Recipe(**data)
        logger.info(f"Loaded recipe: {recipe.title} from workspace '{workspace_id}'")
        return recipe
    except Exception as e:
        logger.error(f"Error loading recipe {recipe_id} for workspace '{workspace_id}': {e}")
        raise


def save_recipe(workspace_id: str, recipe: Recipe) -> None:
    """
    Save a recipe to JSON file.

    Args:
        workspace_id: Workspace identifier
        recipe: Recipe to save
    """
    _ensure_data_dir(workspace_id)
    filepath = DATA_DIR / workspace_id / "recipes" / f"{recipe.id}.json"

    try:
        with open(filepath, 'w') as f:
            json.dump(recipe.model_dump(), f, indent=2)
        logger.info(f"Saved recipe: {recipe.title} to {filepath} in workspace '{workspace_id}'")
    except Exception as e:
        logger.error(f"Error saving recipe {recipe.id} for workspace '{workspace_id}': {e}")
        raise


def list_all_recipes(workspace_id: str) -> List[Recipe]:
    """
    Load all recipes from the recipes directory.
    Recipes are sorted by modification time (most recent first).

    Args:
        workspace_id: Workspace identifier

    Returns:
        List of all Recipe objects, sorted by creation/modification time
    """
    _ensure_data_dir(workspace_id)
    recipes_dir = DATA_DIR / workspace_id / "recipes"
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

    logger.info(f"Loaded {len(recipes)} recipes for workspace '{workspace_id}' (sorted by most recent)")
    return recipes


def delete_recipe(workspace_id: str, recipe_id: str) -> bool:
    """
    Delete a recipe by ID from both JSON storage and Chroma DB.

    Args:
        workspace_id: Workspace identifier
        recipe_id: Unique recipe identifier

    Returns:
        True if deleted, False if recipe didn't exist
    """
    _ensure_data_dir(workspace_id)
    filepath = DATA_DIR / workspace_id / "recipes" / f"{recipe_id}.json"

    if not filepath.exists():
        logger.warning(f"Recipe {recipe_id} not found in storage for workspace '{workspace_id}'")
        # Still try to remove from Chroma in case it's orphaned

    try:
        # Delete JSON file if it exists
        if filepath.exists():
            filepath.unlink()
            logger.info(f"Deleted recipe file: {recipe_id} from workspace '{workspace_id}'")

        # Remove from Chroma DB (workspace filtering will be handled by chroma_manager)
        from app.data.chroma_manager import delete_recipe_from_chroma
        delete_recipe_from_chroma(workspace_id, recipe_id)

        return True
    except Exception as e:
        logger.error(f"Error deleting recipe {recipe_id} for workspace '{workspace_id}': {e}")
        raise


# ===== Meal Plans =====

def _ensure_meal_plans_dir(workspace_id: str) -> Path:
    """
    Ensure meal_plans directory exists for a workspace.

    Args:
        workspace_id: Workspace identifier

    Returns:
        Path to the meal_plans directory
    """
    _ensure_data_dir(workspace_id)
    meal_plans_dir = DATA_DIR / workspace_id / "meal_plans"
    meal_plans_dir.mkdir(exist_ok=True)
    return meal_plans_dir


def load_meal_plan(workspace_id: str, meal_plan_id: str) -> Optional[MealPlan]:
    """
    Load a meal plan by ID.

    Args:
        workspace_id: Workspace identifier
        meal_plan_id: Unique meal plan identifier (typically week_start_date string)

    Returns:
        MealPlan if found, None otherwise
    """
    meal_plans_dir = _ensure_meal_plans_dir(workspace_id)
    filepath = meal_plans_dir / f"{meal_plan_id}.json"

    if not filepath.exists():
        logger.warning(f"Meal plan {meal_plan_id} not found at {filepath}")
        return None

    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        meal_plan = MealPlan(**data)
        logger.info(f"Loaded meal plan: {meal_plan_id} from workspace '{workspace_id}'")
        return meal_plan
    except Exception as e:
        logger.error(f"Error loading meal plan {meal_plan_id} for workspace '{workspace_id}': {e}")
        raise


def save_meal_plan(workspace_id: str, meal_plan: MealPlan) -> None:
    """
    Save a meal plan to JSON file.

    Updates the updated_at timestamp automatically.

    Args:
        workspace_id: Workspace identifier
        meal_plan: MealPlan to save
    """
    from datetime import datetime

    meal_plans_dir = _ensure_meal_plans_dir(workspace_id)
    filepath = meal_plans_dir / f"{meal_plan.id}.json"

    # Update the updated_at timestamp
    # Use model_copy to create a new instance with updated field
    meal_plan_data = meal_plan.model_dump(mode='json')
    meal_plan_data['updated_at'] = datetime.now().isoformat()

    try:
        with open(filepath, 'w') as f:
            json.dump(meal_plan_data, f, indent=2, default=str)
        logger.info(f"Saved meal plan: {meal_plan.id} to {filepath} in workspace '{workspace_id}'")
    except Exception as e:
        logger.error(f"Error saving meal plan {meal_plan.id} for workspace '{workspace_id}': {e}")
        raise


def list_all_meal_plans(workspace_id: str) -> List[MealPlan]:
    """
    Load all meal plans for a workspace.

    Returns meal plans sorted by week_start_date (most recent first).

    Args:
        workspace_id: Workspace identifier

    Returns:
        List of all MealPlan objects, sorted by week_start_date descending
    """
    meal_plans_dir = _ensure_meal_plans_dir(workspace_id)
    meal_plans = []

    for filepath in meal_plans_dir.glob("*.json"):
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
            meal_plan = MealPlan(**data)
            meal_plans.append(meal_plan)
        except Exception as e:
            logger.error(f"Error loading meal plan from {filepath}: {e}")
            # Continue loading other meal plans even if one fails

    # Sort by week_start_date (most recent first)
    meal_plans.sort(key=lambda mp: mp.week_start_date, reverse=True)

    logger.info(f"Loaded {len(meal_plans)} meal plans for workspace '{workspace_id}'")
    return meal_plans


def delete_meal_plan(workspace_id: str, meal_plan_id: str) -> bool:
    """
    Delete a meal plan by ID.

    Args:
        workspace_id: Workspace identifier
        meal_plan_id: Unique meal plan identifier

    Returns:
        True if deleted, False if meal plan didn't exist
    """
    meal_plans_dir = _ensure_meal_plans_dir(workspace_id)
    filepath = meal_plans_dir / f"{meal_plan_id}.json"

    if not filepath.exists():
        logger.warning(f"Meal plan {meal_plan_id} not found for deletion in workspace '{workspace_id}'")
        return False

    try:
        filepath.unlink()
        logger.info(f"Deleted meal plan: {meal_plan_id} from workspace '{workspace_id}'")
        return True
    except Exception as e:
        logger.error(f"Error deleting meal plan {meal_plan_id} for workspace '{workspace_id}': {e}")
        raise
