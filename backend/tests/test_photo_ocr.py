"""Tests for photo-based recipe OCR - TDD: WRITE TESTS FIRST"""
import pytest
from unittest.mock import patch
import json


# Minimal 1x1 white pixel PNG in base64 (for tests that don't need real images)
MINIMAL_TEST_IMAGE = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="


class TestPhotoOCRModels:
    """Test the new data models for photo OCR"""

    def test_bounding_box_model(self):
        """BoundingBox should have normalized coordinates (0-1)"""
        from app.models.recipe import BoundingBox

        bbox = BoundingBox(x=0.1, y=0.2, width=0.5, height=0.3)
        assert bbox.x == 0.1
        assert bbox.y == 0.2
        assert bbox.width == 0.5
        assert bbox.height == 0.3

    def test_text_region_model(self):
        """TextRegion should contain text, type, confidence, and optional bounding box"""
        from app.models.recipe import TextRegion, BoundingBox

        # Without bounding box
        region = TextRegion(
            text="Chocolate Chip Cookies",
            region_type="title",
            confidence="high"
        )
        assert region.text == "Chocolate Chip Cookies"
        assert region.region_type == "title"
        assert region.confidence == "high"
        assert region.bounding_box is None

        # With bounding box
        region_with_bbox = TextRegion(
            text="2 cups flour",
            region_type="ingredients",
            confidence="medium",
            bounding_box=BoundingBox(x=0.1, y=0.3, width=0.8, height=0.2)
        )
        assert region_with_bbox.bounding_box is not None
        assert region_with_bbox.bounding_box.x == 0.1

    def test_ocr_from_photo_request_model(self):
        """OCRFromPhotoRequest should require image_base64"""
        from app.models.recipe import OCRFromPhotoRequest

        request = OCRFromPhotoRequest(image_base64=MINIMAL_TEST_IMAGE)
        assert request.image_base64 == MINIMAL_TEST_IMAGE

    def test_ocr_from_photo_response_model(self):
        """OCRFromPhotoResponse should contain all expected fields"""
        from app.models.recipe import OCRFromPhotoResponse, TextRegion

        response = OCRFromPhotoResponse(
            raw_text="Chocolate Chip Cookies\n\nIngredients:\n- 2 cups flour",
            text_regions=[
                TextRegion(text="Chocolate Chip Cookies", region_type="title", confidence="high")
            ],
            ocr_confidence="high",
            is_handwritten=False,
            warnings=[]
        )
        assert response.raw_text.startswith("Chocolate")
        assert len(response.text_regions) == 1
        assert response.ocr_confidence == "high"
        assert response.is_handwritten is False
        assert response.warnings == []


class TestPhotoOCRServiceContracts:
    """API contract tests for extract_text_from_recipe_photo - define expected behavior"""

    @pytest.mark.asyncio
    async def test_extract_text_returns_expected_tuple(self, temp_data_dir):
        """Contract: extract_text_from_recipe_photo returns tuple of (raw_text, text_regions, confidence, is_handwritten, warnings)"""
        mock_response = {
            "raw_text": "Test Recipe\n\nIngredients:\n- 1 cup flour",
            "text_regions": [
                {"text": "Test Recipe", "region_type": "title", "confidence": "high"}
            ],
            "ocr_confidence": "high",
            "is_handwritten": False,
            "warnings": []
        }

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': json.dumps(mock_response)})()
            ]

            from app.services.claude_service import extract_text_from_recipe_photo

            result = await extract_text_from_recipe_photo(MINIMAL_TEST_IMAGE)

            assert isinstance(result, tuple)
            assert len(result) == 5
            raw_text, text_regions, confidence, is_handwritten, warnings = result
            assert isinstance(raw_text, str)
            assert isinstance(text_regions, list)
            assert confidence in ("high", "medium", "low")
            assert isinstance(is_handwritten, bool)
            assert isinstance(warnings, list)

    @pytest.mark.asyncio
    async def test_extract_text_rejects_empty_image(self, temp_data_dir):
        """Contract: Empty image raises ValueError"""
        from app.services.claude_service import extract_text_from_recipe_photo

        with pytest.raises(ValueError, match="Image data cannot be empty"):
            await extract_text_from_recipe_photo("")

    @pytest.mark.asyncio
    async def test_extract_text_rejects_whitespace_image(self, temp_data_dir):
        """Contract: Whitespace-only image raises ValueError"""
        from app.services.claude_service import extract_text_from_recipe_photo

        with pytest.raises(ValueError, match="Image data cannot be empty"):
            await extract_text_from_recipe_photo("   ")


