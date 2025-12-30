"""
Tests for recipe filter service.

TDD Phase: RED - These tests should FAIL until we implement the functionality.
"""
import pytest
from app.models.recipe import Recipe
from app.models.household import HouseholdProfile, FamilyMember


# ===== Test Fixtures =====

def create_test_recipe(
    recipe_id: str = "test_recipe",
    title: str = "Test Recipe",
    ingredients: list = None,
    tags: list = None
) -> Recipe:
    """Create a test recipe with customizable fields."""
    return Recipe(
        id=recipe_id,
        title=title,
        ingredients=ingredients or ["chicken breast", "rice", "broccoli"],
        instructions="Cook everything together",
        tags=tags or ["dinner", "quick"],
        prep_time_minutes=10,
        active_cooking_time_minutes=20,
        serves=4,
        required_appliances=["oven"]
    )


def create_test_household(
    allergies: list = None,
    dislikes: list = None
) -> HouseholdProfile:
    """Create a test household profile."""
    return HouseholdProfile(
        family_members=[
            FamilyMember(
                name="Adult",
                age_group="adult",
                allergies=allergies or [],
                dislikes=dislikes or []
            )
        ]
    )


# ===== Tests for check_recipe_constraints =====

class TestCheckRecipeConstraints:
    """Tests for check_recipe_constraints function."""

    def test_safe_recipe_no_constraints(self):
        """Recipe with no matching allergies or dislikes is safe."""
        from app.services.recipe_filter_service import check_recipe_constraints

        recipe = create_test_recipe(ingredients=["chicken", "rice", "vegetables"])
        household = create_test_household(allergies=[], dislikes=[])

        is_safe, warnings = check_recipe_constraints(recipe, household)

        assert is_safe is True
        assert warnings == []

    def test_unsafe_recipe_with_allergy(self):
        """Recipe containing allergen is NOT safe."""
        from app.services.recipe_filter_service import check_recipe_constraints

        recipe = create_test_recipe(ingredients=["peanut butter", "bread", "jelly"])
        household = create_test_household(allergies=["peanuts"])

        is_safe, warnings = check_recipe_constraints(recipe, household)

        assert is_safe is False
        assert len(warnings) >= 1
        assert any("allergy" in w.lower() or "peanut" in w.lower() for w in warnings)

    def test_safe_but_warning_for_dislike(self):
        """Recipe with disliked ingredient is safe but has warning."""
        from app.services.recipe_filter_service import check_recipe_constraints

        recipe = create_test_recipe(ingredients=["chicken", "cilantro", "rice"])
        household = create_test_household(allergies=[], dislikes=["cilantro"])

        is_safe, warnings = check_recipe_constraints(recipe, household)

        assert is_safe is True  # Dislikes don't make it unsafe
        assert len(warnings) >= 1
        assert any("cilantro" in w.lower() for w in warnings)

    def test_multiple_allergies_checked(self):
        """All family member allergies are checked."""
        from app.services.recipe_filter_service import check_recipe_constraints

        recipe = create_test_recipe(ingredients=["shrimp", "pasta", "garlic"])
        household = HouseholdProfile(
            family_members=[
                FamilyMember(name="Person1", age_group="adult", allergies=["shellfish"]),
                FamilyMember(name="Person2", age_group="adult", allergies=["nuts"])
            ]
        )

        is_safe, warnings = check_recipe_constraints(recipe, household)

        assert is_safe is False  # Shrimp is shellfish

    def test_case_insensitive_matching(self):
        """Constraint matching should be case-insensitive."""
        from app.services.recipe_filter_service import check_recipe_constraints

        recipe = create_test_recipe(ingredients=["PEANUT BUTTER", "bread"])
        household = create_test_household(allergies=["peanuts"])

        is_safe, warnings = check_recipe_constraints(recipe, household)

        assert is_safe is False

    def test_partial_match_ingredients(self):
        """Allergen should match as substring in ingredients."""
        from app.services.recipe_filter_service import check_recipe_constraints

        recipe = create_test_recipe(ingredients=["2 tbsp peanut oil", "vegetables"])
        household = create_test_household(allergies=["peanut"])

        is_safe, warnings = check_recipe_constraints(recipe, household)

        assert is_safe is False


# ===== Tests for filter_recipes_by_meal_type =====

