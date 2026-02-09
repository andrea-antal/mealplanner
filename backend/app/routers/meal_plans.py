"""
Meal plan API endpoints.

Provides REST API for generating and managing meal plans.
"""
import logging
from datetime import date as Date
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, field_validator
from app.services.meal_plan_service import generate_meal_plan
from app.models.meal_plan import MealPlan
from app.data.data_manager import (
    load_meal_plan,
    save_meal_plan,
    list_all_meal_plans,
    delete_meal_plan,
    load_meal_plan_by_week,
    list_meal_plan_weeks,
)
from app.services.recipe_filter_service import (
    get_alternative_recipes,
    AlternativeRecipeSuggestion
)
from app.models.generation_config import GenerationConfig
from app.models.recipe_readiness import RecipeReadiness
from app.data.data_manager import list_all_recipes

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/meal-plans",
    tags=["meal-plans"]
)


class GenerateMealPlanRequest(BaseModel):
    """Request body for generating a meal plan"""
    week_start_date: str  # ISO format: "2025-12-08"
    num_recipes: int = 15  # Number of candidate recipes to retrieve
    week_context: Optional[str] = None  # User's description of their week (schedule, preferences, etc.)
    generation_config: Optional[GenerationConfig] = None  # Generation configuration (preference weights, recipe source, appliances)

    @field_validator('week_context')
    @classmethod
    def validate_week_context(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 750:
            raise ValueError('week_context must be 750 characters or less')
        return v


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


class MoveMealRequest(BaseModel):
    """Request body for moving a meal (drag-and-drop)"""
    source_day_index: int  # Day to move FROM (0-6)
    source_meal_index: int  # Meal position in source day
    target_day_index: int  # Day to move TO (0-6)
    target_meal_index: int  # Position in target day (insert before)


class AddMealRequest(BaseModel):
    """Request body for adding a meal from recipe library"""
    day_index: int  # Day to add to (0-6)
    meal_type: str  # breakfast, lunch, dinner, snack
    recipe_id: str  # Recipe ID from library
    recipe_title: str  # Recipe title
    for_who: str = "everyone"  # Who this meal is for
    notes: str = ""  # Optional notes
    is_daycare: bool = False  # Whether this is a daycare meal


class DeleteMealRequest(BaseModel):
    """Request body for deleting a meal"""
    day_index: int  # Day index (0-6)
    meal_index: int  # Meal position to delete


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
        num_recipes=request.num_recipes,
        week_context=request.week_context,
        generation_config=request.generation_config
    )

    if not meal_plan:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate meal plan. Check logs for details."
        )

    # Save the generated meal plan to database
    save_meal_plan(workspace_id, meal_plan)
    logger.info(f"Successfully generated and saved meal plan with {len(meal_plan.days)} days for workspace '{workspace_id}'")
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


# ===== Readiness Check Endpoint =====

@router.get("/readiness", response_model=RecipeReadiness)
async def check_readiness_endpoint(
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Check if workspace has sufficient recipes for meal plan generation.

    Returns recipe counts by meal_type and whether generation is possible.
    Requires at least 1 recipe for each of: breakfast, lunch, dinner.

    Args:
        workspace_id: Workspace identifier for data isolation

    Returns:
        RecipeReadiness object with counts and readiness status
    """
    logger.info(f"Checking recipe readiness for workspace '{workspace_id}'")

    # Load all recipes for the workspace
    recipes = list_all_recipes(workspace_id)

    # Count recipes by meal type
    counts = {
        "breakfast": 0,
        "lunch": 0,
        "dinner": 0,
        "snack": 0,
        "side_dish": 0
    }

    for recipe in recipes:
        for meal_type in recipe.meal_types:
            if meal_type in counts:
                counts[meal_type] += 1

    # Check required types (breakfast, lunch, dinner)
    required_types = ["breakfast", "lunch", "dinner"]
    missing = [mt for mt in required_types if counts[mt] == 0]

    readiness = RecipeReadiness(
        total_count=len(recipes),
        counts_by_meal_type=counts,
        is_ready=len(missing) == 0,
        missing_meal_types=missing
    )

    logger.info(
        f"Readiness check: {readiness.total_count} recipes, "
        f"is_ready={readiness.is_ready}, missing={readiness.missing_meal_types}"
    )
    return readiness


# ===== Week-Based Lookup Endpoints =====

@router.get("/week/{week_start_date}", response_model=MealPlan)
async def get_meal_plan_by_week_endpoint(
    week_start_date: str,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Get a meal plan for a specific week by its start date.

    Args:
        week_start_date: ISO date string (e.g. '2026-02-02') - must be a Monday
        workspace_id: Workspace identifier for data isolation

    Returns:
        MealPlan object if found

    Raises:
        HTTPException 400: Invalid date format
        HTTPException 404: No meal plan for this week
    """
    logger.info(f"Getting meal plan for week {week_start_date} in workspace '{workspace_id}'")

    # Parse date to validate format
    try:
        Date.fromisoformat(week_start_date)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date format: {week_start_date}. Use ISO format (YYYY-MM-DD)"
        )

    meal_plan = load_meal_plan_by_week(workspace_id, week_start_date)

    if not meal_plan:
        raise HTTPException(
            status_code=404,
            detail=f"No meal plan found for week starting {week_start_date}"
        )

    return meal_plan


