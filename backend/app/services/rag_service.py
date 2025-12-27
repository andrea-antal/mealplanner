"""
RAG (Retrieval Augmented Generation) service for meal planning.

This service handles:
1. Retrieving relevant recipes from Chroma based on user constraints
2. Loading full recipe details from JSON storage
3. Building context for LLM prompt construction

Separated from meal plan generation to keep concerns distinct and
enable future multi-agent refactoring.
"""
import logging
from typing import List, Dict, Optional
from app.models.recipe import Recipe
from app.models.household import HouseholdProfile
from app.models.grocery import GroceryItem
from app.data.chroma_manager import query_recipes
from app.data.data_manager import load_recipe

logger = logging.getLogger(__name__)


def retrieve_relevant_recipes(
    workspace_id: str,
    household: HouseholdProfile,
    available_groceries: List[GroceryItem],
    num_recipes: int = 15
) -> List[Recipe]:
    """
    Retrieve relevant recipes based on household constraints and available groceries.

    This function performs semantic search in the Chroma vector database to find
    recipes that best match the household's needs and available ingredients.

    Args:
        workspace_id: Workspace identifier for data isolation
        household: Household profile with dietary constraints, preferences, cooking gear
        available_groceries: List of GroceryItem objects currently available
        num_recipes: Maximum number of recipes to return (default: 15)

    Returns:
        List of Recipe objects, sorted by relevance

    Example:
        >>> household = load_household_profile("andrea")
        >>> groceries = [GroceryItem(name="chicken"), GroceryItem(name="rice")]
        >>> recipes = retrieve_relevant_recipes("andrea", household, groceries, num_recipes=10)
        >>> print(f"Found {len(recipes)} relevant recipes")
    """
    logger.info(f"Retrieving recipes for household with {len(household.family_members)} members in workspace '{workspace_id}'")

    # Build query text from household constraints and groceries
    query_text = _build_query_text(household, available_groceries)
    logger.info(f"Query text: {query_text}")

    # Build metadata filters for hard constraints
    filters = _build_filters(household)
    logger.debug(f"Filters: {filters}")

    # Query Chroma for relevant recipe IDs
    search_results = query_recipes(
        workspace_id=workspace_id,
        query_text=query_text,
        filters=filters,
        n_results=num_recipes
    )

    # Load full Recipe objects from JSON storage
    recipes = []
    for result in search_results:
        recipe_id = result['id']
        recipe = load_recipe(workspace_id, recipe_id)

        if recipe:
            recipes.append(recipe)
        else:
            logger.warning(f"Recipe {recipe_id} found in Chroma but not in JSON storage for workspace '{workspace_id}'")

    logger.info(f"Retrieved {len(recipes)} recipes for workspace '{workspace_id}'")
    return recipes


def _build_query_text(household: HouseholdProfile, groceries: List[GroceryItem]) -> str:
    """
    Build natural language query text for semantic search.

    Combines:
    - Available groceries (prioritize using what's on hand)
    - Dietary preferences (e.g., "toddler-friendly", "quick")
    - Cooking preferences (e.g., "one-pot", "minimal-prep")

    Args:
        household: Household profile
        groceries: List of GroceryItem objects

    Returns:
        Query string for semantic search
    """
    query_parts = []

    # Add groceries - extract names from GroceryItem objects
    if groceries:
        grocery_names = [item.name for item in groceries[:10]]  # Limit to avoid too long query
        grocery_text = ", ".join(grocery_names)
        query_parts.append(f"recipes using {grocery_text}")

    # Add cooking preferences
    prefs = household.cooking_preferences
    if prefs.preferred_methods:
        methods = ", ".join(prefs.preferred_methods)
        query_parts.append(methods)

    # Add priority based on weeknight vs weekend
    # For v0.1, default to weeknight priority
    if household.preferences.weeknight_priority:
        query_parts.append(household.preferences.weeknight_priority)

    # Combine into natural language query
    query = " ".join(query_parts)
    return query if query else "family-friendly recipes"


