"""Tests for Claude-based recipe parsing from HTML"""
import pytest
from app.services.claude_service import parse_recipe_from_url
from app.models.recipe import Recipe

# Sample HTML fixtures for different scenarios

SAMPLE_COMPLETE_RECIPE_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>Chocolate Chip Cookies - AllRecipes</title>
</head>
<body>
    <h1>Chocolate Chip Cookies</h1>
    <p class="description">These classic chocolate chip cookies are soft, chewy, and absolutely delicious!</p>

    <div class="recipe-info">
        <span>Prep Time: 15 min</span>
        <span>Cook Time: 12 min</span>
        <span>Servings: 24 cookies</span>
    </div>

    <div class="ingredients">
        <h2>Ingredients</h2>
        <ul>
            <li>2 cups all-purpose flour</li>
            <li>1 cup butter, softened</li>
            <li>3/4 cup granulated sugar</li>
            <li>3/4 cup packed brown sugar</li>
            <li>2 large eggs</li>
            <li>2 teaspoons vanilla extract</li>
            <li>1 teaspoon baking soda</li>
            <li>1 teaspoon salt</li>
            <li>2 cups chocolate chips</li>
        </ul>
    </div>

    <div class="instructions">
        <h2>Instructions</h2>
        <ol>
            <li>Preheat oven to 350°F (175°C).</li>
            <li>In a large bowl, cream together butter and sugars until fluffy.</li>
            <li>Beat in eggs and vanilla extract.</li>
            <li>In a separate bowl, combine flour, baking soda, and salt.</li>
            <li>Gradually stir dry ingredients into butter mixture.</li>
            <li>Fold in chocolate chips.</li>
            <li>Drop rounded tablespoons of dough onto ungreased cookie sheets.</li>
            <li>Bake for 10-12 minutes or until golden brown.</li>
            <li>Cool on baking sheet for 2 minutes before removing to a wire rack.</li>
        </ol>
    </div>

    <div class="tags">
        <span>Dessert</span>
        <span>Baking</span>
        <span>Family-Friendly</span>
    </div>
</body>
</html>
"""

SAMPLE_PAYWALL_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>Premium Recipe - NYT Cooking</title>
</head>
<body>
    <h1>Gourmet Pasta Carbonara</h1>
    <div class="paywall-notice">
        <h2>Subscribe to view this recipe</h2>
        <p>This recipe is available to subscribers only. Please log in or subscribe to continue.</p>
        <button>Subscribe Now</button>
    </div>
    <p class="preview">This authentic Italian carbonara is made with eggs, cheese, and guanciale...</p>
</body>
</html>
"""

SAMPLE_PARTIAL_RECIPE_HTML = """
<!DOCTYPE html>
<html>
<body>
    <h1>Quick Apple Snack</h1>
    <p>A simple and healthy snack for kids.</p>
    <div>
        <h2>Ingredients:</h2>
        <p>1 apple, 2 tbsp peanut butter, 1 tbsp honey</p>
    </div>
    <p>Slice apple and serve with peanut butter and honey drizzle.</p>
</body>
</html>
"""

SAMPLE_NON_RECIPE_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>About Our Food Blog</title>
</head>
<body>
    <h1>Welcome to Our Food Blog</h1>
    <p>We're passionate about sharing delicious recipes and cooking tips.</p>
    <p>Founded in 2020, our blog has grown to include thousands of recipes.</p>
    <div class="sidebar">
        <h2>Popular Categories</h2>
        <ul>
            <li>Breakfast</li>
            <li>Lunch</li>
            <li>Dinner</li>
        </ul>
    </div>
    <p>Subscribe to our newsletter for weekly updates!</p>
