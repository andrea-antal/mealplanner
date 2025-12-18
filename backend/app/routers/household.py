"""
Household and grocery API endpoints.

Provides REST API for managing household profile and groceries.
"""
import logging
from typing import List
from fastapi import APIRouter, HTTPException
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
async def get_household_profile():
    """
    Get the current household profile.

    Returns:
        HouseholdProfile with family members, allergies, preferences, etc.

    Raises:
        HTTPException 404: No household profile found
    """
    profile = load_household_profile()

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="No household profile found. Create one first."
        )

    return profile


@router.put("/profile", response_model=HouseholdProfile)
async def update_household_profile(profile: HouseholdProfile):
    """
    Update the household profile.

    Args:
        profile: Complete HouseholdProfile object

    Returns:
        The updated profile

    Raises:
        HTTPException 500: Failed to save profile
    """
    try:
        save_household_profile(profile)
        logger.info("Updated household profile")
        return profile
    except Exception as e:
        logger.error(f"Failed to save household profile: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save household profile: {str(e)}"
        )


@router.get("/groceries", response_model=GroceryList)
async def get_groceries():
    """
    Get the current grocery list.

    Returns:
        List of available groceries
    """
    items = load_groceries()
    return GroceryList(items=items)


@router.put("/groceries", response_model=GroceryList)
async def update_groceries(groceries: GroceryList):
    """
    Update the grocery list.

    Args:
        groceries: List of available grocery items

    Returns:
        The updated grocery list

    Raises:
        HTTPException 500: Failed to save groceries
    """
    try:
        save_groceries(groceries.items)
        logger.info(f"Updated groceries list with {len(groceries.items)} items")
        return groceries
    except Exception as e:
        logger.error(f"Failed to save groceries: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save groceries: {str(e)}"
        )
