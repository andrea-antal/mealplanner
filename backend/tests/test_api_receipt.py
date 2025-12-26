"""API endpoint integration tests for receipt OCR"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
import json


class TestReceiptParsingEndpoints:
    """Test actual HTTP endpoints"""

    def test_parse_receipt_endpoint_success(self, client, temp_data_dir):
        """Test successful receipt parsing via API"""
        test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="

        # Mock the service to avoid real API call
        with patch('app.routers.groceries.parse_receipt_to_groceries') as mock_parse:
            mock_parse.return_value = (
                [{"name": "milk", "confidence": "high", "purchase_date": "2025-12-20"}],
                []
            )

            response = client.post("/groceries/parse-receipt", json={
                "image_base64": test_image
            })

            assert response.status_code == 200
            data = response.json()
            assert "proposed_items" in data
            assert "detected_purchase_date" in data
            assert "detected_store" in data
            assert "warnings" in data
            assert len(data["proposed_items"]) == 1

    def test_parse_receipt_endpoint_validation_error(self, client, temp_data_dir):
        """Test endpoint validates empty image"""
        response = client.post("/groceries/parse-receipt", json={
            "image_base64": ""
        })

        assert response.status_code == 422  # Pydantic validation error

    def test_parse_receipt_endpoint_handles_service_error(self, client, temp_data_dir):
        """Test endpoint handles service errors gracefully"""
        test_image = "test_base64"

        with patch('app.routers.groceries.parse_receipt_to_groceries') as mock_parse:
            mock_parse.side_effect = ValueError("Invalid image data")

            response = client.post("/groceries/parse-receipt", json={
                "image_base64": test_image
            })

            assert response.status_code == 400
            assert "Invalid image" in response.json()["detail"]

    def test_parse_receipt_endpoint_handles_connection_error(self, client, temp_data_dir):
        """Test endpoint handles Claude API connection errors"""
        test_image = "test_base64"

        with patch('app.routers.groceries.parse_receipt_to_groceries') as mock_parse:
            mock_parse.side_effect = ConnectionError("API unreachable")

            response = client.post("/groceries/parse-receipt", json={
                "image_base64": test_image
            })

            assert response.status_code == 500
            assert "Claude" in response.json()["detail"]

    def test_parse_receipt_with_metadata(self, client, temp_data_dir):
        """Test endpoint returns full metadata from OCR"""
        test_image = "test_base64"

        with patch('app.routers.groceries.parse_receipt_to_groceries') as mock_parse:
            mock_parse.return_value = (
                [
                    {"name": "milk", "confidence": "high", "purchase_date": "2025-12-20"},
                    {"name": "eggs", "confidence": "medium", "purchase_date": "2025-12-20"}
                ],
                ["Could not read item on line 5"]
            )

            # Mock getting detected date/store from service (simplified for test)
            response = client.post("/groceries/parse-receipt", json={
                "image_base64": test_image
            })

            assert response.status_code == 200
            data = response.json()
            assert len(data["proposed_items"]) == 2
            assert len(data["warnings"]) == 1

    def test_batch_add_still_works_from_phase1(self, client, temp_data_dir):
        """Verify Phase 1 batch endpoint still works (regression test)"""
        from datetime import date

        response = client.post("/groceries/batch", json={
            "items": [
                {"name": "milk", "date_added": date.today().isoformat()},
                {"name": "eggs", "date_added": date.today().isoformat()}
            ]
        })

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) >= 2
