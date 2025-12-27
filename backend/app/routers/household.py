"""
Household and grocery API endpoints.

Provides REST API for managing household profile and groceries.
"""
import logging
from typing import List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.models.household import HouseholdProfile
from app.data.data_manager import (
    load_household_profile,
    save_household_profile,
    load_groceries,
    save_groceries
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/household",
    tags=["household"]
)


class GroceryList(BaseModel):
    """Grocery list request/response"""
    items: List[str]


@router.get("/profile", response_model=HouseholdProfile)
async def get_household_profile(workspace_id: str = Query(..., description="Workspace identifier")):
    """
    Get the current household profile.

    Args:
        workspace_id: Workspace identifier for data isolation

    Returns:
        HouseholdProfile with family members, allergies, preferences, etc.

    Raises:
        HTTPException 404: No household profile found
    """
    profile = load_household_profile(workspace_id)

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="No household profile found. Create one first."
        )

    return profile


@router.put("/profile", response_model=HouseholdProfile)
async def update_household_profile(
    profile: HouseholdProfile,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Update the household profile.

    Args:
        profile: Complete HouseholdProfile object
        workspace_id: Workspace identifier for data isolation

    Returns:
        The updated profile

    Raises:
        HTTPException 500: Failed to save profile
    """
    try:
        save_household_profile(workspace_id, profile)
        logger.info(f"Updated household profile for workspace '{workspace_id}'")
        return profile
    except Exception as e:
        logger.error(f"Failed to save household profile for workspace '{workspace_id}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save household profile: {str(e)}"
        )


@router.get("/groceries", response_model=GroceryList)
async def get_groceries(workspace_id: str = Query(..., description="Workspace identifier")):
    """
    Get the current grocery list.

    Args:
        workspace_id: Workspace identifier for data isolation

    Returns:
        List of available groceries
    """
    items = load_groceries(workspace_id)
    # Convert GroceryItem objects to strings for backward compatibility
    item_names = [item.name for item in items]
    return GroceryList(items=item_names)


@router.put("/groceries", response_model=GroceryList)
async def update_groceries(
    groceries: GroceryList,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Update the grocery list.

    Args:
        groceries: List of available grocery items
        workspace_id: Workspace identifier for data isolation

    Returns:
        The updated grocery list

    Raises:
        HTTPException 500: Failed to save groceries
    """
    try:
        # Convert strings to GroceryItem objects
        from app.models.grocery import GroceryItem
        from datetime import date as Date
        items = [GroceryItem(name=item, date_added=Date.today()) for item in groceries.items]
        save_groceries(workspace_id, items)
        logger.info(f"Updated groceries list for workspace '{workspace_id}' with {len(groceries.items)} items")
        return groceries
    except Exception as e:
        logger.error(f"Failed to save groceries for workspace '{workspace_id}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save groceries: {str(e)}"
        )
