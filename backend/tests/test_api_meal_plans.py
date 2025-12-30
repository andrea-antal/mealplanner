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


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
