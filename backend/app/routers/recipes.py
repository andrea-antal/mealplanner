"""
Recipe API endpoints.

Provides REST API for managing recipes in the system.
"""
import logging
from typing import List, Dict, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.models.recipe import Recipe, DynamicRecipeRequest, ImportFromUrlRequest, ImportedRecipeResponse
from app.models.recipe_rating import RecipeRating, RatingUpdate
from app.data.data_manager import (
    load_recipe, save_recipe, list_all_recipes, delete_recipe,
    get_recipe_rating, save_recipe_rating, delete_recipe_rating,
    load_recipe_ratings, load_household_profile
)
from app.services.claude_service import generate_recipe_from_ingredients, generate_recipe_from_title, parse_recipe_from_url
from app.services.url_fetcher import fetch_html_from_url

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
async def get_all_recipes(workspace_id: str = Query(..., description="Workspace identifier")):
    """
    Get all recipes in the system.

    Args:
        workspace_id: Workspace identifier for data isolation

    Returns:
        List of all Recipe objects
    """
    recipes = list_all_recipes(workspace_id)
    logger.info(f"Retrieved {len(recipes)} recipes for workspace '{workspace_id}'")
    return recipes


@router.get("/ratings", response_model=List[RecipeRating])
async def get_all_ratings(workspace_id: str = Query(..., description="Workspace identifier")):
    """
    Get all recipe ratings across all recipes.

    Args:
        workspace_id: Workspace identifier for data isolation

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
    ratings_dict = load_recipe_ratings(workspace_id)

    # Convert dict to list of RecipeRating objects
    ratings_list = [
        RecipeRating(recipe_id=recipe_id, ratings=ratings)
        for recipe_id, ratings in ratings_dict.items()
    ]

    logger.info(f"Retrieved ratings for {len(ratings_list)} recipes in workspace '{workspace_id}'")
    return ratings_list


@router.get("/favorites/{member_name}", response_model=List[Recipe])
async def get_member_favorites(
    member_name: str,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Get all recipes liked by a specific household member.

    Args:
        member_name: Name of the household member
        workspace_id: Workspace identifier for data isolation

    Returns:
        List of Recipe objects that the member has liked

    Example:
        GET /recipes/favorites/Andrea?workspace_id=andrea
        Returns all recipes where Andrea's rating is "like"

    Raises:
        HTTPException 404: Member not found in household profile
    """
    # Verify member exists in household
    household = load_household_profile(workspace_id)
    if household:
        member_names = [member.name for member in household.family_members]
        if member_name not in member_names:
            raise HTTPException(
                status_code=404,
                detail=f"Member '{member_name}' not found in household profile"
            )

    # Get all ratings
    ratings_dict = load_recipe_ratings(workspace_id)

    # Find recipes where this member has "like" rating
    liked_recipe_ids = [
        recipe_id for recipe_id, ratings in ratings_dict.items()
        if ratings.get(member_name) == "like"
    ]

    # Load the full recipe objects
    favorite_recipes = []
    for recipe_id in liked_recipe_ids:
        recipe = load_recipe(workspace_id, recipe_id)
        if recipe:
            favorite_recipes.append(recipe)

    logger.info(f"Found {len(favorite_recipes)} favorites for {member_name} in workspace '{workspace_id}'")
    return favorite_recipes


@router.get("/popular", response_model=List[Recipe])
async def get_popular_recipes(workspace_id: str = Query(..., description="Workspace identifier")):
    """
    Get recipes that are liked by all household members (family favorites).

    A recipe is considered "popular" if:
    - ALL household members have rated it
    - ALL ratings are "like" (no dislikes or unrated members)

    Args:
        workspace_id: Workspace identifier for data isolation

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
    household = load_household_profile(workspace_id)
    if not household or not household.family_members:
        logger.warning(f"No household profile found for workspace '{workspace_id}', returning empty popular recipes")
        return []

    member_names = [member.name for member in household.family_members]

    # Get all ratings
    ratings_dict = load_recipe_ratings(workspace_id)

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
        recipe = load_recipe(workspace_id, recipe_id)
        if recipe:
            popular_recipes.append(recipe)

    logger.info(f"Found {len(popular_recipes)} popular recipes for workspace '{workspace_id}'")
    return popular_recipes


@router.get("/{recipe_id}", response_model=Recipe)
async def get_recipe(
    recipe_id: str,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Get a single recipe by ID.

    Args:
        recipe_id: Unique recipe identifier
        workspace_id: Workspace identifier for data isolation

    Returns:
        Recipe object

    Raises:
        HTTPException 404: Recipe not found
    """
    recipe = load_recipe(workspace_id, recipe_id)

    if not recipe:
        raise HTTPException(
            status_code=404,
            detail=f"Recipe not found: {recipe_id}"
        )

    return recipe