def _build_filters(household: HouseholdProfile) -> Optional[Dict]:
    """
    Build Chroma metadata filters for hard constraints.

    Filters ensure recipes meet non-negotiable requirements:
    - Available appliances (can't make recipe without required equipment)
    - Time constraints (weeknight active cooking time limits)

    Note: Allergies and dislikes are handled in prompt engineering,
    not as hard filters, to allow LLM flexibility.

    Args:
        household: Household profile

    Returns:
        Filter dictionary for Chroma query, or None if no filters needed
    """
    # For v0.1, we're keeping filters minimal
    # Future: Add appliance filtering when we have more recipe data

    # Example of how appliance filtering would work:
    # available_appliances = household.cooking_preferences.available_appliances
    # if available_appliances:
    #     return {
    #         "$or": [
    #             {"required_appliances": {"$contains": appliance}}
    #             for appliance in available_appliances
    #         ]
    #     }

    # For now, return None (no hard filters)
    return None


def prepare_context_for_llm(
    household: HouseholdProfile,
    recipes: List[Recipe],
    available_groceries: List[GroceryItem],
    recipe_ratings: Optional[Dict[str, Dict[str, str]]] = None
) -> Dict:
    """
    Prepare structured context for LLM prompt.

    This bundles all the information the LLM needs to generate a meal plan:
    - Household constraints (allergies, dislikes, daycare rules)
    - Available groceries with expiry information
    - Candidate recipes with full details
    - Cooking preferences
    - Recipe ratings (likes/dislikes per household member)

    Args:
        household: Household profile
        recipes: List of relevant recipes
        available_groceries: List of GroceryItem objects with dates
        recipe_ratings: Optional dict mapping recipe_id to ratings dict (member_name -> rating)

    Returns:
        Dictionary with structured context for prompt construction
    """
    # Extract allergies and dislikes across all family members
    allergies = []
    dislikes = []
    for member in household.family_members:
        allergies.extend(member.allergies)
        dislikes.extend(member.dislikes)

    context = {
        "household": {
            "family_members": [
                {
                    "name": member.name,
                    "age_group": member.age_group,
                    "allergies": member.allergies,
                    "dislikes": member.dislikes,
                    "preferences": member.preferences
                }
                for member in household.family_members
            ],
            "all_allergies": list(set(allergies)),  # Deduplicate
            "all_dislikes": list(set(dislikes)),
            "daycare_rules": {
                "no_nuts": household.daycare_rules.no_nuts,
                "no_honey": household.daycare_rules.no_honey,
                "must_be_cold": household.daycare_rules.must_be_cold
            },
            "cooking_preferences": {
                "available_appliances": household.cooking_preferences.available_appliances,
                "preferred_methods": household.cooking_preferences.preferred_methods,
                "max_active_cooking_time_weeknight": household.cooking_preferences.max_active_cooking_time_weeknight,
                "max_active_cooking_time_weekend": household.cooking_preferences.max_active_cooking_time_weekend
            }
        },
        "available_groceries": [
            {
                "name": item.name,
                "date_added": item.date_added.isoformat() if item.date_added else None,
                "purchase_date": item.purchase_date.isoformat() if item.purchase_date else None,
                "expiry_type": item.expiry_type,
                "expiry_date": item.expiry_date.isoformat() if item.expiry_date else None
            }
            for item in available_groceries
        ],
        "candidate_recipes": [
            {
                "id": recipe.id,
                "title": recipe.title,
                "ingredients": recipe.ingredients,
                "instructions": recipe.instructions,
                "tags": recipe.tags,
                "prep_time_minutes": recipe.prep_time_minutes,
                "active_cooking_time_minutes": recipe.active_cooking_time_minutes,
                "serves": recipe.serves,
                "required_appliances": recipe.required_appliances,
                "household_ratings": recipe_ratings.get(recipe.id, {}) if recipe_ratings else {}
            }
            for recipe in recipes
        ]
    }

    return context
