"""Recipe data model"""
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict

# Valid meal types for recipes
VALID_MEAL_TYPES = {"breakfast", "lunch", "dinner", "snack", "side_dish"}


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
        description="What meals this recipe is suitable for: breakfast, lunch, dinner, snack/dessert. At least one required."
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
    notes: Optional[str] = Field(
        default=None,
        description="Personal notes about the recipe (tips, modifications, URLs, etc.)"
    )
    photo_url: Optional[str] = Field(
        default=None,
        description="URL of the primary recipe photo"
    )
    photo_urls: Optional[List[str]] = Field(
        default=None,
        description="URLs of additional recipe photos"
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


class ParseFromTextRequest(BaseModel):
    """
    Request model for parsing recipe from free-form text.

    Attributes:
        text: Free-form recipe text (ingredients, instructions, etc.)
    """
    text: str = Field(
        ...,
        min_length=50,
        max_length=10000,
        description="Recipe text to parse (50-10000 characters)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "text": "Chocolate Chip Cookies\n\nIngredients:\n- 2 cups flour\n- 1 cup butter\n\nInstructions:\n1. Mix ingredients\n2. Bake at 350F for 12 minutes"
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


class GenerateFromTitleRequest(BaseModel):
    """
    Request model for generating a recipe from just a title.

    Attributes:
        title: Recipe title to generate from
        meal_type: Type of meal (breakfast/lunch/dinner/snack)
        servings: Number of servings to generate for
    """
    title: str = Field(..., min_length=3, description="Recipe title to generate")
    meal_type: str = Field(default="dinner", description="Type of meal")
    servings: int = Field(default=4, gt=0, description="Number of servings")


# ============================================================================
# Photo OCR Models (for parsing recipes from photos)
# ============================================================================

class BoundingBox(BaseModel):
    """
    Normalized bounding box coordinates for a region in an image.

    All values are normalized to 0-1 scale where:
    - (0, 0) is the top-left corner
    - (1, 1) is the bottom-right corner

    Attributes:
        x: Left edge position (0-1)
        y: Top edge position (0-1)
        width: Width of region (0-1)
        height: Height of region (0-1)
    """
    x: float = Field(..., ge=0, le=1, description="Left edge (0-1 normalized)")
    y: float = Field(..., ge=0, le=1, description="Top edge (0-1 normalized)")
    width: float = Field(..., ge=0, le=1, description="Width (0-1 normalized)")
    height: float = Field(..., ge=0, le=1, description="Height (0-1 normalized)")


class TextRegion(BaseModel):
    """
    A region of text detected in a recipe photo.

    Attributes:
        text: The extracted text content
        region_type: Type of content (title, ingredients, instructions, unknown)
        confidence: OCR confidence level (high, medium, low)
        bounding_box: Optional bounding box for this region
    """
    text: str = Field(..., description="Extracted text content")
    region_type: str = Field(
        ...,
        description="Type of content: title, ingredients, instructions, or unknown"
    )
    confidence: str = Field(
        ...,
        description="OCR confidence: high, medium, or low"
    )
    bounding_box: Optional[BoundingBox] = Field(
        default=None,
        description="Bounding box for this text region (optional)"
    )


class OCRFromPhotoRequest(BaseModel):
    """
    Request model for extracting text from a recipe photo.

    Attributes:
        image_base64: Base64-encoded image data (PNG or JPEG)
    """
    image_base64: str = Field(..., description="Base64-encoded image (PNG/JPEG)")

    class Config:
        json_schema_extra = {
            "example": {
                "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAE..."
            }
        }


class OCRFromPhotoResponse(BaseModel):
    """
    Response from photo OCR extraction (Stage 1).

    Contains raw text and structured regions for user review before parsing.

    Attributes:
        raw_text: All extracted text from the image
        text_regions: List of identified text regions with positions
        ocr_confidence: Overall OCR confidence level
        is_handwritten: Whether the text appears to be handwritten
        warnings: List of warnings (image quality, unclear regions, etc.)
    """
    raw_text: str = Field(..., description="All extracted text from the image")
    text_regions: List[TextRegion] = Field(
        default_factory=list,
        description="Identified text regions with bounding boxes"
    )
    ocr_confidence: str = Field(
        ...,
        description="Overall OCR confidence: high, medium, or low"
    )
    is_handwritten: bool = Field(
        default=False,
        description="Whether the text appears to be handwritten"
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Warnings about image quality, unclear regions, etc."
    )

    class Config:
        json_schema_extra = {
            "example": {
                "raw_text": "Chocolate Chip Cookies\n\nIngredients:\n- 2 cups flour...",
                "text_regions": [
                    {
                        "text": "Chocolate Chip Cookies",
                        "region_type": "title",
                        "confidence": "high",
                        "bounding_box": {"x": 0.1, "y": 0.05, "width": 0.8, "height": 0.1}
                    }
                ],
                "ocr_confidence": "high",
                "is_handwritten": False,
                "warnings": []
            }
        }


class FieldConfidence(BaseModel):
    """
    Confidence information for a specific parsed field.

    Used for progressive confirmation of uncertain fields.

    Attributes:
        field_name: Name of the recipe field
        confidence: Parsing confidence (high, medium, low)
        bounding_box: Optional bounding box for visual context
        extracted_value: The extracted value for this field
        notes: Optional notes about the extraction
    """
    field_name: str = Field(..., description="Name of the recipe field")
    confidence: str = Field(..., description="Parsing confidence: high, medium, or low")
    bounding_box: Optional[BoundingBox] = Field(
        default=None,
        description="Bounding box for visual context"
    )
    extracted_value: Optional[str] = Field(
        default=None,
        description="The extracted value (as string for JSON serialization)"
    )
    notes: Optional[str] = Field(
        default=None,
        description="Notes about the extraction (e.g., 'spelling may be incorrect')"
    )
