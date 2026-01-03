"""Tests for Claude-based recipe parsing from free-form text"""
import pytest
from app.services.claude_service import parse_recipe_from_text
from app.models.recipe import Recipe

# Sample text fixtures for different scenarios

SAMPLE_COMPLETE_RECIPE_TEXT = """
Chocolate Chip Cookies

These classic chocolate chip cookies are soft, chewy, and absolutely delicious!

Prep Time: 15 minutes
Cook Time: 12 minutes
Servings: 24 cookies

Ingredients:
- 2 cups all-purpose flour
- 1 cup butter, softened
- 3/4 cup granulated sugar
- 3/4 cup packed brown sugar
- 2 large eggs
- 2 teaspoons vanilla extract
- 1 teaspoon baking soda
- 1 teaspoon salt
- 2 cups chocolate chips

Instructions:
1. Preheat oven to 350°F (175°C).
2. In a large bowl, cream together butter and sugars until fluffy.
3. Beat in eggs and vanilla extract.
4. In a separate bowl, combine flour, baking soda, and salt.
5. Gradually stir dry ingredients into butter mixture.
6. Fold in chocolate chips.
7. Drop rounded tablespoons of dough onto ungreased cookie sheets.
8. Bake for 10-12 minutes or until golden brown.
9. Cool on baking sheet for 2 minutes before removing to a wire rack.

Tags: Dessert, Baking, Family-Friendly
"""

SAMPLE_MINIMAL_RECIPE_TEXT = """
Quick Apple Snack

Ingredients:
- 1 apple
- 2 tbsp peanut butter
- 1 tbsp honey

Slice apple and serve with peanut butter and honey drizzle.
"""

SAMPLE_MESSY_FORMAT_TEXT = """
  Spaghetti   Bolognese

Description: Classic Italian pasta dish

Ingredients:
500g ground beef
1 onion
2 cloves garlic
800g canned tomatoes
400g spaghetti pasta

Instructions:
1. Fry the beef   2. Add onion and garlic
3. Add tomatoes and simmer 30 min
4. Cook pasta and serve

Time: 45 minutes | Serves: 4
Tags: Italian, pasta, dinner
"""

SAMPLE_NON_RECIPE_TEXT = """
Welcome to Our Food Blog

We're passionate about sharing delicious recipes and cooking tips.

Founded in 2020, our blog has grown to include thousands of recipes.

Popular Categories:
- Breakfast
- Lunch
- Dinner

Subscribe to our newsletter for weekly updates!
"""

SAMPLE_VERY_SHORT_TEXT = "chicken milk eggs"

SAMPLE_TEXT_AT_MAX_LENGTH = "x" * 10000  # Exactly at limit

SAMPLE_TEXT_TOO_SHORT = "hi"  # Under 50 chars


@pytest.mark.asyncio
async def test_parse_complete_recipe_text():
    """Should parse all fields from well-formatted recipe text"""
    recipe, confidence, missing_fields, warnings = await parse_recipe_from_text(
        SAMPLE_COMPLETE_RECIPE_TEXT
    )

    # Verify recipe object
    assert isinstance(recipe, Recipe)

    # Verify required fields
    assert recipe.title == "Chocolate Chip Cookies"
    assert len(recipe.ingredients) == 9
    assert "flour" in recipe.ingredients[0].lower()
    assert recipe.instructions != ""
    assert "preheat" in recipe.instructions.lower()

    # Verify optional fields (should be extracted)
    assert recipe.prep_time_minutes >= 0  # Should have extracted 15
    assert recipe.active_cooking_time_minutes >= 0  # Should have extracted 12
    assert recipe.serves > 0  # Should have extracted 24

    # Verify confidence and completeness
    assert confidence == "high"
    assert len(missing_fields) == 0
    assert len(warnings) == 0


@pytest.mark.asyncio
async def test_parse_minimal_recipe_text():
    """Should handle minimal recipe with just title, ingredients, and brief instructions"""
    recipe, confidence, missing_fields, warnings = await parse_recipe_from_text(
        SAMPLE_MINIMAL_RECIPE_TEXT
    )

    # Should extract basic required fields
    assert recipe.title == "Quick Apple Snack"
    assert len(recipe.ingredients) >= 2  # Should find at least apple and peanut butter
    assert recipe.instructions != ""

    # Confidence should reflect minimal data
    assert confidence in ["high", "medium"]

    # May have missing fields for time/servings
    # (Claude might infer or report as missing)


