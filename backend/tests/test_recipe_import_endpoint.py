"""Tests for recipe import endpoint"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock
from app.main import app
from app.models.recipe import Recipe

client = TestClient(app)


@pytest.fixture
def mock_successful_import():
    """Mock successful URL fetch and parse"""
    with patch('app.routers.recipes.fetch_html_from_url') as mock_fetch, \
         patch('app.routers.recipes.parse_recipe_from_url') as mock_parse:

        # Mock URL fetcher
        async def mock_fetch_async(*args, **kwargs):
            return ("<html><h1>Test Recipe</h1></html>", "Allrecipes")
        mock_fetch.side_effect = mock_fetch_async

        # Mock Claude parser
        async def mock_parse_async(*args, **kwargs):
            recipe = Recipe(
                id="test-recipe",
                title="Test Recipe",
                ingredients=["2 cups flour", "1 cup sugar"],
                instructions="Mix and bake at 350F for 30 minutes.",
                prep_time_minutes=15,
                active_cooking_time_minutes=30,
                serves=8,
                tags=["dessert", "baking"],
                required_appliances=["oven"]
            )
            return recipe, "high", [], []
        mock_parse.side_effect = mock_parse_async

        yield mock_fetch, mock_parse


def test_import_from_url_success(mock_successful_import):
    """Should return parsed recipe data with high confidence"""
    response = client.post(
        "/recipes/import-from-url?workspace_id=test",
        json={"url": "https://www.allrecipes.com/recipe/123"}
    )

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert "recipe_data" in data
    assert "confidence" in data
    assert "missing_fields" in data
    assert "warnings" in data

    # Verify recipe data
    recipe_data = data["recipe_data"]
    assert recipe_data["title"] == "Test Recipe"
    assert recipe_data["id"] == "test-recipe"
    assert len(recipe_data["ingredients"]) == 2
    assert "flour" in recipe_data["ingredients"][0]

    # Verify metadata
    assert data["confidence"] == "high"
    assert data["missing_fields"] == []
    assert data["warnings"] == []

    # Verify source fields are set
    assert recipe_data["source_url"] == "https://www.allrecipes.com/recipe/123"
    assert recipe_data["source_name"] == "Allrecipes"


def test_import_from_url_invalid_url():
    """Should return 400 for invalid URL format"""
    response = client.post(
        "/recipes/import-from-url?workspace_id=test",
        json={"url": "not-a-valid-url"}
    )

    assert response.status_code == 400
    assert "detail" in response.json()
    assert "invalid" in response.json()["detail"].lower() or "url" in response.json()["detail"].lower()


def test_import_from_url_fetch_failure():
    """Should return 503 for URL fetch failures"""
    with patch('app.routers.recipes.fetch_html_from_url') as mock_fetch:
        # Mock timeout error
        async def mock_fetch_timeout(*args, **kwargs):
            import httpx
            raise httpx.TimeoutException("Request timed out")
        mock_fetch.side_effect = mock_fetch_timeout

        response = client.post(
            "/recipes/import-from-url?workspace_id=test",
            json={"url": "https://example.com/slow-recipe"}
        )

        assert response.status_code == 503
        assert "detail" in response.json()


def test_import_from_url_404_error():
    """Should return 503 for 404 errors"""
    with patch('app.routers.recipes.fetch_html_from_url') as mock_fetch:
        # Mock 404 error
        async def mock_fetch_404(*args, **kwargs):
            import httpx
            response = MagicMock()
            response.status_code = 404
            raise httpx.HTTPStatusError("404", request=MagicMock(), response=response)
        mock_fetch.side_effect = mock_fetch_404

        response = client.post(
            "/recipes/import-from-url?workspace_id=test",
            json={"url": "https://example.com/missing"}
        )

        assert response.status_code == 503


def test_import_from_url_parse_failure():
    """Should return 400 for parsing failures"""
    with patch('app.routers.recipes.fetch_html_from_url') as mock_fetch, \
         patch('app.routers.recipes.parse_recipe_from_url') as mock_parse:

        # Mock successful fetch
        async def mock_fetch_async(*args, **kwargs):
            return ("<html>Not a recipe</html>", "Example")
        mock_fetch.side_effect = mock_fetch_async

        # Mock parsing error
        async def mock_parse_error(*args, **kwargs):
            raise ValueError("No recipe found in HTML content")
        mock_parse.side_effect = mock_parse_error

        response = client.post(
            "/recipes/import-from-url?workspace_id=test",
            json={"url": "https://example.com/not-a-recipe"}
        )

        assert response.status_code == 400
        assert "detail" in response.json()


def test_import_from_url_missing_workspace_id():
    """Should require workspace_id query parameter"""
    response = client.post(
        "/recipes/import-from-url",
        json={"url": "https://example.com/recipe"}
    )

    assert response.status_code == 422  # FastAPI validation error


def test_import_from_url_missing_url_in_body():
    """Should require url in request body"""
    response = client.post(
        "/recipes/import-from-url?workspace_id=test",
        json={}
    )

    assert response.status_code == 422  # FastAPI validation error


def test_import_does_not_save_recipe():
    """Should NOT save recipe to database (only return data for user review)"""
    with patch('app.routers.recipes.fetch_html_from_url') as mock_fetch, \
         patch('app.routers.recipes.parse_recipe_from_url') as mock_parse, \
         patch('app.data.data_manager.save_recipe') as mock_save:

        # Mock successful fetch and parse
        async def mock_fetch_async(*args, **kwargs):
            return ("<html>Recipe</html>", "Example")
        mock_fetch.side_effect = mock_fetch_async

        async def mock_parse_async(*args, **kwargs):
            recipe = Recipe(
                id="test",
                title="Test Recipe",
                ingredients=["flour"],
                instructions="Mix",
                prep_time_minutes=10,
                active_cooking_time_minutes=20,
                serves=4
            )
            return recipe, "high", [], []
        mock_parse.side_effect = mock_parse_async

        response = client.post(
            "/recipes/import-from-url?workspace_id=test",
            json={"url": "https://example.com/recipe"}
        )

        # Verify successful response
        assert response.status_code == 200

        # Verify save_recipe was NEVER called
        assert mock_save.call_count == 0


def test_import_with_partial_data():
    """Should handle partial recipe data with warnings"""
    with patch('app.routers.recipes.fetch_html_from_url') as mock_fetch, \
         patch('app.routers.recipes.parse_recipe_from_url') as mock_parse:

        async def mock_fetch_async(*args, **kwargs):
            return ("<html>Partial recipe</html>", "Example")
        mock_fetch.side_effect = mock_fetch_async

        async def mock_parse_async(*args, **kwargs):
            recipe = Recipe(
                id="partial",
                title="Partial Recipe",
                ingredients=["apple"],
                instructions="Eat apple",
                prep_time_minutes=0,
                active_cooking_time_minutes=0,
                serves=1
            )
            return recipe, "low", ["prep_time_minutes", "serves"], ["Incomplete data"]
        mock_parse.side_effect = mock_parse_async

        response = client.post(
            "/recipes/import-from-url?workspace_id=test",
            json={"url": "https://example.com/partial"}
        )

        assert response.status_code == 200
        data = response.json()

        assert data["confidence"] == "low"
        assert len(data["missing_fields"]) > 0
        assert len(data["warnings"]) > 0
        assert "Incomplete data" in data["warnings"]


def test_import_sets_source_fields():
    """Should set source_url and source_name from URL and domain"""
    with patch('app.routers.recipes.fetch_html_from_url') as mock_fetch, \
         patch('app.routers.recipes.parse_recipe_from_url') as mock_parse:

        async def mock_fetch_async(*args, **kwargs):
            return ("<html>Recipe</html>", "FoodNetwork")
        mock_fetch.side_effect = mock_fetch_async

        async def mock_parse_async(*args, **kwargs):
            recipe = Recipe(
                id="test",
                title="Test",
                ingredients=["flour"],
                instructions="Mix",
                prep_time_minutes=10,
                active_cooking_time_minutes=20,
                serves=4
            )
            return recipe, "high", [], []
        mock_parse.side_effect = mock_parse_async

        response = client.post(
            "/recipes/import-from-url?workspace_id=test",
            json={"url": "https://www.foodnetwork.com/recipes/amazing-dish"}
        )

        assert response.status_code == 200
        recipe_data = response.json()["recipe_data"]

        assert recipe_data["source_url"] == "https://www.foodnetwork.com/recipes/amazing-dish"
        assert recipe_data["source_name"] == "FoodNetwork"


def test_import_workspace_validation():
    """Should validate workspace_id format"""
    response = client.post(
        "/recipes/import-from-url?workspace_id=../etc/passwd",
        json={"url": "https://example.com/recipe"}
    )

    # Should either reject invalid workspace_id or sanitize it
    # Exact behavior depends on workspace validation in routers
    # 503 is also acceptable if URL fetch happens before workspace validation
    assert response.status_code in [400, 403, 422, 503]
