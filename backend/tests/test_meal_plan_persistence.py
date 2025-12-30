"""Tests for meal plan persistence in data_manager.py

TDD Phase: RED - These tests should FAIL until we implement the functionality.
"""
import pytest
from datetime import date, datetime
from pathlib import Path

from app.models.meal_plan import MealPlan, Day, Meal


# ===== Helper Functions =====

def create_test_meal_plan(week_start: date = None) -> MealPlan:
    """Create a minimal valid meal plan for testing."""
    if week_start is None:
        week_start = date(2025, 1, 6)  # A Monday

    # Create 7 days with at least one meal each
    days = []
    for i in range(7):
        day_date = date(week_start.year, week_start.month, week_start.day + i)
        meal = Meal(
            meal_type="dinner",
            for_who="everyone",
            recipe_id=f"recipe_{i:03d}",
            recipe_title=f"Test Recipe {i}",
            notes=""
        )
        days.append(Day(date=day_date, meals=[meal]))

    return MealPlan(week_start_date=week_start, days=days)


# ===== Tests for save_meal_plan =====

class TestSaveMealPlan:
    """Tests for save_meal_plan function."""

    def test_save_meal_plan_creates_file(self, temp_data_dir):
        """Save should create a JSON file in the correct location."""
        from app.data.data_manager import save_meal_plan

        workspace_id = "test-workspace"
        meal_plan = create_test_meal_plan()

        # Save the meal plan
        save_meal_plan(workspace_id, meal_plan)

        # Verify file was created
        expected_path = temp_data_dir / workspace_id / "meal_plans" / f"{meal_plan.id}.json"
        assert expected_path.exists(), f"Expected file at {expected_path}"

    def test_save_meal_plan_stores_all_fields(self, temp_data_dir):
        """Save should persist all meal plan fields correctly."""
        from app.data.data_manager import save_meal_plan, load_meal_plan

        workspace_id = "test-workspace"
        meal_plan = create_test_meal_plan()

        # Save and reload
        save_meal_plan(workspace_id, meal_plan)
        loaded = load_meal_plan(workspace_id, meal_plan.id)

        # Verify all fields
        assert loaded is not None
        assert loaded.id == meal_plan.id
        assert loaded.week_start_date == meal_plan.week_start_date
        assert len(loaded.days) == 7
        assert loaded.days[0].meals[0].recipe_title == "Test Recipe 0"

    def test_save_meal_plan_overwrites_existing(self, temp_data_dir):
        """Save should overwrite an existing meal plan with same ID."""
        from app.data.data_manager import save_meal_plan, load_meal_plan

        workspace_id = "test-workspace"
        meal_plan = create_test_meal_plan()

        # Save initial version
        save_meal_plan(workspace_id, meal_plan)

        # Modify and save again
        meal_plan.days[0].meals[0].recipe_title = "Updated Recipe"
        save_meal_plan(workspace_id, meal_plan)

        # Load and verify update
        loaded = load_meal_plan(workspace_id, meal_plan.id)
        assert loaded.days[0].meals[0].recipe_title == "Updated Recipe"

    def test_save_meal_plan_updates_updated_at(self, temp_data_dir):
        """Save should update the updated_at timestamp."""
        from app.data.data_manager import save_meal_plan, load_meal_plan

        workspace_id = "test-workspace"
        meal_plan = create_test_meal_plan()

        # Save initial version
        save_meal_plan(workspace_id, meal_plan)
        loaded1 = load_meal_plan(workspace_id, meal_plan.id)
        first_updated = loaded1.updated_at

        # Wait briefly and save again
        import time
        time.sleep(0.01)
        save_meal_plan(workspace_id, meal_plan)
        loaded2 = load_meal_plan(workspace_id, meal_plan.id)

        # updated_at should have changed
        assert loaded2.updated_at >= first_updated


# ===== Tests for load_meal_plan =====

class TestLoadMealPlan:
    """Tests for load_meal_plan function."""

    def test_load_meal_plan_returns_saved_data(self, temp_data_dir):
        """Load should return a previously saved meal plan."""
        from app.data.data_manager import save_meal_plan, load_meal_plan

        workspace_id = "test-workspace"
        meal_plan = create_test_meal_plan()

        save_meal_plan(workspace_id, meal_plan)
        loaded = load_meal_plan(workspace_id, meal_plan.id)

        assert loaded is not None
        assert isinstance(loaded, MealPlan)
        assert loaded.week_start_date == meal_plan.week_start_date

    def test_load_nonexistent_meal_plan_returns_none(self, temp_data_dir):
        """Load should return None for non-existent meal plan."""
        from app.data.data_manager import load_meal_plan

        workspace_id = "test-workspace"

        loaded = load_meal_plan(workspace_id, "nonexistent-id")
        assert loaded is None

    def test_load_meal_plan_isolates_workspaces(self, temp_data_dir):
        """Meal plans should be isolated per workspace."""
        from app.data.data_manager import save_meal_plan, load_meal_plan

        meal_plan = create_test_meal_plan()

        # Save to workspace-a
        save_meal_plan("workspace-a", meal_plan)

        # Should not be accessible from workspace-b
        loaded = load_meal_plan("workspace-b", meal_plan.id)
        assert loaded is None


# ===== Tests for list_all_meal_plans =====

