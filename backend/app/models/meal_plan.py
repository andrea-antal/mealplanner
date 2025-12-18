"""Meal plan data models"""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date as Date


class Meal(BaseModel):
    """Represents a single meal in the plan"""
    meal_type: str = Field(..., description="Meal type: breakfast, lunch, dinner, snack")
    for_who: str = Field(..., description="Who this meal is for (family member name or 'everyone')")
    recipe_id: Optional[str] = Field(None, description="Reference to recipe ID (optional for simple snacks)")
    recipe_title: str = Field(..., description="Recipe title for quick reference")
    notes: str = Field(default="", description="Optional notes (e.g., 'for daycare lunch')")


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
    week_start_date: Date = Field(..., description="Starting date of the week (typically Monday)")
    days: List[Day] = Field(..., min_length=7, max_length=7, description="7 days of meals")

    class Config:
        json_schema_extra = {
            "example": {
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
                ]
            }
        }
