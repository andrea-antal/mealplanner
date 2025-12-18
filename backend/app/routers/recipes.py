"""
Recipe API endpoints.

Provides REST API for managing recipes in the system.
"""
import logging
from typing import List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.models.recipe import Recipe, DynamicRecipeRequest
from app.data.data_manager import load_recipe, save_recipe, list_all_recipes, delete_recipe
from app.services.claude_service import generate_recipe_from_ingredients, generate_recipe_from_title

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/recipes",
    tags=["recipes"]
)


class GenerateFromTitleRequest(BaseModel):
    """Request model for generating a recipe from a title."""
    recipe_title: str
    meal_type: str = "dinner"
    servings: int = 4


@router.get("", response_model=List[Recipe])
async def get_all_recipes():
    """
    Get all recipes in the system.

    Returns:
        List of all Recipe objects
    """
    recipes = list_all_recipes()
    logger.info(f"Retrieved {len(recipes)} recipes")
    return recipes


@router.get("/{recipe_id}", response_model=Recipe)
async def get_recipe(recipe_id: str):
    """
    Get a single recipe by ID.

    Args:
        recipe_id: Unique recipe identifier

    Returns:
        Recipe object

    Raises:
        HTTPException 404: Recipe not found
    """
    recipe = load_recipe(recipe_id)

    if not recipe:
        raise HTTPException(
            status_code=404,
            detail=f"Recipe not found: {recipe_id}"
        )

    return recipe


@router.post("", response_model=Recipe, status_code=201)
async def create_recipe(recipe: Recipe):
    """
    Create a new recipe.

    Args:
        recipe: Complete Recipe object

    Returns:
        The created recipe

    Raises:
        HTTPException 409: Recipe ID already exists
        HTTPException 500: Failed to save recipe
    """
    # Check if recipe already exists
    existing = load_recipe(recipe.id)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Recipe with ID {recipe.id} already exists"
        )

    try:
        save_recipe(recipe)
        logger.info(f"Created new recipe: {recipe.id} - {recipe.title}")
        return recipe
    except Exception as e:
        logger.error(f"Failed to save recipe: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save recipe: {str(e)}"
        )


@router.put("/{recipe_id}", response_model=Recipe)
async def update_recipe(recipe_id: str, recipe: Recipe):
    """
    Update an existing recipe.

    Args:
        recipe_id: Recipe ID from URL (must match recipe.id in body)
        recipe: Complete Recipe object

    Returns:
        The updated recipe

    Raises:
        HTTPException 400: Recipe ID mismatch
        HTTPException 404: Recipe not found
        HTTPException 500: Failed to save recipe
    """
    if recipe.id != recipe_id:
        raise HTTPException(
            status_code=400,
            detail=f"Recipe ID mismatch: URL={recipe_id}, body={recipe.id}"
        )

    # Check if recipe exists
    existing = load_recipe(recipe_id)
    if not existing:
        raise HTTPException(
            status_code=404,
            detail=f"Recipe not found: {recipe_id}"
        )

    try:
        save_recipe(recipe)
        logger.info(f"Updated recipe: {recipe.id} - {recipe.title}")
        return recipe
    except Exception as e:
        logger.error(f"Failed to update recipe: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update recipe: {str(e)}"
        )


@router.delete("/{recipe_id}", status_code=204)
async def delete_recipe_endpoint(recipe_id: str):
    """
    Delete a recipe by ID.

    Args:
        recipe_id: Unique recipe identifier

    Returns:
        No content (204 status)

    Raises:
        HTTPException 404: Recipe not found
        HTTPException 500: Failed to delete recipe
    """
    try:
        deleted = delete_recipe(recipe_id)

        if not deleted:
            raise HTTPException(
                status_code=404,
                detail=f"Recipe not found: {recipe_id}"
            )

        logger.info(f"Deleted recipe: {recipe_id}")
        return None
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Failed to delete recipe {recipe_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete recipe: {str(e)}"
        )


