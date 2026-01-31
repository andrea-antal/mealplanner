"""
API endpoint integration tests for meal plan persistence.

Following TDD: Write tests FIRST, then implement endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from datetime import date, timedelta


@pytest.fixture
def client(temp_data_dir):
    """FastAPI test client with isolated data directory"""
    from app.main import app
    return TestClient(app)


def create_test_meal_plan_data(week_start: date = None) -> dict:
    """Create minimal valid meal plan JSON for testing."""
    if week_start is None:
        week_start = date(2025, 1, 6)

    days = []
    for i in range(7):
        day_date = week_start + timedelta(days=i)
        days.append({
            "date": day_date.isoformat(),
            "meals": [
                {
                    "meal_type": "dinner",
                    "for_who": "everyone",
                    "recipe_id": f"recipe_{i:03d}",
                    "recipe_title": f"Test Recipe {i}",
                    "notes": ""
                }
            ]
        })

    return {
        "week_start_date": week_start.isoformat(),
        "days": days
    }


class TestSaveMealPlanEndpoint:
    """Test POST /meal-plans endpoint"""

    def test_save_meal_plan_success(self, client, temp_data_dir):
        """Test successful meal plan save"""
        meal_plan_data = create_test_meal_plan_data()

        response = client.post(
            "/meal-plans",
            json=meal_plan_data,
            params={"workspace_id": "test-workspace"}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["week_start_date"] == "2025-01-06"
        assert data["id"] == "2025-01-06"
        assert len(data["days"]) == 7

    def test_save_meal_plan_sets_timestamps(self, client, temp_data_dir):
        """Test that save sets created_at and updated_at"""
        meal_plan_data = create_test_meal_plan_data()

        response = client.post(
            "/meal-plans",
            json=meal_plan_data,
            params={"workspace_id": "test-workspace"}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["created_at"] is not None
        assert data["updated_at"] is not None

    def test_save_meal_plan_requires_workspace_id(self, client, temp_data_dir):
        """Test that workspace_id is required"""
        meal_plan_data = create_test_meal_plan_data()

        response = client.post("/meal-plans", json=meal_plan_data)

        assert response.status_code == 422

    def test_save_meal_plan_validates_days(self, client, temp_data_dir):
        """Test that meal plan must have exactly 7 days"""
        meal_plan_data = create_test_meal_plan_data()
        meal_plan_data["days"] = meal_plan_data["days"][:3]  # Only 3 days

        response = client.post(
            "/meal-plans",
            json=meal_plan_data,
            params={"workspace_id": "test-workspace"}
        )

        assert response.status_code == 422


class TestGetMealPlanEndpoint:
    """Test GET /meal-plans/{meal_plan_id} endpoint"""

    def test_get_meal_plan_success(self, client, temp_data_dir):
        """Test successful meal plan retrieval"""
        # First save a meal plan
        meal_plan_data = create_test_meal_plan_data()
        client.post(
            "/meal-plans",
            json=meal_plan_data,
            params={"workspace_id": "test-workspace"}
        )

        # Then retrieve it
        response = client.get(
            "/meal-plans/2025-01-06",
            params={"workspace_id": "test-workspace"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "2025-01-06"
        assert len(data["days"]) == 7

    def test_get_meal_plan_not_found(self, client, temp_data_dir):
        """Test 404 for non-existent meal plan"""
        response = client.get(
            "/meal-plans/nonexistent",
            params={"workspace_id": "test-workspace"}
        )

        assert response.status_code == 404

    def test_get_meal_plan_requires_workspace_id(self, client, temp_data_dir):
        """Test that workspace_id is required"""
        response = client.get("/meal-plans/2025-01-06")

        assert response.status_code == 422

    def test_get_meal_plan_workspace_isolation(self, client, temp_data_dir):
        """Test that meal plans are isolated per workspace"""
        meal_plan_data = create_test_meal_plan_data()

        # Save to workspace-a
        client.post(
            "/meal-plans",
            json=meal_plan_data,
            params={"workspace_id": "workspace-a"}
        )

        # Should not be accessible from workspace-b
        response = client.get(
            "/meal-plans/2025-01-06",
            params={"workspace_id": "workspace-b"}
        )

        assert response.status_code == 404


class TestListMealPlansEndpoint:
    """Test GET /meal-plans endpoint"""

    def test_list_meal_plans_empty(self, client, temp_data_dir):
        """Test listing when no meal plans exist"""
        response = client.get(
            "/meal-plans",
            params={"workspace_id": "test-workspace"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data == []

    def test_list_meal_plans_returns_all(self, client, temp_data_dir):
        """Test listing returns all saved meal plans"""
        # Save multiple meal plans
        for week_offset in range(3):
            week_start = date(2025, 1, 6) + timedelta(weeks=week_offset)
            meal_plan_data = create_test_meal_plan_data(week_start)
            client.post(
                "/meal-plans",
                json=meal_plan_data,
                params={"workspace_id": "test-workspace"}
            )

        response = client.get(
            "/meal-plans",
            params={"workspace_id": "test-workspace"}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

    def test_list_meal_plans_sorted_by_date(self, client, temp_data_dir):
        """Test that list returns meal plans sorted by week_start_date (newest first)"""
        # Save in non-chronological order
        dates = [date(2025, 1, 13), date(2025, 1, 6), date(2025, 1, 20)]
        for week_start in dates:
            meal_plan_data = create_test_meal_plan_data(week_start)
            client.post(
                "/meal-plans",
                json=meal_plan_data,
                params={"workspace_id": "test-workspace"}
            )

        response = client.get(
            "/meal-plans",
            params={"workspace_id": "test-workspace"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data[0]["week_start_date"] == "2025-01-20"
        assert data[1]["week_start_date"] == "2025-01-13"
        assert data[2]["week_start_date"] == "2025-01-06"

    def test_list_meal_plans_requires_workspace_id(self, client, temp_data_dir):
        """Test that workspace_id is required"""
        response = client.get("/meal-plans")

        assert response.status_code == 422


class TestDeleteMealPlanEndpoint:
    """Test DELETE /meal-plans/{meal_plan_id} endpoint"""

    def test_delete_meal_plan_success(self, client, temp_data_dir):
        """Test successful meal plan deletion"""
        # First save a meal plan
        meal_plan_data = create_test_meal_plan_data()
        client.post(
            "/meal-plans",
            json=meal_plan_data,
            params={"workspace_id": "test-workspace"}
        )

        # Delete it
        response = client.delete(
            "/meal-plans/2025-01-06",
            params={"workspace_id": "test-workspace"}
        )

        assert response.status_code == 204

        # Verify it's gone
        get_response = client.get(
            "/meal-plans/2025-01-06",
            params={"workspace_id": "test-workspace"}
        )
        assert get_response.status_code == 404

    def test_delete_meal_plan_not_found(self, client, temp_data_dir):
        """Test 404 when deleting non-existent meal plan"""
        response = client.delete(
            "/meal-plans/nonexistent",
            params={"workspace_id": "test-workspace"}
        )

        assert response.status_code == 404

    def test_delete_meal_plan_requires_workspace_id(self, client, temp_data_dir):
        """Test that workspace_id is required"""
        response = client.delete("/meal-plans/2025-01-06")

        assert response.status_code == 422


class TestSwapMealEndpoint:
    """Test PATCH /meal-plans/{meal_plan_id} endpoint for swapping recipes"""

    def test_swap_meal_success(self, client, temp_data_dir):
        """Test successful recipe swap"""
        workspace_id = "test-workspace"
        meal_plan_data = create_test_meal_plan_data()

        # Save meal plan
        client.post("/meal-plans", json=meal_plan_data, params={"workspace_id": workspace_id})

        # Swap the first meal
        response = client.patch(
            "/meal-plans/2025-01-06",
            json={
                "day_index": 0,
                "meal_index": 0,
                "new_recipe_id": "new_recipe_123",
                "new_recipe_title": "New Delicious Recipe"
            },
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 200
        data = response.json()

        # Verify swap happened
        swapped_meal = data["days"][0]["meals"][0]
        assert swapped_meal["recipe_id"] == "new_recipe_123"
        assert swapped_meal["recipe_title"] == "New Delicious Recipe"

    def test_swap_stores_previous_recipe(self, client, temp_data_dir):
        """Test that swap stores the previous recipe for undo"""
        workspace_id = "test-workspace"
        meal_plan_data = create_test_meal_plan_data()

        # Save meal plan (first meal has recipe_000)
        client.post("/meal-plans", json=meal_plan_data, params={"workspace_id": workspace_id})

        # Swap the first meal
        response = client.patch(
            "/meal-plans/2025-01-06",
            json={
                "day_index": 0,
                "meal_index": 0,
                "new_recipe_id": "new_recipe",
                "new_recipe_title": "New Recipe"
            },
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 200
        data = response.json()

        # Verify previous recipe is stored
        swapped_meal = data["days"][0]["meals"][0]
        assert swapped_meal["previous_recipe_id"] == "recipe_000"
        assert swapped_meal["previous_recipe_title"] == "Test Recipe 0"

    def test_swap_meal_not_found(self, client, temp_data_dir):
        """Test 404 when meal plan doesn't exist"""
        response = client.patch(
            "/meal-plans/nonexistent",
            json={
                "day_index": 0,
                "meal_index": 0,
                "new_recipe_id": "new_recipe",
                "new_recipe_title": "New Recipe"
            },
            params={"workspace_id": "test-workspace"}
        )

        assert response.status_code == 404

    def test_swap_invalid_day_index(self, client, temp_data_dir):
        """Test 400 for invalid day index"""
        workspace_id = "test-workspace"
        meal_plan_data = create_test_meal_plan_data()
        client.post("/meal-plans", json=meal_plan_data, params={"workspace_id": workspace_id})

        response = client.patch(
            "/meal-plans/2025-01-06",
            json={
                "day_index": 99,  # Invalid
                "meal_index": 0,
                "new_recipe_id": "new_recipe",
                "new_recipe_title": "New Recipe"
            },
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 400

    def test_swap_requires_workspace_id(self, client, temp_data_dir):
        """Test that workspace_id is required"""
        response = client.patch(
            "/meal-plans/2025-01-06",
            json={
                "day_index": 0,
                "meal_index": 0,
                "new_recipe_id": "new_recipe",
                "new_recipe_title": "New Recipe"
            }
        )

        assert response.status_code == 422


class TestUndoSwapEndpoint:
    """Test POST /meal-plans/{meal_plan_id}/undo-swap endpoint"""

    def test_undo_swap_success(self, client, temp_data_dir):
        """Test successful undo of a swap"""
        workspace_id = "test-workspace"
        meal_plan_data = create_test_meal_plan_data()

        # Save and then swap
        client.post("/meal-plans", json=meal_plan_data, params={"workspace_id": workspace_id})
        client.patch(
            "/meal-plans/2025-01-06",
            json={
                "day_index": 0,
                "meal_index": 0,
                "new_recipe_id": "new_recipe",
                "new_recipe_title": "New Recipe"
            },
            params={"workspace_id": workspace_id}
        )

        # Undo the swap
        response = client.post(
            "/meal-plans/2025-01-06/undo-swap",
            json={"day_index": 0, "meal_index": 0},
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 200
        data = response.json()

        # Verify original recipe is restored
        restored_meal = data["days"][0]["meals"][0]
        assert restored_meal["recipe_id"] == "recipe_000"
        assert restored_meal["recipe_title"] == "Test Recipe 0"

        # Previous recipe fields should be cleared
        assert restored_meal["previous_recipe_id"] is None
        assert restored_meal["previous_recipe_title"] is None

    def test_undo_swap_no_previous_recipe(self, client, temp_data_dir):
        """Test 400 when there's no previous recipe to restore"""
        workspace_id = "test-workspace"
        meal_plan_data = create_test_meal_plan_data()
        client.post("/meal-plans", json=meal_plan_data, params={"workspace_id": workspace_id})

        # Try to undo without any swap
        response = client.post(
            "/meal-plans/2025-01-06/undo-swap",
            json={"day_index": 0, "meal_index": 0},
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 400

    def test_undo_swap_meal_plan_not_found(self, client, temp_data_dir):
        """Test 404 when meal plan doesn't exist"""
        response = client.post(
            "/meal-plans/nonexistent/undo-swap",
            json={"day_index": 0, "meal_index": 0},
            params={"workspace_id": "test-workspace"}
        )

        assert response.status_code == 404

    def test_undo_swap_requires_workspace_id(self, client, temp_data_dir):
        """Test that workspace_id is required"""
        response = client.post(
            "/meal-plans/2025-01-06/undo-swap",
            json={"day_index": 0, "meal_index": 0}
        )

        assert response.status_code == 422


class TestAlternativesEndpoint:
    """Test POST /meal-plans/alternatives endpoint"""

    def test_get_alternatives_success(self, client, temp_data_dir):
        """Test successful alternatives retrieval"""
        from app.data.data_manager import save_recipe
        from app.models.recipe import Recipe

        workspace_id = "test-workspace"

        # Save test recipes
        recipe = Recipe(
            id="dinner_recipe",
            title="Test Dinner",
            ingredients=["chicken", "rice"],
            instructions="Cook",
            tags=["dinner"],
            prep_time_minutes=10,
            active_cooking_time_minutes=20,
            serves=4
        )
        save_recipe(workspace_id, recipe)

        response = client.post(
            "/meal-plans/alternatives",
            json={"meal_type": "dinner", "exclude_recipe_ids": [], "limit": 10},
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["recipe"]["id"] == "dinner_recipe"
        assert "match_score" in data[0]
        assert "warnings" in data[0]

    def test_get_alternatives_filters_by_meal_type(self, client, temp_data_dir):
        """Test that alternatives are filtered by meal type"""
        from app.data.data_manager import save_recipe
        from app.models.recipe import Recipe

        workspace_id = "test-workspace"

        # Save breakfast and dinner recipes
        save_recipe(workspace_id, Recipe(
            id="breakfast_1", title="Pancakes", ingredients=["flour"],
            instructions="Make", tags=["breakfast"], prep_time_minutes=5,
            active_cooking_time_minutes=10, serves=2
        ))
        save_recipe(workspace_id, Recipe(
            id="dinner_1", title="Chicken", ingredients=["chicken"],
            instructions="Cook", tags=["dinner"], prep_time_minutes=5,
            active_cooking_time_minutes=20, serves=4
        ))

        response = client.post(
            "/meal-plans/alternatives",
            json={"meal_type": "breakfast", "exclude_recipe_ids": [], "limit": 10},
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["recipe"]["id"] == "breakfast_1"

    def test_get_alternatives_requires_workspace_id(self, client, temp_data_dir):
        """Test that workspace_id is required"""
        response = client.post(
            "/meal-plans/alternatives",
            json={"meal_type": "dinner", "exclude_recipe_ids": [], "limit": 10}
        )

        assert response.status_code == 422


class TestReadinessEndpoint:
    """Test GET /meal-plans/readiness endpoint for V1 empty state handling"""

    def test_readiness_no_recipes(self, client, temp_data_dir):
        """Test readiness returns is_ready=false when no recipes exist"""
        response = client.get(
            "/meal-plans/readiness",
            params={"workspace_id": "test-workspace"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 0
        assert data["is_ready"] is False
        assert set(data["missing_meal_types"]) == {"breakfast", "lunch", "dinner"}

    def test_readiness_missing_breakfast(self, client, temp_data_dir):
        """Test readiness detects missing breakfast recipes"""
        from app.data.data_manager import save_recipe
        from app.models.recipe import Recipe

        workspace_id = "test-workspace"

        # Save lunch and dinner recipes only
        save_recipe(workspace_id, Recipe(
            id="lunch_1", title="Lunch Recipe", ingredients=["item"],
            instructions="Cook", meal_types=["lunch"],
            prep_time_minutes=5, active_cooking_time_minutes=10, serves=2
        ))
        save_recipe(workspace_id, Recipe(
            id="dinner_1", title="Dinner Recipe", ingredients=["item"],
            instructions="Cook", meal_types=["dinner"],
            prep_time_minutes=5, active_cooking_time_minutes=20, serves=4
        ))

        response = client.get(
            "/meal-plans/readiness",
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 2
        assert data["is_ready"] is False
        assert data["missing_meal_types"] == ["breakfast"]

    def test_readiness_missing_lunch(self, client, temp_data_dir):
        """Test readiness detects missing lunch recipes"""
        from app.data.data_manager import save_recipe
        from app.models.recipe import Recipe

        workspace_id = "test-workspace"

        # Save breakfast and dinner recipes only
        save_recipe(workspace_id, Recipe(
            id="breakfast_1", title="Breakfast Recipe", ingredients=["item"],
            instructions="Cook", meal_types=["breakfast"],
            prep_time_minutes=5, active_cooking_time_minutes=10, serves=2
        ))
        save_recipe(workspace_id, Recipe(
            id="dinner_1", title="Dinner Recipe", ingredients=["item"],
            instructions="Cook", meal_types=["dinner"],
            prep_time_minutes=5, active_cooking_time_minutes=20, serves=4
        ))

        response = client.get(
            "/meal-plans/readiness",
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 2
        assert data["is_ready"] is False
        assert data["missing_meal_types"] == ["lunch"]

    def test_readiness_missing_dinner(self, client, temp_data_dir):
        """Test readiness detects missing dinner recipes"""
        from app.data.data_manager import save_recipe
        from app.models.recipe import Recipe

        workspace_id = "test-workspace"

        # Save breakfast and lunch recipes only
        save_recipe(workspace_id, Recipe(
            id="breakfast_1", title="Breakfast Recipe", ingredients=["item"],
            instructions="Cook", meal_types=["breakfast"],
            prep_time_minutes=5, active_cooking_time_minutes=10, serves=2
        ))
        save_recipe(workspace_id, Recipe(
            id="lunch_1", title="Lunch Recipe", ingredients=["item"],
            instructions="Cook", meal_types=["lunch"],
            prep_time_minutes=5, active_cooking_time_minutes=20, serves=4
        ))

        response = client.get(
            "/meal-plans/readiness",
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 2
        assert data["is_ready"] is False
        assert data["missing_meal_types"] == ["dinner"]

    def test_readiness_all_meal_types_present(self, client, temp_data_dir):
        """Test readiness returns is_ready=true when all required meal types exist"""
        from app.data.data_manager import save_recipe
        from app.models.recipe import Recipe

        workspace_id = "test-workspace"

        # Save one of each required meal type
        save_recipe(workspace_id, Recipe(
            id="breakfast_1", title="Breakfast Recipe", ingredients=["item"],
            instructions="Cook", meal_types=["breakfast"],
            prep_time_minutes=5, active_cooking_time_minutes=10, serves=2
        ))
        save_recipe(workspace_id, Recipe(
            id="lunch_1", title="Lunch Recipe", ingredients=["item"],
            instructions="Cook", meal_types=["lunch"],
            prep_time_minutes=5, active_cooking_time_minutes=10, serves=2
        ))
        save_recipe(workspace_id, Recipe(
            id="dinner_1", title="Dinner Recipe", ingredients=["item"],
            instructions="Cook", meal_types=["dinner"],
            prep_time_minutes=5, active_cooking_time_minutes=20, serves=4
        ))

        response = client.get(
            "/meal-plans/readiness",
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 3
        assert data["is_ready"] is True
        assert data["missing_meal_types"] == []

    def test_readiness_recipe_with_multiple_meal_types(self, client, temp_data_dir):
        """Test readiness handles recipes with multiple meal_types correctly"""
        from app.data.data_manager import save_recipe
        from app.models.recipe import Recipe

        workspace_id = "test-workspace"

        # One recipe that covers breakfast and lunch
        save_recipe(workspace_id, Recipe(
            id="brunch_1", title="Brunch Recipe", ingredients=["item"],
            instructions="Cook", meal_types=["breakfast", "lunch"],
            prep_time_minutes=5, active_cooking_time_minutes=10, serves=2
        ))
        # One recipe for dinner
        save_recipe(workspace_id, Recipe(
            id="dinner_1", title="Dinner Recipe", ingredients=["item"],
            instructions="Cook", meal_types=["dinner"],
            prep_time_minutes=5, active_cooking_time_minutes=20, serves=4
        ))

        response = client.get(
            "/meal-plans/readiness",
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 2
        assert data["is_ready"] is True
        assert data["counts_by_meal_type"]["breakfast"] == 1
        assert data["counts_by_meal_type"]["lunch"] == 1
        assert data["counts_by_meal_type"]["dinner"] == 1

    def test_readiness_only_side_dishes(self, client, temp_data_dir):
        """Test readiness returns is_ready=false when only side_dish recipes exist"""
        from app.data.data_manager import save_recipe
        from app.models.recipe import Recipe

        workspace_id = "test-workspace"

        # Save only side dishes
        for i in range(5):
            save_recipe(workspace_id, Recipe(
                id=f"side_{i}", title=f"Side Dish {i}", ingredients=["item"],
                instructions="Cook", meal_types=["side_dish"],
                prep_time_minutes=5, active_cooking_time_minutes=10, serves=2
            ))

        response = client.get(
            "/meal-plans/readiness",
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 5
        assert data["is_ready"] is False
        assert set(data["missing_meal_types"]) == {"breakfast", "lunch", "dinner"}
        assert data["counts_by_meal_type"]["side_dish"] == 5

    def test_readiness_workspace_isolation(self, client, temp_data_dir):
        """Test that readiness respects workspace isolation"""
        from app.data.data_manager import save_recipe
        from app.models.recipe import Recipe

        # Save recipes to workspace-a
        save_recipe("workspace-a", Recipe(
            id="breakfast_1", title="Breakfast", ingredients=["item"],
            instructions="Cook", meal_types=["breakfast"],
            prep_time_minutes=5, active_cooking_time_minutes=10, serves=2
        ))
        save_recipe("workspace-a", Recipe(
            id="lunch_1", title="Lunch", ingredients=["item"],
            instructions="Cook", meal_types=["lunch"],
            prep_time_minutes=5, active_cooking_time_minutes=10, serves=2
        ))
        save_recipe("workspace-a", Recipe(
            id="dinner_1", title="Dinner", ingredients=["item"],
            instructions="Cook", meal_types=["dinner"],
            prep_time_minutes=5, active_cooking_time_minutes=10, serves=2
        ))

        # workspace-a should be ready
        response_a = client.get(
            "/meal-plans/readiness",
            params={"workspace_id": "workspace-a"}
        )
        assert response_a.status_code == 200
        assert response_a.json()["is_ready"] is True

        # workspace-b should NOT be ready (no recipes)
        response_b = client.get(
            "/meal-plans/readiness",
            params={"workspace_id": "workspace-b"}
        )
        assert response_b.status_code == 200
        assert response_b.json()["is_ready"] is False
        assert response_b.json()["total_count"] == 0

    def test_readiness_requires_workspace_id(self, client, temp_data_dir):
        """Test that workspace_id is required"""
        response = client.get("/meal-plans/readiness")
        assert response.status_code == 422

    def test_readiness_counts_by_meal_type(self, client, temp_data_dir):
        """Test that counts_by_meal_type returns accurate counts"""
        from app.data.data_manager import save_recipe
        from app.models.recipe import Recipe

        workspace_id = "test-workspace"

        # Save multiple recipes of various types
        for i in range(3):
            save_recipe(workspace_id, Recipe(
                id=f"breakfast_{i}", title=f"Breakfast {i}", ingredients=["item"],
                instructions="Cook", meal_types=["breakfast"],
                prep_time_minutes=5, active_cooking_time_minutes=10, serves=2
            ))
        for i in range(2):
            save_recipe(workspace_id, Recipe(
                id=f"lunch_{i}", title=f"Lunch {i}", ingredients=["item"],
                instructions="Cook", meal_types=["lunch"],
                prep_time_minutes=5, active_cooking_time_minutes=10, serves=2
            ))
        save_recipe(workspace_id, Recipe(
            id="dinner_1", title="Dinner", ingredients=["item"],
            instructions="Cook", meal_types=["dinner"],
            prep_time_minutes=5, active_cooking_time_minutes=10, serves=2
        ))

        response = client.get(
            "/meal-plans/readiness",
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 6
        assert data["counts_by_meal_type"]["breakfast"] == 3
        assert data["counts_by_meal_type"]["lunch"] == 2
        assert data["counts_by_meal_type"]["dinner"] == 1
        assert data["counts_by_meal_type"]["snack"] == 0
        assert data["counts_by_meal_type"]["side_dish"] == 0


class TestMoveMealEndpoint:
    """Test POST /meal-plans/{meal_plan_id}/move-meal endpoint for drag-and-drop"""

    def test_move_meal_within_same_day(self, client, temp_data_dir):
        """Test moving a meal to a different position within the same day"""
        workspace_id = "test-workspace"

        # Create meal plan with multiple meals on day 0
        meal_plan_data = create_test_meal_plan_data()
        meal_plan_data["days"][0]["meals"] = [
            {"meal_type": "breakfast", "for_who": "everyone", "recipe_id": "recipe_breakfast", "recipe_title": "Breakfast", "notes": ""},
            {"meal_type": "lunch", "for_who": "everyone", "recipe_id": "recipe_lunch", "recipe_title": "Lunch", "notes": ""},
            {"meal_type": "dinner", "for_who": "everyone", "recipe_id": "recipe_dinner", "recipe_title": "Dinner", "notes": ""},
        ]
        client.post("/meal-plans", json=meal_plan_data, params={"workspace_id": workspace_id})

        # Move dinner (index 2) to position 0 (before breakfast)
        response = client.post(
            "/meal-plans/2025-01-06/move-meal",
            json={
                "source_day_index": 0,
                "source_meal_index": 2,
                "target_day_index": 0,
                "target_meal_index": 0
            },
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 200
        data = response.json()

        # Verify new order: dinner, breakfast, lunch
        meals = data["days"][0]["meals"]
        assert meals[0]["recipe_title"] == "Dinner"
        assert meals[1]["recipe_title"] == "Breakfast"
        assert meals[2]["recipe_title"] == "Lunch"

    def test_move_meal_between_days(self, client, temp_data_dir):
        """Test moving a meal from one day to another"""
        workspace_id = "test-workspace"

        meal_plan_data = create_test_meal_plan_data()
        # Day 0 has one meal, day 1 has one meal
        meal_plan_data["days"][0]["meals"] = [
            {"meal_type": "dinner", "for_who": "everyone", "recipe_id": "recipe_monday", "recipe_title": "Monday Dinner", "notes": ""}
        ]
        meal_plan_data["days"][1]["meals"] = [
            {"meal_type": "dinner", "for_who": "everyone", "recipe_id": "recipe_tuesday", "recipe_title": "Tuesday Dinner", "notes": ""}
        ]
        client.post("/meal-plans", json=meal_plan_data, params={"workspace_id": workspace_id})

        # Move Monday's dinner to Tuesday (at position 0, before Tuesday's dinner)
        response = client.post(
            "/meal-plans/2025-01-06/move-meal",
            json={
                "source_day_index": 0,
                "source_meal_index": 0,
                "target_day_index": 1,
                "target_meal_index": 0
            },
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 200
        data = response.json()

        # Day 0 should now be empty (or have minimum placeholder)
        assert len(data["days"][0]["meals"]) == 0 or data["days"][0]["meals"][0]["recipe_id"] is None

        # Day 1 should have Monday's dinner first, then Tuesday's
        tuesday_meals = data["days"][1]["meals"]
        assert len(tuesday_meals) == 2
        assert tuesday_meals[0]["recipe_title"] == "Monday Dinner"
        assert tuesday_meals[1]["recipe_title"] == "Tuesday Dinner"

    def test_move_meal_invalid_source_day(self, client, temp_data_dir):
        """Test 400 for invalid source day index"""
        workspace_id = "test-workspace"
        meal_plan_data = create_test_meal_plan_data()
        client.post("/meal-plans", json=meal_plan_data, params={"workspace_id": workspace_id})

        response = client.post(
            "/meal-plans/2025-01-06/move-meal",
            json={
                "source_day_index": 99,  # Invalid
                "source_meal_index": 0,
                "target_day_index": 0,
                "target_meal_index": 0
            },
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 400

    def test_move_meal_invalid_source_meal(self, client, temp_data_dir):
        """Test 400 for invalid source meal index"""
        workspace_id = "test-workspace"
        meal_plan_data = create_test_meal_plan_data()
        client.post("/meal-plans", json=meal_plan_data, params={"workspace_id": workspace_id})

        response = client.post(
            "/meal-plans/2025-01-06/move-meal",
            json={
                "source_day_index": 0,
                "source_meal_index": 99,  # Invalid
                "target_day_index": 0,
                "target_meal_index": 0
            },
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 400

    def test_move_meal_invalid_target_day(self, client, temp_data_dir):
        """Test 400 for invalid target day index"""
        workspace_id = "test-workspace"
        meal_plan_data = create_test_meal_plan_data()
        client.post("/meal-plans", json=meal_plan_data, params={"workspace_id": workspace_id})

        response = client.post(
            "/meal-plans/2025-01-06/move-meal",
            json={
                "source_day_index": 0,
                "source_meal_index": 0,
                "target_day_index": 99,  # Invalid
                "target_meal_index": 0
            },
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 400

    def test_move_meal_not_found(self, client, temp_data_dir):
        """Test 404 when meal plan doesn't exist"""
        response = client.post(
            "/meal-plans/nonexistent/move-meal",
            json={
                "source_day_index": 0,
                "source_meal_index": 0,
                "target_day_index": 1,
                "target_meal_index": 0
            },
            params={"workspace_id": "test-workspace"}
        )

        assert response.status_code == 404

    def test_move_meal_requires_workspace_id(self, client, temp_data_dir):
        """Test that workspace_id is required"""
        response = client.post(
            "/meal-plans/2025-01-06/move-meal",
            json={
                "source_day_index": 0,
                "source_meal_index": 0,
                "target_day_index": 1,
                "target_meal_index": 0
            }
        )

        assert response.status_code == 422


class TestAddMealEndpoint:
    """Test POST /meal-plans/{meal_plan_id}/add-meal endpoint for manual recipe addition"""

    def test_add_meal_success(self, client, temp_data_dir):
        """Test successfully adding a meal from recipe library"""
        workspace_id = "test-workspace"
        meal_plan_data = create_test_meal_plan_data()
        client.post("/meal-plans", json=meal_plan_data, params={"workspace_id": workspace_id})

        # Add a new lunch to day 0
        response = client.post(
            "/meal-plans/2025-01-06/add-meal",
            json={
                "day_index": 0,
                "meal_type": "lunch",
                "recipe_id": "library_recipe_001",
                "recipe_title": "Chicken Salad from Library",
                "for_who": "everyone"
            },
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 200
        data = response.json()

        # Verify meal was added
        day_meals = data["days"][0]["meals"]
        added_meal = next((m for m in day_meals if m["recipe_id"] == "library_recipe_001"), None)
        assert added_meal is not None
        assert added_meal["meal_type"] == "lunch"
        assert added_meal["recipe_title"] == "Chicken Salad from Library"
        assert added_meal["for_who"] == "everyone"

    def test_add_meal_with_notes(self, client, temp_data_dir):
        """Test adding a meal with notes"""
        workspace_id = "test-workspace"
        meal_plan_data = create_test_meal_plan_data()
        client.post("/meal-plans", json=meal_plan_data, params={"workspace_id": workspace_id})

        response = client.post(
            "/meal-plans/2025-01-06/add-meal",
            json={
                "day_index": 0,
                "meal_type": "lunch",
                "recipe_id": "recipe_123",
                "recipe_title": "Test Recipe",
                "for_who": "Nathan",
                "notes": "for daycare"
            },
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 200
        data = response.json()

        day_meals = data["days"][0]["meals"]
        added_meal = next((m for m in day_meals if m["recipe_id"] == "recipe_123"), None)
        assert added_meal is not None
        assert added_meal["notes"] == "for daycare"
        assert added_meal["for_who"] == "Nathan"

    def test_add_meal_with_is_daycare(self, client, temp_data_dir):
        """Test adding a daycare meal with is_daycare flag"""
        workspace_id = "test-workspace"
        meal_plan_data = create_test_meal_plan_data()
        client.post("/meal-plans", json=meal_plan_data, params={"workspace_id": workspace_id})

        response = client.post(
            "/meal-plans/2025-01-06/add-meal",
            json={
                "day_index": 0,
                "meal_type": "lunch",
                "recipe_id": "daycare_recipe",
                "recipe_title": "Daycare Lunch",
                "for_who": "Nathan",
                "is_daycare": True
            },
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 200
        data = response.json()

        day_meals = data["days"][0]["meals"]
        added_meal = next((m for m in day_meals if m["recipe_id"] == "daycare_recipe"), None)
        assert added_meal is not None
        assert added_meal["is_daycare"] is True

    def test_add_meal_invalid_day_index(self, client, temp_data_dir):
        """Test 400 for invalid day index"""
        workspace_id = "test-workspace"
        meal_plan_data = create_test_meal_plan_data()
        client.post("/meal-plans", json=meal_plan_data, params={"workspace_id": workspace_id})

        response = client.post(
            "/meal-plans/2025-01-06/add-meal",
            json={
                "day_index": 99,  # Invalid
                "meal_type": "lunch",
                "recipe_id": "recipe_123",
                "recipe_title": "Test Recipe",
                "for_who": "everyone"
            },
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 400

    def test_add_meal_not_found(self, client, temp_data_dir):
        """Test 404 when meal plan doesn't exist"""
        response = client.post(
            "/meal-plans/nonexistent/add-meal",
            json={
                "day_index": 0,
                "meal_type": "lunch",
                "recipe_id": "recipe_123",
                "recipe_title": "Test Recipe",
                "for_who": "everyone"
            },
            params={"workspace_id": "test-workspace"}
        )

        assert response.status_code == 404

    def test_add_meal_requires_workspace_id(self, client, temp_data_dir):
        """Test that workspace_id is required"""
        response = client.post(
            "/meal-plans/2025-01-06/add-meal",
            json={
                "day_index": 0,
                "meal_type": "lunch",
                "recipe_id": "recipe_123",
                "recipe_title": "Test Recipe",
                "for_who": "everyone"
            }
        )

        assert response.status_code == 422

    def test_add_meal_requires_recipe_title(self, client, temp_data_dir):
        """Test that recipe_title is required"""
        workspace_id = "test-workspace"
        meal_plan_data = create_test_meal_plan_data()
        client.post("/meal-plans", json=meal_plan_data, params={"workspace_id": workspace_id})

        response = client.post(
            "/meal-plans/2025-01-06/add-meal",
            json={
                "day_index": 0,
                "meal_type": "lunch",
                "recipe_id": "recipe_123",
                "for_who": "everyone"
                # Missing recipe_title
            },
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 422


class TestDeleteMealEndpoint:
    """Test DELETE /meal-plans/{meal_plan_id}/delete-meal endpoint"""

    def test_delete_meal_success(self, client, temp_data_dir):
        """Test successfully deleting a meal from a day"""
        workspace_id = "test-workspace"

        # Create meal plan with multiple meals on day 0
        meal_plan_data = create_test_meal_plan_data()
        meal_plan_data["days"][0]["meals"] = [
            {"meal_type": "breakfast", "for_who": "everyone", "recipe_id": "recipe_breakfast", "recipe_title": "Breakfast", "notes": ""},
            {"meal_type": "lunch", "for_who": "everyone", "recipe_id": "recipe_lunch", "recipe_title": "Lunch", "notes": ""},
            {"meal_type": "dinner", "for_who": "everyone", "recipe_id": "recipe_dinner", "recipe_title": "Dinner", "notes": ""},
        ]
        client.post("/meal-plans", json=meal_plan_data, params={"workspace_id": workspace_id})

        # Delete lunch (index 1)
        response = client.post(
            "/meal-plans/2025-01-06/delete-meal",
            json={
                "day_index": 0,
                "meal_index": 1
            },
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 200
        data = response.json()

        # Verify lunch was removed
        meals = data["days"][0]["meals"]
        assert len(meals) == 2
        assert meals[0]["recipe_title"] == "Breakfast"
        assert meals[1]["recipe_title"] == "Dinner"

    def test_delete_meal_invalid_day_index(self, client, temp_data_dir):
        """Test 400 for invalid day index"""
        workspace_id = "test-workspace"
        meal_plan_data = create_test_meal_plan_data()
        client.post("/meal-plans", json=meal_plan_data, params={"workspace_id": workspace_id})

        response = client.post(
            "/meal-plans/2025-01-06/delete-meal",
            json={
                "day_index": 99,
                "meal_index": 0
            },
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 400

    def test_delete_meal_invalid_meal_index(self, client, temp_data_dir):
        """Test 400 for invalid meal index"""
        workspace_id = "test-workspace"
        meal_plan_data = create_test_meal_plan_data()
        client.post("/meal-plans", json=meal_plan_data, params={"workspace_id": workspace_id})

        response = client.post(
            "/meal-plans/2025-01-06/delete-meal",
            json={
                "day_index": 0,
                "meal_index": 99
            },
            params={"workspace_id": workspace_id}
        )

        assert response.status_code == 400

    def test_delete_meal_not_found(self, client, temp_data_dir):
        """Test 404 when meal plan doesn't exist"""
        response = client.post(
            "/meal-plans/nonexistent/delete-meal",
            json={
                "day_index": 0,
                "meal_index": 0
            },
            params={"workspace_id": "test-workspace"}
        )

        assert response.status_code == 404

    def test_delete_meal_requires_workspace_id(self, client, temp_data_dir):
        """Test that workspace_id is required"""
        response = client.post(
            "/meal-plans/2025-01-06/delete-meal",
            json={
                "day_index": 0,
                "meal_index": 0
            }
        )

        assert response.status_code == 422


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