class TestFilterRecipesByMealType:
    """Tests for meal type filtering."""

    def test_filter_dinner_recipes(self):
        """Filter returns only recipes tagged for the meal type."""
        from app.services.recipe_filter_service import filter_recipes_by_meal_type

        recipes = [
            create_test_recipe("r1", "Breakfast Pancakes", tags=["breakfast", "quick"]),
            create_test_recipe("r2", "Dinner Chicken", tags=["dinner", "protein"]),
            create_test_recipe("r3", "Lunch Salad", tags=["lunch", "healthy"]),
            create_test_recipe("r4", "Dinner Pasta", tags=["dinner", "italian"]),
        ]

        filtered = filter_recipes_by_meal_type(recipes, "dinner")

        assert len(filtered) == 2
        assert all("dinner" in r.tags for r in filtered)

    def test_filter_breakfast_recipes(self):
        """Filter returns breakfast recipes."""
        from app.services.recipe_filter_service import filter_recipes_by_meal_type

        recipes = [
            create_test_recipe("r1", "Breakfast Pancakes", tags=["breakfast"]),
            create_test_recipe("r2", "Dinner Chicken", tags=["dinner"]),
        ]

        filtered = filter_recipes_by_meal_type(recipes, "breakfast")

        assert len(filtered) == 1
        assert filtered[0].title == "Breakfast Pancakes"

    def test_filter_falls_back_to_all_when_no_match(self):
        """Filter returns all recipes when no recipes match meal type (fallback behavior)."""
        from app.services.recipe_filter_service import filter_recipes_by_meal_type

        recipes = [
            create_test_recipe("r1", tags=["dinner"]),
            create_test_recipe("r2", tags=["lunch"]),
        ]

        filtered = filter_recipes_by_meal_type(recipes, "snack")

        # Fallback: returns all recipes when none match the meal type
        assert len(filtered) == 2
        assert filtered == recipes


# ===== Tests for score_recipe_for_swap =====

class TestScoreRecipeForSwap:
    """Tests for recipe scoring."""

    def test_score_without_ratings(self):
        """Recipe without ratings gets base score."""
        from app.services.recipe_filter_service import score_recipe_for_swap

        recipe = create_test_recipe()
        ratings = {}  # No ratings
        household = create_test_household()

        score = score_recipe_for_swap(recipe, ratings, household)

        assert 0.0 <= score <= 1.0

    def test_higher_score_for_liked_recipe(self):
        """Recipe liked by family members gets higher score."""
        from app.services.recipe_filter_service import score_recipe_for_swap

        recipe = create_test_recipe("liked_recipe")
        ratings = {"liked_recipe": {"Adult": "like"}}
        household = create_test_household()

        liked_score = score_recipe_for_swap(recipe, ratings, household)

        # Compare with unrated recipe
        unrated_recipe = create_test_recipe("unrated_recipe")
        unrated_score = score_recipe_for_swap(unrated_recipe, {}, household)

        assert liked_score > unrated_score

    def test_lower_score_for_disliked_recipe(self):
        """Recipe disliked by family members gets lower score."""
        from app.services.recipe_filter_service import score_recipe_for_swap

        recipe = create_test_recipe("disliked_recipe")
        ratings = {"disliked_recipe": {"Adult": "dislike"}}
        household = create_test_household()

        disliked_score = score_recipe_for_swap(recipe, ratings, household)

        # Compare with unrated recipe
        unrated_recipe = create_test_recipe("unrated_recipe")
        unrated_score = score_recipe_for_swap(unrated_recipe, {}, household)

        assert disliked_score < unrated_score


# ===== Tests for get_alternative_recipes =====

