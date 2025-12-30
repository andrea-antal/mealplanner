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


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
