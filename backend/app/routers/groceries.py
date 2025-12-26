"""
Groceries API endpoints.

Provides REST API for managing grocery items with date tracking and expiry management.
Includes voice parsing endpoints for Sprint 4 Phase 1.
Includes receipt OCR endpoints for Sprint 4 Phase 2.
"""
import logging
from fastapi import APIRouter, HTTPException
from app.models.grocery import (
    GroceryItem,
    GroceryList,
    VoiceParseRequest,
    VoiceParseResponse,
    ProposedGroceryItem,
    BatchAddRequest,
    ReceiptParseRequest,
    ReceiptParseResponse
)
from app.data.data_manager import load_groceries, save_groceries
from app.services.claude_service import parse_voice_to_groceries, parse_receipt_to_groceries

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/groceries",
    tags=["groceries"]
)


@router.get("", response_model=GroceryList)
async def get_groceries():
    """
    Get all groceries.

    Returns:
        GroceryList containing all grocery items with dates and expiry info
    """
    try:
        items = load_groceries()
        logger.info(f"Retrieved {len(items)} grocery items")
        return GroceryList(items=items)
    except Exception as e:
        logger.error(f"Failed to load groceries: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load groceries: {str(e)}"
        )


@router.post("", response_model=GroceryItem)
async def add_grocery(item: GroceryItem):
    """
    Add a single grocery item.

    Args:
        item: GroceryItem to add (name required, dates optional)

    Returns:
        The added GroceryItem

    Raises:
        HTTPException 400: Invalid item data (e.g., expiry_date without expiry_type)
        HTTPException 500: Failed to save groceries
    """
    try:
        items = load_groceries()
        items.append(item)
        save_groceries(items)
        logger.info(f"Added grocery item: {item.name}")
        return item
    except ValueError as e:
        # Pydantic validation error
        logger.error(f"Invalid grocery item: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to add grocery: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to add grocery: {str(e)}"
        )


@router.delete("/{item_name}")
async def delete_grocery(item_name: str):
    """
    Delete a grocery item by name.

    Args:
        item_name: Name of the grocery item to delete

    Returns:
        Success message

    Raises:
        HTTPException 404: Item not found
        HTTPException 500: Failed to save groceries
    """
    try:
        items = load_groceries()

        # Find and remove item (case-insensitive match)
        original_count = len(items)
        items = [item for item in items if item.name.lower() != item_name.lower()]

        if len(items) == original_count:
            logger.warning(f"Grocery item not found: {item_name}")
            raise HTTPException(
                status_code=404,
                detail=f"Grocery item '{item_name}' not found"
            )

        save_groceries(items)
        logger.info(f"Deleted grocery item: {item_name}")
        return {"message": f"Grocery item '{item_name}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete grocery: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete grocery: {str(e)}"
        )


@router.get("/expiring-soon", response_model=GroceryList)
async def get_expiring_soon(days_ahead: int = 1):
    """
    Get groceries expiring within N days.

    Args:
        days_ahead: Number of days to look ahead (default: 1)

    Returns:
        GroceryList containing only items expiring soon

    Raises:
        HTTPException 400: Invalid days_ahead value
        HTTPException 500: Failed to load groceries
    """
    if days_ahead < 0:
        raise HTTPException(
            status_code=400,
            detail="days_ahead must be non-negative"
        )

    try:
        items = load_groceries()
        expiring_items = [item for item in items if item.is_expiring_soon(days_ahead)]
        logger.info(f"Found {len(expiring_items)} items expiring within {days_ahead} days")
        return GroceryList(items=expiring_items)
    except Exception as e:
        logger.error(f"Failed to get expiring groceries: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get expiring groceries: {str(e)}"
        )


# =============================================================================
# Voice Parsing Endpoints (Sprint 4 Phase 1)
# =============================================================================