class TestListAllMealPlans:
    """Tests for list_all_meal_plans function."""

    def test_list_empty_returns_empty_list(self, temp_data_dir):
        """List should return empty list when no meal plans exist."""
        from app.data.data_manager import list_all_meal_plans

        workspace_id = "test-workspace"

        result = list_all_meal_plans(workspace_id)
        assert result == []

    def test_list_returns_all_saved_meal_plans(self, temp_data_dir):
        """List should return all saved meal plans."""
        from app.data.data_manager import save_meal_plan, list_all_meal_plans

        workspace_id = "test-workspace"

        # Save multiple meal plans
        plan1 = create_test_meal_plan(date(2025, 1, 6))
        plan2 = create_test_meal_plan(date(2025, 1, 13))
        plan3 = create_test_meal_plan(date(2025, 1, 20))

        save_meal_plan(workspace_id, plan1)
        save_meal_plan(workspace_id, plan2)
        save_meal_plan(workspace_id, plan3)

        # List all
        result = list_all_meal_plans(workspace_id)

        assert len(result) == 3
        assert all(isinstance(mp, MealPlan) for mp in result)

    def test_list_sorted_by_week_start_date(self, temp_data_dir):
        """List should return meal plans sorted by week_start_date (most recent first)."""
        from app.data.data_manager import save_meal_plan, list_all_meal_plans

        workspace_id = "test-workspace"

        # Save in non-chronological order
        plan_old = create_test_meal_plan(date(2025, 1, 6))
        plan_mid = create_test_meal_plan(date(2025, 1, 13))
        plan_new = create_test_meal_plan(date(2025, 1, 20))

        save_meal_plan(workspace_id, plan_mid)
        save_meal_plan(workspace_id, plan_old)
        save_meal_plan(workspace_id, plan_new)

        # List and verify order
        result = list_all_meal_plans(workspace_id)

        assert result[0].week_start_date == date(2025, 1, 20)
        assert result[1].week_start_date == date(2025, 1, 13)
        assert result[2].week_start_date == date(2025, 1, 6)


# ===== Tests for delete_meal_plan =====

class TestDeleteMealPlan:
    """Tests for delete_meal_plan function."""

    def test_delete_removes_meal_plan(self, temp_data_dir):
        """Delete should remove the meal plan file."""
        from app.data.data_manager import save_meal_plan, load_meal_plan, delete_meal_plan

        workspace_id = "test-workspace"
        meal_plan = create_test_meal_plan()

        # Save and verify exists
        save_meal_plan(workspace_id, meal_plan)
        assert load_meal_plan(workspace_id, meal_plan.id) is not None

        # Delete
        result = delete_meal_plan(workspace_id, meal_plan.id)

        assert result is True
        assert load_meal_plan(workspace_id, meal_plan.id) is None

    def test_delete_nonexistent_returns_false(self, temp_data_dir):
        """Delete should return False for non-existent meal plan."""
        from app.data.data_manager import delete_meal_plan

        workspace_id = "test-workspace"

        result = delete_meal_plan(workspace_id, "nonexistent-id")
        assert result is False


# ===== Tests for Model Fields =====

class TestMealPlanModelFields:
    """Tests for new MealPlan model fields (id, timestamps, previous_recipe)."""

    def test_meal_plan_has_id_field(self):
        """MealPlan should have an id field."""
        meal_plan = create_test_meal_plan()

        # id should exist and default to week_start_date string
        assert hasattr(meal_plan, 'id')
        assert meal_plan.id is not None

    def test_meal_plan_id_defaults_to_week_start_date(self):
        """MealPlan id should default to week_start_date string."""
        meal_plan = create_test_meal_plan(date(2025, 1, 6))

        assert meal_plan.id == "2025-01-06"

    def test_meal_plan_has_created_at_field(self):
        """MealPlan should have a created_at timestamp."""
        meal_plan = create_test_meal_plan()

        assert hasattr(meal_plan, 'created_at')
        assert meal_plan.created_at is not None
        assert isinstance(meal_plan.created_at, datetime)

    def test_meal_plan_has_updated_at_field(self):
        """MealPlan should have an updated_at timestamp."""
        meal_plan = create_test_meal_plan()

        assert hasattr(meal_plan, 'updated_at')

    def test_meal_has_previous_recipe_fields(self):
        """Meal should have previous_recipe_id and previous_recipe_title fields."""
        meal = Meal(
            meal_type="dinner",
            for_who="everyone",
            recipe_id="recipe_001",
            recipe_title="Test Recipe",
            notes=""
        )

        assert hasattr(meal, 'previous_recipe_id')
        assert hasattr(meal, 'previous_recipe_title')
        # Should default to None
        assert meal.previous_recipe_id is None
        assert meal.previous_recipe_title is None

    def test_meal_previous_recipe_fields_persist(self, temp_data_dir):
        """Previous recipe fields should persist through save/load."""
        from app.data.data_manager import save_meal_plan, load_meal_plan

        workspace_id = "test-workspace"
        meal_plan = create_test_meal_plan()

        # Set previous recipe on first meal
        meal_plan.days[0].meals[0].previous_recipe_id = "old_recipe_001"
        meal_plan.days[0].meals[0].previous_recipe_title = "Old Recipe"

        # Save and reload
        save_meal_plan(workspace_id, meal_plan)
        loaded = load_meal_plan(workspace_id, meal_plan.id)

        # Verify previous recipe fields
        assert loaded.days[0].meals[0].previous_recipe_id == "old_recipe_001"
        assert loaded.days[0].meals[0].previous_recipe_title == "Old Recipe"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
