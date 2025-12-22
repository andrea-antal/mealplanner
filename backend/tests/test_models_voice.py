"""
Test Pydantic models for voice parsing.

Following TDD: These tests are written BEFORE implementing the models.
They will FAIL initially, then we implement models to make them PASS.
"""
import pytest
from pydantic import ValidationError
from datetime import date


class TestProposedGroceryItemModel:
    """Test ProposedGroceryItem Pydantic model validation"""

    def test_minimal_proposed_item(self):
        """Minimal valid ProposedGroceryItem with only required fields"""
        from app.models.grocery import ProposedGroceryItem

        item = ProposedGroceryItem(
            name="chicken",
            confidence="high"
        )

        assert item.name == "chicken"
        assert item.confidence == "high"
        # Optional fields should be None
        assert item.date_added is None
        assert item.purchase_date is None
        assert item.expiry_date is None
        assert item.expiry_type is None
        assert item.portion is None
        assert item.notes is None

    def test_proposed_item_with_all_fields(self):
        """ProposedGroceryItem with all fields populated"""
        from app.models.grocery import ProposedGroceryItem

        item = ProposedGroceryItem(
            name="milk",
            date_added=date(2025, 12, 22),
            purchase_date=date(2025, 12, 21),
            expiry_date=date(2025, 12, 25),
            expiry_type="expiry_date",
            portion="1 gallon",
            confidence="high",
            notes="Inferred from voice input"
        )

        assert item.name == "milk"
        assert item.date_added == date(2025, 12, 22)
        assert item.purchase_date == date(2025, 12, 21)
        assert item.expiry_date == date(2025, 12, 25)
        assert item.expiry_type == "expiry_date"
        assert item.portion == "1 gallon"
        assert item.confidence == "high"
        assert item.notes == "Inferred from voice input"

    def test_proposed_item_confidence_values(self):
        """Confidence must be one of: high, medium, low"""
        from app.models.grocery import ProposedGroceryItem

        # Valid values
        ProposedGroceryItem(name="test", confidence="high")
        ProposedGroceryItem(name="test", confidence="medium")
        ProposedGroceryItem(name="test", confidence="low")

        # Invalid value should raise ValidationError
        with pytest.raises(ValidationError):
            ProposedGroceryItem(name="test", confidence="invalid")

    def test_proposed_item_expiry_type_values(self):
        """expiry_type must be 'expiry_date' or 'best_before_date' if set"""
        from app.models.grocery import ProposedGroceryItem

        # Valid values
        item1 = ProposedGroceryItem(
            name="test",
            confidence="high",
            expiry_type="expiry_date",
            expiry_date=date(2025, 12, 25)
        )
        assert item1.expiry_type == "expiry_date"

        item2 = ProposedGroceryItem(
            name="test",
            confidence="high",
            expiry_type="best_before_date",
            expiry_date=date(2025, 12, 25)
        )
        assert item2.expiry_type == "best_before_date"

        # Invalid value should raise ValidationError
        with pytest.raises(ValidationError):
            ProposedGroceryItem(
                name="test",
                confidence="high",
                expiry_type="invalid",
                expiry_date=date(2025, 12, 25)
            )

    def test_proposed_item_requires_expiry_type_when_expiry_date_set(self):
        """
        Validation rule: If expiry_date is provided, expiry_type must also be set.
        This mirrors the existing GroceryItem validation.
        """
        from app.models.grocery import ProposedGroceryItem

        # This should raise ValidationError
        with pytest.raises(ValidationError):
            ProposedGroceryItem(
                name="milk",
                confidence="high",
                expiry_date=date(2025, 12, 25)
                # Missing expiry_type!
            )

    def test_proposed_item_default_confidence(self):
        """Confidence should default to 'high' if not specified"""
        from app.models.grocery import ProposedGroceryItem

        item = ProposedGroceryItem(name="test")
        assert item.confidence == "high"


class TestVoiceParseRequestModel:
    """Test VoiceParseRequest Pydantic model validation"""

    def test_valid_voice_parse_request(self):
        """Valid VoiceParseRequest with transcription"""
        from app.models.grocery import VoiceParseRequest

        request = VoiceParseRequest(transcription="chicken and milk")
        assert request.transcription == "chicken and milk"

    def test_voice_parse_request_rejects_empty(self):
        """VoiceParseRequest should reject empty string"""
        from app.models.grocery import VoiceParseRequest

        with pytest.raises(ValidationError):
            VoiceParseRequest(transcription="")

    def test_voice_parse_request_requires_field(self):
        """VoiceParseRequest requires transcription field"""
        from app.models.grocery import VoiceParseRequest

        with pytest.raises(ValidationError):
            VoiceParseRequest()  # No transcription provided


class TestVoiceParseResponseModel:
    """Test VoiceParseResponse Pydantic model validation"""

    def test_valid_voice_parse_response(self):
        """Valid VoiceParseResponse with proposed items"""
        from app.models.grocery import VoiceParseResponse, ProposedGroceryItem

        response = VoiceParseResponse(
            proposed_items=[
                ProposedGroceryItem(name="chicken", confidence="high")
            ],
            transcription_used="chicken and milk",
            warnings=["Possible duplicate: 'milk'"]
        )

        assert len(response.proposed_items) == 1
        assert response.transcription_used == "chicken and milk"
        assert len(response.warnings) == 1

    def test_voice_parse_response_empty_items(self):
        """VoiceParseResponse can have empty proposed_items list"""
        from app.models.grocery import VoiceParseResponse

        response = VoiceParseResponse(
            proposed_items=[],
            transcription_used="test",
            warnings=[]
        )

        assert response.proposed_items == []
        assert response.warnings == []

    def test_voice_parse_response_warnings_default(self):
        """Warnings should default to empty list"""
        from app.models.grocery import VoiceParseResponse

        response = VoiceParseResponse(
            proposed_items=[],
            transcription_used="test"
        )

        assert response.warnings == []


class TestBatchAddRequestModel:
    """Test BatchAddRequest Pydantic model validation"""

    def test_valid_batch_add_request(self):
        """Valid BatchAddRequest with items"""
        from app.models.grocery import BatchAddRequest, GroceryItem

        request = BatchAddRequest(
            items=[
                GroceryItem(
                    name="chicken",
                    date_added=date(2025, 12, 22)
                ),
                GroceryItem(
                    name="milk",
                    date_added=date(2025, 12, 22),
                    expiry_date=date(2025, 12, 25),
                    expiry_type="expiry_date"
                )
            ]
        )

        assert len(request.items) == 2
        assert request.items[0].name == "chicken"
        assert request.items[1].expiry_date == date(2025, 12, 25)

    def test_batch_add_request_rejects_empty_list(self):
        """BatchAddRequest should reject empty items list"""
        from app.models.grocery import BatchAddRequest

        with pytest.raises(ValidationError):
            BatchAddRequest(items=[])

    def test_batch_add_request_requires_field(self):
        """BatchAddRequest requires items field"""
        from app.models.grocery import BatchAddRequest

        with pytest.raises(ValidationError):
            BatchAddRequest()  # No items provided
