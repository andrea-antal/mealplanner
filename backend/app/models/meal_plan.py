"""Meal plan data models"""
from __future__ import annotations
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import date as Date, datetime


class Meal(BaseModel):
    """Represents a single meal in the plan"""
    meal_type: str = Field(..., description="Meal type: breakfast, lunch, dinner, snack")
    for_who: str = Field(..., description="Who this meal is for (family member name or 'everyone')")
    recipe_id: Optional[str] = Field(None, description="Reference to recipe ID (optional for simple snacks)")
    recipe_title: str = Field(..., description="Recipe title for quick reference")
    notes: str = Field(default="", description="Optional notes (e.g., 'for daycare lunch')")
    # Fields for undo functionality
    previous_recipe_id: Optional[str] = Field(None, description="Previous recipe ID before swap (for undo)")
    previous_recipe_title: Optional[str] = Field(None, description="Previous recipe title before swap (for undo)")


class Day(BaseModel):
    """Represents a single day's meals"""
    date: Date = Field(..., description="Date for this day")
    meals: List[Meal] = Field(..., min_length=1, description="List of meals for this day")


class MealPlan(BaseModel):
    """
    Complete weekly meal plan.

    This is the output from the meal plan generation service,
    containing a full week of meals organized by day.
    """
    id: Optional[str] = Field(None, description="Unique identifier (defaults to week_start_date string)")
    week_start_date: Date = Field(..., description="Starting date of the week (typically Monday)")
    days: List[Day] = Field(..., min_length=7, max_length=7, description="7 days of meals")
    created_at: Optional[datetime] = Field(default_factory=datetime.now, description="When the meal plan was created")
    updated_at: Optional[datetime] = Field(None, description="When the meal plan was last updated")

    def model_post_init(self, __context) -> None:
        """Set id to week_start_date string if not provided."""
        if self.id is None:
            # Use object.__setattr__ to bypass Pydantic's frozen model protection
            object.__setattr__(self, 'id', str(self.week_start_date))

    class Config:
        json_schema_extra = {
            "example": {
                "id": "2025-12-03",
                "week_start_date": "2025-12-03",
                "days": [
                    {
                        "date": "2025-12-03",
                        "meals": [
                            {
                                "meal_type": "dinner",
                                "for_who": "everyone",
                                "recipe_id": "recipe_001",
                                "recipe_title": "One-Pot Chicken and Rice",
                                "notes": ""
                            }
                        ]
                    }
                ],
                "created_at": "2025-12-03T10:00:00",
                "updated_at": None
            }
        }
