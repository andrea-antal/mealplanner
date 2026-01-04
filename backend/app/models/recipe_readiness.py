"""Recipe readiness model for meal plan generation validation."""
from pydantic import BaseModel
from typing import Dict, List


class RecipeReadiness(BaseModel):
    """
    Response model for recipe readiness check.

    Used by the /meal-plans/readiness endpoint to determine if a workspace
    has sufficient recipe data for meal plan generation.

    Attributes:
        total_count: Total number of recipes in the workspace
        counts_by_meal_type: Recipe counts for each meal type
        is_ready: True if at least 1 recipe exists for each required type
        missing_meal_types: List of required meal types with 0 recipes
    """
    total_count: int
    counts_by_meal_type: Dict[str, int]
    is_ready: bool
    missing_meal_types: List[str]

    class Config:
        json_schema_extra = {
            "example": {
                "total_count": 5,
                "counts_by_meal_type": {
                    "breakfast": 2,
                    "lunch": 1,
                    "dinner": 2,
                    "snack": 0,
                    "side_dish": 0
                },
                "is_ready": True,
                "missing_meal_types": []
            }
        }
