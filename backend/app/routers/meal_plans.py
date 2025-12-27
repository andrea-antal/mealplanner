"""
Meal plan API endpoints.

Provides REST API for generating and managing meal plans.
"""
import logging
from datetime import date as Date
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.services.meal_plan_service import generate_meal_plan
from app.models.meal_plan import MealPlan

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/meal-plans",
    tags=["meal-plans"]
)


class GenerateMealPlanRequest(BaseModel):
    """Request body for generating a meal plan"""
    week_start_date: str  # ISO format: "2025-12-08"
    num_recipes: int = 15  # Number of candidate recipes to retrieve


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
