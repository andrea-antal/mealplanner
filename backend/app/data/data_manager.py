"""
Data manager for Supabase database operations.

This module provides an abstraction layer for data persistence using Supabase.
All functions require a workspace_id parameter for multi-tenant data isolation.

Note: Row-Level Security (RLS) in Supabase provides an additional layer of
data isolation at the database level.
"""
import logging
from typing import List, Optional, Dict
from datetime import date as Date, datetime
from app.models import Recipe, HouseholdProfile
from app.models.grocery import GroceryItem, GroceryList
from app.models.shopping import ShoppingListItem, ShoppingList, TemplateItem, TemplateList
from app.models.meal_plan import MealPlan
from app.db.supabase_client import get_supabase_admin_client
from app.middleware.api_call_tracker import log_api_call

logger = logging.getLogger(__name__)


def _get_client():
    """Get Supabase admin client for data operations."""
    return get_supabase_admin_client()


# ===== Workspace Management =====

def list_workspaces() -> List[str]:
    """
    List all workspace IDs that have data.

    Queries multiple tables to find all workspaces with actual data,
    not just user profiles (which are created at signup).

    Returns:
        Sorted list of workspace IDs
    """
    try:
        supabase = _get_client()
        workspaces = set()

        # Check profiles (users who have signed up)
        try:
            response = supabase.table("profiles").select("workspace_id").execute()
            workspaces.update(row["workspace_id"] for row in response.data if row.get("workspace_id"))
        except Exception:
            pass

        # Check household_profiles (migrated data)
        try:
            response = supabase.table("household_profiles").select("workspace_id").execute()
            workspaces.update(row["workspace_id"] for row in response.data if row.get("workspace_id"))
        except Exception:
            pass

        # Check recipes (migrated data)
        try:
            response = supabase.table("recipes").select("workspace_id").limit(1000).execute()
            workspaces.update(row["workspace_id"] for row in response.data if row.get("workspace_id"))
        except Exception:
            pass

        return sorted(workspaces)
    except Exception as e:
        logger.error(f"Error listing workspaces: {e}")
        return []


def get_workspace_stats(workspace_id: str) -> Dict:
    """
    Get summary statistics for a workspace.

    Returns:
        Dict with recipe_count, meal_plan_count, grocery_count, member_count,
        last_meal_plan_date, and last_activity timestamp.
    """
    try:
        supabase = _get_client()

        stats = {
            "workspace_id": workspace_id,
            "recipe_count": 0,
            "meal_plan_count": 0,
            "grocery_count": 0,
            "member_count": 0,
            "last_meal_plan_date": None,
            "last_activity": None,
        }

        # Recipe count
        recipe_response = supabase.table("recipes").select("id", count="exact").eq("workspace_id", workspace_id).execute()
        stats["recipe_count"] = recipe_response.count or 0

        # Meal plan count + most recent
        meal_plan_response = supabase.table("meal_plans").select("id, created_at").eq("workspace_id", workspace_id).order("created_at", desc=True).execute()
        stats["meal_plan_count"] = len(meal_plan_response.data)
        if meal_plan_response.data:
            stats["last_meal_plan_date"] = meal_plan_response.data[0]["created_at"]
            stats["last_activity"] = meal_plan_response.data[0]["created_at"]

        # Grocery count - use regular query (not .single()) to avoid exception when no rows
        grocery_response = supabase.table("groceries").select("items").eq("workspace_id", workspace_id).execute()
        if grocery_response.data:
            items = grocery_response.data[0].get("items", [])
            stats["grocery_count"] = len(items) if items else 0

        # Household member count - use regular query (not .single()) to avoid exception when no rows
        household_response = supabase.table("household_profiles").select("family_members").eq("workspace_id", workspace_id).execute()
        if household_response.data:
            members = household_response.data[0].get("family_members", [])
            stats["member_count"] = len(members) if members else 0

        return stats

    except Exception as e:
        logger.error(f"Error getting workspace stats for '{workspace_id}': {e}")
        return {"error": str(e), "workspace_id": workspace_id}


