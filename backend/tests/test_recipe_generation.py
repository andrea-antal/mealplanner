"""
Tests for dynamic recipe generation functionality.

These tests follow TDD principles and focus on schema validation
to catch integration bugs like field name mismatches.
"""

import pytest
from pydantic import ValidationError
from app.models.recipe import Recipe


def test_recipe_schema_matches_frontend_interface():
    """
    Test 1: Verify Recipe model has all required fields that frontend expects.
    This test would have caught the cook_time_minutes vs active_cooking_time_minutes bug.
    """
    recipe = Recipe(
        id="test-123",
        title="Test Recipe",
        description="A test recipe",
        ingredients=["chicken breast", "rice", "broccoli"],
        instructions="1. Cook chicken. 2. Cook rice. 3. Steam broccoli.",
        tags=["quick", "healthy"],
        prep_time_minutes=10,
        active_cooking_time_minutes=20,  # Critical: NOT cook_time_minutes!
        serves=4,  # Critical: NOT servings!
        required_appliances=["stove", "pot"]
    )

    # Verify all expected fields exist
    assert recipe.id == "test-123"
    assert recipe.title == "Test Recipe"
    assert recipe.description == "A test recipe"
    assert recipe.ingredients == ["chicken breast", "rice", "broccoli"]
    assert recipe.instructions == "1. Cook chicken. 2. Cook rice. 3. Steam broccoli."
    assert recipe.tags == ["quick", "healthy"]
    assert recipe.prep_time_minutes == 10
    assert recipe.active_cooking_time_minutes == 20
    assert recipe.serves == 4
    assert recipe.required_appliances == ["stove", "pot"]

    # Verify field names match exactly (would catch typos)
    assert hasattr(recipe, "active_cooking_time_minutes")
    assert hasattr(recipe, "serves")
    assert not hasattr(recipe, "cook_time_minutes")  # Should NOT exist
    assert not hasattr(recipe, "servings")  # Should NOT exist


def test_recipe_model_required_fields():
    """
    Test 2: Verify Recipe model enforces required fields.
    """
    # Should raise ValidationError if required fields missing
    with pytest.raises(ValidationError) as exc_info:
        Recipe(
            # Missing required fields: id, title, ingredients, instructions, etc.
        )

    # Verify error mentions missing required fields
    error_message = str(exc_info.value)
    assert "field required" in error_message.lower() or "missing" in error_message.lower()


def test_recipe_instructions_is_string_not_array():
    """
    Test 3: Verify instructions field is string, not array.
    This matches backend implementation where instructions are stored as a single string.
    Frontend will split by numbered list pattern for display.
    """
    recipe = Recipe(
        id="test-123",
        title="Test Recipe",
        ingredients=["chicken"],
        instructions="1. Step one. 2. Step two.",  # String, not array
        tags=[],
        prep_time_minutes=10,
        active_cooking_time_minutes=20,
        serves=4,
        required_appliances=[]
    )

    assert isinstance(recipe.instructions, str)
    assert not isinstance(recipe.instructions, list)


def test_recipe_optional_fields():
    """
    Test 4: Verify optional fields have sensible defaults.
    """
    recipe = Recipe(
        id="test-minimal",
        title="Minimal Recipe",
        ingredients=["ingredient1"],
        instructions="Do something.",
        prep_time_minutes=5,
        active_cooking_time_minutes=10,
        serves=2
        # Not providing: description, tags, required_appliances
    )

    # Optional fields should have defaults
    assert recipe.tags == []  # Default empty list
    assert recipe.required_appliances == []  # Default empty list
    # description can be None or not required


# Placeholder tests for DynamicRecipeRequest model
# These will be implemented after creating the model

def test_dynamic_recipe_request_schema_placeholder():
    """
    Placeholder: Test for DynamicRecipeRequest model.
    Will implement after creating the model.

    Expected test:
    - Verify request model has ingredients, portions, meal_type, servings fields
    - Verify portions is optional Dict[str, str]
    - Verify meal_type defaults to "dinner"
    - Verify servings defaults to 4
    """
    pytest.skip("DynamicRecipeRequest model not yet created")


def test_generated_recipe_respects_constraints_placeholder():
    """
    Placeholder: Test for household constraint satisfaction.
    Will implement after Claude service integration.

    Expected test:
    - Load household profile with peanut allergy
    - Generate recipe from ingredients
    - Verify "peanut" does not appear in ingredients or instructions
    """
    pytest.skip("Claude service integration not yet complete")