@router.post("", response_model=Recipe, status_code=201)
async def create_recipe(
    recipe: Recipe,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Create a new recipe.

    Args:
        recipe: Complete Recipe object
        workspace_id: Workspace identifier for data isolation

    Returns:
        The created recipe

    Raises:
        HTTPException 409: Recipe ID already exists
        HTTPException 500: Failed to save recipe
    """
    # Check if recipe already exists
    existing = load_recipe(workspace_id, recipe.id)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Recipe with ID {recipe.id} already exists"
        )

    try:
        save_recipe(workspace_id, recipe)
        logger.info(f"Created new recipe: {recipe.id} - {recipe.title} in workspace '{workspace_id}'")
        return recipe
    except Exception as e:
        logger.error(f"Failed to save recipe for workspace '{workspace_id}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save recipe: {str(e)}"
        )


@router.put("/{recipe_id}", response_model=Recipe)
async def update_recipe(
    recipe_id: str,
    recipe: Recipe,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Update an existing recipe.

    Args:
        recipe_id: Recipe ID from URL (must match recipe.id in body)
        recipe: Complete Recipe object
        workspace_id: Workspace identifier for data isolation

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
    existing = load_recipe(workspace_id, recipe_id)
    if not existing:
        raise HTTPException(
            status_code=404,
            detail=f"Recipe not found: {recipe_id}"
        )

    try:
        save_recipe(workspace_id, recipe)
        logger.info(f"Updated recipe: {recipe.id} - {recipe.title} in workspace '{workspace_id}'")
        return recipe
    except Exception as e:
        logger.error(f"Failed to update recipe for workspace '{workspace_id}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update recipe: {str(e)}"
        )


@router.get("/{recipe_id}/ratings", response_model=Dict[str, Optional[str]])
async def get_recipe_ratings(
    recipe_id: str,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Get all ratings for a recipe.

    Args:
        recipe_id: Unique recipe identifier
        workspace_id: Workspace identifier for data isolation

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
    recipe = load_recipe(workspace_id, recipe_id)
    if not recipe:
        raise HTTPException(
            status_code=404,
            detail=f"Recipe not found: {recipe_id}"
        )

    ratings = get_recipe_rating(workspace_id, recipe_id)
    logger.info(f"Retrieved ratings for {recipe_id} in workspace '{workspace_id}': {len(ratings)} members")
    return ratings


@router.post("/{recipe_id}/rating", response_model=Dict[str, Optional[str]])
async def rate_recipe(
    recipe_id: str,
    rating_update: RatingUpdate,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Rate a recipe for a specific household member.

    Args:
        recipe_id: Unique recipe identifier
        rating_update: RatingUpdate with member_name and rating
        workspace_id: Workspace identifier for data isolation

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
    recipe = load_recipe(workspace_id, recipe_id)
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
            workspace_id=workspace_id,
            recipe_id=recipe_id,
            member_name=rating_update.member_name,
            rating=rating_update.rating
        )
        logger.info(f"Updated rating for {recipe_id} by {rating_update.member_name} in workspace '{workspace_id}': {rating_update.rating}")
        return updated_ratings
    except Exception as e:
        logger.error(f"Failed to save rating for workspace '{workspace_id}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save rating: {str(e)}"
        )


@router.delete("/{recipe_id}", status_code=204)
async def delete_recipe_endpoint(
    recipe_id: str,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Delete a recipe by ID.

    Also deletes associated ratings to prevent orphaned data.

    Args:
        recipe_id: Unique recipe identifier
        workspace_id: Workspace identifier for data isolation

    Returns:
        No content (204 status)

    Raises:
        HTTPException 404: Recipe not found
        HTTPException 500: Failed to delete recipe
    """
    try:
        deleted = delete_recipe(workspace_id, recipe_id)

        if not deleted:
            raise HTTPException(
                status_code=404,
                detail=f"Recipe not found: {recipe_id}"
            )

        # Clean up associated ratings
        delete_recipe_rating(workspace_id, recipe_id)

        logger.info(f"Deleted recipe and ratings: {recipe_id} from workspace '{workspace_id}'")
        return None
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Failed to delete recipe {recipe_id} for workspace '{workspace_id}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete recipe: {str(e)}"
        )