</body>
</html>
"""

SAMPLE_MESSY_FORMATTING_HTML = """
<html><body><div class="recipe">
<h1>  Spaghetti   Bolognese  </h1>
<p>Description: Classic Italian pasta dish</p>
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
Appliances: stove, pot
</div></body></html>
"""


@pytest.mark.asyncio
async def test_parse_complete_recipe():
    """Should parse all fields from well-formatted HTML"""
    recipe, confidence, missing_fields, warnings = await parse_recipe_from_url(
        "https://www.allrecipes.com/recipe/chocolate-chip-cookies",
        SAMPLE_COMPLETE_RECIPE_HTML
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
async def test_parse_paywall_detection():
    """Should detect paywalled content and return warning"""
    recipe, confidence, missing_fields, warnings = await parse_recipe_from_url(
        "https://cooking.nytimes.com/recipe/pasta-carbonara",
        SAMPLE_PAYWALL_HTML
    )

    # Should detect paywall
    assert confidence == "low"
    assert any("paywall" in w.lower() or "subscribe" in w.lower() for w in warnings)

    # Should still extract what's available (title, partial description)
    assert recipe.title is not None
    assert "carbonara" in recipe.title.lower()


@pytest.mark.asyncio
async def test_parse_partial_recipe():
    """Should handle missing optional fields gracefully"""
    recipe, confidence, missing_fields, warnings = await parse_recipe_from_url(
        "https://example.com/quick-snack",
        SAMPLE_PARTIAL_RECIPE_HTML
    )

    # Should extract basic required fields
    assert recipe.title == "Quick Apple Snack"
    assert len(recipe.ingredients) >= 2  # Should find at least apple and peanut butter
    assert recipe.instructions != ""

    # Confidence should reflect missing data or be high if Claude inferred well
    assert confidence in ["high", "medium", "low"]

    # May or may not have missing fields (Claude might infer missing data)
    # Likely missing: prep_time_minutes, active_cooking_time_minutes, serves
    # But Claude is smart and might infer some of these


@pytest.mark.asyncio
async def test_parse_no_recipe_found():
    """Should raise ValueError when no recipe content detected"""
    with pytest.raises(ValueError, match="(?i)no recipe|not.*recipe|recipe.*not found"):
        await parse_recipe_from_url(
            "https://example.com/about",
            SAMPLE_NON_RECIPE_HTML
        )


@pytest.mark.asyncio
async def test_parse_messy_formatting():
    """Should handle poorly formatted HTML with missing structure"""
    recipe, confidence, missing_fields, warnings = await parse_recipe_from_url(
        "https://example.com/spaghetti",
        SAMPLE_MESSY_FORMATTING_HTML
    )

    # Should clean up title
    assert recipe.title == "Spaghetti Bolognese"

    # Should extract ingredients despite poor formatting
    assert len(recipe.ingredients) >= 4
    assert any("beef" in ing.lower() for ing in recipe.ingredients)

    # Should extract instructions
    assert recipe.instructions != ""
    assert any(str(i) in recipe.instructions for i in range(1, 4))

    # Should infer some metadata
    if recipe.prep_time_minutes:
        assert recipe.prep_time_minutes > 0
    if recipe.serves:
        assert recipe.serves == 4

    # Confidence might be medium due to messy formatting
    assert confidence in ["medium", "high"]


@pytest.mark.asyncio
async def test_parse_generates_recipe_id():
    """Should generate URL-safe recipe ID from title"""
    recipe, _, _, _ = await parse_recipe_from_url(
        "https://example.com/recipe",
        SAMPLE_COMPLETE_RECIPE_HTML
    )

    assert recipe.id is not None
    assert recipe.id == "chocolate-chip-cookies"
    assert " " not in recipe.id  # No spaces
    assert recipe.id.islower()  # Lowercase


@pytest.mark.asyncio
async def test_parse_extracts_tags():
    """Should infer or extract recipe tags"""
    recipe, _, _, _ = await parse_recipe_from_url(
        "https://example.com/recipe",
        SAMPLE_COMPLETE_RECIPE_HTML
    )

    # Should have some tags (either extracted or inferred)
    assert len(recipe.tags) > 0
    # Common tags might include: dessert, baking, cookies, family-friendly


@pytest.mark.asyncio
async def test_parse_extracts_appliances():
    """Should infer required appliances from instructions"""
    recipe, _, _, _ = await parse_recipe_from_url(
        "https://example.com/recipe",
        SAMPLE_COMPLETE_RECIPE_HTML
    )

    # Should infer oven is required
    assert "oven" in [a.lower() for a in recipe.required_appliances]


@pytest.mark.asyncio
async def test_parse_confidence_scoring():
    """Should assign appropriate confidence levels"""
    # Complete recipe -> high confidence
    _, conf_high, _, _ = await parse_recipe_from_url(
        "https://example.com",
        SAMPLE_COMPLETE_RECIPE_HTML
    )
    assert conf_high == "high"

    # Partial recipe -> medium/low confidence
    _, conf_partial, _, _ = await parse_recipe_from_url(
        "https://example.com",
        SAMPLE_PARTIAL_RECIPE_HTML
    )
    assert conf_partial in ["medium", "low"]

    # Paywall -> low confidence
    _, conf_paywall, _, _ = await parse_recipe_from_url(
        "https://example.com",
        SAMPLE_PAYWALL_HTML
    )
    assert conf_paywall == "low"
