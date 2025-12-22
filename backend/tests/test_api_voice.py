"""
API endpoint integration tests for voice parsing.

Following TDD: Write tests FIRST, then implement endpoints.
These tests verify the actual HTTP endpoints work correctly.
"""
import pytest
from fastapi.testclient import TestClient
from datetime import date
from unittest.mock import patch
import json


@pytest.fixture
def client(temp_data_dir):
    """FastAPI test client with isolated data directory"""
    from app.main import app
    return TestClient(app)


class TestVoiceParsingEndpoints:
    """Test /groceries/parse-voice endpoint"""

    def test_parse_voice_endpoint_success(self, client, temp_data_dir):
        """Test successful voice parsing via API with mocked Claude"""
        mock_response = {
            "proposed_items": [
                {
                    "name": "chicken",
                    "date_added": date.today().isoformat(),
                    "confidence": "high"
                },
                {
                    "name": "milk",
                    "date_added": date.today().isoformat(),
                    "confidence": "high"
                }
            ],
            "warnings": []
        }

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': json.dumps(mock_response)})()
            ]

            response = client.post("/groceries/parse-voice", json={
                "transcription": "chicken and milk"
            })

            assert response.status_code == 200
            data = response.json()
            assert "proposed_items" in data
            assert "transcription_used" in data
            assert "warnings" in data
            assert len(data["proposed_items"]) == 2
            assert data["transcription_used"] == "chicken and milk"

    def test_parse_voice_endpoint_empty_transcription(self, client, temp_data_dir):
        """Test endpoint rejects empty transcription"""
        response = client.post("/groceries/parse-voice", json={
            "transcription": ""
        })

        # Pydantic validation error for min_length=1
        assert response.status_code == 422

    def test_parse_voice_endpoint_missing_field(self, client, temp_data_dir):
        """Test endpoint requires transcription field"""
        response = client.post("/groceries/parse-voice", json={})

        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    def test_parse_voice_endpoint_whitespace_only(self, client, temp_data_dir):
        """Test endpoint rejects whitespace-only transcription"""
        # Pydantic will accept "   " (passes min_length=1)
        # But service should reject it with ValueError → 400
        response = client.post("/groceries/parse-voice", json={
            "transcription": "   "
        })

        assert response.status_code == 400

    def test_parse_voice_endpoint_with_warnings(self, client, temp_data_dir):
        """Test endpoint returns warnings for duplicates"""
        # First add a grocery item
        client.post("/groceries", json={
            "name": "milk",
            "date_added": date.today().isoformat()
        })

        mock_response = {
            "proposed_items": [
                {
                    "name": "milk",
                    "date_added": date.today().isoformat(),
                    "confidence": "high"
                }
            ],
            "warnings": ["Possible duplicate: 'milk' already in your list"]
        }

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': json.dumps(mock_response)})()
            ]

            response = client.post("/groceries/parse-voice", json={
                "transcription": "milk"
            })

            assert response.status_code == 200
            data = response.json()
            assert len(data["warnings"]) >= 1


class TestBatchAddEndpoints:
    """Test /groceries/batch endpoint"""

    def test_batch_add_endpoint_success(self, client, temp_data_dir):
        """Test batch adding items"""
        response = client.post("/groceries/batch", json={
            "items": [
                {"name": "chicken", "date_added": date.today().isoformat()},
                {"name": "milk", "date_added": date.today().isoformat()}
            ]
        })

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) >= 2

        # Verify items are in the list
        item_names = [item["name"] for item in data["items"]]
        assert "chicken" in item_names
        assert "milk" in item_names

    def test_batch_add_with_dates(self, client, temp_data_dir):
        """Test batch add with expiry dates"""
        # Use unique name to avoid test data conflicts
        unique_name = f"test_dairy_{date.today().day}"

        response = client.post("/groceries/batch", json={
            "items": [
                {
                    "name": unique_name,
                    "date_added": date.today().isoformat(),
                    "expiry_date": "2025-12-25",
                    "expiry_type": "expiry_date"
                }
            ]
        })

        assert response.status_code == 200
        data = response.json()

        # Verify item was added (endpoint returns all items including new one)
        item_names = [item["name"] for item in data["items"]]
        assert unique_name in item_names

    def test_batch_add_handles_duplicates(self, client, temp_data_dir):
        """Test batch add skips duplicates gracefully"""
        # Use unique names to avoid test data conflicts
        unique_dup = f"dup_test_{date.today().day}"
        unique_new = f"new_test_{date.today().day}"

        # Add item first
        client.post("/groceries", json={
            "name": unique_dup,
            "date_added": date.today().isoformat()
        })

        # Get current count
        existing_response = client.get("/groceries")
        existing_count = len(existing_response.json()["items"])

        # Try to batch add duplicate + new item
        response = client.post("/groceries/batch", json={
            "items": [
                {"name": unique_dup, "date_added": date.today().isoformat()},
                {"name": unique_new, "date_added": date.today().isoformat()}
            ]
        })

        assert response.status_code == 200
        data = response.json()

        # Should have existing_count + 1 (only new item added, duplicate skipped)
        assert len(data["items"]) == existing_count + 1

    def test_batch_add_validates_empty_list(self, client, temp_data_dir):
        """Test batch add rejects empty items list"""
        response = client.post("/groceries/batch", json={"items": []})

        # Pydantic validation error for min_length=1
        assert response.status_code == 422

    def test_batch_add_validates_expiry_type(self, client, temp_data_dir):
        """Test batch add validates expiry_type requirement"""
        response = client.post("/groceries/batch", json={
            "items": [
                {
                    "name": "milk",
                    "date_added": date.today().isoformat(),
                    "expiry_date": "2025-12-25"
                    # Missing expiry_type!
                }
            ]
        })

        # FastAPI returns 422 for Pydantic validation errors (standard REST behavior)
        assert response.status_code == 422

    def test_batch_add_requires_items_field(self, client, temp_data_dir):
        """Test batch add requires items field"""
        response = client.post("/groceries/batch", json={})

        assert response.status_code == 422

    def test_batch_add_multiple_items(self, client, temp_data_dir):
        """Test batch add with many items at once"""
        items = [
            {"name": f"item_{i}", "date_added": date.today().isoformat()}
            for i in range(10)
        ]

        response = client.post("/groceries/batch", json={"items": items})

        assert response.status_code == 200
        data = response.json()

        # Should have all 10 items
        item_names = [item["name"] for item in data["items"]]
        for i in range(10):
            assert f"item_{i}" in item_names

    def test_batch_add_case_insensitive_duplicate_detection(self, client, temp_data_dir):
        """Test that duplicate detection is case-insensitive"""
        # Add "Milk" with capital M
        client.post("/groceries", json={
            "name": "Milk",
            "date_added": date.today().isoformat()
        })

        existing_count = len(client.get("/groceries").json()["items"])

        # Try to add "milk" with lowercase m
        response = client.post("/groceries/batch", json={
            "items": [
                {"name": "milk", "date_added": date.today().isoformat()}
            ]
        })

        assert response.status_code == 200
        data = response.json()

        # Should not add duplicate (case-insensitive match)
        assert len(data["items"]) == existing_count