def get_user_email_map() -> Dict[str, Optional[str]]:
    """
    Map workspace_id (user UUID) to email address.

    Uses Supabase Admin API to fetch all users in one call,
    avoiding N+1 queries when displaying workspace summaries.

    Returns:
        Dict mapping user UUID to email address, empty dict on error
    """
    try:
        supabase = _get_client()
        response = supabase.auth.admin.list_users()
        return {user.id: user.email for user in response}
    except Exception as e:
        logger.error(f"Error fetching user emails: {e}")
        return {}


def is_workspace_empty(workspace_id: str) -> bool:
    """
    Check if a workspace has no meaningful data.

    Args:
        workspace_id: Workspace identifier to check

    Returns:
        True if workspace is empty, False otherwise
    """
    stats = get_workspace_stats(workspace_id)

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
    Delete all data for a workspace.

    This permanently removes:
    - All recipes
    - All meal plans
    - Household profile
    - Groceries list
    - Recipe ratings
    - Chroma vector DB entries

    WARNING: This operation is irreversible!

    Args:
        workspace_id: Workspace identifier to delete

    Returns:
        True if data was deleted, False if workspace didn't exist
    """
    try:
        supabase = _get_client()

        # Delete in order (respecting potential foreign keys)
        supabase.table("recipe_ratings").delete().eq("workspace_id", workspace_id).execute()
        supabase.table("meal_plans").delete().eq("workspace_id", workspace_id).execute()
        supabase.table("recipes").delete().eq("workspace_id", workspace_id).execute()
        supabase.table("groceries").delete().eq("workspace_id", workspace_id).execute()
        supabase.table("household_profiles").delete().eq("workspace_id", workspace_id).execute()

        # Clean up Chroma vector DB entries to prevent orphaned embeddings
        # (chromadb may not be installed in production if using pgvector instead)
        try:
            from app.data.chroma_manager import delete_workspace_from_chroma
            chroma_deleted = delete_workspace_from_chroma(workspace_id)
            logger.info(f"Cleaned up {chroma_deleted} Chroma entries for workspace '{workspace_id}'")
        except ImportError:
            logger.debug("Chroma not available, skipping Chroma cleanup")

        logger.info(f"Deleted all data for workspace '{workspace_id}'")
        return True

    except Exception as e:
        logger.error(f"Error deleting workspace '{workspace_id}': {e}")
        raise


def delete_account(workspace_id: str) -> dict:
    """
    Delete a user account and all associated workspace data.

    This permanently removes:
    - All workspace data (recipes, meal plans, groceries, household profile, ratings)
    - Chroma vector DB entries
    - The auth user from Supabase Auth

    WARNING: This operation is irreversible! The user will no longer be able to log in.

    Args:
        workspace_id: Workspace/user identifier to delete (same as user UUID)

    Returns:
        dict: Summary of what was deleted

    Raises:
        ValueError: If workspace doesn't exist or user not found
        Exception: If auth deletion fails
    """
    try:
        supabase = _get_client()

        # First delete all workspace data (this also handles Chroma cleanup)
        delete_workspace(workspace_id)

        # Then delete the auth user
        # workspace_id is the user's UUID in this system
        try:
            supabase.auth.admin.delete_user(workspace_id)
            logger.info(f"Deleted auth user '{workspace_id}'")
        except Exception as auth_error:
            # Log but don't fail if user doesn't exist in auth
            # (data might have been orphaned)
            logger.warning(f"Could not delete auth user '{workspace_id}': {auth_error}")

        return {
            "workspace_id": workspace_id,
            "workspace_deleted": True,
            "auth_user_deleted": True
        }

    except Exception as e:
        logger.error(f"Error deleting account '{workspace_id}': {e}")
        raise


# ===== Household Profile =====

def load_household_profile(workspace_id: str) -> Optional[HouseholdProfile]:
    """
    Load household profile from database.

    Args:
        workspace_id: Workspace identifier

    Returns:
        HouseholdProfile if exists, None otherwise
    """
    try:
        supabase = _get_client()
        response = supabase.table("household_profiles").select("*").eq("workspace_id", workspace_id).single().execute()

        if not response.data:
            logger.warning(f"Household profile not found for workspace '{workspace_id}'")
            return None

        data = response.data
        profile = HouseholdProfile(
            family_members=data.get("family_members", []),
            daycare_rules=data.get("daycare_rules", {}),
            cooking_preferences=data.get("cooking_preferences", {}),
            preferences=data.get("preferences", {}),
            onboarding_status=data.get("onboarding_status", {}),
            onboarding_data=data.get("onboarding_data", {})
        )
        logger.info(f"Loaded household profile for workspace '{workspace_id}' with {len(profile.family_members)} members")
        return profile

    except Exception as e:
        if "PGRST116" in str(e):  # No rows returned
            logger.warning(f"Household profile not found for workspace '{workspace_id}'")
            return None
        logger.error(f"Error loading household profile for workspace '{workspace_id}': {e}")
        raise


def save_household_profile(workspace_id: str, profile: HouseholdProfile) -> None:
    """
    Save household profile to database (upsert).

    Args:
        workspace_id: Workspace identifier
        profile: HouseholdProfile to save
    """
    try:
        supabase = _get_client()

        data = {
            "workspace_id": workspace_id,
            "family_members": profile.family_members if hasattr(profile, 'family_members') else [],
            "daycare_rules": profile.daycare_rules.model_dump() if hasattr(profile.daycare_rules, 'model_dump') else (profile.daycare_rules if profile.daycare_rules else {}),
            "cooking_preferences": profile.cooking_preferences.model_dump() if hasattr(profile.cooking_preferences, 'model_dump') else (profile.cooking_preferences if profile.cooking_preferences else {}),
            "preferences": profile.preferences.model_dump() if hasattr(profile.preferences, 'model_dump') else (profile.preferences if profile.preferences else {}),
            "onboarding_status": profile.onboarding_status.model_dump() if hasattr(profile.onboarding_status, 'model_dump') else (profile.onboarding_status if profile.onboarding_status else {}),
            "onboarding_data": profile.onboarding_data.model_dump() if hasattr(profile.onboarding_data, 'model_dump') else (profile.onboarding_data if profile.onboarding_data else {}),
            "updated_at": datetime.now().isoformat()
        }

        # Convert family_members if they're Pydantic models
        if data["family_members"]:
            data["family_members"] = [
                m.model_dump() if hasattr(m, 'model_dump') else m
                for m in data["family_members"]
            ]

        supabase.table("household_profiles").upsert(data, on_conflict="workspace_id").execute()
        logger.info(f"Saved household profile for workspace '{workspace_id}'")

    except Exception as e:
        logger.error(f"Error saving household profile for workspace '{workspace_id}': {e}")
        raise


# ===== Groceries =====

def load_groceries(workspace_id: str) -> List[GroceryItem]:
    """
    Load groceries from database.

    Args:
        workspace_id: Workspace identifier

    Returns:
        List of GroceryItem objects, empty list if none exist
    """
    try:
        supabase = _get_client()
        response = supabase.table("groceries").select("items").eq("workspace_id", workspace_id).single().execute()

        if not response.data:
            logger.info(f"No groceries found for workspace '{workspace_id}'")
            return []

        items_data = response.data.get("items", [])
        if not items_data:
            return []

        items = [GroceryItem(**item) for item in items_data]
        logger.info(f"Loaded {len(items)} grocery items for workspace '{workspace_id}'")
        return items

    except Exception as e:
        if "PGRST116" in str(e):  # No rows returned
            return []
        logger.error(f"Error loading groceries for workspace '{workspace_id}': {e}")
        raise


def save_groceries(workspace_id: str, items: List[GroceryItem]) -> None:
    """
    Save groceries list to database (upsert).

    Args:
        workspace_id: Workspace identifier
        items: List of GroceryItem objects
    """
    try:
        supabase = _get_client()

        items_data = [item.model_dump(mode='json') for item in items]

        data = {
            "workspace_id": workspace_id,
            "items": items_data,
            "updated_at": datetime.now().isoformat()
        }

        supabase.table("groceries").upsert(data, on_conflict="workspace_id").execute()
        logger.info(f"Saved {len(items)} grocery items for workspace '{workspace_id}'")

    except Exception as e:
        logger.error(f"Error saving groceries for workspace '{workspace_id}': {e}")
        raise


# ===== Shopping List =====

def load_shopping_list(workspace_id: str) -> List[ShoppingListItem]:
    """
    Load shopping list from database.

    Args:
        workspace_id: Workspace identifier

    Returns:
        List of ShoppingListItem objects, empty list if none exist
    """
    try:
        supabase = _get_client()
        response = supabase.table("shopping_lists").select("items").eq("workspace_id", workspace_id).single().execute()

        if not response.data:
            logger.info(f"No shopping list found for workspace '{workspace_id}'")
            return []

        items_data = response.data.get("items", [])
        if not items_data:
            return []

        items = [ShoppingListItem(**item) for item in items_data]
        logger.info(f"Loaded {len(items)} shopping list items for workspace '{workspace_id}'")
        return items

    except Exception as e:
        if "PGRST116" in str(e):  # No rows returned
            return []
        logger.error(f"Error loading shopping list for workspace '{workspace_id}': {e}")
        raise


def save_shopping_list(workspace_id: str, items: List[ShoppingListItem]) -> None:
    """
    Save shopping list to database (upsert).

    Args:
        workspace_id: Workspace identifier
        items: List of ShoppingListItem objects
    """
    try:
        supabase = _get_client()

        items_data = [item.model_dump(mode='json') for item in items]

        data = {
            "workspace_id": workspace_id,
            "items": items_data,
            "updated_at": datetime.now().isoformat()
        }

        supabase.table("shopping_lists").upsert(data, on_conflict="workspace_id").execute()
        logger.info(f"Saved {len(items)} shopping list items for workspace '{workspace_id}'")

    except Exception as e:
        logger.error(f"Error saving shopping list for workspace '{workspace_id}': {e}")
        raise


def clear_shopping_list(workspace_id: str) -> None:
    """
    Clear all items from shopping list.

    Args:
        workspace_id: Workspace identifier
    """
    save_shopping_list(workspace_id, [])
    logger.info(f"Cleared shopping list for workspace '{workspace_id}'")


# ===== Shopping Templates =====

def load_shopping_templates(workspace_id: str) -> List[TemplateItem]:
    """
    Load shopping templates from database.

    Args:
        workspace_id: Workspace identifier

    Returns:
        List of TemplateItem objects, empty list if none exist
    """
    try:
        supabase = _get_client()
        response = supabase.table("shopping_templates").select("items").eq("workspace_id", workspace_id).single().execute()

        if not response.data:
            logger.info(f"No shopping templates found for workspace '{workspace_id}'")
            return []

        items_data = response.data.get("items", [])
        if not items_data:
            return []

        templates = [TemplateItem(**item) for item in items_data]
        logger.info(f"Loaded {len(templates)} shopping templates for workspace '{workspace_id}'")
        return templates

    except Exception as e:
        if "PGRST116" in str(e):  # No rows returned
            return []
        logger.error(f"Error loading shopping templates for workspace '{workspace_id}': {e}")
        raise


def save_shopping_templates(workspace_id: str, templates: List[TemplateItem]) -> None:
    """
    Save shopping templates to database (upsert).

    Args:
        workspace_id: Workspace identifier
        templates: List of TemplateItem objects
    """
    try:
        supabase = _get_client()

        items_data = [template.model_dump(mode='json') for template in templates]

        data = {
            "workspace_id": workspace_id,
            "items": items_data,
            "updated_at": datetime.now().isoformat()
        }

        supabase.table("shopping_templates").upsert(data, on_conflict="workspace_id").execute()
        logger.info(f"Saved {len(templates)} shopping templates for workspace '{workspace_id}'")

    except Exception as e:
        logger.error(f"Error saving shopping templates for workspace '{workspace_id}': {e}")
        raise


# ===== Recipe Ratings =====

def load_recipe_ratings(workspace_id: str) -> dict:
    """
    Load all recipe ratings for a workspace.

    Args:
        workspace_id: Workspace identifier

    Returns:
        Dict mapping recipe_id to ratings dict (member_name -> rating).
    """
    try:
        supabase = _get_client()
        response = supabase.table("recipe_ratings").select("recipe_id, ratings").eq("workspace_id", workspace_id).execute()

        ratings_dict = {}
        for row in response.data:
            ratings_dict[row["recipe_id"]] = row.get("ratings", {})

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
    """
    try:
        supabase = _get_client()

        # Get existing ratings for this recipe
        response = supabase.table("recipe_ratings").select("ratings").eq("workspace_id", workspace_id).eq("recipe_id", recipe_id).single().execute()

        if response.data:
            current_ratings = response.data.get("ratings", {})
        else:
            current_ratings = {}

        # Update the rating
        if rating is None:
            current_ratings.pop(member_name, None)
        else:
            current_ratings[member_name] = rating

        # Upsert the ratings
        data = {
            "workspace_id": workspace_id,
            "recipe_id": recipe_id,
            "ratings": current_ratings,
            "updated_at": datetime.now().isoformat()
        }

        supabase.table("recipe_ratings").upsert(data, on_conflict="workspace_id,recipe_id").execute()
        logger.info(f"Saved rating for {recipe_id} by {member_name} in workspace '{workspace_id}': {rating}")
        return current_ratings

    except Exception as e:
        if "PGRST116" in str(e):  # No existing row
            # Create new rating entry
            data = {
                "workspace_id": workspace_id,
                "recipe_id": recipe_id,
                "ratings": {member_name: rating} if rating else {},
                "updated_at": datetime.now().isoformat()
            }
            supabase = _get_client()
            supabase.table("recipe_ratings").insert(data).execute()
            return data["ratings"]

        logger.error(f"Error saving recipe rating for workspace '{workspace_id}': {e}")
        raise


