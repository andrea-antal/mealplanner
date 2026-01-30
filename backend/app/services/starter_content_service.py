"""
Starter content generation service for onboarding.

Generates initial content (meal plans or recipes) for new users
based on their onboarding preferences.
"""
import logging
from datetime import date, timedelta
from typing import List, Optional

from app.models.household import HouseholdProfile, OnboardingData
from app.models.recipe import Recipe
from app.services.meal_plan_service import generate_meal_plan
from app.services.claude_service import generate_recipe_from_title
from app.data.data_manager import save_meal_plan, save_recipe

logger = logging.getLogger(__name__)


# Starter recipe titles organized by cuisine
STARTER_RECIPES_BY_CUISINE = {
    "hungarian": [
        ("Chicken Paprikash", "dinner"),
        ("Hungarian Goulash", "dinner"),
        ("Stuffed Peppers", "dinner"),
        ("Lángos with Sour Cream", "snack"),
        ("Hungarian Mushroom Soup", "lunch"),
    ],
    "italian": [
        ("Spaghetti Carbonara", "dinner"),
        ("Chicken Parmesan", "dinner"),
        ("Caprese Salad", "lunch"),
    ],
    "mexican": [
        ("Chicken Tacos", "dinner"),
        ("Black Bean Burritos", "dinner"),
        ("Guacamole with Chips", "snack"),
    ],
    "chinese": [
        ("Chicken Fried Rice", "dinner"),
        ("Kung Pao Chicken", "dinner"),
        ("Egg Drop Soup", "lunch"),
    ],
    "korean": [
        ("Bibimbap", "dinner"),
        ("Korean BBQ Beef", "dinner"),
        ("Kimchi Fried Rice", "lunch"),
    ],
    "japanese": [
        ("Teriyaki Chicken", "dinner"),
        ("Miso Soup with Tofu", "lunch"),
        ("Vegetable Tempura", "dinner"),
    ],
    "greek": [
        ("Greek Salad", "lunch"),
        ("Chicken Souvlaki", "dinner"),
        ("Tzatziki with Pita", "snack"),
    ],
    "indian": [
        ("Butter Chicken", "dinner"),
        ("Vegetable Curry", "dinner"),
        ("Dal with Rice", "dinner"),
    ],
    "thai": [
        ("Pad Thai", "dinner"),
        ("Thai Green Curry", "dinner"),
        ("Tom Yum Soup", "lunch"),
    ],
    "mediterranean": [
        ("Hummus with Vegetables", "snack"),
        ("Falafel Wraps", "lunch"),
        ("Grilled Mediterranean Chicken", "dinner"),
    ],
    "american": [
        ("Classic Cheeseburgers", "dinner"),
        ("Grilled Cheese Sandwiches", "lunch"),
        ("Sheet Pan BBQ Chicken", "dinner"),
    ],
}

# Default recipes for users who didn't select specific cuisines
DEFAULT_STARTER_RECIPES = [
    ("Sheet Pan Chicken and Vegetables", "dinner"),
    ("One-Pot Pasta Primavera", "dinner"),
    ("Easy Stir-Fry with Rice", "dinner"),
    ("Simple Vegetable Soup", "lunch"),
    ("Overnight Oats", "breakfast"),
]


def generate_starter_meal_plan(
    workspace_id: str,
    household: HouseholdProfile
) -> bool:
    """
    Generate a starter meal plan for a new user.

    Creates a meal plan for the upcoming week using the same flow
    as "generate anyway" - produces title-only suggestions that
    the user can later convert to full recipes.

    Args:
        workspace_id: User's workspace identifier
        household: User's household profile with preferences

    Returns:
        True if generation succeeded, False otherwise
    """
    logger.info(f"Generating starter meal plan for workspace '{workspace_id}'")

    # Calculate next Monday as week start
    today = date.today()
    days_until_monday = (7 - today.weekday()) % 7
    if days_until_monday == 0:
        days_until_monday = 7  # If today is Monday, get next Monday
    week_start = today + timedelta(days=days_until_monday)

    try:
        # Generate the meal plan (works even with no recipes in library)
        meal_plan = generate_meal_plan(
            workspace_id=workspace_id,
            week_start_date=week_start,
            household=household,
            num_recipes=7,  # Fewer candidates since library is empty
            week_context="First week using the app - please create a simple, approachable meal plan."
        )

        if meal_plan:
            # Save the generated meal plan
            save_meal_plan(workspace_id, meal_plan)
            logger.info(
                f"Successfully generated starter meal plan for workspace '{workspace_id}' "
                f"with {len(meal_plan.days)} days"
            )
            return True
        else:
            logger.warning(f"Meal plan generation returned None for workspace '{workspace_id}'")
            return False

    except Exception as e:
        logger.error(f"Failed to generate starter meal plan for workspace '{workspace_id}': {e}")
        return False


async def generate_starter_recipes(
    workspace_id: str,
    onboarding_data: OnboardingData,
    count: int = 5
) -> int:
    """
    Generate starter recipes based on user's cuisine preferences.

    Creates actual recipes (not just titles) and saves them to the
    user's recipe library.

    Args:
        workspace_id: User's workspace identifier
        onboarding_data: User's onboarding responses with cuisine preferences
        count: Maximum number of recipes to generate (default: 5)

    Returns:
        Number of recipes successfully generated
    """
    logger.info(f"Generating {count} starter recipes for workspace '{workspace_id}'")

    # Select recipe titles based on cuisine preferences
    titles_to_generate: List[tuple] = []
    cuisines = onboarding_data.cuisine_preferences or []

    if cuisines:
        # Determine how many recipes to take per cuisine
        # If only 1 cuisine selected, use all recipes from it
        # If multiple cuisines, distribute evenly (at least 2 per cuisine)
        recipes_per_cuisine = count if len(cuisines) == 1 else max(2, count // len(cuisines))

        for cuisine in cuisines:
            cuisine_lower = cuisine.lower()
            if cuisine_lower in STARTER_RECIPES_BY_CUISINE:
                titles_to_generate.extend(
                    STARTER_RECIPES_BY_CUISINE[cuisine_lower][:recipes_per_cuisine]
                )

    # If not enough recipes from cuisines, add defaults
    if len(titles_to_generate) < count:
        remaining = count - len(titles_to_generate)
        titles_to_generate.extend(DEFAULT_STARTER_RECIPES[:remaining])

    # Limit to requested count
    titles_to_generate = titles_to_generate[:count]

    logger.info(f"Selected {len(titles_to_generate)} recipes to generate: {[t[0] for t in titles_to_generate]}")

    # Generate each recipe
    generated_count = 0
    for title, meal_type in titles_to_generate:
        try:
            logger.info(f"Generating recipe: '{title}' ({meal_type})")

            # Generate the full recipe using Claude
            recipe = await generate_recipe_from_title(
                recipe_title=title,
                meal_type=meal_type,
                servings=4
            )

            # Save to user's library
            save_recipe(workspace_id, recipe)
            generated_count += 1

            logger.info(f"Successfully generated and saved recipe: '{title}'")

        except Exception as e:
            logger.warning(f"Failed to generate recipe '{title}': {e}")
            # Continue with other recipes - don't fail entirely
            continue

    logger.info(
        f"Completed starter recipe generation for workspace '{workspace_id}': "
        f"{generated_count}/{len(titles_to_generate)} recipes created"
    )

    return generated_count
