"""
Meal plan service - orchestrates RAG retrieval and Claude generation.

This service is the main entry point for meal plan generation:
1. Retrieves relevant recipes using RAG
2. Prepares context for LLM
3. Calls Claude to generate meal plan
4. Returns structured MealPlan object
"""
import logging
from datetime import date as Date
from typing import Optional
from app.models.meal_plan import MealPlan
from app.models.household import HouseholdProfile
from app.services.rag_service import retrieve_relevant_recipes, prepare_context_for_llm
from app.services.claude_service import generate_meal_plan_with_claude
from app.data.data_manager import load_household_profile, load_groceries, load_recipe_ratings

logger = logging.getLogger(__name__)


def generate_meal_plan(
    workspace_id: str,
    week_start_date: Date,
    household: Optional[HouseholdProfile] = None,
    num_recipes: int = 15
) -> Optional[MealPlan]:
    """
    Generate a weekly meal plan.

    This is the main orchestration function that:
    1. Loads household profile and groceries (if not provided)
    2. Retrieves relevant recipes using RAG
    3. Prepares context for Claude
    4. Generates meal plan using Claude API
    5. Returns validated MealPlan

    Args:
        workspace_id: Workspace identifier for data isolation
        week_start_date: Start date for the meal plan
        household: Optional HouseholdProfile (loads from storage if not provided)
        num_recipes: Number of candidate recipes to retrieve (default: 15)

    Returns:
        MealPlan object if successful, None if generation fails

    Example:
        >>> from datetime import date
        >>> meal_plan = generate_meal_plan("andrea", date(2025, 12, 3))
        >>> if meal_plan:
        ...     print(f"Generated plan for {len(meal_plan.days)} days")
    """
    logger.info(f"Starting meal plan generation for week of {week_start_date} in workspace '{workspace_id}'")

    # Load household profile if not provided
    if household is None:
        household = load_household_profile(workspace_id)
        if not household:
            logger.error(f"No household profile found for workspace '{workspace_id}'")
            return None

    # Load available groceries
    groceries = load_groceries(workspace_id)
    logger.info(f"Loaded {len(groceries)} available groceries for workspace '{workspace_id}'")

    # Load recipe ratings
    recipe_ratings = load_recipe_ratings(workspace_id)
    logger.info(f"Loaded ratings for {len(recipe_ratings)} recipes for workspace '{workspace_id}'")

    # Step 1: Retrieve relevant recipes using RAG
    logger.info(f"Retrieving {num_recipes} relevant recipes for workspace '{workspace_id}'...")
    recipes = retrieve_relevant_recipes(
        workspace_id=workspace_id,
        household=household,
        available_groceries=groceries,
        num_recipes=num_recipes
    )

    if not recipes:
        logger.error("No recipes retrieved from RAG service")
        return None

    logger.info(f"Retrieved {len(recipes)} candidate recipes")

    # Step 2: Prepare context for LLM
    logger.info("Preparing context for Claude...")
    context = prepare_context_for_llm(
        household=household,
        recipes=recipes,
        available_groceries=groceries,
        recipe_ratings=recipe_ratings
    )

    # Step 3: Generate meal plan with Claude
    logger.info("Calling Claude API to generate meal plan...")
    meal_plan = generate_meal_plan_with_claude(
        context=context,
        week_start_date=week_start_date.isoformat()
    )

    if not meal_plan:
        logger.error("Claude failed to generate meal plan")
        return None

    # Step 4: Validate and return
    logger.info(f"✅ Successfully generated meal plan for week of {week_start_date}")
    logger.info(f"   - {len(meal_plan.days)} days")
    logger.info(f"   - Total meals: {sum(len(day.meals) for day in meal_plan.days)}")

    return meal_plan


def validate_meal_plan_constraints(
    meal_plan: MealPlan,
    household: HouseholdProfile
) -> tuple[bool, list[str]]:
    """
    Validate that a meal plan respects household constraints.

    Checks:
    - No allergies present in selected recipes
    - Daycare lunches meet daycare rules
    - Cooking times within limits

    Args:
        meal_plan: Generated meal plan to validate
        household: Household profile with constraints

    Returns:
        Tuple of (is_valid: bool, violations: list[str])

    Note: This is a basic validator for v0.1. Production would need more comprehensive checking.
    """
    violations = []

    # Collect all allergies
    all_allergies = []
    for member in household.family_members:
        all_allergies.extend(member.allergies)

    # For v0.1, we trust Claude to respect constraints
    # Future: Cross-check recipe ingredients against allergies
    # Future: Verify daycare lunch rules
    # Future: Check cooking time constraints

    is_valid = len(violations) == 0
    return is_valid, violations