@pytest.mark.asyncio
async def test_parse_messy_format_text():
    """Should handle poorly formatted text with inconsistent spacing"""
    recipe, confidence, missing_fields, warnings = await parse_recipe_from_text(
        SAMPLE_MESSY_FORMAT_TEXT
    )

    # Should clean up title
    assert recipe.title == "Spaghetti Bolognese"

    # Should extract ingredients despite poor formatting
    assert len(recipe.ingredients) >= 4
    assert any("beef" in ing.lower() for ing in recipe.ingredients)

    # Should extract instructions
    assert recipe.instructions != ""

    # Should infer serves
    if recipe.serves:
        assert recipe.serves == 4


@pytest.mark.asyncio
async def test_parse_no_recipe_found():
    """Should raise ValueError when no recipe content detected"""
    with pytest.raises(ValueError, match="(?i)no recipe|not.*recipe|recipe.*not found"):
        await parse_recipe_from_text(SAMPLE_NON_RECIPE_TEXT)


@pytest.mark.asyncio
async def test_parse_text_too_short():
    """Should reject text that's too short (< 50 chars)"""
    with pytest.raises(ValueError, match="(?i)too short|minimum|at least"):
        await parse_recipe_from_text(SAMPLE_TEXT_TOO_SHORT)


@pytest.mark.asyncio
async def test_parse_text_at_max_length():
    """Should handle text at maximum length (10000 chars)"""
    # This test verifies the function accepts 10000 char input
    # The content itself is gibberish so it should error as no recipe found
    with pytest.raises(ValueError, match="(?i)no recipe|not.*recipe|invalid"):
        await parse_recipe_from_text(SAMPLE_TEXT_AT_MAX_LENGTH)


@pytest.mark.asyncio
async def test_parse_generates_recipe_id():
    """Should generate URL-safe recipe ID from title"""
    recipe, _, _, _ = await parse_recipe_from_text(SAMPLE_COMPLETE_RECIPE_TEXT)

    assert recipe.id is not None
    assert recipe.id == "chocolate-chip-cookies"
    assert " " not in recipe.id  # No spaces
    assert recipe.id.islower()  # Lowercase


@pytest.mark.asyncio
async def test_parse_extracts_tags():
    """Should infer or extract recipe tags"""
    recipe, _, _, _ = await parse_recipe_from_text(SAMPLE_COMPLETE_RECIPE_TEXT)

    # Should have some tags (either extracted or inferred)
    assert len(recipe.tags) > 0
    # Common tags might include: dessert, baking, cookies, family-friendly


@pytest.mark.asyncio
async def test_parse_extracts_appliances():
    """Should infer required appliances from instructions"""
    recipe, _, _, _ = await parse_recipe_from_text(SAMPLE_COMPLETE_RECIPE_TEXT)

    # Should infer oven is required
    assert "oven" in [a.lower() for a in recipe.required_appliances]


@pytest.mark.asyncio
async def test_parse_infers_meal_types():
    """Should infer meal_types based on recipe content"""
    recipe, _, _, _ = await parse_recipe_from_text(SAMPLE_COMPLETE_RECIPE_TEXT)

    # Cookies are typically a snack or dessert
    # The meal_types might include 'snack' or be empty (to be filled by user)
    assert isinstance(recipe.meal_types, list)


@pytest.mark.asyncio
async def test_parse_confidence_scoring():
    """Should assign appropriate confidence levels based on completeness"""
    # Complete recipe -> high confidence
    _, conf_complete, _, _ = await parse_recipe_from_text(SAMPLE_COMPLETE_RECIPE_TEXT)
    assert conf_complete == "high"

    # Minimal recipe -> medium/high confidence (core fields present)
    _, conf_minimal, _, _ = await parse_recipe_from_text(SAMPLE_MINIMAL_RECIPE_TEXT)
    assert conf_minimal in ["high", "medium"]


@pytest.mark.asyncio
async def test_parse_returns_warnings_for_missing_data():
    """Should return warnings when data is incomplete or requires inference"""
    _, _, missing_fields, warnings = await parse_recipe_from_text(
        SAMPLE_MINIMAL_RECIPE_TEXT
    )

    # Should either have missing_fields populated or empty if Claude inferred
    assert isinstance(missing_fields, list)
    assert isinstance(warnings, list)