def get_recipe_rating(workspace_id: str, recipe_id: str) -> Dict[str, Optional[str]]:
    """
    Get ratings for a specific recipe.

    Args:
        workspace_id: Workspace identifier
        recipe_id: Recipe identifier

    Returns:
        Dict mapping member_name to rating, empty dict if no ratings exist
    """
    try:
        supabase = _get_client()
        response = supabase.table("recipe_ratings").select("ratings").eq("workspace_id", workspace_id).eq("recipe_id", recipe_id).single().execute()

        if response.data:
            return response.data.get("ratings", {})
        return {}

    except Exception as e:
        if "PGRST116" in str(e):  # No rows returned
            return {}
        logger.error(f"Error getting recipe rating for workspace '{workspace_id}': {e}")
        return {}


def delete_recipe_rating(workspace_id: str, recipe_id: str) -> None:
    """
    Delete all ratings for a recipe.

    Args:
        workspace_id: Workspace identifier
        recipe_id: Recipe identifier to delete ratings for
    """
    try:
        supabase = _get_client()
        supabase.table("recipe_ratings").delete().eq("workspace_id", workspace_id).eq("recipe_id", recipe_id).execute()
        logger.info(f"Deleted ratings for recipe {recipe_id} in workspace '{workspace_id}'")

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
    try:
        supabase = _get_client()
        response = supabase.table("recipes").select("*").eq("workspace_id", workspace_id).eq("id", recipe_id).single().execute()

        if not response.data:
            logger.warning(f"Recipe {recipe_id} not found in workspace '{workspace_id}'")
            return None

        data = response.data
        # Remove Supabase-specific fields
        data.pop("embedding", None)
        data.pop("workspace_id", None)

        recipe = Recipe(**data)
        logger.info(f"Loaded recipe: {recipe.title} from workspace '{workspace_id}'")
        return recipe

    except Exception as e:
        if "PGRST116" in str(e):  # No rows returned
            logger.warning(f"Recipe {recipe_id} not found in workspace '{workspace_id}'")
            return None
        logger.error(f"Error loading recipe {recipe_id} for workspace '{workspace_id}': {e}")
        raise


