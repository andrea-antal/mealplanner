"""
Meal plan API endpoints.

Provides REST API for generating and managing meal plans.
"""
import logging
from datetime import date as Date
from typing import List
from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel
from app.services.meal_plan_service import generate_meal_plan
from app.models.meal_plan import MealPlan
from app.data.data_manager import (
    load_meal_plan,
    save_meal_plan,
    list_all_meal_plans,
    delete_meal_plan
)
from app.services.recipe_filter_service import (
    get_alternative_recipes,
    AlternativeRecipeSuggestion
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/meal-plans",
    tags=["meal-plans"]
)


class GenerateMealPlanRequest(BaseModel):
    """Request body for generating a meal plan"""
    week_start_date: str  # ISO format: "2025-12-08"
    num_recipes: int = 15  # Number of candidate recipes to retrieve


class AlternativeRecipesRequest(BaseModel):
    """Request body for getting alternative recipe suggestions"""
    meal_type: str  # breakfast, lunch, dinner, snack
    exclude_recipe_ids: List[str] = []  # Recipe IDs to exclude (already in plan)
    limit: int = 10  # Maximum suggestions to return


class SwapMealRequest(BaseModel):
    """Request body for swapping a recipe in a meal plan"""
    day_index: int  # 0-6 for day of week
    meal_index: int  # Index of meal within the day
    new_recipe_id: str  # New recipe ID to swap in
    new_recipe_title: str  # New recipe title


class UndoSwapRequest(BaseModel):
    """Request body for undoing a recipe swap"""
    day_index: int  # 0-6 for day of week
    meal_index: int  # Index of meal within the day


@router.post("/generate", response_model=MealPlan)
async def generate_meal_plan_endpoint(
    request: GenerateMealPlanRequest,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Generate a weekly meal plan.

    This endpoint:
    1. Loads household profile and groceries from storage
    2. Retrieves relevant recipes using RAG
    3. Calls Claude to generate a 7-day meal plan
    4. Returns the meal plan as JSON

    Args:
        request: Contains week_start_date and optional num_recipes
        workspace_id: Workspace identifier for data isolation

    Returns:
        MealPlan object with 7 days of meals

    Raises:
        HTTPException 400: Invalid date format
        HTTPException 500: Meal plan generation failed
    """
    logger.info(f"Received request to generate meal plan for {request.week_start_date} in workspace '{workspace_id}'")

    # Parse date
    try:
        week_start = Date.fromisoformat(request.week_start_date)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date format: {request.week_start_date}. Use ISO format (YYYY-MM-DD)"
        )

    # Generate meal plan
    meal_plan = generate_meal_plan(
        workspace_id=workspace_id,
        week_start_date=week_start,
        num_recipes=request.num_recipes
    )

    if not meal_plan:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate meal plan. Check logs for details."
        )

    logger.info(f"Successfully generated meal plan with {len(meal_plan.days)} days for workspace '{workspace_id}'")
    return meal_plan


# ===== Alternative Recipes Endpoint =====

@router.post("/alternatives", response_model=List[AlternativeRecipeSuggestion])
async def get_alternatives_endpoint(
    request: AlternativeRecipesRequest,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Get alternative recipe suggestions for swapping.

    Filters recipes based on:
    - Meal type (breakfast, lunch, dinner, snack)
    - Household constraints (excludes recipes with allergens)
    - Excludes specified recipe IDs (already in meal plan)

    Returns suggestions sorted by match score (highest first).
    Includes warnings for dislikes or other potential issues.

    Args:
        request: Contains meal_type, exclude_recipe_ids, and limit
        workspace_id: Workspace identifier for data isolation

    Returns:
        List of AlternativeRecipeSuggestion objects
    """
    logger.info(f"Getting alternative {request.meal_type} recipes for workspace '{workspace_id}'")

    suggestions = get_alternative_recipes(
        workspace_id=workspace_id,
        meal_type=request.meal_type,
        exclude_recipe_ids=request.exclude_recipe_ids,
        limit=request.limit
    )

    logger.info(f"Found {len(suggestions)} alternative recipes")
    return suggestions


# ===== Swap & Undo Endpoints =====

@router.patch("/{meal_plan_id}", response_model=MealPlan)
async def swap_meal_endpoint(
    meal_plan_id: str,
    request: SwapMealRequest,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Swap a recipe in a meal plan.

    Stores the current recipe in previous_recipe_id/title for undo capability.

    Args:
        meal_plan_id: Meal plan identifier
        request: Contains day_index, meal_index, new_recipe_id, new_recipe_title
        workspace_id: Workspace identifier for data isolation

    Returns:
        Updated MealPlan object

    Raises:
        HTTPException 404: Meal plan not found
        HTTPException 400: Invalid day_index or meal_index
    """
    logger.info(f"Swapping meal in plan {meal_plan_id} for workspace '{workspace_id}'")

    # Load the meal plan
    meal_plan = load_meal_plan(workspace_id, meal_plan_id)
    if not meal_plan:
        raise HTTPException(status_code=404, detail=f"Meal plan '{meal_plan_id}' not found")

    # Validate indices
    if request.day_index < 0 or request.day_index >= len(meal_plan.days):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid day_index: {request.day_index}. Must be 0-{len(meal_plan.days) - 1}"
        )

    day = meal_plan.days[request.day_index]
    if request.meal_index < 0 or request.meal_index >= len(day.meals):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid meal_index: {request.meal_index}. Must be 0-{len(day.meals) - 1}"
        )

    # Get the meal to swap
    meal = day.meals[request.meal_index]

    # Store current recipe as previous (for undo)
    # Create a new meal object with updated fields
    from app.models.meal_plan import Meal
    updated_meal = Meal(
        meal_type=meal.meal_type,
        for_who=meal.for_who,
        recipe_id=request.new_recipe_id,
        recipe_title=request.new_recipe_title,
        notes=meal.notes,
        previous_recipe_id=meal.recipe_id,
        previous_recipe_title=meal.recipe_title
    )

    # Replace the meal in the plan
    meal_plan.days[request.day_index].meals[request.meal_index] = updated_meal

    # Save the updated plan
    save_meal_plan(workspace_id, meal_plan)

    # Reload to get updated timestamps
    updated_plan = load_meal_plan(workspace_id, meal_plan_id)
    logger.info(f"Successfully swapped meal in plan {meal_plan_id}")
    return updated_plan


@router.post("/{meal_plan_id}/undo-swap", response_model=MealPlan)
async def undo_swap_endpoint(
    meal_plan_id: str,
    request: UndoSwapRequest,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Undo a recipe swap in a meal plan.

    Restores the previous recipe and clears the previous_recipe fields.

    Args:
        meal_plan_id: Meal plan identifier
        request: Contains day_index and meal_index
        workspace_id: Workspace identifier for data isolation

    Returns:
        Updated MealPlan object

    Raises:
        HTTPException 404: Meal plan not found
        HTTPException 400: No previous recipe to restore or invalid indices
    """
    logger.info(f"Undoing swap in plan {meal_plan_id} for workspace '{workspace_id}'")

    # Load the meal plan
    meal_plan = load_meal_plan(workspace_id, meal_plan_id)
    if not meal_plan:
        raise HTTPException(status_code=404, detail=f"Meal plan '{meal_plan_id}' not found")

    # Validate indices
    if request.day_index < 0 or request.day_index >= len(meal_plan.days):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid day_index: {request.day_index}"
        )

    day = meal_plan.days[request.day_index]
    if request.meal_index < 0 or request.meal_index >= len(day.meals):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid meal_index: {request.meal_index}"
        )

    # Get the meal to undo
    meal = day.meals[request.meal_index]

    # Check if there's a previous recipe to restore
    if meal.previous_recipe_id is None:
        raise HTTPException(
            status_code=400,
            detail="No previous recipe to restore. Swap has not been performed on this meal."
        )

    # Restore the previous recipe
    from app.models.meal_plan import Meal
    restored_meal = Meal(
        meal_type=meal.meal_type,
        for_who=meal.for_who,
        recipe_id=meal.previous_recipe_id,
        recipe_title=meal.previous_recipe_title,
        notes=meal.notes,
        previous_recipe_id=None,  # Clear previous
        previous_recipe_title=None
    )

    # Replace the meal in the plan
    meal_plan.days[request.day_index].meals[request.meal_index] = restored_meal

    # Save the updated plan
    save_meal_plan(workspace_id, meal_plan)

    # Reload to get updated timestamps
    updated_plan = load_meal_plan(workspace_id, meal_plan_id)
    logger.info(f"Successfully undid swap in plan {meal_plan_id}")
    return updated_plan


