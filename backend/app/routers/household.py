"""
Household and grocery API endpoints.

Provides REST API for managing household profile and groceries.
"""
import logging
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from pydantic import BaseModel, Field
from app.models.household import (
    HouseholdProfile,
    FamilyMember,
    OnboardingStatus,
    OnboardingData,
    CookingPreferences
)
from app.data.data_manager import (
    load_household_profile,
    save_household_profile,
    load_groceries,
    save_groceries
)
from app.services.onboarding_logger import (
    log_onboarding_completed,
    log_onboarding_skipped,
    log_onboarding_error
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


# Equipment level to appliances mapping
EQUIPMENT_LEVEL_APPLIANCES = {
    "minimal": ["microwave"],
    "basic": ["microwave", "oven"],
    "standard": ["microwave", "oven", "blender"],
    "well_equipped": ["microwave", "oven", "blender", "instant_pot", "food_processor"],
}


class OnboardingSubmission(BaseModel):
    """Complete onboarding data submission from wizard"""
    skill_level: str = Field(..., description="Cooking skill: beginner, intermediate, advanced")
    cooking_frequency: str = Field(..., description="How often: daily, few_times_week, few_times_month, rarely")
    kitchen_equipment_level: str = Field(..., description="Kitchen setup: minimal, basic, standard, well_equipped")
    pantry_stock_level: str = Field(..., description="Pantry: minimal, moderate, well_stocked")
    primary_goal: str = Field(..., description="Main goal: grocery_management, recipe_library, household_preferences, meal_planning")
    cuisine_preferences: List[str] = Field(default_factory=list, description="Preferred cuisines")
    dietary_goals: str = Field(..., description="Meal approach: meal_prep, cook_fresh, mixed")
    dietary_patterns: List[str] = Field(default_factory=list, description="Dietary patterns like keto, high_protein")
    household_members: List[FamilyMember] = Field(..., min_length=1, description="At least one household member required")
    starter_content_choice: Optional[str] = Field(default=None, description="Starter content: meal_plan, starter_recipes, or skip")


@router.get("/onboarding-status", response_model=OnboardingStatus)
async def get_onboarding_status(workspace_id: str = Query(..., description="Workspace identifier")):
    """
    Get onboarding status for a workspace.

    Returns default status (not completed) if no profile exists yet.
    Used by frontend to determine if onboarding wizard should be shown.
    """
    profile = load_household_profile(workspace_id)

    if profile and hasattr(profile, 'onboarding_status') and profile.onboarding_status:
        return profile.onboarding_status

    # Return default status for new users
    return OnboardingStatus()


@router.post("/onboarding", response_model=HouseholdProfile)
async def submit_onboarding(
    submission: OnboardingSubmission,
    workspace_id: str = Query(..., description="Workspace identifier"),
    background_tasks: BackgroundTasks = None
):
    """
    Submit completed onboarding data.

    Creates or updates household profile with onboarding responses.
    Maps equipment level to specific appliances.
    Optionally triggers starter content generation in the background.
    """
    # Load existing profile or create new one
    existing_profile = load_household_profile(workspace_id)

    # Map equipment level to appliances
    appliances = EQUIPMENT_LEVEL_APPLIANCES.get(
        submission.kitchen_equipment_level,
        EQUIPMENT_LEVEL_APPLIANCES["basic"]
    )

    # Build cooking preferences
    cooking_preferences = CookingPreferences(
        available_appliances=appliances,
        skill_level=submission.skill_level,
        # Preserve existing values if they exist
        preferred_methods=existing_profile.cooking_preferences.preferred_methods if existing_profile else [],
        max_active_cooking_time_weeknight=existing_profile.cooking_preferences.max_active_cooking_time_weeknight if existing_profile else 30,
        max_active_cooking_time_weekend=existing_profile.cooking_preferences.max_active_cooking_time_weekend if existing_profile else 60
    )

    # Build onboarding data
    onboarding_data = OnboardingData(
        cooking_frequency=submission.cooking_frequency,
        kitchen_equipment_level=submission.kitchen_equipment_level,
        pantry_stock_level=submission.pantry_stock_level,
        primary_goal=submission.primary_goal,
        cuisine_preferences=submission.cuisine_preferences,
        dietary_goals=submission.dietary_goals,
        dietary_patterns=submission.dietary_patterns,
        starter_content_choice=submission.starter_content_choice
    )

    # Build onboarding status
    onboarding_status = OnboardingStatus(
        completed=True,
        skipped_count=existing_profile.onboarding_status.skipped_count if existing_profile else 0,
        permanently_dismissed=False,
        completed_at=datetime.now().isoformat()
    )

    # Create or update profile
    if existing_profile:
        # SAFETY: Preserve existing family members if user already has them
        # Only update if submission has real members (not just placeholder)
        if existing_profile.family_members and len(existing_profile.family_members) > 0:
            # Keep existing family members - don't overwrite with onboarding data
            logger.info(f"Preserving {len(existing_profile.family_members)} existing family members for workspace '{workspace_id}'")
        else:
            existing_profile.family_members = submission.household_members
        existing_profile.cooking_preferences = cooking_preferences
        existing_profile.onboarding_data = onboarding_data
        existing_profile.onboarding_status = onboarding_status
        profile = existing_profile
    else:
        profile = HouseholdProfile(
            family_members=submission.household_members,
            cooking_preferences=cooking_preferences,
            onboarding_data=onboarding_data,
            onboarding_status=onboarding_status
        )

    save_household_profile(workspace_id, profile)

    # Log onboarding completion for funnel analytics with all answers
    log_onboarding_completed(
        workspace_id,
        onboarding_answers={
            "skill_level": submission.skill_level,
            "cooking_frequency": submission.cooking_frequency,
            "kitchen_equipment_level": submission.kitchen_equipment_level,
            "pantry_stock_level": submission.pantry_stock_level,
            "primary_goal": submission.primary_goal,
            "cuisine_preferences": submission.cuisine_preferences,
            "dietary_goals": submission.dietary_goals,
            "dietary_patterns": submission.dietary_patterns,
            "starter_content_choice": submission.starter_content_choice,
        }
    )

    logger.info(f"Completed onboarding for workspace '{workspace_id}'")

    # Trigger starter content generation if requested
    if background_tasks and submission.starter_content_choice:
        from app.services.starter_content_service import (
            generate_starter_meal_plan,
            generate_starter_recipes
        )

        if submission.starter_content_choice == "meal_plan":
            logger.info(f"Queueing starter meal plan generation for workspace '{workspace_id}'")
            background_tasks.add_task(
                generate_starter_meal_plan,
                workspace_id,
                profile
            )
        elif submission.starter_content_choice == "starter_recipes":
            logger.info(f"Queueing starter recipe generation for workspace '{workspace_id}'")
            background_tasks.add_task(
                generate_starter_recipes,
                workspace_id,
                onboarding_data
            )

    return profile


@router.post("/onboarding/skip", response_model=OnboardingStatus)
async def skip_onboarding(
    workspace_id: str = Query(..., description="Workspace identifier"),
    permanent: bool = Query(default=False, description="Skip permanently (never show again)")
):
    """
    Skip onboarding wizard.

    Increments skip counter. If permanent=True, marks as permanently dismissed.
    Creates a minimal profile with defaults if none exists.
    """
    profile = load_household_profile(workspace_id)

    if not profile:
        # Create minimal profile with default household member
        profile = HouseholdProfile(
            family_members=[FamilyMember(name="Me", age_group="adult")],
            onboarding_status=OnboardingStatus()
        )

    # Update onboarding status
    profile.onboarding_status.skipped_count += 1
    if permanent:
        profile.onboarding_status.permanently_dismissed = True

    save_household_profile(workspace_id, profile)

    # Log skip event for funnel analytics
    log_onboarding_skipped(
        workspace_id,
        skip_count=profile.onboarding_status.skipped_count,
        permanent=permanent
    )

    logger.info(f"Skipped onboarding for workspace '{workspace_id}' (permanent={permanent}, count={profile.onboarding_status.skipped_count})")

    return profile.onboarding_status