def save_recipe(workspace_id: str, recipe: Recipe) -> None:
    """
    Save a recipe to database (upsert).

    Args:
        workspace_id: Workspace identifier
        recipe: Recipe to save
    """
    try:
        supabase = _get_client()

        data = recipe.model_dump()
        data["workspace_id"] = workspace_id
        data["updated_at"] = datetime.now().isoformat()

        # Remove 'description' field until Supabase schema cache refreshes
        # (Column was added but PostgREST cache hasn't updated yet)
        data.pop("description", None)

        # Generate embedding for the recipe
        embedding = _generate_recipe_embedding(recipe, workspace_id=workspace_id)
        if embedding:
            data["embedding"] = embedding

        supabase.table("recipes").upsert(data, on_conflict="id").execute()
        logger.info(f"Saved recipe: {recipe.title} to workspace '{workspace_id}'")

    except Exception as e:
        logger.error(f"Error saving recipe {recipe.id} for workspace '{workspace_id}': {e}")
        raise


def list_all_recipes(workspace_id: str) -> List[Recipe]:
    """
    Load all recipes for a workspace.
    Recipes are sorted by updated_at (most recent first).

    Args:
        workspace_id: Workspace identifier

    Returns:
        List of all Recipe objects
    """
    try:
        supabase = _get_client()
        response = supabase.table("recipes").select("*").eq("workspace_id", workspace_id).order("updated_at", desc=True).execute()

        recipes = []
        for data in response.data:
            # Remove Supabase-specific fields
            data.pop("embedding", None)
            data.pop("workspace_id", None)
            recipes.append(Recipe(**data))

        logger.info(f"Loaded {len(recipes)} recipes for workspace '{workspace_id}'")
        return recipes

    except Exception as e:
        logger.error(f"Error listing recipes for workspace '{workspace_id}': {e}")
        raise


