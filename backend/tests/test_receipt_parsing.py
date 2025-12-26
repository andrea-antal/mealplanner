"""Test contracts for receipt OCR parsing - WRITE THESE FIRST"""
import pytest
from datetime import date
import base64
from unittest.mock import patch
import json


class TestReceiptParsingContracts:
    """API contract tests - these define the expected behavior"""

    @pytest.mark.asyncio
    async def test_parse_receipt_returns_tuple(self, temp_data_dir):
        """Contract: parse_receipt_to_groceries returns (items, warnings)"""
        mock_response = {"proposed_items": [], "warnings": []}

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': json.dumps(mock_response)})()
            ]

            from app.services.claude_service import parse_receipt_to_groceries

            # Create minimal test image (1x1 white pixel PNG base64)
            test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="

            result = await parse_receipt_to_groceries(test_image, [])
            assert isinstance(result, tuple)
            assert len(result) == 2
            items, warnings = result
            assert isinstance(items, list)
            assert isinstance(warnings, list)

    @pytest.mark.asyncio
    async def test_parse_receipt_rejects_empty_input(self, temp_data_dir):
        """Contract: Empty image raises ValueError"""
        from app.services.claude_service import parse_receipt_to_groceries

        with pytest.raises(ValueError, match="Image data cannot be empty"):
            await parse_receipt_to_groceries("", [])

    def test_parse_receipt_endpoint_contract(self, client, temp_data_dir):
        """Contract: POST /groceries/parse-receipt accepts image"""
        test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="

        # Mock the service to avoid real API call
        with patch('app.routers.groceries.parse_receipt_to_groceries') as mock_parse:
            mock_parse.return_value = ([], [])

            response = client.post("/groceries/parse-receipt", json={
                "image_base64": test_image
            })

            assert response.status_code == 200


class TestReceiptParsingServiceMocked:
    """Test service logic WITHOUT calling real Claude Vision API"""

    @pytest.mark.asyncio
    async def test_parse_simple_receipt_mocked(self, temp_data_dir):
        """Test parsing with mocked Claude Vision response"""
        mock_response = {
            "proposed_items": [
                {
                    "name": "milk",
                    "purchase_date": "2025-12-20",
                    "confidence": "high",
                    "notes": "2% milk"
                },
                {
                    "name": "chicken breast",
                    "purchase_date": "2025-12-20",
                    "confidence": "high"
                }
            ],
            "detected_purchase_date": "2025-12-20",
            "detected_store": "Whole Foods Market",
            "warnings": []
        }

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            # Setup mock to return our test data
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': json.dumps(mock_response)})()
            ]

            from app.services.claude_service import parse_receipt_to_groceries
            test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="

            items, warnings = await parse_receipt_to_groceries(test_image, [])

            assert len(items) == 2
            assert items[0]["name"] == "milk"
            assert items[0]["purchase_date"] == "2025-12-20"

            # Verify Claude Vision API was called with image content
            mock_claude.assert_called_once()
            call_args = mock_claude.call_args

            # Check that multimodal content was sent (image + text)
            messages = call_args.kwargs.get('messages', [])
            assert len(messages) > 0
            content = messages[0].get('content', [])

            # Should have both image and text parts
            content_types = [item.get('type') for item in content]
            assert 'image' in content_types
            assert 'text' in content_types

    @pytest.mark.asyncio
    async def test_parse_receipt_with_purchase_date(self, temp_data_dir):
        """Test that detected purchase date is propagated to all items"""
        mock_response = {
            "proposed_items": [
                {"name": "milk", "confidence": "high"},
                {"name": "eggs", "confidence": "high"}
            ],
            "detected_purchase_date": "2025-12-15",
            "detected_store": "Safeway",
            "warnings": []
        }

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': json.dumps(mock_response)})()
            ]

            from app.services.claude_service import parse_receipt_to_groceries
            test_image = "test_base64"
            items, warnings = await parse_receipt_to_groceries(test_image, [])

            # All items should have purchase_date from receipt
            assert all(item["purchase_date"] == "2025-12-15" for item in items)

    @pytest.mark.asyncio
    async def test_parse_handles_claude_json_markdown(self, temp_data_dir):
        """Test parsing when Claude wraps JSON in markdown"""
        mock_response = {
            "proposed_items": [],
            "warnings": []
        }

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            # Claude often wraps JSON in ```json code blocks
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': f'```json\n{json.dumps(mock_response)}\n```'})()
            ]

            from app.services.claude_service import parse_receipt_to_groceries
            test_image = "test_base64"
            items, warnings = await parse_receipt_to_groceries(test_image, [])

            assert isinstance(items, list)

    @pytest.mark.asyncio
    async def test_parse_handles_malformed_json(self, temp_data_dir):
        """Test error handling for malformed Claude response"""
        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': 'NOT VALID JSON'})()
            ]

            from app.services.claude_service import parse_receipt_to_groceries

            with pytest.raises(ValueError, match="Failed to parse"):
                await parse_receipt_to_groceries("test_image", [])

    @pytest.mark.asyncio
    async def test_parse_propagates_connection_errors(self, temp_data_dir):
        """Test that connection errors are properly raised"""
        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.side_effect = Exception("Connection refused")

            from app.services.claude_service import parse_receipt_to_groceries

            with pytest.raises(ConnectionError):
                await parse_receipt_to_groceries("test_image", [])

    @pytest.mark.asyncio
    async def test_parse_detects_duplicates(self, temp_data_dir):
        """Test duplicate detection against existing groceries"""
        mock_response = {
            "proposed_items": [
                {"name": "milk", "confidence": "high"},
                {"name": "eggs", "confidence": "high"}
            ],
            "warnings": ["Duplicate item detected: milk already in grocery list"]
        }

        existing_groceries = [{"name": "Milk", "date_added": "2025-12-20"}]  # Case-insensitive

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': json.dumps(mock_response)})()
            ]

            from app.services.claude_service import parse_receipt_to_groceries
            items, warnings = await parse_receipt_to_groceries("test_image", existing_groceries)

            # Should warn about duplicate milk
            assert any("milk" in w.lower() for w in warnings)

    @pytest.mark.asyncio
    async def test_parse_uses_low_temperature(self, temp_data_dir):
        """Test that OCR uses very low temperature for accuracy"""
        mock_response = {"proposed_items": [], "warnings": []}

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': json.dumps(mock_response)})()
            ]

            from app.services.claude_service import parse_receipt_to_groceries
            await parse_receipt_to_groceries("test_image", [])

            # Verify temperature is 0.1 or lower (for OCR accuracy)
            call_args = mock_claude.call_args
            temperature = call_args.kwargs.get('temperature', 1.0)
            assert temperature <= 0.1, "OCR should use very low temperature"
