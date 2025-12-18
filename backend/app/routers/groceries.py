"""
Groceries API endpoints.

Provides REST API for managing grocery items with date tracking and expiry management.
"""
import logging
from fastapi import APIRouter, HTTPException
from app.models.grocery import GroceryItem, GroceryList
from app.data.data_manager import load_groceries, save_groceries

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