def delete_recipe(workspace_id: str, recipe_id: str) -> bool:
    """
    Delete a recipe by ID.

    Args:
        workspace_id: Workspace identifier
        recipe_id: Unique recipe identifier

    Returns:
        True if deleted, False if recipe didn't exist
    """
    try:
        supabase = _get_client()

        # Check if recipe exists
        check = supabase.table("recipes").select("id").eq("workspace_id", workspace_id).eq("id", recipe_id).single().execute()
        if not check.data:
            logger.warning(f"Recipe {recipe_id} not found in workspace '{workspace_id}'")
            return False

        # Delete the recipe
        supabase.table("recipes").delete().eq("workspace_id", workspace_id).eq("id", recipe_id).execute()

        # Also delete associated ratings
        delete_recipe_rating(workspace_id, recipe_id)

        logger.info(f"Deleted recipe {recipe_id} from workspace '{workspace_id}'")
        return True

    except Exception as e:
        if "PGRST116" in str(e):  # No rows returned
            return False
        logger.error(f"Error deleting recipe {recipe_id} for workspace '{workspace_id}': {e}")
        raise


# ===== Meal Plans =====

def load_meal_plan(workspace_id: str, meal_plan_id: str) -> Optional[MealPlan]:
    """
    Load a meal plan by ID.

    Args:
        workspace_id: Workspace identifier
        meal_plan_id: Unique meal plan identifier (typically week_start_date string)

    Returns:
        MealPlan if found, None otherwise
    """
    try:
        supabase = _get_client()
        response = supabase.table("meal_plans").select("*").eq("workspace_id", workspace_id).eq("id", meal_plan_id).single().execute()

        if not response.data:
            logger.warning(f"Meal plan {meal_plan_id} not found in workspace '{workspace_id}'")
            return None

        data = response.data
        data.pop("workspace_id", None)

        meal_plan = MealPlan(**data)
        logger.info(f"Loaded meal plan: {meal_plan_id} from workspace '{workspace_id}'")
        return meal_plan

    except Exception as e:
        if "PGRST116" in str(e):  # No rows returned
            return None
        logger.error(f"Error loading meal plan {meal_plan_id} for workspace '{workspace_id}': {e}")
        raise


