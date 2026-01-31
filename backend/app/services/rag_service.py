"""
RAG (Retrieval Augmented Generation) service for meal planning.

This service handles:
1. Retrieving relevant recipes using semantic search (pgvector)
2. Building context for LLM prompt construction

Separated from meal plan generation to keep concerns distinct and
enable future multi-agent refactoring.
"""
import logging
from typing import List, Dict, Optional
from app.models.recipe import Recipe
from app.models.household import HouseholdProfile
from app.models.grocery import GroceryItem
from app.data.data_manager import query_recipes, list_all_recipes

logger = logging.getLogger(__name__)

# Minimum recipes per core meal type to ensure balanced coverage
MIN_PER_MEAL_TYPE = 2
CORE_MEAL_TYPES = ["breakfast", "lunch", "dinner"]


def retrieve_relevant_recipes(
    workspace_id: str,
    household: HouseholdProfile,
    available_groceries: List[GroceryItem],
    num_recipes: int = 15,
    week_context: Optional[str] = None
) -> List[Recipe]:
    """
    Retrieve relevant recipes based on household constraints and available groceries.

    This function ensures balanced meal type coverage by:
    1. Guaranteeing at least MIN_PER_MEAL_TYPE recipes for each core meal type
    2. Filling remaining slots with semantically relevant recipes

    This prevents the common issue where semantic search returns mostly dinners,
    leaving breakfast/lunch with "gaps" that trigger AI-generated meals.

    Args:
        workspace_id: Workspace identifier for data isolation
        household: Household profile with dietary constraints, preferences, cooking gear
        available_groceries: List of GroceryItem objects currently available
        num_recipes: Maximum number of recipes to return (default: 15)
        week_context: Optional user description of their week (e.g., "busy week, need quick meals")

    Returns:
        List of Recipe objects with balanced meal type coverage

    Example:
        >>> household = load_household_profile("andrea")
        >>> groceries = [GroceryItem(name="chicken"), GroceryItem(name="rice")]
        >>> recipes = retrieve_relevant_recipes("andrea", household, groceries, num_recipes=10)
        >>> print(f"Found {len(recipes)} relevant recipes")
    """
    logger.info(f"Retrieving recipes for household with {len(household.family_members)} members in workspace '{workspace_id}'")

    # Build query text from household constraints, groceries, and user context
    query_text = _build_query_text(household, available_groceries, week_context)
    logger.info(f"Query text: {query_text}")

    # Build metadata filters for hard constraints
    filters = _build_filters(household)
    logger.debug(f"Filters: {filters}")

    # Get all recipes to ensure we can meet minimum coverage
    all_recipes = list_all_recipes(workspace_id)

    if not all_recipes:
        logger.info(f"No recipes found for workspace '{workspace_id}'")
        return []

    # If library is small, just return all recipes
    if len(all_recipes) <= num_recipes:
        logger.info(f"Small library ({len(all_recipes)} recipes), returning all")
        return all_recipes

    # Query for semantically relevant recipes
    semantic_recipes = query_recipes(
        workspace_id=workspace_id,
        query_text=query_text,
        n_results=num_recipes * 2,  # Get extra for meal type balancing
        filters=filters
    )

    # Build balanced result ensuring minimum coverage per meal type
    result = _ensure_meal_type_coverage(
        all_recipes=all_recipes,
        semantic_recipes=semantic_recipes,
        num_recipes=num_recipes
    )

    logger.info(f"Retrieved {len(result)} recipes for workspace '{workspace_id}' (balanced coverage)")
    return result


