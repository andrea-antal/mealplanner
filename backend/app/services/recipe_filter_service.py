"""
Recipe filtering service for swap suggestions.

Filters recipes based on:
- Meal type compatibility (breakfast, lunch, dinner, snack)
- Household constraints (allergies, dislikes)
- Recipe ratings from family members
"""
import logging
from typing import List, Tuple, Dict, Optional
from pydantic import BaseModel

from app.models.recipe import Recipe
from app.models.household import HouseholdProfile
from app.data.data_manager import (
    list_all_recipes,
    load_household_profile,
    load_recipe_ratings
)

logger = logging.getLogger(__name__)


class AlternativeRecipeSuggestion(BaseModel):
    """A recipe suggestion with match score and warnings."""
    recipe: Recipe
    match_score: float  # 0-1, higher is better
    warnings: List[str] = []


def _normalize_for_matching(text: str) -> str:
    """Normalize text for ingredient matching (lowercase, strip)."""
    return text.lower().strip()


def _check_ingredient_match(constraint: str, ingredients_text: str) -> bool:
    """
    Check if a constraint (allergy/dislike) matches any ingredient.

    Uses smart matching:
    - "peanuts" matches "peanut butter", "peanut oil", etc.
    - "shellfish" matches "shrimp", "crab", "lobster"
    - Case-insensitive matching
    """
    constraint_lower = _normalize_for_matching(constraint)

    # Direct substring match
    if constraint_lower in ingredients_text:
        return True

    # Handle plural/singular variations
    # "peanuts" -> check for "peanut"
    if constraint_lower.endswith('s'):
        singular = constraint_lower[:-1]
        if singular in ingredients_text:
            return True

    # "peanut" -> check for "peanuts"
    if not constraint_lower.endswith('s'):
        plural = constraint_lower + 's'
        if plural in ingredients_text:
            return True

    # Common allergy expansions
    allergy_expansions = {
        'shellfish': ['shrimp', 'crab', 'lobster', 'clam', 'mussel', 'oyster', 'scallop'],
        'tree nuts': ['almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut'],
        'dairy': ['milk', 'cheese', 'cream', 'butter', 'yogurt'],
        'gluten': ['wheat', 'flour', 'bread', 'pasta'],
    }

    if constraint_lower in allergy_expansions:
        for expansion in allergy_expansions[constraint_lower]:
            if expansion in ingredients_text:
                return True

    return False


def check_recipe_constraints(
    recipe: Recipe,
    household: HouseholdProfile
) -> Tuple[bool, List[str]]:
    """
    Check if recipe violates household constraints.

    Args:
        recipe: Recipe to check
        household: Household profile with allergies and dislikes

    Returns:
        Tuple of (is_safe, warnings):
        - is_safe: True if no allergies are violated (dislikes are OK)
        - warnings: List of warning messages for dislikes or other issues
    """
    warnings = []
    is_safe = True

    # Combine all ingredients into lowercase string for matching
    ingredients_text = _normalize_for_matching(" ".join(recipe.ingredients))

    # Check each family member's constraints
    for member in household.family_members:
        # Check allergies (makes recipe unsafe)
        for allergy in member.allergies:
            if _check_ingredient_match(allergy, ingredients_text):
                is_safe = False
                warnings.append(
                    f"Contains {allergy} (allergy for {member.name})"
                )

        # Check dislikes (warning only, still safe)
        for dislike in member.dislikes:
            if _check_ingredient_match(dislike, ingredients_text):
                warnings.append(
                    f"Contains {dislike} ({member.name} dislikes)"
                )

    return is_safe, warnings


def filter_recipes_by_meal_type(
    recipes: List[Recipe],
    meal_type: str
) -> List[Recipe]:
    """
    Filter recipes by meal_types field, with fallback to all recipes.

    If no recipes have the meal_type in their meal_types list, returns ALL recipes
    to allow users to swap to any available option.

    Side dishes are included for lunch and dinner meal types.

    Args:
        recipes: List of recipes to filter
        meal_type: Meal type to filter by (breakfast, lunch, dinner, snack)

    Returns:
        List of recipes that have the meal_type in their meal_types field,
        or all recipes if none match the meal type
    """
    meal_type_lower = meal_type.lower()

    # Side dishes can be used for lunch or dinner
    types_to_match = {meal_type_lower}
    if meal_type_lower in ('lunch', 'dinner'):
        types_to_match.add('side_dish')

    # Filter by meal_types field (new), falling back to tags for backwards compatibility
    filtered = [
        r for r in recipes
        if any(mt.lower() in types_to_match for mt in getattr(r, 'meal_types', []))
        or (not getattr(r, 'meal_types', []) and any(t.lower() in types_to_match for t in r.tags))
    ]

    # Fallback: if no recipes match meal type, return all recipes
    if not filtered:
        logger.info(f"No recipes with meal_type '{meal_type}', returning all {len(recipes)} recipes")
        return recipes

    return filtered


