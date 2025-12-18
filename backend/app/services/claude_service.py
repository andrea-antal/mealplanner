"""
Claude API service for meal plan generation.

This service handles all interactions with the Anthropic Claude API:
- Prompt construction for meal planning
- API calls with error handling
- Response parsing and validation
"""
import logging
import json
import uuid
from datetime import date as Date
from typing import Dict, Optional
from anthropic import Anthropic
from app.config import settings
from app.models.meal_plan import MealPlan
from app.models.recipe import Recipe

logger = logging.getLogger(__name__)

# Initialize Anthropic client
client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)


def generate_meal_plan_with_claude(
    context: Dict,
    week_start_date: str,
    model: str = None
) -> Optional[MealPlan]:
    """
    Generate a weekly meal plan using Claude API.

    Args:
        context: Structured context from RAG service containing:
            - household: Family members, allergies, dislikes, daycare rules, cooking preferences
            - available_groceries: List of groceries on hand
            - candidate_recipes: List of recipe dicts with full details
        week_start_date: ISO date string (e.g., "2025-12-03") for the week start
        model: Claude model to use (default: uses MODEL_NAME from settings)

    Returns:
        MealPlan object if successful, None if generation fails
    """
    # Use configured model if not specified
    if model is None:
        model = settings.MODEL_NAME

    logger.info(f"Generating meal plan for week starting {week_start_date} using {model}")

    # Build prompt
    prompt = _build_meal_plan_prompt(context, week_start_date)

    try:
        # Call Claude API (Messages API for modern SDK)
        response = client.messages.create(
            model=model,
            max_tokens=4096,
            temperature=0.7,  # Slight creativity for variety
            system=_get_system_prompt(),
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        # Extract response text
        response_text = response.content[0].text
        logger.debug(f"Claude response: {response_text[:200]}...")

        # Parse JSON response into MealPlan
        meal_plan = _parse_meal_plan_response(response_text, week_start_date)

        if meal_plan:
            logger.info(f"Successfully generated meal plan with {len(meal_plan.days)} days")
            return meal_plan
        else:
            logger.error("Failed to parse meal plan from Claude response")
            return None

    except Exception as e:
        logger.error(f"Error calling Claude API: {e}", exc_info=True)
        return None


def _get_system_prompt() -> str:
    """
    Get the system prompt that defines Claude's role.

    Returns:
        System prompt string
    """
    return """You are a meal planning assistant specializing in family meal planning with complex dietary constraints.

Your expertise:
- Creating balanced, practical weekly meal plans
- Respecting allergies, dislikes, and daycare food safety rules
- Accommodating dietary preferences and patterns (e.g., pescetarian, low-carb, lactose-intolerant)
- Maximizing use of available groceries to reduce waste
- Balancing weeknight time constraints with weekend cooking opportunities
- Suggesting toddler-friendly, family-approved meals

You always:
- Strictly respect all allergies and daycare rules (non-negotiable)
- Prioritize available groceries, especially those marked "USE SOON" (expiring within 2 days)
- Consider dietary preferences when selecting recipes (e.g., more fish/seafood for pescetarians)
- Consider cooking time constraints (weeknights vs weekends)
- Provide practical, realistic meal plans that busy families can execute
- Only use recipes from the provided candidate list

IMPORTANT PRIORITY:
- Ingredients marked with ⚠️ "USE SOON" are expiring within 2 days and should be prioritized in your meal plan
- Try to use these ingredients in the next 1-2 days to reduce food waste"""


def _build_meal_plan_prompt(context: Dict, week_start_date: str) -> str:
    """
    Build the user prompt with household context and task description.

    Args:
        context: Context dict from RAG service
        week_start_date: Week start date string

    Returns:
        Formatted prompt string
    """
    household = context['household']
    groceries = context['available_groceries']
    recipes = context['candidate_recipes']

    # Format family members
    family_info = []
    for member in household['family_members']:
        allergies = f"Allergies: {', '.join(member['allergies'])}" if member['allergies'] else "No allergies"
        dislikes = f"Dislikes: {', '.join(member['dislikes'])}" if member['dislikes'] else "No dislikes"

        # Add preferences if present
        preferences = ""
        if member.get('preferences'):  # Handle old data without preferences field
            pref_list = ', '.join(member['preferences'])
            preferences = f". Preferences: {pref_list}"

        family_info.append(f"- {member['name']} ({member['age_group']}): {allergies}. {dislikes}{preferences}")

    family_text = "\n".join(family_info)

    # Format daycare rules
    daycare = household['daycare_rules']
    daycare_text = "Daycare Lunch Rules:\n"
    if daycare['no_nuts']:
        daycare_text += "- NO NUTS (strict allergy policy)\n"
    if daycare['no_honey']:
        daycare_text += "- NO HONEY (infant safety)\n"
    if daycare['must_be_cold']:
        daycare_text += "- Must be served cold (no heating available)\n"

    # Format cooking preferences
    prefs = household['cooking_preferences']
    prefs_text = f"""Cooking Preferences:
- Available appliances: {', '.join(prefs['available_appliances'])}
- Preferred methods: {', '.join(prefs['preferred_methods'])}
- Max active cooking time (weeknight): {prefs['max_active_cooking_time_weeknight']} minutes
- Max active cooking time (weekend): {prefs['max_active_cooking_time_weekend']} minutes"""

    # Format groceries with expiry context
    if groceries:
        groceries_lines = []
        for item in groceries:
            # Check if item is a dict (from context) or needs to be accessed differently
            if isinstance(item, dict):
                name = item.get('name', str(item))
                expiry_date = item.get('expiry_date')
                purchase_date = item.get('purchase_date')
            else:
                # Legacy string support
                name = str(item)
                expiry_date = None
                purchase_date = None

            # Add expiry warning if applicable
            if expiry_date and purchase_date:
                # Only show expiry if purchase_date < expiry_date
                try:
                    purchase = Date.fromisoformat(str(purchase_date))
                    expiry = Date.fromisoformat(str(expiry_date))
                    if purchase < expiry:
                        days_until = (expiry - Date.today()).days
                        if days_until <= 2:
                            groceries_lines.append(f"- {name} ⚠️ USE SOON (expires in {days_until} days)")
                        else:
                            groceries_lines.append(f"- {name}")
                    else:
                        groceries_lines.append(f"- {name}")
                except (ValueError, TypeError):
                    groceries_lines.append(f"- {name}")
            else:
                groceries_lines.append(f"- {name}")

        groceries_text = "\n".join(groceries_lines)
    else:
        groceries_text = "None listed"

    # Format recipes
    recipes_json = json.dumps(recipes, indent=2)

    prompt = f"""Generate a 7-day meal plan starting {week_start_date}.

HOUSEHOLD INFORMATION:

Family Members:
{family_text}

{daycare_text}

{prefs_text}

Available Groceries:
{groceries_text}

CANDIDATE RECIPES (use ONLY these recipes):
{recipes_json}

TASK:

Create a 7-day meal plan (breakfast, lunch, dinner, snacks) that:

1. **MUST respect all allergies and daycare rules** (non-negotiable)
2. Prioritizes using available groceries
3. Respects cooking time constraints:
   - Weeknight dinners: ≤ {prefs['max_active_cooking_time_weeknight']} min active cooking
   - Weekend dinners: ≤ {prefs['max_active_cooking_time_weekend']} min active cooking
4. Specifies which family member(s) each meal is for
5. For daycare lunches, explicitly note "for daycare" and ensure it meets all daycare rules
6. Provides variety across the week
7. Uses ONLY recipes from the candidate list above

RESPONSE FORMAT:

Return your response as valid JSON matching this exact schema:

{{
  "week_start_date": "{week_start_date}",
  "days": [
    {{
      "date": "YYYY-MM-DD",
      "meals": [
        {{
          "meal_type": "breakfast|lunch|dinner|snack",
          "for_who": "name of family member(s)",
          "recipe_id": "id from candidate recipes OR null for simple snacks",
          "recipe_title": "title from candidate recipes OR simple description for snacks",
          "notes": "any relevant notes (e.g., 'for daycare', 'uses available chicken')"
        }}
      ]
    }}
  ]
}}

IMPORTANT:
- Return ONLY valid JSON, no other text
- Use recipe IDs and titles exactly as provided in candidate recipes
- For simple snacks (e.g., "Apple slices", "Banana"), use recipe_id: null
- Include 7 days starting from {week_start_date}
- Each day should have breakfast, lunch, dinner, and optionally snacks"""

    return prompt


def _parse_meal_plan_response(response_text: str, week_start_date: str) -> Optional[MealPlan]:
    """
    Parse Claude's JSON response into a MealPlan object.

    Args:
        response_text: Raw text response from Claude
        week_start_date: Expected week start date

    Returns:
        MealPlan object if parsing succeeds, None otherwise
    """
    try:
        # Claude sometimes wraps JSON in markdown code blocks
        # Extract JSON if wrapped
        if "```json" in response_text:
            start = response_text.find("```json") + 7
            end = response_text.find("```", start)
            response_text = response_text[start:end].strip()
        elif "```" in response_text:
            start = response_text.find("```") + 3
            end = response_text.find("```", start)
            response_text = response_text[start:end].strip()

        # Parse JSON
        data = json.loads(response_text)

        # Validate and create MealPlan using Pydantic
        meal_plan = MealPlan(**data)

        return meal_plan

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from Claude response: {e}")
        logger.debug(f"Response text: {response_text}")
        return None
    except Exception as e:
        logger.error(f"Failed to create MealPlan from parsed data: {e}")
        logger.debug(f"Response text: {response_text}")
        return None


async def generate_recipe_from_ingredients(
    ingredients: list[str],
    portions: Dict[str, str],
    meal_type: str = "dinner",
    cuisine_type: Optional[str] = None,
    cooking_time_max: Optional[int] = None,
    servings: int = 4,
    model: str = None
) -> Recipe:
    """
    Generate a recipe dynamically from selected ingredients using Claude AI.

    Args:
        ingredients: List of available ingredients
        portions: Optional quantities for specific ingredients (e.g., {"chicken breast": "2 pieces"})
        meal_type: Type of meal (breakfast/lunch/dinner/snack)
        cuisine_type: Optional cuisine style (italian, mexican, chinese, etc.)
        cooking_time_max: Maximum cooking time in minutes
        servings: Number of servings to generate for
        model: Claude model to use (default: uses MODEL_NAME from settings)

    Returns:
        Generated Recipe object with is_generated=True

    Raises:
        ValueError: If no ingredients provided or invalid input
        ConnectionError: If Claude API is unavailable
    """
    if not ingredients:
        raise ValueError("At least one ingredient is required")

    # Use configured model if not specified
    if model is None:
        model = settings.MODEL_NAME

    logger.info(f"Generating {meal_type} recipe from {len(ingredients)} ingredients using {model}" +
                (f" ({cuisine_type} style)" if cuisine_type else ""))

    # Build prompt for recipe generation
    prompt = _build_recipe_generation_prompt(
        ingredients, portions, meal_type, cuisine_type, cooking_time_max, servings
    )

    try:
        # Call Claude API
        response = client.messages.create(
            model=model,
            max_tokens=2048,
            temperature=0.8,  # More creativity for recipe generation
            system=_get_recipe_generation_system_prompt(),
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        # Extract response text
        response_text = response.content[0].text
        logger.debug(f"Claude recipe response: {response_text[:200]}...")

        # Parse JSON response into Recipe
        recipe = _parse_recipe_response(response_text)

        if recipe:
            logger.info(f"Successfully generated recipe: {recipe.title}")
            return recipe
        else:
            raise ValueError("Failed to parse recipe from Claude response")

    except Exception as e:
        logger.error(f"Error calling Claude API for recipe generation: {e}", exc_info=True)
        if "connection" in str(e).lower():
            raise ConnectionError(f"Claude API unavailable: {e}")
        raise ValueError(f"Failed to generate recipe: {e}")


def _get_recipe_generation_system_prompt() -> str:
    """
    Get the system prompt for recipe generation.

    Returns:
        System prompt string
    """
    return """You are an expert chef and recipe developer who specializes in creating delicious, practical recipes from available ingredients.

Your expertise:
- Creating balanced, flavorful recipes from specific ingredients
- Adapting to time constraints and dietary needs
- Writing clear, easy-to-follow cooking instructions
- Suggesting appropriate cooking techniques and appliances

You always:
- Use all or most of the provided ingredients
- Create practical recipes that home cooks can execute
- Provide precise ingredient quantities
- Write step-by-step instructions
- Consider cooking time constraints when specified
- Mark recipes as family-friendly when appropriate"""


def _build_recipe_generation_prompt(
    ingredients: list[str],
    portions: Dict[str, str],
    meal_type: str,
    cuisine_type: Optional[str],
    cooking_time_max: Optional[int],
    servings: int
) -> str:
    """
    Build the prompt for recipe generation.

    Args:
        ingredients: List of available ingredients
        portions: Quantities for specific ingredients
        meal_type: Type of meal
        cuisine_type: Cuisine style
        cooking_time_max: Maximum cooking time
        servings: Number of servings

    Returns:
        Formatted prompt string
    """
    # Format ingredients with portions if available
    ingredients_text = []
    for ingredient in ingredients:
        if ingredient in portions:
            ingredients_text.append(f"- {ingredient}: {portions[ingredient]}")
        else:
            ingredients_text.append(f"- {ingredient}")

    ingredients_str = "\n".join(ingredients_text)

    # Add cuisine style if specified
    cuisine_text = f"{cuisine_type} style " if cuisine_type else ""

    time_constraint = ""
    if cooking_time_max:
        time_constraint = f"\n- Maximum active cooking time: {cooking_time_max} minutes"

    prompt = f"""Create a {cuisine_text}{meal_type} recipe using these available ingredients:

{ingredients_str}

Requirements:
- Servings: {servings}{time_constraint}
- Use most or all of the provided ingredients
- Add common pantry staples if needed (salt, pepper, oil, etc.)
- Make it practical and delicious

RESPONSE FORMAT:

Return your response as valid JSON matching this exact schema:

{{
  "id": "generated_<unique_id>",
  "title": "Recipe Name",
  "description": "Brief description of the dish",
  "ingredients": [
    "2 lbs chicken breast",
    "1 cup rice",
    "2 cups broccoli florets"
  ],
  "instructions": "Step-by-step cooking instructions with numbered steps",
  "tags": ["quick", "healthy", "family-friendly"],
  "prep_time_minutes": 10,
  "active_cooking_time_minutes": 25,
  "serves": {servings},
  "required_appliances": ["stove", "pot"],
  "is_generated": true
}}

IMPORTANT:
- Return ONLY valid JSON, no other text
- Include precise quantities in the ingredients list
- Use numbered steps in instructions (e.g., "1. Heat oil in pan. 2. Add chicken...")
- Tags should include relevant attributes (quick, healthy, toddler-friendly, etc.)
- The id should start with "generated_" followed by a unique identifier
- Set is_generated to true
- Keep active_cooking_time_minutes within the time constraint if specified"""

    return prompt


def _parse_recipe_response(response_text: str) -> Optional[Recipe]:
    """
    Parse Claude's JSON response into a Recipe object.

    Args:
        response_text: Raw text response from Claude

    Returns:
        Recipe object if parsing succeeds, None otherwise
    """
    try:
        # Claude sometimes wraps JSON in markdown code blocks
        if "```json" in response_text:
            start = response_text.find("```json") + 7
            end = response_text.find("```", start)
            response_text = response_text[start:end].strip()
        elif "```" in response_text:
            start = response_text.find("```") + 3
            end = response_text.find("```", start)
            response_text = response_text[start:end].strip()

        # Parse JSON
        data = json.loads(response_text)

        # Ensure is_generated is set to True
        data["is_generated"] = True

        # Generate a unique ID if not provided or doesn't start with "generated_"
        if not data.get("id") or not data["id"].startswith("generated_"):
            data["id"] = f"generated_{uuid.uuid4().hex[:12]}"

        # Validate and create Recipe using Pydantic
        recipe = Recipe(**data)

        return recipe

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from recipe response: {e}")
        logger.debug(f"Response text: {response_text}")
        return None
    except Exception as e:
        logger.error(f"Failed to create Recipe from parsed data: {e}")
        logger.debug(f"Response text: {response_text}")
        return None


async def generate_recipe_from_title(
    recipe_title: str,
    meal_type: str = "dinner",
    servings: int = 4,
    model: str = None
) -> Recipe:
    """
    Generate a recipe dynamically from a recipe title using Claude AI.

    Args:
        recipe_title: Title/name of the recipe to generate
        meal_type: Type of meal (breakfast/lunch/dinner/snack)
        servings: Number of servings to generate for
        model: Claude model to use (default: uses MODEL_NAME from settings)

    Returns:
        Generated Recipe object with is_generated=True

    Raises:
        ValueError: If invalid input
        ConnectionError: If Claude API is unavailable
    """
    if not recipe_title or not recipe_title.strip():
        raise ValueError("Recipe title is required")

    # Use configured model if not specified
    if model is None:
        model = settings.MODEL_NAME

    logger.info(f"Generating recipe from title: '{recipe_title}' ({meal_type}, {servings} servings) using {model}")

    # Build prompt for recipe generation from title
    prompt = _build_recipe_from_title_prompt(recipe_title, meal_type, servings)

    try:
        # Call Claude API
        response = client.messages.create(
            model=model,
            max_tokens=2048,
            temperature=0.7,  # Balanced creativity
            system=_get_recipe_generation_system_prompt(),
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        # Extract response text
        response_text = response.content[0].text
        logger.debug(f"Claude recipe response: {response_text[:200]}...")

        # Parse JSON response into Recipe
        recipe = _parse_recipe_response(response_text)

        if recipe:
            logger.info(f"Successfully generated recipe: {recipe.title}")
            return recipe
        else:
            raise ValueError("Failed to parse recipe from Claude response")

    except Exception as e:
        logger.error(f"Error calling Claude API for recipe generation: {e}", exc_info=True)
        if "connection" in str(e).lower():
            raise ConnectionError(f"Claude API unavailable: {e}")
        raise ValueError(f"Failed to generate recipe: {e}")


def _build_recipe_from_title_prompt(
    recipe_title: str,
    meal_type: str,
    servings: int
) -> str:
    """
    Build the prompt for recipe generation from title.

    Args:
        recipe_title: Title/name of the recipe
        meal_type: Type of meal
        servings: Number of servings

    Returns:
        Formatted prompt string
    """
    prompt = f"""Create a complete recipe for "{recipe_title}".

This is a {meal_type} recipe that should serve {servings} people.

Requirements:
- Servings: {servings}
- Create a practical, delicious version of this dish
- Include all necessary ingredients with precise quantities
- Provide clear step-by-step instructions
- Add appropriate tags (quick, healthy, family-friendly, etc.)

RESPONSE FORMAT:

Return your response as valid JSON matching this exact schema:

{{
  "id": "generated_<unique_id>",
  "title": "{recipe_title}",
  "description": "Brief description of the dish",
  "ingredients": [
    "ingredient with quantity",
    "another ingredient with quantity"
  ],
  "instructions": "Step-by-step cooking instructions with numbered steps",
  "tags": ["relevant", "tags"],
  "prep_time_minutes": <number>,
  "active_cooking_time_minutes": <number>,
  "serves": {servings},
  "required_appliances": ["appliance1", "appliance2"],
  "is_generated": true
}}

IMPORTANT:
- Return ONLY valid JSON, no other text
- Use the exact title provided: "{recipe_title}"
- Include precise quantities in the ingredients list
- Use numbered steps in instructions (e.g., "1. Heat oil in pan. 2. Add ingredients...")
- Tags should include relevant attributes (quick, healthy, toddler-friendly, family-friendly, etc.)
- The id should start with "generated_" followed by a unique identifier
- Set is_generated to true
- Be realistic with cooking and prep times"""

    return prompt