class TestPhotoOCRServiceMocked:
    """Test service logic with mocked Claude Vision API"""

    @pytest.mark.asyncio
    async def test_extract_printed_recipe(self, temp_data_dir):
        """Test extracting text from a printed recipe photo"""
        mock_response = {
            "raw_text": """Classic Chocolate Chip Cookies

Prep Time: 15 minutes
Cook Time: 12 minutes
Servings: 24

Ingredients:
- 2 cups all-purpose flour
- 1 cup butter, softened
- 3/4 cup sugar
- 2 eggs
- 1 tsp vanilla
- 2 cups chocolate chips

Instructions:
1. Preheat oven to 350F
2. Cream butter and sugar
3. Add eggs and vanilla
4. Mix in flour
5. Fold in chocolate chips
6. Bake for 10-12 minutes""",
            "text_regions": [
                {
                    "text": "Classic Chocolate Chip Cookies",
                    "region_type": "title",
                    "confidence": "high",
                    "bounding_box": {"x": 0.1, "y": 0.05, "width": 0.8, "height": 0.08}
                },
                {
                    "text": "- 2 cups all-purpose flour\n- 1 cup butter, softened\n- 3/4 cup sugar\n- 2 eggs\n- 1 tsp vanilla\n- 2 cups chocolate chips",
                    "region_type": "ingredients",
                    "confidence": "high",
                    "bounding_box": {"x": 0.1, "y": 0.25, "width": 0.8, "height": 0.3}
                },
                {
                    "text": "1. Preheat oven to 350F\n2. Cream butter and sugar\n3. Add eggs and vanilla\n4. Mix in flour\n5. Fold in chocolate chips\n6. Bake for 10-12 minutes",
                    "region_type": "instructions",
                    "confidence": "high",
                    "bounding_box": {"x": 0.1, "y": 0.6, "width": 0.8, "height": 0.35}
                }
            ],
            "ocr_confidence": "high",
            "is_handwritten": False,
            "warnings": []
        }

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': json.dumps(mock_response)})()
            ]

            from app.services.claude_service import extract_text_from_recipe_photo

            raw_text, text_regions, confidence, is_handwritten, warnings = \
                await extract_text_from_recipe_photo(MINIMAL_TEST_IMAGE)

            assert "Classic Chocolate Chip Cookies" in raw_text
            assert len(text_regions) == 3
            assert confidence == "high"
            assert is_handwritten is False
            assert len(warnings) == 0

            # Verify Claude Vision API was called with image content
            mock_claude.assert_called_once()
            call_args = mock_claude.call_args
            messages = call_args.kwargs.get('messages', call_args[1].get('messages') if len(call_args) > 1 else None)
            assert messages is not None
            assert len(messages) == 1
            content = messages[0]['content']
            # Should have image and text content
            assert len(content) == 2
            assert content[0]['type'] == 'image'
            assert content[1]['type'] == 'text'

    @pytest.mark.asyncio
    async def test_extract_handwritten_recipe(self, temp_data_dir):
        """Test detecting handwritten recipe with medium confidence"""
        mock_response = {
            "raw_text": """Grandmas Apple Pie

Ingredients:
- 6 apples
- 1 cup suger
- cinnamon
- pie crust

Bake at 350 for 45 min""",
            "text_regions": [
                {
                    "text": "Grandmas Apple Pie",
                    "region_type": "title",
                    "confidence": "medium"
                },
                {
                    "text": "- 6 apples\n- 1 cup suger\n- cinnamon\n- pie crust",
                    "region_type": "ingredients",
                    "confidence": "low"
                }
            ],
            "ocr_confidence": "medium",
            "is_handwritten": True,
            "warnings": ["Handwritten text detected - please verify spelling and quantities"]
        }

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': json.dumps(mock_response)})()
            ]

            from app.services.claude_service import extract_text_from_recipe_photo

            raw_text, text_regions, confidence, is_handwritten, warnings = \
                await extract_text_from_recipe_photo(MINIMAL_TEST_IMAGE)

            assert "Grandmas Apple Pie" in raw_text
            assert confidence == "medium"
            assert is_handwritten is True
            assert len(warnings) == 1
            assert "Handwritten" in warnings[0]

    @pytest.mark.asyncio
    async def test_extract_blurry_photo(self, temp_data_dir):
        """Test handling blurry/unclear photo with low confidence"""
        mock_response = {
            "raw_text": "??? Rec???e\n\nIngr???ts:\n- fl???r\n- ???gar",
            "text_regions": [
                {
                    "text": "??? Rec???e",
                    "region_type": "title",
                    "confidence": "low"
                }
            ],
            "ocr_confidence": "low",
            "is_handwritten": False,
            "warnings": [
                "Image quality is poor - text may be inaccurate",
                "Multiple characters could not be recognized"
            ]
        }

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': json.dumps(mock_response)})()
            ]

            from app.services.claude_service import extract_text_from_recipe_photo

            raw_text, text_regions, confidence, is_handwritten, warnings = \
                await extract_text_from_recipe_photo(MINIMAL_TEST_IMAGE)

            assert confidence == "low"
            assert len(warnings) >= 1
            assert any("quality" in w.lower() or "poor" in w.lower() for w in warnings)

    @pytest.mark.asyncio
    async def test_uses_high_accuracy_model(self, temp_data_dir):
        """Test that OCR uses the high-accuracy model (Opus 4.5) by default"""
        mock_response = {
            "raw_text": "Test",
            "text_regions": [],
            "ocr_confidence": "high",
            "is_handwritten": False,
            "warnings": []
        }

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': json.dumps(mock_response)})()
            ]

            from app.services.claude_service import extract_text_from_recipe_photo
            from app.config import settings

            await extract_text_from_recipe_photo(MINIMAL_TEST_IMAGE)

            # Verify Opus 4.5 (HIGH_ACCURACY_MODEL_NAME) is used
            mock_claude.assert_called_once()
            call_kwargs = mock_claude.call_args.kwargs
            assert call_kwargs.get('model') == settings.HIGH_ACCURACY_MODEL_NAME

    @pytest.mark.asyncio
    async def test_uses_low_temperature_for_ocr_accuracy(self, temp_data_dir):
        """Test that OCR uses low temperature for accuracy"""
        mock_response = {
            "raw_text": "Test",
            "text_regions": [],
            "ocr_confidence": "high",
            "is_handwritten": False,
            "warnings": []
        }

        with patch('app.services.claude_service.client.messages.create') as mock_claude:
            mock_claude.return_value.content = [
                type('obj', (object,), {'text': json.dumps(mock_response)})()
            ]

            from app.services.claude_service import extract_text_from_recipe_photo

            await extract_text_from_recipe_photo(MINIMAL_TEST_IMAGE)

            # Temperature should be 0.1 or lower for OCR accuracy
            mock_claude.assert_called_once()
            call_kwargs = mock_claude.call_args.kwargs
            assert call_kwargs.get('temperature', 1.0) <= 0.1