def score_recipe_for_swap(
    recipe: Recipe,
    ratings: Dict[str, Dict[str, str]],
    household: HouseholdProfile
) -> float:
    """
    Score a recipe for swap suggestion ranking.

    Scoring factors:
    - Base score: 0.5
    - +0.3 for each family member who likes it
    - -0.3 for each family member who dislikes it
    - Score clamped to [0.0, 1.0]

    Args:
        recipe: Recipe to score
        ratings: Dict mapping recipe_id to {member_name: rating}
        household: Household profile for family member list

    Returns:
        Score between 0.0 and 1.0
    """
    base_score = 0.5
    score = base_score

    # Get ratings for this recipe
    recipe_ratings = ratings.get(recipe.id, {})

    # Adjust score based on ratings
    for member in household.family_members:
        rating = recipe_ratings.get(member.name)
        if rating == "like":
            score += 0.3
        elif rating == "dislike":
            score -= 0.3

    # Clamp to valid range
    return max(0.0, min(1.0, score))


def get_alternative_recipes(
    workspace_id: str,
    meal_type: str,
    exclude_recipe_ids: List[str],
    limit: int = 10
) -> List[AlternativeRecipeSuggestion]:
    """
    Get filtered recipe alternatives for swapping.

    Steps:
    1. Load all recipes for workspace
    2. Filter by meal_type tag
    3. Exclude recipes in exclude_recipe_ids
    4. Load household profile for constraints
    5. Check each recipe against constraints (exclude unsafe ones)
    6. Score and sort recipes
    7. Return top N suggestions

    Args:
        workspace_id: Workspace identifier
        meal_type: Meal type to filter by (breakfast, lunch, dinner, snack)
        exclude_recipe_ids: Recipe IDs to exclude (e.g., already in meal plan)
        limit: Maximum number of suggestions to return

    Returns:
        List of AlternativeRecipeSuggestion objects, sorted by score (highest first)
    """
    logger.info(f"Getting alternative recipes for {meal_type} in workspace '{workspace_id}'")

    # Load all recipes
    all_recipes = list_all_recipes(workspace_id)
    logger.info(f"Loaded {len(all_recipes)} total recipes")

    # Filter by meal type
    meal_type_recipes = filter_recipes_by_meal_type(all_recipes, meal_type)
    logger.info(f"Filtered to {len(meal_type_recipes)} {meal_type} recipes")

    # Exclude specified IDs
    filtered_recipes = [r for r in meal_type_recipes if r.id not in exclude_recipe_ids]
    logger.info(f"After exclusions: {len(filtered_recipes)} recipes")

    # Second fallback: if all meal-type recipes were excluded, use all recipes
    if not filtered_recipes:
        logger.info(f"All {meal_type} recipes excluded, falling back to all recipes")
        filtered_recipes = [r for r in all_recipes if r.id not in exclude_recipe_ids]
        logger.info(f"Fallback to {len(filtered_recipes)} recipes")

    # Load household profile for constraints
    household = load_household_profile(workspace_id)
    if household is None:
        # Create minimal household if none exists (requires at least 1 member)
        from app.models.household import FamilyMember
        household = HouseholdProfile(
            family_members=[FamilyMember(name="Default", age_group="adult")]
        )

    # Load ratings for scoring
    ratings = load_recipe_ratings(workspace_id)

    # Build suggestions list
    suggestions = []
    for recipe in filtered_recipes:
        is_safe, warnings = check_recipe_constraints(recipe, household)

        # Skip unsafe recipes (allergens)
        if not is_safe:
            logger.debug(f"Skipping unsafe recipe: {recipe.id}")
            continue

        # Calculate score
        score = score_recipe_for_swap(recipe, ratings, household)

        suggestions.append(AlternativeRecipeSuggestion(
            recipe=recipe,
            match_score=score,
            warnings=warnings
        ))

    # Sort by score (highest first)
    suggestions.sort(key=lambda s: s.match_score, reverse=True)

    # Return limited results
    return suggestions[:limit]
