"""Recipe data model"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict


class Recipe(BaseModel):
    """
    Represents a recipe with all necessary metadata for meal planning.

    Attributes:
        id: Unique identifier for the recipe
        title: Recipe name
        ingredients: List of ingredients with quantities
        instructions: Step-by-step cooking instructions
        tags: Categories/attributes (e.g., "toddler-friendly", "quick", "daycare-safe")
        prep_time_minutes: Total prep time
        active_cooking_time_minutes: Active time spent cooking (for time constraints)
        serves: Number of servings
        required_appliances: Appliances needed (e.g., "oven", "instant_pot")
    """
    id: str = Field(..., description="Unique recipe identifier")
    title: str = Field(..., min_length=1, description="Recipe name")
    ingredients: List[str] = Field(..., min_length=1, description="List of ingredients")
    instructions: str = Field(..., min_length=1, description="Cooking instructions")
    tags: List[str] = Field(
        default_factory=list,
        description="Tags like toddler-friendly, quick, daycare-safe, husband-approved, batch-cookable"
    )
    prep_time_minutes: int = Field(..., ge=0, description="Total preparation time")
    active_cooking_time_minutes: int = Field(..., ge=0, description="Active cooking time")
    serves: int = Field(..., gt=0, description="Number of servings")
    required_appliances: List[str] = Field(
        default_factory=list,
        description="Required appliances: oven, instant_pot, blender, microwave, food_processor"
    )
    is_generated: bool = Field(
        default=False,
        description="Whether this recipe was dynamically generated from ingredients"
    )
    description: Optional[str] = Field(
        default=None,
        description="Optional recipe description or notes"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "id": "recipe_001",
                "title": "One-Pot Chicken and Rice",
                "description": "A simple and delicious one-pot meal",
                "ingredients": [
                    "2 lbs chicken breast",
                    "2 cups rice",
                    "4 cups chicken broth"
                ],
                "instructions": "1. Sauté chicken. 2. Add rice and broth. 3. Simmer 20 min.",
                "tags": ["toddler-friendly", "quick", "husband-approved"],
                "prep_time_minutes": 10,
                "active_cooking_time_minutes": 25,
                "serves": 6,
                "required_appliances": ["oven"],
                "is_generated": False
            }
        }


class DynamicRecipeRequest(BaseModel):
    """
    Request model for dynamic recipe generation from selected ingredients.

    Attributes:
        ingredients: List of available ingredients to use
        portions: Optional quantities for specific ingredients (e.g., {"chicken breast": "2 pieces"})
        meal_type: Type of meal to generate (breakfast/lunch/dinner/snack)
        cuisine_type: Optional cuisine style (italian, mexican, chinese, korean, japanese, greek, healthy, or custom)
        cooking_time_max: Maximum cooking time in minutes
        servings: Number of servings to generate for
    """
    ingredients: List[str] = Field(..., min_length=1, description="List of ingredients to use")
    portions: Optional[Dict[str, str]] = Field(
        default_factory=dict,
        description="Optional quantities for ingredients"
    )
    meal_type: Optional[str] = Field(
        default="dinner",
        description="Type of meal: breakfast, lunch, dinner, or snack"
    )
    cuisine_type: Optional[str] = Field(
        default=None,
        description="Cuisine style: italian, mexican, chinese, korean, japanese, greek, healthy, or custom value"
    )
    cooking_time_max: Optional[int] = Field(
        default=None,
        ge=0,
        description="Maximum cooking time in minutes"
    )
    servings: int = Field(default=4, gt=0, description="Number of servings")

    class Config:
        json_schema_extra = {
            "example": {
                "ingredients": ["chicken breast", "rice", "broccoli"],
                "portions": {"chicken breast": "2 pieces"},
                "meal_type": "dinner",
                "cuisine_type": "italian",
                "cooking_time_max": 30,
                "servings": 4
            }
        }
