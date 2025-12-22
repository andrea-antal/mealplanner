"""
Recipe rating model for tracking household member preferences.

Each recipe can have ratings from multiple household members:
- "like": Member enjoys this recipe
- "dislike": Member dislikes this recipe
- null/None: Member hasn't rated this recipe yet
"""
from pydantic import BaseModel, Field
from typing import Dict, Optional


class RecipeRating(BaseModel):
    """
    Per-recipe ratings from household members.

    Attributes:
        recipe_id: Unique identifier for the recipe
        ratings: Map of member_name to rating ('like', 'dislike', or None)

    Example:
        {
            "recipe_id": "recipe_001",
            "ratings": {
                "Andrea": "like",
                "Adam": "dislike",
                "Nathan": "like"
            }
        }
    """
    recipe_id: str = Field(..., description="Recipe ID")
    ratings: Dict[str, Optional[str]] = Field(
        default_factory=dict,
        description="Map of member_name to rating ('like', 'dislike', or null)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "recipe_id": "recipe_001",
                "ratings": {
                    "Andrea": "like",
                    "Adam": "dislike",
                    "Nathan": None
                }
            }
        }


class RatingUpdate(BaseModel):
    """
    Request model for updating a single member's rating.

    Attributes:
        member_name: Name of the household member
        rating: Rating value ('like', 'dislike', or null to clear)
    """
    member_name: str = Field(..., description="Household member name")
    rating: Optional[str] = Field(
        None,
        description="Rating: 'like', 'dislike', or null to clear rating"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "member_name": "Andrea",
                "rating": "like"
            }
        }
