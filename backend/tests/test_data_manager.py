"""Tests for data_manager.py"""
import pytest
from app.data import (
    load_household_profile,
    save_household_profile,
    load_groceries,
    save_groceries,
    load_recipe,
    save_recipe,
    list_all_recipes,
)
from app.models import HouseholdProfile, FamilyMember, Recipe


def test_load_household_profile():
    """Test loading household profile from JSON"""
    profile = load_household_profile()
    assert profile is not None
    assert isinstance(profile, HouseholdProfile)
    assert len(profile.family_members) == 3
    assert profile.daycare_rules.no_nuts is True
    print("✅ test_load_household_profile passed")


def test_save_and_load_household_profile():
    """Test saving and loading household profile"""
    # Create a test profile
    member = FamilyMember(name="Test Person", age_group="adult", allergies=[], dislikes=[])
    test_profile = HouseholdProfile(family_members=[member])

    # Save it
    save_household_profile(test_profile)

    # Load it back
    loaded = load_household_profile()
    assert loaded is not None
    assert len(loaded.family_members) == 1
    assert loaded.family_members[0].name == "Test Person"
    print("✅ test_save_and_load_household_profile passed")


def test_load_groceries():
    """Test loading groceries from JSON"""
    groceries = load_groceries()
    assert isinstance(groceries, list)
    assert len(groceries) > 0
    assert "chicken breast" in groceries
    print("✅ test_load_groceries passed")


def test_save_and_load_groceries():
    """Test saving and loading groceries"""
    test_items = ["apple", "banana", "carrot"]

    # Save
    save_groceries(test_items)

    # Load
    loaded = load_groceries()
    assert loaded == test_items
    print("✅ test_save_and_load_groceries passed")


def test_load_recipe():
    """Test loading a single recipe"""
    recipe = load_recipe("recipe_001")
    assert recipe is not None
    assert isinstance(recipe, Recipe)
    assert recipe.title == "One-Pot Chicken and Rice"
    assert "toddler-friendly" in recipe.tags
    print("✅ test_load_recipe passed")


def test_load_nonexistent_recipe():
    """Test loading a recipe that doesn't exist"""
    recipe = load_recipe("nonexistent")
    assert recipe is None
    print("✅ test_load_nonexistent_recipe passed")


def test_save_and_load_recipe():
    """Test saving and loading a recipe"""
    test_recipe = Recipe(
        id="test_recipe",
        title="Test Dish",
        ingredients=["ingredient1", "ingredient2"],
        instructions="Mix and cook",
        tags=["test"],
        prep_time_minutes=5,
        active_cooking_time_minutes=10,
        serves=2,
        required_appliances=["oven"]
    )

    # Save
    save_recipe(test_recipe)

    # Load
    loaded = load_recipe("test_recipe")
    assert loaded is not None
    assert loaded.title == "Test Dish"
    assert loaded.serves == 2
    print("✅ test_save_and_load_recipe passed")


def test_list_all_recipes():
    """Test listing all recipes"""
    recipes = list_all_recipes()
    assert isinstance(recipes, list)
    assert len(recipes) >= 3  # We created 3 sample recipes

    # Check that all are Recipe objects
    for recipe in recipes:
        assert isinstance(recipe, Recipe)

    print(f"✅ test_list_all_recipes passed ({len(recipes)} recipes found)")


if __name__ == "__main__":
    # Run tests manually
    test_load_household_profile()
    test_save_and_load_household_profile()
    test_load_groceries()
    test_save_and_load_groceries()
    test_load_recipe()
    test_load_nonexistent_recipe()
    test_save_and_load_recipe()
    test_list_all_recipes()
    print("\n🎉 All data_manager tests passed!")
