"""
Claude API service for meal plan generation.

This service handles all interactions with the Anthropic Claude API:
- Prompt construction for meal planning
- API calls with error handling
- Response parsing and validation
- Voice-to-grocery parsing (Sprint 4 Phase 1)
"""
import logging
import json
import uuid
from datetime import date as Date, timedelta
from typing import Dict, Optional
from anthropic import Anthropic
from app.config import settings
from app.models.meal_plan import MealPlan
from app.models.recipe import Recipe, VALID_MEAL_TYPES

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
- Match recipes to appropriate meal types using the "meal_types" field (e.g., breakfast recipes for breakfast slots)
- Prioritize available groceries, especially those marked "USE SOON" (expiring within 2 days)
- Consider dietary preferences when selecting recipes (e.g., more fish/seafood for pescetarians)
- Consider cooking time constraints (weeknights vs weekends)
- Provide practical, realistic meal plans that busy families can execute
- Only use recipes from the provided candidate list

RECIPE RATING GUIDELINES:
- Each recipe may have household member ratings: "like", "dislike", or null (not rated)
- Prioritize recipes with more "like" ratings from household members
- Avoid recipes with more "dislike" than "like" ratings
- Balance family preferences with variety and dietary constraints
- A recipe liked by the whole family is an excellent choice

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
2. **Match recipes to meal types** - use each recipe's "meal_types" field to assign it to appropriate meals
3. Prioritizes using available groceries
4. Respects cooking time constraints:
   - Weeknight dinners: ≤ {prefs['max_active_cooking_time_weeknight']} min active cooking
   - Weekend dinners: ≤ {prefs['max_active_cooking_time_weekend']} min active cooking
5. Specifies which family member(s) each meal is for
6. **DAYCARE REQUIREMENTS** (Monday-Friday only):
   - Nathan needs a daycare lunch AND daycare snack each weekday (Mon-Fri)
   - Daycare meals must explicitly note "for daycare" and meet all daycare rules
   - Weekend meals (Sat-Sun) are family meals - no separate daycare meals
   - Holidays with no daycare should be treated as weekend/family meal days
