"""
Recipe API endpoints.

Provides REST API for managing recipes in the system.
"""
import logging
from typing import List, Dict, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.models.recipe import Recipe, DynamicRecipeRequest
from app.models.recipe_rating import RecipeRating, RatingUpdate
from app.data.data_manager import (
    load_recipe, save_recipe, list_all_recipes, delete_recipe,
    get_recipe_rating, save_recipe_rating, delete_recipe_rating,
    load_recipe_ratings, load_household_profile
)
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


@router.get("/ratings", response_model=List[RecipeRating])
async def get_all_ratings():
    """
    Get all recipe ratings across all recipes.

    Returns:
        List of RecipeRating objects for all recipes with ratings

    Example response:
        [
            {
                "recipe_id": "recipe_001",
                "ratings": {
                    "Andrea": "like",
                    "Adam": "dislike",
                    "Nathan": "like"
                }
            },
            {
                "recipe_id": "recipe_002",
                "ratings": {
                    "Andrea": "like",
                    "Adam": "like"
                }
            }
        ]
    """
    ratings_dict = load_recipe_ratings()

    # Convert dict to list of RecipeRating objects
    ratings_list = [
        RecipeRating(recipe_id=recipe_id, ratings=ratings)
        for recipe_id, ratings in ratings_dict.items()
    ]

    logger.info(f"Retrieved ratings for {len(ratings_list)} recipes")
    return ratings_list


@router.get("/favorites/{member_name}", response_model=List[Recipe])
async def get_member_favorites(member_name: str):
    """
    Get all recipes liked by a specific household member.

    Args:
        member_name: Name of the household member

    Returns:
        List of Recipe objects that the member has liked

    Example:
        GET /recipes/favorites/Andrea
        Returns all recipes where Andrea's rating is "like"

    Raises:
        HTTPException 404: Member not found in household profile
    """
    # Verify member exists in household
    household = load_household_profile()
    if household:
        member_names = [member.name for member in household.family_members]
        if member_name not in member_names:
            raise HTTPException(
                status_code=404,
                detail=f"Member '{member_name}' not found in household profile"
            )

    # Get all ratings
    ratings_dict = load_recipe_ratings()

    # Find recipes where this member has "like" rating
    liked_recipe_ids = [
        recipe_id for recipe_id, ratings in ratings_dict.items()
        if ratings.get(member_name) == "like"
    ]

    # Load the full recipe objects
    favorite_recipes = []
    for recipe_id in liked_recipe_ids:
        recipe = load_recipe(recipe_id)
        if recipe:
            favorite_recipes.append(recipe)

    logger.info(f"Found {len(favorite_recipes)} favorites for {member_name}")
    return favorite_recipes


@router.get("/popular", response_model=List[Recipe])
async def get_popular_recipes():
    """
    Get recipes that are liked by all household members (family favorites).

    A recipe is considered "popular" if:
    - ALL household members have rated it
    - ALL ratings are "like" (no dislikes or unrated members)

    Returns:
        List of Recipe objects liked by all members (family favorites)

    Example response:
        [
            {
                "id": "recipe_003",
                "title": "Simple Pasta with Tomato Sauce",
                ...
            }
        ]
    """
    # Get all household members
    household = load_household_profile()
    if not household or not household.family_members:
        logger.warning("No household profile found, returning empty popular recipes")
        return []

    member_names = [member.name for member in household.family_members]

    # Get all ratings
    ratings_dict = load_recipe_ratings()

    # Find recipes where ALL household members rated it and ALL gave "like"
    popular_recipe_ids = []
    for recipe_id, ratings in ratings_dict.items():
        # Skip if no ratings
        if not ratings:
            continue

        # Check if ALL household members have rated this recipe
        members_who_rated = [name for name in member_names if name in ratings and ratings[name] is not None]
        if len(members_who_rated) != len(member_names):
            # Not all members have rated it
            continue

        # Check if ALL ratings are "like"
        all_ratings = [ratings[name] for name in member_names]
        if all(rating == "like" for rating in all_ratings):
            popular_recipe_ids.append(recipe_id)

    # Load the full recipe objects
    popular_recipes = []
    for recipe_id in popular_recipe_ids:
        recipe = load_recipe(recipe_id)
        if recipe:
            popular_recipes.append(recipe)

    logger.info(f"Found {len(popular_recipes)} popular recipes")
    return popular_recipes


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


@router.get("/{recipe_id}/ratings", response_model=Dict[str, Optional[str]])
async def get_recipe_ratings(recipe_id: str):
    """
    Get all ratings for a recipe.

    Args:
        recipe_id: Unique recipe identifier

    Returns:
        Dict mapping member_name to rating ('like', 'dislike', or null)

    Example response:
        {
            "Andrea": "like",
            "Adam": "dislike",
            "Nathan": "like"
        }

    Raises:
        HTTPException 404: Recipe not found
    """
    # Verify recipe exists
    recipe = load_recipe(recipe_id)
    if not recipe:
        raise HTTPException(
            status_code=404,
            detail=f"Recipe not found: {recipe_id}"
        )

    ratings = get_recipe_rating(recipe_id)
    logger.info(f"Retrieved ratings for {recipe_id}: {len(ratings)} members")
    return ratings


@router.post("/{recipe_id}/rating", response_model=Dict[str, Optional[str]])
async def rate_recipe(recipe_id: str, rating_update: RatingUpdate):
    """
    Rate a recipe for a specific household member.

    Args:
        recipe_id: Unique recipe identifier
        rating_update: RatingUpdate with member_name and rating

    Returns:
        Updated ratings dict for this recipe

    Example request body:
        {
            "member_name": "Andrea",
            "rating": "like"
        }

    Example response:
        {
            "Andrea": "like",
            "Adam": "dislike",
            "Nathan": "like"
        }

    Raises:
        HTTPException 404: Recipe not found
        HTTPException 400: Invalid rating value
        HTTPException 500: Failed to save rating
    """
    # Verify recipe exists
    recipe = load_recipe(recipe_id)
    if not recipe:
        raise HTTPException(
            status_code=404,
            detail=f"Recipe not found: {recipe_id}"
        )

    # Validate rating value
    if rating_update.rating is not None and rating_update.rating not in ["like", "dislike"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid rating: must be 'like', 'dislike', or null"
        )

    try:
        updated_ratings = save_recipe_rating(
            recipe_id=recipe_id,
            member_name=rating_update.member_name,
            rating=rating_update.rating
        )
        logger.info(f"Updated rating for {recipe_id} by {rating_update.member_name}: {rating_update.rating}")
        return updated_ratings
    except Exception as e:
        logger.error(f"Failed to save rating: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save rating: {str(e)}"
        )


@router.delete("/{recipe_id}", status_code=204)
async def delete_recipe_endpoint(recipe_id: str):
    """
    Delete a recipe by ID.

    Also deletes associated ratings to prevent orphaned data.

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

        # Clean up associated ratings
        delete_recipe_rating(recipe_id)

        logger.info(f"Deleted recipe and ratings: {recipe_id}")
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