def _ensure_meal_type_coverage(
    all_recipes: List[Recipe],
    semantic_recipes: List[Recipe],
    num_recipes: int
) -> List[Recipe]:
    """
    Ensure balanced meal type coverage in the returned recipes.

    Strategy:
    1. First, include semantic results that help meet minimum coverage
    2. If gaps remain, pull from all_recipes to fill them
    3. Fill remaining slots with best semantic matches

    Args:
        all_recipes: All recipes in the workspace
        semantic_recipes: Recipes from semantic search (relevance-ordered)
        num_recipes: Target number of recipes to return

    Returns:
        List of recipes with balanced meal type coverage
    """
    result: List[Recipe] = []
    result_ids: set = set()

    # Group all recipes by meal type for gap-filling
    recipes_by_type: Dict[str, List[Recipe]] = {mt: [] for mt in CORE_MEAL_TYPES}
    for recipe in all_recipes:
        meal_types = getattr(recipe, 'meal_types', []) or ['dinner']
        # Handle side_dish as usable for lunch/dinner
        if 'side_dish' in meal_types:
            meal_types = list(meal_types) + ['lunch', 'dinner']
        for mt in meal_types:
            if mt in recipes_by_type:
                recipes_by_type[mt].append(recipe)

    # Track coverage as we add recipes
    coverage: Dict[str, int] = {mt: 0 for mt in CORE_MEAL_TYPES}

    def add_recipe(recipe: Recipe) -> bool:
        """Add recipe to result if not already present. Returns True if added."""
        if recipe.id in result_ids:
            return False
        result.append(recipe)
        result_ids.add(recipe.id)
        # Update coverage counts
        meal_types = getattr(recipe, 'meal_types', []) or ['dinner']
        if 'side_dish' in meal_types:
            meal_types = list(meal_types) + ['lunch', 'dinner']
        for mt in meal_types:
            if mt in coverage:
                coverage[mt] += 1
        return True

    # Step 1: Add semantic recipes, prioritizing those that help coverage
    for recipe in semantic_recipes:
        if len(result) >= num_recipes:
            break
        meal_types = getattr(recipe, 'meal_types', []) or ['dinner']
        if 'side_dish' in meal_types:
            meal_types = list(meal_types) + ['lunch', 'dinner']
        # Prioritize if it helps a type below minimum
        helps_coverage = any(coverage.get(mt, 0) < MIN_PER_MEAL_TYPE for mt in meal_types if mt in CORE_MEAL_TYPES)
        if helps_coverage:
            add_recipe(recipe)

    # Step 2: Fill gaps from all_recipes if semantic didn't provide enough
    for meal_type in CORE_MEAL_TYPES:
        while coverage[meal_type] < MIN_PER_MEAL_TYPE and len(result) < num_recipes:
            # Find a recipe of this type not yet in results
            for recipe in recipes_by_type[meal_type]:
                if recipe.id not in result_ids:
                    add_recipe(recipe)
                    break
            else:
                # No more recipes of this type available
                break

    # Step 3: Fill remaining slots with semantic recipes (in order)
    for recipe in semantic_recipes:
        if len(result) >= num_recipes:
            break
        add_recipe(recipe)

    # Log coverage stats
    logger.info(f"Recipe coverage: breakfast={coverage['breakfast']}, lunch={coverage['lunch']}, dinner={coverage['dinner']}")

    return result


def _build_query_text(
    household: HouseholdProfile,
    groceries: List[GroceryItem],
    week_context: Optional[str] = None
) -> str:
    """
    Build natural language query text for semantic search.

    Combines:
    - User's week context (e.g., "busy week, need quick meals")
    - Available groceries (prioritize using what's on hand)
    - Dietary preferences (e.g., "toddler-friendly", "quick")
    - Cooking preferences (e.g., "one-pot", "minimal-prep")

    Args:
        household: Household profile
        groceries: List of GroceryItem objects
        week_context: Optional user description of their week

    Returns:
        Query string for semantic search
    """
    query_parts = []

    # Add user's week context first (highest priority for intent)
    if week_context:
        # Extract key intent words, limit length to avoid overwhelming other signals
        context_snippet = week_context[:150].strip()
        query_parts.append(context_snippet)

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
    Build metadata filters for hard constraints.

    Filters ensure recipes meet non-negotiable requirements:
    - Available appliances (can't make recipe without required equipment)
    - Time constraints (weeknight active cooking time limits)

    Note: Allergies and dislikes are handled in prompt engineering,
    not as hard filters, to allow LLM flexibility.

    Args:
        household: Household profile

    Returns:
        Filter dictionary for query, or None if no filters needed
    """
    # For v0.1, we're keeping filters minimal
    # Future: Add appliance filtering when we have more recipe data

    # Example of how appliance filtering would work:
    # available_appliances = household.cooking_preferences.available_appliances
    # if available_appliances:
    #     return {
    #         "required_appliances": available_appliances
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
                "no_peanuts_only": household.daycare_rules.no_peanuts_only,
                "no_chocolate": household.daycare_rules.no_chocolate,
                "no_honey": household.daycare_rules.no_honey,
                "must_be_cold": household.daycare_rules.must_be_cold,
                "custom_rules": household.daycare_rules.custom_rules,
                "daycare_days": household.daycare_rules.daycare_days
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
                "meal_types": getattr(recipe, 'meal_types', []),  # breakfast, lunch, dinner, snack
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
