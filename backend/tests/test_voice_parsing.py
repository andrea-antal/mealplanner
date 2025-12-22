"""
Test contracts for voice parsing functionality.

Following TDD principles:
1. Write tests FIRST (they will fail)
2. Implement code to make them pass
3. Refactor while keeping tests green

These tests define the expected behavior before implementation.
"""
import pytest
from datetime import date, timedelta


class TestVoiceParsingContracts:
    """
    API contract tests - these define the expected behavior.

    These tests will FAIL initially because the functions don't exist yet.
    That's expected and proves the tests are valid.
    """

    @pytest.mark.asyncio
    async def test_parse_voice_returns_tuple(self, temp_data_dir):
        """Contract: parse_voice_to_groceries returns (items, warnings) tuple"""
        # Import will fail initially - that's expected
        from app.services.claude_service import parse_voice_to_groceries

        result = await parse_voice_to_groceries("test", [])

        # Verify contract: returns a tuple
        assert isinstance(result, tuple), "Should return a tuple"
        assert len(result) == 2, "Tuple should have 2 elements"

        items, warnings = result
        assert isinstance(items, list), "First element should be list of items"
        assert isinstance(warnings, list), "Second element should be list of warnings"

    @pytest.mark.asyncio
    async def test_parse_voice_rejects_empty_input(self, temp_data_dir):
        """Contract: Empty transcription raises ValueError"""
        from app.services.claude_service import parse_voice_to_groceries

        with pytest.raises(ValueError, match="Transcription cannot be empty"):
            await parse_voice_to_groceries("", [])

        with pytest.raises(ValueError, match="Transcription cannot be empty"):
            await parse_voice_to_groceries("   ", [])

    @pytest.mark.asyncio
    async def test_parse_voice_accepts_existing_groceries(self, temp_data_dir):
        """Contract: Function accepts list of existing grocery names for duplicate detection"""
        from app.services.claude_service import parse_voice_to_groceries

        # Should not raise an error
        result = await parse_voice_to_groceries("test", ["milk", "eggs"])
        assert isinstance(result, tuple)


class TestVoiceParsingServiceMocked:
    """
    Service tests with mocked Claude API.

    These verify the service logic WITHOUT calling the real Claude API.
    """

    @pytest.mark.asyncio
    async def test_parse_simple_items_mocked(self, temp_data_dir):
        """Test parsing simple grocery list with mocked Claude response"""
        from unittest.mock import patch
        import json

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
            # Setup mock to return our test data
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': json.dumps(mock_response)})()
            ]

            from app.services.claude_service import parse_voice_to_groceries
            items, warnings = await parse_voice_to_groceries("chicken and milk", [])

            # Verify results
            assert len(items) == 2, "Should parse 2 items"
            assert items[0]["name"] == "chicken"
            assert items[1]["name"] == "milk"
            assert len(warnings) == 0, "Should have no warnings"

            # Verify API was called
            mock_claude.assert_called_once()

    @pytest.mark.asyncio
    async def test_parse_with_dates(self, temp_data_dir):
        """Test parsing items with relative date phrases"""
        from unittest.mock import patch
        import json

        yesterday = (date.today() - timedelta(days=1)).isoformat()
        tomorrow = (date.today() + timedelta(days=1)).isoformat()

        mock_response = {
            "proposed_items": [
                {
                    "name": "chicken",
                    "date_added": date.today().isoformat(),
                    "purchase_date": yesterday,
                    "expiry_date": tomorrow,
                    "expiry_type": "expiry_date",
                    "confidence": "high",
                    "notes": "Inferred dates from 'yesterday' and 'tomorrow'"
                }
            ],
            "warnings": []
        }

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': json.dumps(mock_response)})()
            ]

            from app.services.claude_service import parse_voice_to_groceries
            items, warnings = await parse_voice_to_groceries(
                "Bought chicken yesterday, expires tomorrow",
                []
            )

            assert len(items) == 1
            assert items[0]["purchase_date"] == yesterday
            assert items[0]["expiry_date"] == tomorrow
            assert items[0]["expiry_type"] == "expiry_date"

    @pytest.mark.asyncio
    async def test_parse_handles_claude_json_markdown(self, temp_data_dir):
        """Test parsing when Claude wraps JSON in markdown code blocks"""
        from unittest.mock import patch
        import json

        mock_response = {"proposed_items": [], "warnings": []}

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            # Claude often wraps JSON in ```json code blocks
            mock_claude.return_value.content = [
                type('obj', (object,), {
                    'text': f'```json\n{json.dumps(mock_response)}\n```'
                })()
            ]

            from app.services.claude_service import parse_voice_to_groceries
            items, warnings = await parse_voice_to_groceries("test", [])

            assert isinstance(items, list)
            assert isinstance(warnings, list)

    @pytest.mark.asyncio
    async def test_parse_handles_malformed_json(self, temp_data_dir):
        """Test error handling for malformed Claude response"""
        from unittest.mock import patch

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': 'NOT VALID JSON'})()
            ]

            from app.services.claude_service import parse_voice_to_groceries

            with pytest.raises(ValueError, match="Failed to parse"):
                await parse_voice_to_groceries("test", [])

    @pytest.mark.asyncio
    async def test_parse_propagates_connection_errors(self, temp_data_dir):
        """Test that connection errors are properly raised as ConnectionError"""
        from unittest.mock import patch

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.side_effect = Exception("Connection refused")

            from app.services.claude_service import parse_voice_to_groceries

            with pytest.raises(ConnectionError):
                await parse_voice_to_groceries("test", [])

    @pytest.mark.asyncio
    async def test_duplicate_detection(self, temp_data_dir):
        """Test duplicate warning when item already exists"""
        from unittest.mock import patch
        import json

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

            from app.services.claude_service import parse_voice_to_groceries
            items, warnings = await parse_voice_to_groceries(
                "Milk",
                ["milk", "eggs"]  # milk already exists
            )

            assert len(warnings) >= 1
            assert any("duplicate" in w.lower() for w in warnings)

    @pytest.mark.asyncio
    async def test_confidence_scores(self, temp_data_dir):
        """Test that confidence scores are assigned correctly"""
        from unittest.mock import patch
        import json

        mock_response = {
            "proposed_items": [
                {
                    "name": "chicken",
                    "confidence": "high",
                    "date_added": date.today().isoformat()
                },
                {
                    "name": "something vague",
                    "confidence": "low",
                    "date_added": date.today().isoformat()
                }
            ],
            "warnings": []
        }

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': json.dumps(mock_response)})()
            ]

            from app.services.claude_service import parse_voice_to_groceries
            items, _ = await parse_voice_to_groceries(
                "Chicken and something vague",
                []
            )

            assert items[0]["confidence"] == "high"
            assert items[1]["confidence"] == "low"
