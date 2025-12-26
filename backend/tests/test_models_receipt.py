"""Test Pydantic models for receipt OCR parsing"""
import pytest
from pydantic import ValidationError
from datetime import date


class TestReceiptParsingModels:
    """Model validation tests - WRITE BEFORE IMPLEMENTING MODELS"""

    def test_receipt_parse_request_minimal(self):
        """Minimal valid ReceiptParseRequest"""
        from app.models.grocery import ReceiptParseRequest

        req = ReceiptParseRequest(
            image_base64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
        )
        assert req.image_base64.startswith("iVBOR")

    def test_receipt_parse_request_rejects_empty(self):
        """ReceiptParseRequest requires non-empty image"""
        from app.models.grocery import ReceiptParseRequest

        with pytest.raises(ValidationError):
            ReceiptParseRequest(image_base64="")

    def test_receipt_parse_response_minimal(self):
        """Minimal valid ReceiptParseResponse"""
        from app.models.grocery import ReceiptParseResponse

        resp = ReceiptParseResponse(
            proposed_items=[],
            warnings=[]
        )
        assert resp.detected_purchase_date is None
        assert resp.detected_store is None

    def test_receipt_parse_response_with_metadata(self):
        """ReceiptParseResponse with full metadata"""
        from app.models.grocery import ReceiptParseResponse, ProposedGroceryItem

        resp = ReceiptParseResponse(
            proposed_items=[
                ProposedGroceryItem(
                    name="milk",
                    purchase_date=date(2025, 12, 20),
                    confidence="high"
                )
            ],
            detected_purchase_date=date(2025, 12, 20),
            detected_store="Whole Foods",
            warnings=["Could not read item on line 5"]
        )
        assert resp.detected_store == "Whole Foods"
        assert len(resp.proposed_items) == 1

    def test_reuses_proposed_grocery_item_from_phase1(self):
        """Verify ProposedGroceryItem from Phase 1 works for receipts"""
        from app.models.grocery import ProposedGroceryItem

        # Phase 1 model should work for OCR results
        item = ProposedGroceryItem(
            name="chicken breast",
            purchase_date=date(2025, 12, 20),
            confidence="medium",
            notes="OCR confidence medium due to smudged text"
        )
        assert item.name == "chicken breast"
        assert item.confidence == "medium"
