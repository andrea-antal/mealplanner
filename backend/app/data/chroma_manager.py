"""
Chroma vector database manager for recipe embeddings.

This module handles all interactions with the Chroma vector database:
- Initializing the database and collections
- Embedding recipes into vector storage
- Querying for relevant recipes based on semantic search
"""
import logging
from typing import List, Dict, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.models.recipe import Recipe
from app.config import settings

logger = logging.getLogger(__name__)

# Chroma client singleton
_chroma_client: Optional[chromadb.Client] = None
RECIPES_COLLECTION_NAME = "recipes"


def initialize_chroma() -> chromadb.Client:
    """
    Initialize and return the Chroma DB client with persistent storage.

    Uses a singleton pattern to avoid creating multiple clients.

    Returns:
        chromadb.Client: The initialized Chroma client
    """
    global _chroma_client

    if _chroma_client is not None:
        return _chroma_client

    logger.info(f"Initializing Chroma DB with persist directory: {settings.chroma_persist_dir}")

    # Use PersistentClient for disk persistence
    _chroma_client = chromadb.PersistentClient(
        path=settings.chroma_persist_dir,
        settings=ChromaSettings(anonymized_telemetry=False)
    )

    logger.info("Chroma DB initialized successfully")
    return _chroma_client


def get_recipes_collection() -> chromadb.Collection:
    """
    Get or create the recipes collection in Chroma.

    The collection stores recipe embeddings with metadata for filtering.

    Returns:
        chromadb.Collection: The recipes collection
    """
    client = initialize_chroma()

    # Get or create collection with default embedding function
    collection = client.get_or_create_collection(
        name=RECIPES_COLLECTION_NAME,
        metadata={"description": "Recipe embeddings for meal planning RAG"}
    )

    logger.info(f"Retrieved recipes collection with {collection.count()} documents")
    return collection


def embed_recipes(workspace_id: str, recipes: List[Recipe]) -> int:
    """
    Embed a list of recipes into the Chroma vector database.

    Each recipe is converted to a text representation combining:
    - Title
    - Tags (joined)
    - Ingredients (joined)

    Metadata is stored for filtering:
    - workspace_id, id, tags, required_appliances, prep_time_minutes, active_cooking_time_minutes, serves
    - source_url, source_name (for imported recipes)

    Args:
        workspace_id: Workspace identifier for data isolation
        recipes: List of Recipe objects to embed

    Returns:
        int: Number of recipes successfully embedded
    """
    if not recipes:
        logger.warning("No recipes provided to embed")
        return 0

    collection = get_recipes_collection()

    # Prepare documents, IDs, and metadata
    documents = []
    ids = []
    metadatas = []

    for recipe in recipes:
        # Create text representation for embedding
        # Combine title, tags, and ingredients for semantic search
        text_representation = (
            f"{recipe.title} - "
            f"Tags: {', '.join(recipe.tags)} - "
            f"Ingredients: {', '.join(recipe.ingredients)}"
        )

        documents.append(text_representation)
        # Prefix recipe ID with workspace to ensure global uniqueness in Chroma
        ids.append(f"{workspace_id}:{recipe.id}")

        # Store metadata for filtering (including workspace_id for multi-tenancy)
        metadatas.append({
            "workspace_id": workspace_id,  # Critical for workspace isolation
            "recipe_id": recipe.id,  # Original recipe ID without workspace prefix
            "title": recipe.title,
            "tags": ",".join(recipe.tags),  # Store as comma-separated string
            "required_appliances": ",".join(recipe.required_appliances),
            "prep_time_minutes": recipe.prep_time_minutes,
            "active_cooking_time_minutes": recipe.active_cooking_time_minutes,
            "serves": recipe.serves,
            "source_url": recipe.source_url or "",  # URL import feature - source tracking
            "source_name": recipe.source_name or "",  # Display name of source (e.g., "Allrecipes")
        })

    # Add to collection (will update if IDs already exist)
    collection.add(
        documents=documents,
        ids=ids,
        metadatas=metadatas
    )

    logger.info(f"Embedded {len(recipes)} recipes into Chroma DB for workspace '{workspace_id}'")
    return len(recipes)


def query_recipes(
    workspace_id: str,
    query_text: str,
    filters: Optional[Dict] = None,
    n_results: int = 10
) -> List[Dict]:
    """
    Query the recipes collection for semantically similar recipes within a workspace.

    Args:
        workspace_id: Workspace identifier for data isolation
        query_text: Natural language query (e.g., "quick chicken dinner with broccoli")
        filters: Optional metadata filters (e.g., {"tags": {"$contains": "toddler-friendly"}})
        n_results: Maximum number of results to return

    Returns:
        List of dictionaries containing recipe metadata and similarity scores
        Each dict has: recipe_id, title, tags, required_appliances, distance (similarity score)
    """
    collection = get_recipes_collection()

    # Build workspace filter - CRITICAL for data isolation
    workspace_filter = {"workspace_id": workspace_id}

    # Combine workspace filter with any additional filters
    if filters:
        # Merge filters using $and operator
        combined_filters = {"$and": [workspace_filter, filters]}
    else:
        combined_filters = workspace_filter

    # Query with workspace-scoped filters
    results = collection.query(
        query_texts=[query_text],
        n_results=n_results,
        where=combined_filters
    )

    # Format results
    formatted_results = []

    if results and results['ids'] and results['ids'][0]:
        for i, chroma_id in enumerate(results['ids'][0]):
            metadata = results['metadatas'][0][i] if results['metadatas'] else {}
            distance = results['distances'][0][i] if results['distances'] else None

            # Use recipe_id from metadata (without workspace prefix)
            formatted_results.append({
                "id": metadata.get("recipe_id", chroma_id),  # Original recipe ID
                "title": metadata.get("title", ""),
                "tags": metadata.get("tags", "").split(",") if metadata.get("tags") else [],
                "required_appliances": metadata.get("required_appliances", "").split(",") if metadata.get("required_appliances") else [],
                "prep_time_minutes": metadata.get("prep_time_minutes"),
                "active_cooking_time_minutes": metadata.get("active_cooking_time_minutes"),
                "serves": metadata.get("serves"),
                "distance": distance,  # Lower distance = more similar
            })

    logger.info(f"Query '{query_text}' for workspace '{workspace_id}' returned {len(formatted_results)} results")
    return formatted_results