def save_meal_plan(workspace_id: str, meal_plan: MealPlan) -> None:
    """
    Save a meal plan to database (upsert).

    Args:
        workspace_id: Workspace identifier
        meal_plan: MealPlan to save
    """
    try:
        supabase = _get_client()

        data = meal_plan.model_dump(mode='json')
        data["workspace_id"] = workspace_id
        data["updated_at"] = datetime.now().isoformat()

        supabase.table("meal_plans").upsert(data, on_conflict="id").execute()
        logger.info(f"Saved meal plan: {meal_plan.id} to workspace '{workspace_id}'")

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
        List of all MealPlan objects
    """
    try:
        supabase = _get_client()
        response = supabase.table("meal_plans").select("*").eq("workspace_id", workspace_id).order("week_start_date", desc=True).execute()

        meal_plans = []
        for data in response.data:
            data.pop("workspace_id", None)
            meal_plans.append(MealPlan(**data))

        logger.info(f"Loaded {len(meal_plans)} meal plans for workspace '{workspace_id}'")
        return meal_plans

    except Exception as e:
        logger.error(f"Error listing meal plans for workspace '{workspace_id}': {e}")
        raise


def delete_meal_plan(workspace_id: str, meal_plan_id: str) -> bool:
    """
    Delete a meal plan by ID.

    Args:
        workspace_id: Workspace identifier
        meal_plan_id: Unique meal plan identifier

    Returns:
        True if deleted, False if meal plan didn't exist
    """
    try:
        supabase = _get_client()

        # Check if meal plan exists
        check = supabase.table("meal_plans").select("id").eq("workspace_id", workspace_id).eq("id", meal_plan_id).single().execute()
        if not check.data:
            logger.warning(f"Meal plan {meal_plan_id} not found in workspace '{workspace_id}'")
            return False

        # Delete the meal plan
        supabase.table("meal_plans").delete().eq("workspace_id", workspace_id).eq("id", meal_plan_id).execute()

        logger.info(f"Deleted meal plan {meal_plan_id} from workspace '{workspace_id}'")
        return True

    except Exception as e:
        if "PGRST116" in str(e):  # No rows returned
            return False
        logger.error(f"Error deleting meal plan {meal_plan_id} for workspace '{workspace_id}': {e}")
        raise


def load_meal_plan_by_week(workspace_id: str, week_start_date: str) -> Optional[MealPlan]:
    """
    Load a meal plan by week start date.

    Args:
        workspace_id: Workspace identifier
        week_start_date: ISO date string (e.g. '2026-02-02')

    Returns:
        MealPlan if found, None otherwise
    """
    try:
        supabase = _get_client()
        response = supabase.table("meal_plans").select("*").eq("workspace_id", workspace_id).eq("week_start_date", week_start_date).maybe_single().execute()

        if not response.data:
            logger.info(f"No meal plan found for week {week_start_date} in workspace '{workspace_id}'")
            return None

        data = response.data
        data.pop("workspace_id", None)
        return MealPlan(**data)

    except Exception as e:
        logger.error(f"Error loading meal plan for week {week_start_date} in workspace '{workspace_id}': {e}")
        raise


def list_meal_plan_weeks(workspace_id: str) -> List[str]:
    """
    List all week_start_date values that have meal plans.

    Args:
        workspace_id: Workspace identifier

    Returns:
        List of week_start_date strings sorted most recent first
    """
    try:
        supabase = _get_client()
        response = supabase.table("meal_plans").select("week_start_date").eq("workspace_id", workspace_id).order("week_start_date", desc=True).execute()

        weeks = [str(row["week_start_date"]) for row in response.data]
        logger.info(f"Found {len(weeks)} meal plan weeks for workspace '{workspace_id}'")
        return weeks

    except Exception as e:
        logger.error(f"Error listing meal plan weeks for workspace '{workspace_id}': {e}")
        raise


# ===== Recipe Embedding & Search =====

def _generate_recipe_embedding(recipe: Recipe, workspace_id: Optional[str] = None) -> Optional[List[float]]:
    """
    Generate embedding vector for a recipe using OpenAI.

    Args:
        recipe: Recipe to generate embedding for
        workspace_id: Optional workspace ID for tracking API usage

    Returns:
        List of floats (1536-dimensional vector) or None if generation fails
    """
    try:
        from openai import OpenAI
        from app.config import settings

        if not settings.OPENAI_API_KEY:
            logger.warning("OpenAI API key not configured, skipping embedding generation")
            return None

        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        # Create text to embed: title + tags + ingredients
        text_parts = [recipe.title]
        if recipe.tags:
            text_parts.extend(recipe.tags)
        if recipe.ingredients:
            # Handle both string and dict ingredients
            for ing in recipe.ingredients:
                if isinstance(ing, str):
                    text_parts.append(ing)
                elif isinstance(ing, dict):
                    text_parts.append(ing.get("name", str(ing)))

        text = " ".join(text_parts)

        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )

        # Track API call
        log_api_call(
            provider="openai",
            workspace_id=workspace_id,
            operation="recipe_embedding",
            model="text-embedding-3-small"
        )

        return response.data[0].embedding

    except Exception as e:
        # Track failed API call
        log_api_call(
            provider="openai",
            workspace_id=workspace_id,
            operation="recipe_embedding",
            model="text-embedding-3-small",
            error=str(e)
        )
        logger.error(f"Error generating embedding for recipe {recipe.id}: {e}")
        return None


def query_recipes(
    workspace_id: str,
    query_text: str,
    n_results: int = 10,
    filters: Optional[Dict] = None
) -> List[Recipe]:
    """
    Query recipes using semantic similarity search with pgvector.

    Args:
        workspace_id: Workspace identifier
        query_text: Natural language query
        n_results: Maximum number of results to return
        filters: Optional filters (tags, meal_types, etc.)

    Returns:
        List of Recipe objects sorted by similarity
    """
    try:
        from openai import OpenAI
        from app.config import settings

        if not settings.OPENAI_API_KEY:
            logger.warning("OpenAI API key not configured, falling back to text search")
            return _text_search_recipes(workspace_id, query_text, n_results, filters)

        # Generate embedding for query
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=query_text
        )
        query_embedding = response.data[0].embedding

        # Track API call
        log_api_call(
            provider="openai",
            workspace_id=workspace_id,
            operation="query_embedding",
            model="text-embedding-3-small"
        )

        # Query Supabase with vector similarity using RPC
        supabase = _get_client()

        # Call the match_recipes Postgres function
        response = supabase.rpc('match_recipes', {
            'query_embedding': query_embedding,
            'match_workspace_id': workspace_id,
            'match_count': n_results,
            'similarity_threshold': 0.0
        }).execute()

        if not response.data:
            logger.info(f"No vector matches for query '{query_text}', falling back to text search")
            return _text_search_recipes(workspace_id, query_text, n_results, filters)

        # Get matched recipe IDs
        matched_ids = [r['id'] for r in response.data]
        logger.info(f"Vector search found {len(matched_ids)} recipes for query '{query_text[:50]}...'")

        # Fetch full recipe objects for matched IDs
        recipes = []
        for recipe_id in matched_ids:
            recipe = load_recipe(workspace_id, recipe_id)
            if recipe:
                recipes.append(recipe)

        # If vector search returned results but we couldn't load them, fall back
        if not recipes and matched_ids:
            logger.warning("Vector search matched IDs but failed to load recipes, falling back to text search")
            return _text_search_recipes(workspace_id, query_text, n_results, filters)

        return recipes

    except Exception as e:
        logger.error(f"Error querying recipes for workspace '{workspace_id}': {e}")
        return _text_search_recipes(workspace_id, query_text, n_results, filters)


def _text_search_recipes(
    workspace_id: str,
    query_text: str,
    n_results: int = 10,
    filters: Optional[Dict] = None
) -> List[Recipe]:
    """
    Fallback text-based recipe search.

    Matches individual words from the query against recipe titles, tags,
    and ingredients. Falls back to returning all recipes if no matches.

    Args:
        workspace_id: Workspace identifier
        query_text: Text to search for
        n_results: Maximum number of results
        filters: Optional filters

    Returns:
        List of matching Recipe objects
    """
    try:
        all_recipes = list_all_recipes(workspace_id)

        if not all_recipes:
            return []

        # Tokenize query into individual words (skip common words)
        stop_words = {'recipes', 'using', 'with', 'and', 'or', 'the', 'a', 'an', 'for', 'to'}
        query_words = [
            word.lower().strip('.,!?')
            for word in query_text.split()
            if word.lower() not in stop_words and len(word) > 2
        ]

        matched = []

        for recipe in all_recipes:
            score = 0
            title_lower = recipe.title.lower()

            # Check each query word against recipe
            for word in query_words:
                if word in title_lower:
                    score += 10
                if recipe.tags:
                    for tag in recipe.tags:
                        if word in tag.lower():
                            score += 5
                if recipe.ingredients:
                    for ing in recipe.ingredients:
                        ing_text = ing if isinstance(ing, str) else str(ing)
                        if word in ing_text.lower():
                            score += 1

            if score > 0:
                matched.append((recipe, score))

        # Sort by score and return top results
        if matched:
            matched.sort(key=lambda x: x[1], reverse=True)
            return [r for r, _ in matched[:n_results]]

        # Fallback: if no matches, return most recent recipes
        # This ensures meal plan generation always has recipes to work with
        logger.info(f"Text search found no matches, returning {n_results} most recent recipes")
        return all_recipes[:n_results]

    except Exception as e:
        logger.error(f"Error in text search for workspace '{workspace_id}': {e}")
        return []