@router.post("/import-from-url", response_model=ImportedRecipeResponse, status_code=200)
async def import_recipe_from_url(
    request: ImportFromUrlRequest,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Import recipe from URL using Claude AI to parse HTML content.

    This endpoint fetches HTML from a recipe URL and uses Claude to extract
    structured recipe data. The recipe is NOT automatically saved - it's returned
    to the frontend for user review and editing before final submission.

    Args:
        request: ImportFromUrlRequest containing the URL to import
        workspace_id: Workspace identifier for validation

    Returns:
        ImportedRecipeResponse with:
        - recipe_data: Parsed Recipe object (may have partial data)
        - confidence: "high", "medium", or "low" based on parsing quality
        - missing_fields: List of fields that couldn't be extracted
        - warnings: Warnings about paywalls, incomplete data, etc.

    Raises:
        HTTPException 400: Invalid URL format or failed to parse recipe
        HTTPException 503: Failed to fetch URL (network error, 404, timeout)
        HTTPException 422: Invalid request body

    Example:
        POST /recipes/import-from-url?workspace_id=andrea
        Body: {"url": "https://www.allrecipes.com/recipe/chocolate-chip-cookies"}

        Response: {
            "recipe_data": {...},
            "confidence": "high",
            "missing_fields": [],
            "warnings": []
        }
    """
    try:
        # Validate workspace_id
        if not workspace_id or not workspace_id.strip():
            raise HTTPException(status_code=400, detail="workspace_id cannot be empty")

        # Validate URL format first (will raise ValueError if invalid)
        logger.info(f"Importing recipe from URL: {request.url}")

        # Fetch HTML from URL
        try:
            html_content, source_name = await fetch_html_from_url(request.url)
            logger.info(f"Successfully fetched HTML from {source_name}")
        except ValueError as e:
            # Invalid URL format
            logger.warning(f"Invalid URL format: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid URL: {str(e)}")
        except Exception as e:
            # Network errors, timeouts, 404s, etc.
            logger.error(f"Failed to fetch URL {request.url}: {e}")
            raise HTTPException(
                status_code=503,
                detail=f"Failed to fetch recipe from URL: {str(e)}"
            )

        # Parse recipe using Claude
        try:
            recipe, confidence, missing_fields, warnings = await parse_recipe_from_url(
                request.url,
                html_content
            )
            logger.info(f"Successfully parsed recipe '{recipe.title}' with {confidence} confidence")
        except ValueError as e:
            # Parsing failed (no recipe found, invalid content, etc.)
            logger.warning(f"Failed to parse recipe from {request.url}: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to parse recipe: {str(e)}"
            )
        except Exception as e:
            # Unexpected errors
            logger.error(f"Unexpected error parsing recipe: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to parse recipe: {str(e)}"
            )

        # Set source fields
        recipe.source_url = request.url
        recipe.source_name = source_name

        # Return parsed data for user review (DO NOT SAVE)
        return ImportedRecipeResponse(
            recipe_data=recipe,
            confidence=confidence,
            missing_fields=missing_fields,
            warnings=warnings
        )

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Failed to import recipe from URL: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to import recipe: {str(e)}"
        )


@router.post("/generate", response_model=Recipe, status_code=201)
async def generate_recipe(
    request: DynamicRecipeRequest,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Generate a recipe dynamically from selected ingredients using Claude AI.

    Args:
        request: DynamicRecipeRequest with ingredients, portions, meal type, etc.
        workspace_id: Workspace identifier for data isolation

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
        logger.info(f"Generating recipe from {len(request.ingredients)} ingredients for workspace '{workspace_id}'")
        recipe = await generate_recipe_from_ingredients(
            ingredients=request.ingredients,
            portions=request.portions or {},
            meal_type=request.meal_type or "dinner",
            cuisine_type=request.cuisine_type,
            cooking_time_max=request.cooking_time_max,
            servings=request.servings
        )

        # Save the generated recipe
        save_recipe(workspace_id, recipe)
        logger.info(f"Generated and saved recipe: {recipe.id} - {recipe.title} for workspace '{workspace_id}'")

        # Embed the recipe in Chroma for RAG retrieval
        from app.data.chroma_manager import embed_recipes
        embed_recipes(workspace_id, [recipe])
        logger.info(f"Embedded recipe in Chroma DB: {recipe.id} for workspace '{workspace_id}'")

        return recipe

    except ValueError as e:
        # Invalid input or Claude API error
        logger.error(f"Failed to generate recipe for workspace '{workspace_id}': {e}")
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
async def generate_recipe_from_title_endpoint(
    request: GenerateFromTitleRequest,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Generate a recipe from a title using Claude AI.

    Args:
        request: GenerateFromTitleRequest with recipe title, meal type, and servings
        workspace_id: Workspace identifier for data isolation

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
    all_recipes = list_all_recipes(workspace_id)
    for existing_recipe in all_recipes:
        if existing_recipe.title.lower() == request.recipe_title.strip().lower():
            raise HTTPException(
                status_code=409,
                detail=f"A recipe with the title '{request.recipe_title}' already exists"
            )

    try:
        logger.info(f"Generating recipe from title: '{request.recipe_title}' for workspace '{workspace_id}'")
        recipe = await generate_recipe_from_title(
            recipe_title=request.recipe_title.strip(),
            meal_type=request.meal_type,
            servings=request.servings
        )

        # Save the generated recipe
        save_recipe(workspace_id, recipe)
        logger.info(f"Generated and saved recipe: {recipe.id} - {recipe.title} for workspace '{workspace_id}'")

        # Embed the recipe in Chroma for RAG retrieval
        from app.data.chroma_manager import embed_recipes
        embed_recipes(workspace_id, [recipe])
        logger.info(f"Embedded recipe in Chroma DB: {recipe.id} for workspace '{workspace_id}'")

        return recipe

    except ValueError as e:
        # Invalid input or Claude API error
        logger.error(f"Failed to generate recipe for workspace '{workspace_id}': {e}")
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
        logger.error(f"Unexpected error generating recipe for workspace '{workspace_id}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate recipe: {str(e)}"
        )


@router.post("/admin/sync-chroma", tags=["admin"])
async def sync_chroma_db(workspace_id: str = Query(..., description="Workspace identifier")):
    """
    Admin endpoint to sync Chroma DB with recipe storage for a workspace.

    Removes orphaned entries and adds missing embeddings.
    Useful for fixing inconsistencies between JSON storage and Chroma vector DB.

    Args:
        workspace_id: Workspace identifier for data isolation

    Returns:
        dict: Sync statistics
            - orphaned_removed: Number of orphaned Chroma entries removed
            - missing_added: Number of missing recipes added to Chroma
            - total_in_sync: Total number of recipes now in sync
    """
    from app.data.chroma_manager import sync_chroma_with_storage

    try:
        stats = sync_chroma_with_storage(workspace_id)
        logger.info(f"Chroma sync completed for workspace '{workspace_id}': {stats}")
        return {
            "message": f"Chroma DB synchronized with recipe storage for workspace '{workspace_id}'",
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Failed to sync Chroma DB for workspace '{workspace_id}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Chroma sync failed: {str(e)}"
        )


# Keywords for inferring meal types
MEAL_TYPE_KEYWORDS = {
    "breakfast": ["breakfast", "oatmeal", "pancake", "waffle", "egg", "cereal", "toast", "muffin", "smoothie", "granola", "yogurt", "french toast", "bacon", "sausage", "bagel"],
    "lunch": ["lunch", "sandwich", "salad", "wrap", "soup", "panini", "burger", "quesadilla", "bowl", "pita"],
    "dinner": ["dinner", "stir-fry", "stir fry", "roast", "baked", "casserole", "pasta", "curry", "stew", "grilled", "braised", "chicken", "beef", "pork", "fish", "salmon", "tofu"],
    "snack": ["snack", "bar", "bars", "bites", "cookie", "cracker", "chip", "dip", "popcorn", "nuts", "fruit"]
}


def infer_meal_types(recipe: dict) -> list:
    """Infer meal_types for a recipe based on its title and tags."""
    from app.models.recipe import VALID_MEAL_TYPES
    meal_types = set()
    title = recipe.get("title", "").lower()
    tags = [tag.lower() for tag in recipe.get("tags", [])]
    search_text = title + " " + " ".join(tags)

    # Check for direct meal type mentions in tags
    for tag in tags:
        if tag in VALID_MEAL_TYPES:
            meal_types.add(tag)

    # If no direct match, check keywords
    if not meal_types:
        for meal_type, keywords in MEAL_TYPE_KEYWORDS.items():
            for keyword in keywords:
                if keyword in search_text:
                    meal_types.add(meal_type)
                    break

    # Default to dinner
    if not meal_types:
        meal_types.add("dinner")

    return sorted(list(meal_types))


@router.post("/migrate-meal-types")
async def migrate_meal_types(
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    One-time migration to add meal_types to all recipes in a workspace.
    Safe to run multiple times - skips recipes that already have meal_types.
    """
    recipes = list_all_recipes(workspace_id)
    stats = {"total": 0, "updated": 0, "skipped": 0, "errors": 0}

    for recipe in recipes:
        stats["total"] += 1
        try:
            # Skip if already has meal_types
            if recipe.meal_types and len(recipe.meal_types) > 0:
                stats["skipped"] += 1
                continue

            # Infer meal types
            recipe_dict = recipe.model_dump()
            meal_types = infer_meal_types(recipe_dict)
            recipe_dict["meal_types"] = meal_types

            # Save updated recipe
            updated_recipe = Recipe(**recipe_dict)
            save_recipe(workspace_id, updated_recipe)
            stats["updated"] += 1
            logger.info(f"Migrated recipe '{recipe.id}': meal_types={meal_types}")

        except Exception as e:
            stats["errors"] += 1
            logger.error(f"Failed to migrate recipe '{recipe.id}': {e}")

    logger.info(f"Meal types migration complete for workspace '{workspace_id}': {stats}")
    return {
        "message": f"Migration complete for workspace '{workspace_id}'",
        "stats": stats
    }