@router.post("/generate", response_model=Recipe, status_code=201)
async def generate_recipe(request: DynamicRecipeRequest):
    """
    Generate a recipe dynamically from selected ingredients using Claude AI.

    Args:
        request: DynamicRecipeRequest with ingredients, portions, meal type, etc.

    Returns:
        Generated Recipe object with is_generated=True

    Raises:
        HTTPException 400: Invalid request (e.g., no ingredients)
        HTTPException 500: Failed to generate recipe
        HTTPException 503: Claude API unavailable
    """
    if not request.ingredients or len(request.ingredients) == 0:
        raise HTTPException(
            status_code=400,
            detail="At least one ingredient is required"
        )

    try:
        logger.info(f"Generating recipe from {len(request.ingredients)} ingredients")
        recipe = await generate_recipe_from_ingredients(
            ingredients=request.ingredients,
            portions=request.portions or {},
            meal_type=request.meal_type or "dinner",
            cuisine_type=request.cuisine_type,
            cooking_time_max=request.cooking_time_max,
            servings=request.servings
        )

        # Save the generated recipe
        save_recipe(recipe)
        logger.info(f"Generated and saved recipe: {recipe.id} - {recipe.title}")

        # Embed the recipe in Chroma for RAG retrieval
        from app.data.chroma_manager import embed_recipes
        embed_recipes([recipe])
        logger.info(f"Embedded recipe in Chroma DB: {recipe.id}")

        return recipe

    except ValueError as e:
        # Invalid input or Claude API error
        logger.error(f"Failed to generate recipe: {e}")
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except ConnectionError as e:
        # Claude API unavailable
        logger.error(f"Claude API unavailable: {e}")
        raise HTTPException(
            status_code=503,
            detail="Recipe generation service temporarily unavailable"
        )
    except Exception as e:
        logger.error(f"Unexpected error generating recipe: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate recipe: {str(e)}"
        )


@router.post("/generate-from-title", response_model=Recipe, status_code=201)
async def generate_recipe_from_title_endpoint(request: GenerateFromTitleRequest):
    """
    Generate a recipe from a title using Claude AI.

    Args:
        request: GenerateFromTitleRequest with recipe title, meal type, and servings

    Returns:
        Generated Recipe object with is_generated=True

    Raises:
        HTTPException 400: Invalid request (e.g., empty title)
        HTTPException 409: Recipe with this title already exists
        HTTPException 500: Failed to generate recipe
        HTTPException 503: Claude API unavailable
    """
    if not request.recipe_title or not request.recipe_title.strip():
        raise HTTPException(
            status_code=400,
            detail="Recipe title is required"
        )

    # Check if a recipe with this title already exists
    all_recipes = list_all_recipes()
    for existing_recipe in all_recipes:
        if existing_recipe.title.lower() == request.recipe_title.strip().lower():
            raise HTTPException(
                status_code=409,
                detail=f"A recipe with the title '{request.recipe_title}' already exists"
            )

    try:
        logger.info(f"Generating recipe from title: '{request.recipe_title}'")
        recipe = await generate_recipe_from_title(
            recipe_title=request.recipe_title.strip(),
            meal_type=request.meal_type,
            servings=request.servings
        )

        # Save the generated recipe
        save_recipe(recipe)
        logger.info(f"Generated and saved recipe: {recipe.id} - {recipe.title}")

        # Embed the recipe in Chroma for RAG retrieval
        from app.data.chroma_manager import embed_recipes
        embed_recipes([recipe])
        logger.info(f"Embedded recipe in Chroma DB: {recipe.id}")

        return recipe

    except ValueError as e:
        # Invalid input or Claude API error
        logger.error(f"Failed to generate recipe: {e}")
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except ConnectionError as e:
        # Claude API unavailable
        logger.error(f"Claude API unavailable: {e}")
        raise HTTPException(
            status_code=503,
            detail="Recipe generation service temporarily unavailable"
        )
    except Exception as e:
        logger.error(f"Unexpected error generating recipe: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate recipe: {str(e)}"
        )


@router.post("/admin/sync-chroma", tags=["admin"])
async def sync_chroma_db():
    """
    Admin endpoint to sync Chroma DB with recipe storage.

    Removes orphaned entries and adds missing embeddings.
    Useful for fixing inconsistencies between JSON storage and Chroma vector DB.

    Returns:
        dict: Sync statistics
            - orphaned_removed: Number of orphaned Chroma entries removed
            - missing_added: Number of missing recipes added to Chroma
            - total_in_sync: Total number of recipes now in sync
    """
    from app.data.chroma_manager import sync_chroma_with_storage

    try:
        stats = sync_chroma_with_storage()
        logger.info(f"Chroma sync completed: {stats}")
        return {
            "message": "Chroma DB synchronized with recipe storage",
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Failed to sync Chroma DB: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Chroma sync failed: {str(e)}"
        )