# ===== CRUD Endpoints =====

@router.get("", response_model=List[MealPlan])
async def list_meal_plans_endpoint(
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    List all meal plans for a workspace.

    Returns meal plans sorted by week_start_date (most recent first).

    Args:
        workspace_id: Workspace identifier for data isolation

    Returns:
        List of MealPlan objects
    """
    logger.info(f"Listing all meal plans for workspace '{workspace_id}'")
    meal_plans = list_all_meal_plans(workspace_id)
    return meal_plans


@router.get("/{meal_plan_id}", response_model=MealPlan)
async def get_meal_plan_endpoint(
    meal_plan_id: str,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Get a specific meal plan by ID.

    Args:
        meal_plan_id: Unique meal plan identifier (typically week_start_date)
        workspace_id: Workspace identifier for data isolation

    Returns:
        MealPlan object

    Raises:
        HTTPException 404: Meal plan not found
    """
    logger.info(f"Getting meal plan {meal_plan_id} for workspace '{workspace_id}'")
    meal_plan = load_meal_plan(workspace_id, meal_plan_id)

    if not meal_plan:
        raise HTTPException(
            status_code=404,
            detail=f"Meal plan '{meal_plan_id}' not found"
        )

    return meal_plan


@router.post("", response_model=MealPlan, status_code=201)
async def save_meal_plan_endpoint(
    meal_plan: MealPlan,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Save a meal plan.

    Creates a new meal plan or updates an existing one with the same ID.

    Args:
        meal_plan: MealPlan object to save
        workspace_id: Workspace identifier for data isolation

    Returns:
        Saved MealPlan object with updated timestamps
    """
    logger.info(f"Saving meal plan {meal_plan.id} for workspace '{workspace_id}'")
    save_meal_plan(workspace_id, meal_plan)

    # Reload to get updated timestamps
    saved_plan = load_meal_plan(workspace_id, meal_plan.id)
    return saved_plan


@router.delete("/{meal_plan_id}", status_code=204)
async def delete_meal_plan_endpoint(
    meal_plan_id: str,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Delete a meal plan.

    Args:
        meal_plan_id: Unique meal plan identifier
        workspace_id: Workspace identifier for data isolation

    Raises:
        HTTPException 404: Meal plan not found
    """
    logger.info(f"Deleting meal plan {meal_plan_id} for workspace '{workspace_id}'")
    deleted = delete_meal_plan(workspace_id, meal_plan_id)

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail=f"Meal plan '{meal_plan_id}' not found"
        )

    return Response(status_code=204)