@router.get("/weeks", response_model=List[str])
async def list_meal_plan_weeks_endpoint(
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    List all week start dates that have saved meal plans.

    Returns dates sorted most recent first (e.g. ['2026-02-09', '2026-02-02', '2026-01-26']).

    Args:
        workspace_id: Workspace identifier for data isolation

    Returns:
        List of week_start_date strings
    """
    logger.info(f"Listing meal plan weeks for workspace '{workspace_id}'")
    weeks = list_meal_plan_weeks(workspace_id)
    return weeks


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
    # Must check both fields - title-only meals have previous_recipe_id=None but valid previous_recipe_title
    if meal.previous_recipe_id is None and meal.previous_recipe_title is None:
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


# ===== Move, Add, Delete Meal Endpoints (for drag-and-drop) =====

@router.post("/{meal_plan_id}/move-meal", response_model=MealPlan)
async def move_meal_endpoint(
    meal_plan_id: str,
    request: MoveMealRequest,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Move a meal from one position to another (drag-and-drop).

    Can move within the same day (reorder) or between different days.
    The meal is removed from source and inserted at target position.

    Args:
        meal_plan_id: Meal plan identifier
        request: Contains source and target day/meal indices
        workspace_id: Workspace identifier for data isolation

    Returns:
        Updated MealPlan object

    Raises:
        HTTPException 404: Meal plan not found
        HTTPException 400: Invalid indices
    """
    logger.info(f"Moving meal in plan {meal_plan_id} for workspace '{workspace_id}'")

    # Load the meal plan
    meal_plan = load_meal_plan(workspace_id, meal_plan_id)
    if not meal_plan:
        raise HTTPException(status_code=404, detail=f"Meal plan '{meal_plan_id}' not found")

    # Validate source day index
    if request.source_day_index < 0 or request.source_day_index >= len(meal_plan.days):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid source_day_index: {request.source_day_index}. Must be 0-{len(meal_plan.days) - 1}"
        )

    # Validate target day index
    if request.target_day_index < 0 or request.target_day_index >= len(meal_plan.days):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid target_day_index: {request.target_day_index}. Must be 0-{len(meal_plan.days) - 1}"
        )

    source_day = meal_plan.days[request.source_day_index]

    # Validate source meal index
    if request.source_meal_index < 0 or request.source_meal_index >= len(source_day.meals):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid source_meal_index: {request.source_meal_index}. Must be 0-{len(source_day.meals) - 1}"
        )

    # Remove meal from source
    meal_to_move = source_day.meals.pop(request.source_meal_index)

    # Get target day
    target_day = meal_plan.days[request.target_day_index]

    # Validate target meal index (can be 0 to len(meals) for insertion)
    max_target_index = len(target_day.meals)
    if request.target_meal_index < 0 or request.target_meal_index > max_target_index:
        # Restore the meal we just removed before raising
        source_day.meals.insert(request.source_meal_index, meal_to_move)
        raise HTTPException(
            status_code=400,
            detail=f"Invalid target_meal_index: {request.target_meal_index}. Must be 0-{max_target_index}"
        )

    # Insert at target position
    target_day.meals.insert(request.target_meal_index, meal_to_move)

    # Save the updated plan
    save_meal_plan(workspace_id, meal_plan)

    # Reload to get updated timestamps
    updated_plan = load_meal_plan(workspace_id, meal_plan_id)
    logger.info(f"Successfully moved meal in plan {meal_plan_id}")
    return updated_plan


