"""Recipe data model"""
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict

# Valid meal types for recipes
VALID_MEAL_TYPES = {"breakfast", "lunch", "dinner", "snack"}


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
    meal_types: List[str] = Field(
        default_factory=list,
        description="What meals this recipe is suitable for: breakfast, lunch, dinner, snack. At least one required."
    )
    prep_time_minutes: int = Field(..., ge=0, description="Total preparation time")

    @field_validator('meal_types')
    @classmethod
    def validate_meal_types(cls, v: List[str]) -> List[str]:
        """Validate meal_types contains only valid values."""
        if v:  # Only validate if not empty (empty allowed during migration)
            invalid = set(v) - VALID_MEAL_TYPES
            if invalid:
                raise ValueError(f"Invalid meal types: {invalid}. Valid types: {VALID_MEAL_TYPES}")
        return v
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
    source_url: Optional[str] = Field(
        default=None,
        description="URL of original recipe source (if imported from web)"
    )
    source_name: Optional[str] = Field(
        default=None,
        description="Display name of source (e.g., 'AllRecipes', 'FoodNetwork')"
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
                "meal_types": ["lunch", "dinner"],
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


class ImportFromUrlRequest(BaseModel):
    """
    Request model for importing recipe from URL.

    Attributes:
        url: URL of the recipe to import
    """
    url: str = Field(..., description="URL of recipe to import")

    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://www.allrecipes.com/recipe/chocolate-chip-cookies"
            }
        }


class ImportedRecipeResponse(BaseModel):
    """
    Response model for recipe import from URL.

    Contains parsed recipe data along with metadata about parsing quality.

    Attributes:
        recipe_data: Parsed recipe (may have partial data)
        confidence: Confidence level of parsing ("high", "medium", "low")
        missing_fields: List of optional fields that couldn't be extracted
        warnings: List of warnings (e.g., paywall detected, incomplete data)
    """
    recipe_data: Recipe
    confidence: str = Field(..., description="Parsing confidence: high, medium, or low")
    missing_fields: List[str] = Field(
        default_factory=list,
        description="Fields that couldn't be extracted from HTML"
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Warnings about parsing quality (paywalls, incomplete data)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "recipe_data": {
                    "id": "chocolate-chip-cookies",
                    "title": "Chocolate Chip Cookies",
                    "ingredients": ["2 cups flour", "1 cup sugar"],
                    "instructions": "Mix and bake at 350F",
                    "prep_time_minutes": 15,
                    "active_cooking_time_minutes": 12,
                    "serves": 24,
                    "tags": ["dessert", "baking"],
                    "required_appliances": ["oven"],
                    "source_url": "https://www.allrecipes.com/recipe/...",
                    "source_name": "Allrecipes"
                },
                "confidence": "high",
                "missing_fields": [],
                "warnings": []
            }
        }