def delete_recipe_from_chroma(workspace_id: str, recipe_id: str) -> None:
    """
    Delete a recipe from the Chroma vector database.

    Args:
        workspace_id: Workspace identifier
        recipe_id: Recipe identifier to delete
    """
    collection = get_recipes_collection()
    chroma_id = f"{workspace_id}:{recipe_id}"

    try:
        collection.delete(ids=[chroma_id])
        logger.info(f"Removed recipe {recipe_id} from Chroma DB for workspace '{workspace_id}'")
    except Exception as e:
        logger.warning(f"Could not remove {recipe_id} from Chroma for workspace '{workspace_id}' (may not exist): {e}")


def get_recipe_count(workspace_id: Optional[str] = None) -> int:
    """
    Get the total number of recipes in the collection.

    Args:
        workspace_id: Optional workspace identifier to count recipes for a specific workspace

    Returns:
        int: Number of recipes stored in Chroma (total or for specific workspace)
    """
    collection = get_recipes_collection()

    if workspace_id:
        # Count recipes for specific workspace
        results = collection.get(where={"workspace_id": workspace_id})
        count = len(results['ids']) if results and results['ids'] else 0
        logger.info(f"Counted {count} recipes for workspace '{workspace_id}'")
        return count
    else:
        # Count all recipes across all workspaces
        total = collection.count()
        logger.info(f"Counted {total} total recipes across all workspaces")
        return total


def reset_collection() -> None:
    """
    Delete and recreate the recipes collection.

    WARNING: This deletes all recipe embeddings!
    Useful for testing or re-seeding data.
    """
    client = initialize_chroma()

    try:
        client.delete_collection(name=RECIPES_COLLECTION_NAME)
        logger.info(f"Deleted collection: {RECIPES_COLLECTION_NAME}")
    except Exception as e:
        logger.warning(f"Could not delete collection (may not exist): {e}")

    # Recreate empty collection
    collection = client.create_collection(
        name=RECIPES_COLLECTION_NAME,
        metadata={"description": "Recipe embeddings for meal planning RAG"}
    )

    logger.info(f"Reset collection: {RECIPES_COLLECTION_NAME}")


def sync_chroma_with_storage(workspace_id: str) -> dict:
    """
    Sync Chroma DB with JSON storage for a specific workspace (cleanup utility).

    Removes orphaned Chroma entries and adds missing recipe embeddings.
    Returns stats about what was cleaned up.

    Args:
        workspace_id: Workspace identifier to sync

    Returns:
        dict: Statistics with keys 'orphaned_removed', 'missing_added', 'total_in_sync'
    """
    from app.data.data_manager import list_all_recipes

    collection = get_recipes_collection()
    all_recipes = list_all_recipes(workspace_id)  # Load from JSON for this workspace
    recipe_ids_in_storage = {r.id for r in all_recipes}

    # Get all IDs in Chroma for this workspace
    chroma_results = collection.get(where={"workspace_id": workspace_id})
    # Extract original recipe IDs from chroma_ids (remove workspace prefix)
    chroma_ids = set()
    chroma_full_ids = {}  # Map recipe_id -> full chroma_id for deletion
    if chroma_results and chroma_results['ids']:
        for chroma_id, metadata in zip(chroma_results['ids'], chroma_results['metadatas'] or []):
            recipe_id = metadata.get('recipe_id', chroma_id.split(':', 1)[1] if ':' in chroma_id else chroma_id)
            chroma_ids.add(recipe_id)
            chroma_full_ids[recipe_id] = chroma_id

    # Find orphaned entries (in Chroma but not in storage)
    orphaned = chroma_ids - recipe_ids_in_storage
    if orphaned:
        orphaned_full_ids = [chroma_full_ids[rid] for rid in orphaned if rid in chroma_full_ids]
        collection.delete(ids=orphaned_full_ids)
        logger.info(f"Removed {len(orphaned)} orphaned entries from Chroma for workspace '{workspace_id}': {orphaned}")

    # Find missing embeddings (in storage but not in Chroma)
    missing = recipe_ids_in_storage - chroma_ids
    if missing:
        missing_recipes = [r for r in all_recipes if r.id in missing]
        embed_recipes(workspace_id, missing_recipes)
        logger.info(f"Added {len(missing)} missing recipes to Chroma for workspace '{workspace_id}': {missing}")

    stats = {
        "orphaned_removed": len(orphaned),
        "missing_added": len(missing),
        "total_in_sync": len(recipe_ids_in_storage)
    }

    logger.info(f"Chroma sync complete for workspace '{workspace_id}': {stats}")
    return stats