class TestGetAlternativeRecipes:
    """Tests for the main alternative recipes function."""

    def test_get_alternatives_filters_by_meal_type(self, temp_data_dir):
        """Alternatives are filtered by meal type."""
        from app.services.recipe_filter_service import get_alternative_recipes
        from app.data.data_manager import save_recipe

        workspace_id = "test-workspace"

        # Save test recipes
        save_recipe(workspace_id, create_test_recipe("dinner1", "Dinner 1", tags=["dinner"]))
        save_recipe(workspace_id, create_test_recipe("dinner2", "Dinner 2", tags=["dinner"]))
        save_recipe(workspace_id, create_test_recipe("breakfast1", "Breakfast 1", tags=["breakfast"]))

        alternatives = get_alternative_recipes(
            workspace_id=workspace_id,
            meal_type="dinner",
            exclude_recipe_ids=[],
            limit=10
        )

        assert len(alternatives) == 2
        assert all(alt.recipe.id.startswith("dinner") for alt in alternatives)

    def test_get_alternatives_excludes_specified_ids(self, temp_data_dir):
        """Specified recipe IDs are excluded from alternatives."""
        from app.services.recipe_filter_service import get_alternative_recipes
        from app.data.data_manager import save_recipe

        workspace_id = "test-workspace"

        # Save test recipes
        save_recipe(workspace_id, create_test_recipe("recipe1", tags=["dinner"]))
        save_recipe(workspace_id, create_test_recipe("recipe2", tags=["dinner"]))
        save_recipe(workspace_id, create_test_recipe("recipe3", tags=["dinner"]))

        alternatives = get_alternative_recipes(
            workspace_id=workspace_id,
            meal_type="dinner",
            exclude_recipe_ids=["recipe1", "recipe2"],
            limit=10
        )

        assert len(alternatives) == 1
        assert alternatives[0].recipe.id == "recipe3"

    def test_get_alternatives_respects_limit(self, temp_data_dir):
        """Results are limited to specified count."""
        from app.services.recipe_filter_service import get_alternative_recipes
        from app.data.data_manager import save_recipe

        workspace_id = "test-workspace"

        # Save many test recipes
        for i in range(10):
            save_recipe(workspace_id, create_test_recipe(f"recipe{i}", tags=["dinner"]))

        alternatives = get_alternative_recipes(
            workspace_id=workspace_id,
            meal_type="dinner",
            exclude_recipe_ids=[],
            limit=3
        )

        assert len(alternatives) == 3

    def test_get_alternatives_includes_constraint_warnings(self, temp_data_dir):
        """Alternatives include warnings for household constraints."""
        from app.services.recipe_filter_service import get_alternative_recipes
        from app.data.data_manager import save_recipe, save_household_profile

        workspace_id = "test-workspace"

        # Save household with dislike
        household = create_test_household(dislikes=["cilantro"])
        save_household_profile(workspace_id, household)

        # Save recipe with disliked ingredient
        save_recipe(workspace_id, create_test_recipe(
            "cilantro_dish",
            "Cilantro Rice",
            ingredients=["rice", "cilantro", "lime"],
            tags=["dinner"]
        ))

        alternatives = get_alternative_recipes(
            workspace_id=workspace_id,
            meal_type="dinner",
            exclude_recipe_ids=[],
            limit=10
        )

        assert len(alternatives) == 1
        assert len(alternatives[0].warnings) >= 1

    def test_get_alternatives_excludes_allergy_recipes(self, temp_data_dir):
        """Recipes with allergens are excluded (is_safe=False)."""
        from app.services.recipe_filter_service import get_alternative_recipes
        from app.data.data_manager import save_recipe, save_household_profile

        workspace_id = "test-workspace"

        # Save household with allergy
        household = create_test_household(allergies=["peanuts"])
        save_household_profile(workspace_id, household)

        # Save recipes - one safe, one with allergen
        save_recipe(workspace_id, create_test_recipe(
            "safe_recipe",
            "Safe Chicken",
            ingredients=["chicken", "rice"],
            tags=["dinner"]
        ))
        save_recipe(workspace_id, create_test_recipe(
            "unsafe_recipe",
            "Peanut Noodles",
            ingredients=["noodles", "peanut sauce"],
            tags=["dinner"]
        ))

        alternatives = get_alternative_recipes(
            workspace_id=workspace_id,
            meal_type="dinner",
            exclude_recipe_ids=[],
            limit=10
        )

        # Only safe recipe should be returned
        assert len(alternatives) == 1
        assert alternatives[0].recipe.id == "safe_recipe"

    def test_get_alternatives_sorted_by_score(self, temp_data_dir):
        """Alternatives are sorted by score (highest first)."""
        from app.services.recipe_filter_service import get_alternative_recipes
        from app.data.data_manager import save_recipe, save_recipe_rating, save_household_profile

        workspace_id = "test-workspace"

        # Save household profile with member "Adult" (needed for rating matching)
        household = create_test_household()
        save_household_profile(workspace_id, household)

        # Save recipes
        save_recipe(workspace_id, create_test_recipe("liked", tags=["dinner"]))
        save_recipe(workspace_id, create_test_recipe("unrated", tags=["dinner"]))
        save_recipe(workspace_id, create_test_recipe("disliked", tags=["dinner"]))

        # Add ratings
        save_recipe_rating(workspace_id, "liked", "Adult", "like")
        save_recipe_rating(workspace_id, "disliked", "Adult", "dislike")

        alternatives = get_alternative_recipes(
            workspace_id=workspace_id,
            meal_type="dinner",
            exclude_recipe_ids=[],
            limit=10
        )

        # Should be sorted by score: liked > unrated > disliked
        assert alternatives[0].recipe.id == "liked"
        assert alternatives[-1].recipe.id == "disliked"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