@router.post("/parse-voice", response_model=VoiceParseResponse)
async def parse_voice_input(request: VoiceParseRequest):
    """
    Parse voice transcription into proposed grocery items.

    This endpoint uses Claude AI to extract structured grocery items from
    natural language voice input. The proposed items include confidence scores
    and are not saved until the user confirms them via the batch endpoint.

    Args:
        request: VoiceParseRequest with transcription text

    Returns:
        VoiceParseResponse with proposed items and warnings

    Raises:
        HTTPException 400: Invalid transcription or parsing failed
        HTTPException 500: Claude API error or server error

    Example:
        Request: {"transcription": "Chicken breast bought yesterday, milk expires tomorrow"}
        Response: {
            "proposed_items": [
                {"name": "chicken breast", "purchase_date": "2025-12-21", ...},
                {"name": "milk", "expiry_date": "2025-12-23", ...}
            ],
            "transcription_used": "...",
            "warnings": []
        }
    """
    try:
        # Get existing groceries for duplicate detection
        existing_items = load_groceries()
        existing_names = [item.name.lower() for item in existing_items]

        # Parse voice input using Claude service
        proposed_items, warnings = await parse_voice_to_groceries(
            request.transcription,
            existing_names
        )

        logger.info(f"Parsed {len(proposed_items)} items from voice input")

        # Convert dicts to ProposedGroceryItem models
        return VoiceParseResponse(
            proposed_items=[ProposedGroceryItem(**item) for item in proposed_items],
            transcription_used=request.transcription,
            warnings=warnings
        )

    except ValueError as e:
        # Invalid input or parsing failure
        logger.error(f"Invalid voice input: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except ConnectionError as e:
        # Claude API unavailable
        logger.error(f"Claude API unavailable: {e}")
        raise HTTPException(
            status_code=500,
            detail="AI service temporarily unavailable. Please try again."
        )
    except Exception as e:
        logger.error(f"Failed to parse voice input: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse voice input: {str(e)}"
        )


@router.post("/batch", response_model=GroceryList)
async def batch_add_groceries(request: BatchAddRequest):
    """
    Add multiple grocery items at once.

    This endpoint is designed for adding confirmed items from voice/OCR/image parsing.
    It automatically skips duplicates based on case-insensitive name matching.

    Args:
        request: BatchAddRequest with list of grocery items

    Returns:
        Updated GroceryList with all items (both existing and newly added)

    Raises:
        HTTPException 400: Invalid items or validation failed
        HTTPException 500: Failed to save groceries

    Example:
        Request: {
            "items": [
                {"name": "chicken", "date_added": "2025-12-22"},
                {"name": "milk", "date_added": "2025-12-22", "expiry_date": "2025-12-25", ...}
            ]
        }
        Response: {"items": [/* all groceries including newly added */]}
    """
    try:
        if not request.items:
            raise HTTPException(
                status_code=400,
                detail="At least one item is required"
            )

        # Load existing groceries
        items = load_groceries()

        # Add new items (skip duplicates based on case-insensitive name matching)
        existing_names = {item.name.lower() for item in items}
        added_count = 0

        for new_item in request.items:
            if new_item.name.lower() not in existing_names:
                items.append(new_item)
                existing_names.add(new_item.name.lower())
                added_count += 1
            else:
                logger.debug(f"Skipping duplicate item: {new_item.name}")

        # Save updated list
        save_groceries(items)
        logger.info(
            f"Batch added {added_count} items "
            f"({len(request.items) - added_count} duplicates skipped)"
        )

        return GroceryList(items=items)

    except ValueError as e:
        # Pydantic validation error
        logger.error(f"Invalid grocery items: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        # Re-raise HTTPExceptions (don't wrap them)
        raise
    except Exception as e:
        logger.error(f"Failed to batch add groceries: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to batch add groceries: {str(e)}"
        )


# =============================================================================
# Receipt OCR endpoints (Sprint 4 Phase 2)
# =============================================================================


@router.post("/parse-receipt", response_model=ReceiptParseResponse)
async def parse_receipt(request: ReceiptParseRequest):
    """
    Parse receipt image to extract grocery items using Claude Vision OCR.

    Extracts:
    - Item names (standardized)
    - Purchase date from receipt
    - Store name
    - Confidence scores

    Returns proposed items for user confirmation.

    Raises:
        HTTPException 400: Invalid image data
        HTTPException 422: Validation error (Pydantic)
        HTTPException 500: Claude Vision API error
    """
    try:
        logger.info("Parsing receipt via OCR")

        # Get existing groceries for duplicate detection
        existing_items = load_groceries()
        existing_dicts = [item.model_dump() for item in existing_items]

        # Call Claude Vision service
        proposed_items, warnings = await parse_receipt_to_groceries(
            request.image_base64,
            existing_dicts
        )

        # Extract metadata (if present in items)
        detected_purchase_date = None
        detected_store = None

        if proposed_items:
            # Get purchase date from first item (all should have same date)
            first_item = proposed_items[0]
            if "purchase_date" in first_item and first_item["purchase_date"]:
                detected_purchase_date = first_item["purchase_date"]

        # Note: detected_store would come from Claude's response metadata
        # For simplicity, we'll leave it None for now (can enhance later)

        return ReceiptParseResponse(
            proposed_items=[ProposedGroceryItem(**item) for item in proposed_items],
            detected_purchase_date=detected_purchase_date,
            detected_store=detected_store,
            warnings=warnings
        )

    except ValueError as e:
        logger.warning(f"Invalid receipt data: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")
    except ConnectionError as e:
        logger.error(f"Claude Vision API error: {e}")
        raise HTTPException(status_code=500, detail=f"Claude Vision API error: {e}")
    except Exception as e:
        logger.error(f"Unexpected error parsing receipt: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")