7. Provides variety across the week
8. Uses ONLY recipes from the candidate list above

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
- Include 7 consecutive days starting from {week_start_date} (Monday through Sunday)
- Each weekday (Mon-Fri) must have: breakfast (family), lunch (Nathan's daycare + family if needed), dinner (family), Nathan's daycare snack
- Each weekend day (Sat-Sun) must have: breakfast (family), lunch (family), dinner (family), optional family snacks
- Each day should have breakfast, lunch, and dinner minimum"""

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

        # Parse JSON response into Recipe (pass meal_type for auto-tagging)
        recipe = _parse_generated_recipe_response(response_text, meal_type)

        if recipe:
            logger.info(f"Successfully generated recipe: {recipe.title} (meal_types: {recipe.meal_types})")
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


def _parse_generated_recipe_response(response_text: str, meal_type: str = "dinner") -> Optional[Recipe]:
    """
    Parse Claude's JSON response into a Recipe object for generated recipes.

    Args:
        response_text: Raw text response from Claude
        meal_type: Meal type to auto-tag the recipe with (breakfast, lunch, dinner, snack)

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

        # Auto-set meal_types based on the meal_type parameter
        # This ensures recipes generated for specific meal slots are properly tagged
        if meal_type and meal_type.lower() in ["breakfast", "lunch", "dinner", "snack"]:
            data["meal_types"] = [meal_type.lower()]
        else:
            data["meal_types"] = ["dinner"]  # Default to dinner if unknown

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

        # Parse JSON response into Recipe (pass meal_type for auto-tagging)
        recipe = _parse_generated_recipe_response(response_text, meal_type)

        if recipe:
            logger.info(f"Successfully generated recipe: {recipe.title} (meal_types: {recipe.meal_types})")
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


# =============================================================================
# Voice-to-Grocery Parsing (Sprint 4 Phase 1)
# =============================================================================


async def parse_voice_to_groceries(
    transcription: str,
    existing_groceries: list[str],
    model: str = None
) -> tuple[list[dict], list[str]]:
    """
    Parse voice transcription into structured grocery items using Claude AI.

    Args:
        transcription: Voice-to-text transcription from user
        existing_groceries: List of grocery names already in user's list (for duplicate detection)
        model: Optional Claude model name override (defaults to HIGH_ACCURACY_MODEL_NAME for better language understanding)

    Returns:
        Tuple of (proposed_items: list[dict], warnings: list[str])
        - proposed_items: List of dicts matching ProposedGroceryItem schema
        - warnings: List of user-facing warning messages

    Raises:
        ValueError: If transcription is empty or Claude response is invalid
        ConnectionError: If Claude API is unavailable

    Examples:
        Input: "Chicken breast bought yesterday, milk expiring tomorrow"
        Output: ([
            {
                "name": "chicken breast",
                "purchase_date": "2025-12-21",
                "confidence": "high",
                "notes": "Inferred purchase date from 'yesterday'"
            },
            {
                "name": "milk",
                "expiry_date": "2025-12-23",
                "expiry_type": "expiry_date",
                "confidence": "high",
                "notes": "Inferred expiry from 'tomorrow'"
            }
        ], [])
    """
    # Validate input
    if not transcription or not transcription.strip():
        raise ValueError("Transcription cannot be empty")

    logger.info(f"Parsing voice transcription: '{transcription[:100]}...'")

    # Use Opus 4 for voice parsing by default, allow override
    if model is None:
        model = settings.HIGH_ACCURACY_MODEL_NAME

    # Build prompt for voice parsing
    prompt = _build_voice_parse_prompt(transcription, existing_groceries)

    try:
        # Call Claude API
        response = client.messages.create(
            model=model,
            max_tokens=1500,
            temperature=0.3,  # Lower temp for more consistent parsing
            system=_get_voice_parse_system_prompt(),
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        # Extract response text
        response_text = response.content[0].text
        logger.debug(f"Claude voice parse response: {response_text[:200]}...")

        # Parse JSON response
        parsed_data = _parse_voice_response(response_text)

        if parsed_data:
            proposed_items = parsed_data.get("proposed_items", [])
            warnings = parsed_data.get("warnings", [])
            logger.info(f"Successfully parsed {len(proposed_items)} items from voice")
            return proposed_items, warnings
        else:
            raise ValueError("Failed to parse response from Claude")

    except Exception as e:
        logger.error(f"Error calling Claude API for voice parsing: {e}", exc_info=True)
        if "connection" in str(e).lower() or "api" in str(e).lower():
            raise ConnectionError(f"Claude API unavailable: {e}")
        raise ValueError(f"Failed to parse voice input: {e}")


def _get_voice_parse_system_prompt() -> str:
    """
    Get the system prompt for voice-to-grocery parsing.

    Returns:
        System prompt string
    """
    today = Date.today().isoformat()
    return f"""You are a grocery list assistant specializing in parsing natural voice input into structured grocery items.

Your expertise:
- Understanding casual, natural language about groceries
- Inferring dates from relative phrases ("yesterday", "tomorrow", "expires soon")
- Extracting quantities and portions
- Detecting duplicate items
- Assigning confidence scores based on parsing clarity

You always:
- Parse items into their simplest form (e.g., "2 lbs chicken breast" → name: "chicken breast", portion: "2 lbs")
- Infer purchase_date from phrases like "bought yesterday", "purchased today"
- Infer expiry_date from phrases like "expires tomorrow", "use by Friday", "goes bad soon"
- Flag low confidence when the input is ambiguous
- Detect potential duplicates against existing groceries
- Provide helpful notes explaining your reasoning
- Use today's date as the baseline for relative date calculations

IMPORTANT DATE HANDLING:
- Today's date is {today}
- "yesterday" = today - 1 day
- "tomorrow" = today + 1 day
- "expires soon" = today + 2 days (use as expiry_date)
- "bought last week" = today - 7 days (use as purchase_date)
- When expiry is mentioned, always set expiry_type to "expiry_date" unless "best before" is explicitly stated"""


def _build_voice_parse_prompt(transcription: str, existing_groceries: list[str]) -> str:
    """
    Build the prompt for voice parsing.

    Args:
        transcription: Voice transcription text
        existing_groceries: List of existing grocery names

    Returns:
        Formatted prompt string
    """
    today = Date.today().isoformat()
    yesterday = (Date.today() - timedelta(days=1)).isoformat()
    tomorrow = (Date.today() + timedelta(days=1)).isoformat()
    existing_items_text = ", ".join(existing_groceries) if existing_groceries else "None"

    prompt = f"""Parse this voice transcription into structured grocery items:

TRANSCRIPTION:
"{transcription}"

CONTEXT:
- Today's date: {today}
- Existing groceries: {existing_items_text}

TASK:
Extract all grocery items mentioned and structure them with:
1. Item name (standardized, lowercase)
2. Purchase date (if mentioned or inferred)
3. Expiry date (if mentioned or inferred)
4. Portion/quantity (if mentioned)
5. Confidence score (high/medium/low)
6. Notes explaining your reasoning

RESPONSE FORMAT:

Return your response as valid JSON matching this exact schema:

{{
  "proposed_items": [
    {{
      "name": "chicken breast",
      "date_added": "{today}",
      "purchase_date": "{yesterday}",  // Optional, ISO format
      "expiry_type": "expiry_date",    // Optional, "expiry_date" or "best_before_date"
      "expiry_date": "{tomorrow}",     // Optional, ISO format
      "portion": "2 lbs",              // Optional
      "confidence": "high",            // Required: "high", "medium", or "low"
      "notes": "Inferred purchase date from 'yesterday'"  // Optional explanation
    }}
  ],
  "warnings": [
    "Possible duplicate: 'chicken' already in your list"
  ]
}}

RULES:
1. Return ONLY valid JSON, no other text
2. Use ISO date format (YYYY-MM-DD) for all dates
3. Standardize item names (lowercase, singular form preferred)
4. If you're unsure about something, mark confidence as "medium" or "low"
5. Add warnings for potential duplicates or ambiguities
6. If no items can be extracted, return empty proposed_items array with a warning
7. date_added should always be today's date ({today})
8. Only include purchase_date, expiry_date, expiry_type if you can infer them from the transcription

EXAMPLES:

Input: "Chicken breast, milk, and eggs"
Output: {{
  "proposed_items": [
    {{"name": "chicken breast", "date_added": "{today}", "confidence": "high"}},
    {{"name": "milk", "date_added": "{today}", "confidence": "high"}},
    {{"name": "eggs", "date_added": "{today}", "confidence": "high"}}
  ],
  "warnings": []
}}

Input: "Bought chicken yesterday, expires tomorrow"
Output: {{
  "proposed_items": [
    {{
      "name": "chicken",
      "date_added": "{today}",
      "purchase_date": "{yesterday}",
      "expiry_date": "{tomorrow}",
      "expiry_type": "expiry_date",
      "confidence": "high",
      "notes": "Inferred purchase date from 'yesterday' and expiry from 'tomorrow'"
    }}
  ],
  "warnings": []
}}"""

    return prompt


def _parse_voice_response(response_text: str) -> Optional[dict]:
    """
    Parse Claude's JSON response for voice parsing.

    Args:
        response_text: Raw text response from Claude

    Returns:
        Dict with proposed_items and warnings, or None if parsing fails
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

        # Validate structure
        if "proposed_items" not in data:
            logger.error("Response missing 'proposed_items' field")
            return None

        return data

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from voice response: {e}")
        logger.debug(f"Response text: {response_text}")
        return None
    except Exception as e:
        logger.error(f"Failed to parse voice response: {e}")
        logger.debug(f"Response text: {response_text}")
        return None


# Receipt OCR parsing (Sprint 4 Phase 2)


async def parse_receipt_to_groceries(
    image_base64: str,
    existing_groceries: list,
    model: str = None
) -> tuple[list[dict], list[dict], list[str]]:
    """
    Parse receipt image using Claude Vision API to extract grocery items.

    Uses multimodal Claude Vision to OCR receipt and extract:
    - Grocery item names (standardized, brands removed)
    - Purchase date from receipt header
    - Store name from receipt header
    - Confidence scores based on OCR clarity
    - Excluded items (non-food, tax, etc.)

    Args:
        image_base64: Base64 encoded receipt image (PNG/JPG)
        existing_groceries: List of existing grocery items for duplicate detection
        model: Optional Claude model name override (defaults to HIGH_ACCURACY_MODEL_NAME for better OCR)

    Returns:
        Tuple of (proposed_items, excluded_items, warnings)

    Raises:
        ValueError: If image is empty or response cannot be parsed
        ConnectionError: If Claude API call fails
    """
    if not image_base64 or image_base64.strip() == "":
        raise ValueError("Image data cannot be empty")

    logger.info("Parsing receipt with Claude Vision API")

    # Use Opus 4 for receipt OCR by default, allow override
    if model is None:
        model = settings.HIGH_ACCURACY_MODEL_NAME

    try:
        # Build system prompt for OCR
        system_prompt = _get_receipt_parse_system_prompt()

        # Build user message with duplicate context
        user_prompt = _build_receipt_user_prompt(existing_groceries)

        # Call Claude Vision API (multimodal)
        response = client.messages.create(
            model=model,
            max_tokens=2000,
            temperature=0.1,  # Very low for OCR accuracy
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",  # Assume JPEG (client compresses)
                                "data": image_base64,
                            },
                        },
                        {"type": "text", "text": user_prompt}
                    ],
                }
            ],
        )

        # Parse response
        response_text = response.content[0].text
        parsed_data = _parse_receipt_response(response_text)

        return (parsed_data["proposed_items"], parsed_data["excluded_items"], parsed_data["warnings"])

    except Exception as e:
        if "connection" in str(e).lower() or "timeout" in str(e).lower():
            logger.error(f"Connection error calling Claude Vision API: {e}")
            raise ConnectionError(f"Failed to connect to Claude Vision API: {e}")
        else:
            logger.error(f"Error parsing receipt: {e}")
            raise


def _get_receipt_parse_system_prompt() -> str:
    """System prompt for receipt OCR parsing."""
    return """You are an expert at reading grocery store receipts and extracting items.

Your task:
1. Read the receipt image and extract ALL grocery items
2. Detect the purchase date from the receipt header (usually at top)
3. Detect the store name from the receipt header
4. Standardize item names (remove brand names, generic descriptions)
5. Assign confidence: "high" (clear text), "medium" (some blur), "low" (very unclear)
6. Separately list non-food items (bags, cleaning supplies, etc.) as excluded items

Return JSON format:
{
  "proposed_items": [
    {
      "name": "standardized item name",
      "confidence": "high|medium|low",
      "notes": "optional notes about the item"
    }
  ],
  "excluded_items": [
    {
      "name": "item name as on receipt",
      "reason": "non-food item|tax/total|store info|bag fee"
    }
  ],
  "detected_purchase_date": "YYYY-MM-DD or null if not found",
  "detected_store": "Store Name or null if not found",
  "warnings": ["warnings about OCR quality or unreadable items"]
}

Example: "CHKN BRST" → "chicken breast", "2% MILK GAL" → "milk", "ORG BANANAS" → "bananas"
Exclude: taxes, totals, bag fees, store info, non-food items (cleaning supplies, paper goods, etc.)

Be concise. Focus on food items in proposed_items, list excluded items separately."""


def _build_receipt_user_prompt(existing_groceries: list) -> str:
    """Build user prompt with existing grocery context for duplicate detection."""
    prompt = "Extract all grocery items from this receipt."

    if existing_groceries:
        existing_names = [g["name"] for g in existing_groceries]
        prompt += f"\n\nExisting groceries (warn about duplicates): {', '.join(existing_names)}"

    return prompt


def _parse_receipt_response(response_text: str) -> dict:
    """
    Parse Claude's response text into structured data.

    Handles:
    - Plain JSON
    - JSON wrapped in markdown code blocks
    - Missing fields (use defaults)

    Args:
        response_text: Raw text from Claude Vision API

    Returns:
        Dict with proposed_items, detected_purchase_date, detected_store, warnings

    Raises:
        ValueError: If response is not valid JSON
    """
    try:
        # Remove markdown code blocks if present
        text = response_text.strip()
        if text.startswith("```"):
            # Extract JSON from code block
            lines = text.split("\n")
            text = "\n".join(lines[1:-1]) if len(lines) > 2 else text

        # Parse JSON
        data = json.loads(text)

        # Validate and set defaults
        proposed_items = data.get("proposed_items", [])
        excluded_items = data.get("excluded_items", [])
        detected_purchase_date = data.get("detected_purchase_date")
        detected_store = data.get("detected_store")
        warnings = data.get("warnings", [])

        # Propagate purchase date to all items
        if detected_purchase_date:
            for item in proposed_items:
                if "purchase_date" not in item or not item["purchase_date"]:
                    item["purchase_date"] = detected_purchase_date

        return {
            "proposed_items": proposed_items,
            "excluded_items": excluded_items,
            "detected_purchase_date": detected_purchase_date,
            "detected_store": detected_store,
            "warnings": warnings
        }

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Claude Vision response as JSON: {e}")
        logger.error(f"Response text: {response_text}")
        raise ValueError(f"Failed to parse Claude Vision response: {e}")


# Recipe URL Parsing (URL Import Feature)


async def parse_recipe_from_url(
    url: str,
    html_content: str,
    model: str = None
) -> tuple[Recipe, str, list[str], list[str]]:
    """
    Parse recipe from HTML content using Claude AI.

    Args:
        url: Source URL of the recipe
        html_content: Raw HTML content from the recipe page
        model: Optional Claude model name override (defaults to MODEL_NAME for cost-effectiveness)

    Returns:
        Tuple of (recipe, confidence, missing_fields, warnings)
        - recipe: Recipe object with extracted fields
        - confidence: "high", "medium", or "low"
        - missing_fields: List of optional fields that couldn't be extracted
        - warnings: List of user-facing warnings (e.g., paywall detected)

    Raises:
        ValueError: If no recipe found in HTML or parsing fails
        ConnectionError: If Claude API is unavailable

    Examples:
        >>> recipe, conf, missing, warns = await parse_recipe_from_url(
        ...     "https://allrecipes.com/...",
        ...     "<html>...</html>"
        ... )
        >>> recipe.title
        'Chocolate Chip Cookies'
        >>> conf
        'high'
    """
    if not html_content or not html_content.strip():
        raise ValueError("HTML content cannot be empty")

    logger.info(f"Parsing recipe from URL: {url}")

    # Use default Sonnet for URL parsing, allow override
    if model is None:
        model = settings.MODEL_NAME

    # Build prompt for recipe parsing
    prompt = _build_recipe_parse_prompt(url, html_content)

    try:
        # Call Claude API
        response = client.messages.create(
            model=model,
            max_tokens=2048,
            temperature=0.3,  # Lower temp for consistent parsing
            system=_get_recipe_parse_system_prompt(),
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        # Extract response text
        response_text = response.content[0].text
        logger.debug(f"Claude recipe parse response: {response_text[:200]}...")

        # Parse JSON response
        parsed_data = _parse_recipe_response(response_text)

        if parsed_data:
            recipe_data = parsed_data.get("recipe")
            confidence = parsed_data.get("confidence", "low")
            missing_fields = parsed_data.get("missing_fields", [])
            warnings = parsed_data.get("warnings", [])

            # Generate recipe ID from title
            recipe_id = recipe_data.get("title", "").lower().replace(" ", "-").replace("'", "")
            recipe_id = ''.join(c for c in recipe_id if c.isalnum() or c == '-')
            recipe_data["id"] = recipe_id

            # Create Recipe object
            try:
                recipe = Recipe(**recipe_data)
                logger.info(f"Successfully parsed recipe: '{recipe.title}' with {confidence} confidence")
                return recipe, confidence, missing_fields, warnings
            except Exception as e:
                logger.error(f"Failed to create Recipe object: {e}")
                raise ValueError(f"Invalid recipe data from Claude: {e}")
        else:
            raise ValueError("Failed to parse recipe from Claude response")

    except Exception as e:
        logger.error(f"Error calling Claude API for recipe parsing: {e}", exc_info=True)
        if "connection" in str(e).lower() or "api" in str(e).lower():
            raise ConnectionError(f"Claude API unavailable: {e}")
        raise ValueError(f"Failed to parse recipe from HTML: {e}")


def _get_recipe_parse_system_prompt() -> str:
    """
    Get the system prompt for HTML-to-recipe parsing.

    Returns:
        System prompt string
    """
    return """You are a recipe extraction assistant specializing in parsing HTML content to extract structured recipe data.

Your expertise:
- Extracting recipe information from various HTML structures
- Handling poorly formatted or inconsistent HTML
- Detecting paywalled or restricted content
- Inferring missing information when possible (prep time, servings, tags, appliances)
- Assigning confidence scores based on extraction quality

You always:
- Extract all available recipe fields accurately
- Clean up formatting issues (extra spaces, inconsistent capitalization)
- Detect keywords indicating paywalled content (subscribe, login required, member-only)
- Infer tags from recipe type, cuisine, and characteristics
- Infer required appliances from cooking instructions
- Report missing fields honestly
- Assign confidence scores: high (all required + most optional fields), medium (required fields + some optional), low (missing required fields or paywall)

IMPORTANT:
- If you don't find clear recipe content, return an error
- If content appears behind a paywall, mark confidence as "low" and add paywall warning
- Generate recipe IDs from titles (lowercase, hyphenated, alphanumeric only)"""


def _build_recipe_parse_prompt(url: str, html_content: str) -> str:
    """
    Build the user prompt for recipe parsing from HTML.

    Args:
        url: Source URL
        html_content: Raw HTML

    Returns:
        Formatted prompt string
    """
    # Truncate HTML if too long (to fit in context window)
    max_html_length = 50000
    if len(html_content) > max_html_length:
        html_content = html_content[:max_html_length] + "\n[... HTML truncated ...]"
        logger.warning(f"HTML content truncated from {len(html_content)} to {max_html_length} chars")

    return f"""Extract recipe information from this HTML content.

SOURCE URL: {url}

HTML CONTENT:
{html_content}

TASK:
Parse the HTML and extract recipe fields. Return JSON with this exact schema:

{{
  "recipe": {{
    "title": "string (required)",
    "description": "string (optional)",
    "ingredients": ["list of strings (required)"],
    "instructions": "string (required, can be numbered or paragraphs)",
    "tags": ["list of strings (optional, infer from content like 'dessert', 'italian', 'quick')"],
    "prep_time_minutes": number (optional, total prep time),
    "active_cooking_time_minutes": number (optional, active cooking time),
    "serves": number (optional, number of servings),
    "required_appliances": ["list of strings (optional, infer from instructions like 'oven', 'blender')"]
  }},
  "confidence": "high" | "medium" | "low",
  "missing_fields": ["list of field names that couldn't be extracted"],
  "warnings": ["list of warnings like 'Paywall detected', 'Incomplete data'"]
}}

INSTRUCTIONS:
1. **Required fields**: title, ingredients (list), instructions
2. **Optional fields**: description, prep_time_minutes, active_cooking_time_minutes, serves, tags, required_appliances
3. **Paywall detection**: Look for keywords like "subscribe", "login", "member-only", "premium content"
4. **Confidence scoring**:
   - "high": All required fields + most optional fields extracted clearly
   - "medium": All required fields + some optional fields
   - "low": Missing required fields, paywall detected, or very incomplete data
5. **Infer when possible**: If cooking time says "45 minutes total", split into prep + cooking time estimates
6. **Clean formatting**: Remove extra whitespace, normalize capitalization
7. **Tags**: Infer from recipe type (dessert, breakfast, etc.), cuisine (Italian, Mexican), characteristics (quick, healthy)
8. **Appliances**: Infer from instructions (oven, stove, blender, microwave, instant pot, food processor)

Return ONLY valid JSON, no other text."""


def _parse_recipe_response(response_text: str) -> Optional[dict]:
    """
    Parse Claude's JSON response for recipe parsing.

    Args:
        response_text: Raw text response from Claude

    Returns:
        Dict with recipe, confidence, missing_fields, and warnings

    Raises:
        ValueError: If no recipe found or invalid JSON
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

        # Validate structure
        if "recipe" not in data:
            logger.error("Response missing 'recipe' field")
            raise ValueError("No recipe found in HTML content")

        recipe_data = data.get("recipe")

        # Check if recipe data exists
        if not recipe_data or recipe_data is None:
            raise ValueError("No recipe found in HTML content")

        # Validate required fields (but allow partial data for paywalls)
        if not recipe_data.get("title"):
            raise ValueError("No recipe title found in HTML content")

        # For paywall or partial recipes, be more lenient
        # Allow empty ingredients/instructions if confidence is low
        confidence = data.get("confidence", "low")
        warnings = data.get("warnings", [])
        is_paywall = any("paywall" in str(w).lower() or "subscribe" in str(w).lower() for w in warnings)

        if not recipe_data.get("ingredients") and not is_paywall and confidence != "low":
            raise ValueError("No recipe ingredients found in HTML content")
        if not recipe_data.get("instructions") and not is_paywall and confidence != "low":
            raise ValueError("No recipe instructions found in HTML content")

        # For partial/paywall recipes, fill in minimal required fields
        if not recipe_data.get("ingredients"):
            recipe_data["ingredients"] = ["Ingredients not available (paywall or incomplete)"]
        if not recipe_data.get("instructions"):
            recipe_data["instructions"] = "Instructions not available (paywall or incomplete)"

        # Ensure all required Recipe fields have values (use defaults if missing)
        if recipe_data.get("prep_time_minutes") is None:
            recipe_data["prep_time_minutes"] = 0
        if recipe_data.get("active_cooking_time_minutes") is None:
            recipe_data["active_cooking_time_minutes"] = 0
        if recipe_data.get("serves") is None:
            recipe_data["serves"] = 1

        return data

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from recipe response: {e}")
        logger.debug(f"Response text: {response_text}")
        raise ValueError(f"Failed to parse recipe - invalid JSON response: {e}")
    except Exception as e:
        logger.error(f"Failed to parse recipe response: {e}")
        logger.debug(f"Response text: {response_text}")
        raise


# Recipe Text Parsing (Free-Form Text Feature)


async def parse_recipe_from_text(
    recipe_text: str,
    model: str = None
) -> tuple[Recipe, str, list[str], list[str]]:
    """
    Parse recipe from free-form text using Claude AI.

    Args:
        recipe_text: Raw recipe text (ingredients, instructions, etc.)
        model: Optional Claude model name override (defaults to HIGH_ACCURACY_MODEL_NAME)

    Returns:
        Tuple of (recipe, confidence, missing_fields, warnings)
        - recipe: Recipe object with extracted fields
        - confidence: "high", "medium", or "low"
        - missing_fields: List of optional fields that couldn't be extracted
        - warnings: List of user-facing warnings

    Raises:
        ValueError: If text is too short, no recipe found, or parsing fails
        ConnectionError: If Claude API is unavailable

    Examples:
        >>> recipe, conf, missing, warns = await parse_recipe_from_text(
        ...     "Chocolate Chip Cookies\\n\\nIngredients:\\n- 2 cups flour..."
        ... )
        >>> recipe.title
        'Chocolate Chip Cookies'
    """
    if not recipe_text or not recipe_text.strip():
        raise ValueError("Recipe text cannot be empty")

    text_length = len(recipe_text.strip())
    if text_length < 50:
        raise ValueError(f"Recipe text too short ({text_length} chars). Minimum 50 characters required.")

    logger.info(f"Parsing recipe from text: {recipe_text[:100]}...")

    # Use Opus 4.5 for better text understanding
    if model is None:
        model = settings.HIGH_ACCURACY_MODEL_NAME

    # Build prompt for text parsing
    prompt = _build_recipe_text_parse_prompt(recipe_text)

    try:
        # Call Claude API
        response = client.messages.create(
            model=model,
            max_tokens=2048,
            temperature=0.3,  # Lower temp for consistent parsing
            system=_get_recipe_text_parse_system_prompt(),
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        # Extract response text - handle empty responses
        if not response.content:
            raise ValueError("No recipe found in text - Claude returned empty response")
        response_text = response.content[0].text
        logger.debug(f"Claude text parse response: {response_text[:200]}...")

        # Parse JSON response (reuse existing parser)
        parsed_data = _parse_recipe_response(response_text)

        if parsed_data:
            recipe_data = parsed_data.get("recipe")
            confidence = parsed_data.get("confidence", "low")
            missing_fields = parsed_data.get("missing_fields", [])
            warnings = parsed_data.get("warnings", [])

            # Generate recipe ID from title
            recipe_id = recipe_data.get("title", "").lower().replace(" ", "-").replace("'", "")
            recipe_id = ''.join(c for c in recipe_id if c.isalnum() or c == '-')
            recipe_data["id"] = recipe_id

            # Filter meal_types to only valid values (Claude might infer invalid ones like "dessert")
            if recipe_data.get("meal_types"):
                original_meal_types = recipe_data["meal_types"]
                recipe_data["meal_types"] = [mt for mt in original_meal_types if mt in VALID_MEAL_TYPES]
                invalid_types = set(original_meal_types) - VALID_MEAL_TYPES
                if invalid_types:
                    logger.warning(f"Filtered invalid meal_types from Claude response: {invalid_types}")

            # Create Recipe object
            try:
                recipe = Recipe(**recipe_data)
                logger.info(f"Successfully parsed recipe from text: '{recipe.title}' with {confidence} confidence")
                return recipe, confidence, missing_fields, warnings
            except Exception as e:
                logger.error(f"Failed to create Recipe object: {e}")
                raise ValueError(f"Invalid recipe data from Claude: {e}")
        else:
            raise ValueError("Failed to parse recipe from Claude response")

    except Exception as e:
        logger.error(f"Error calling Claude API for text parsing: {e}", exc_info=True)
        if "connection" in str(e).lower() or "api" in str(e).lower():
            raise ConnectionError(f"Claude API unavailable: {e}")
        raise ValueError(f"Failed to parse recipe from text: {e}")


def _get_recipe_text_parse_system_prompt() -> str:
    """
    Get the system prompt for free-form text recipe parsing.

    Returns:
        System prompt string
    """
    return """You are a recipe extraction specialist. Parse free-form recipe text into structured data.

Your expertise:
- Extracting recipe information from various text formats
- Handling blog posts, handwritten notes, OCR text, copy-pasted content
- Cleaning up formatting issues (extra spaces, inconsistent capitalization)
- Inferring missing information from context when reasonable

You always:
- Extract all available recipe fields accurately
- Clean up formatting (extra spaces, weird line breaks, inconsistent caps)
- Infer tags from recipe type, cuisine, and characteristics
- Infer required appliances from cooking instructions
- Report confidence: high (clear structure, complete data), medium (some inference needed), low (significant guessing or missing data)

IMPORTANT:
- If the text doesn't contain a recipe (just a food blog intro, shopping list, etc.), return an error
- If key information is missing, report it in missing_fields but still return what you can
- meal_types should be inferred from the recipe (breakfast, lunch, dinner, snack, side_dish)"""


def _build_recipe_text_parse_prompt(recipe_text: str) -> str:
    """
    Build the user prompt for recipe parsing from free-form text.

    Args:
        recipe_text: Raw recipe text

    Returns:
        Formatted prompt string
    """
    return f"""Extract recipe information from this text.

RECIPE TEXT:
{recipe_text}

TASK:
Parse the text and extract recipe fields. Return JSON with this exact schema:

{{
  "recipe": {{
    "title": "string (required)",
    "description": "string (optional)",
    "ingredients": ["list of strings (required)"],
    "instructions": "string (required, can be numbered or paragraphs)",
    "tags": ["list of strings (optional, infer from content like 'dessert', 'italian', 'quick')"],
    "meal_types": ["list of meal types: breakfast, lunch, dinner, snack, side_dish"],
    "prep_time_minutes": number (optional, total prep time),
    "active_cooking_time_minutes": number (optional, active cooking time),
    "serves": number (optional, number of servings),
    "required_appliances": ["list of strings (optional, infer from instructions like 'oven', 'blender')"]
  }},
  "confidence": "high" | "medium" | "low",
  "missing_fields": ["list of field names that couldn't be extracted"],
  "warnings": ["list of warnings like 'Times are estimates', 'Servings not specified'"]
}}

INSTRUCTIONS:
1. **Required fields**: title, ingredients (list), instructions
2. **Optional fields**: description, prep_time_minutes, active_cooking_time_minutes, serves, tags, meal_types, required_appliances
3. **Error case**: If no recipe found (just a blog intro, shopping list, etc.), return {{"error": "No recipe found in text"}}
4. **Confidence scoring**:
   - "high": Clear recipe structure, all required fields present, most optional fields extractable
   - "medium": Recipe identifiable but some fields require inference
   - "low": Significant guessing required, missing key information
5. **Infer when possible**: Estimate prep/cook times if not explicit, infer servings from ingredient quantities
6. **Clean formatting**: Remove extra whitespace, normalize capitalization, fix common OCR errors
7. **Tags**: Infer from recipe type (dessert, main dish), cuisine (Italian, Mexican), characteristics (quick, healthy, kid-friendly)
8. **Appliances**: Infer from instructions (oven, stove, blender, microwave, instant pot, food processor)
9. **Meal types**: Infer what meals this recipe is suitable for (breakfast, lunch, dinner, snack, side_dish)

Return ONLY valid JSON, no other text."""