@router.post("/{meal_plan_id}/add-meal", response_model=MealPlan)
async def add_meal_endpoint(
    meal_plan_id: str,
    request: AddMealRequest,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Add a meal from the recipe library to a day.

    This allows users to manually select and add recipes to their meal plan.

    Args:
        meal_plan_id: Meal plan identifier
        request: Contains day_index, meal_type, recipe_id, recipe_title, for_who
        workspace_id: Workspace identifier for data isolation

    Returns:
        Updated MealPlan object

    Raises:
        HTTPException 404: Meal plan not found
        HTTPException 400: Invalid day_index
    """
    logger.info(f"Adding meal to plan {meal_plan_id} for workspace '{workspace_id}'")

    # Load the meal plan
    meal_plan = load_meal_plan(workspace_id, meal_plan_id)
    if not meal_plan:
        raise HTTPException(status_code=404, detail=f"Meal plan '{meal_plan_id}' not found")

    # Validate day index
    if request.day_index < 0 or request.day_index >= len(meal_plan.days):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid day_index: {request.day_index}. Must be 0-{len(meal_plan.days) - 1}"
        )

    # Create the new meal
    from app.models.meal_plan import Meal
    new_meal = Meal(
        meal_type=request.meal_type,
        for_who=request.for_who,
        recipe_id=request.recipe_id,
        recipe_title=request.recipe_title,
        notes=request.notes,
        is_daycare=request.is_daycare
    )

    # Add to the day's meals
    meal_plan.days[request.day_index].meals.append(new_meal)

    # Save the updated plan
    save_meal_plan(workspace_id, meal_plan)

    # Reload to get updated timestamps
    updated_plan = load_meal_plan(workspace_id, meal_plan_id)
    logger.info(f"Successfully added meal to plan {meal_plan_id}")
    return updated_plan


@router.post("/{meal_plan_id}/delete-meal", response_model=MealPlan)
async def delete_meal_endpoint(
    meal_plan_id: str,
    request: DeleteMealRequest,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Delete a meal from a day.

    Args:
        meal_plan_id: Meal plan identifier
        request: Contains day_index and meal_index
        workspace_id: Workspace identifier for data isolation

    Returns:
        Updated MealPlan object

    Raises:
        HTTPException 404: Meal plan not found
        HTTPException 400: Invalid indices
    """
    logger.info(f"Deleting meal from plan {meal_plan_id} for workspace '{workspace_id}'")

    # Load the meal plan
    meal_plan = load_meal_plan(workspace_id, meal_plan_id)
    if not meal_plan:
        raise HTTPException(status_code=404, detail=f"Meal plan '{meal_plan_id}' not found")

    # Validate day index
    if request.day_index < 0 or request.day_index >= len(meal_plan.days):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid day_index: {request.day_index}. Must be 0-{len(meal_plan.days) - 1}"
        )

    day = meal_plan.days[request.day_index]

    # Validate meal index
    if request.meal_index < 0 or request.meal_index >= len(day.meals):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid meal_index: {request.meal_index}. Must be 0-{len(day.meals) - 1}"
        )

    # Remove the meal
    removed_meal = day.meals.pop(request.meal_index)
    logger.info(f"Removed meal: {removed_meal.recipe_title}")

    # Save the updated plan
    save_meal_plan(workspace_id, meal_plan)

    # Reload to get updated timestamps
    updated_plan = load_meal_plan(workspace_id, meal_plan_id)
    logger.info(f"Successfully deleted meal from plan {meal_plan_id}")
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
