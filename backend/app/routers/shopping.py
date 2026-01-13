"""
Shopping List API endpoints.

Provides REST API for managing shopping list items and templates.
Shopping list is ephemeral (per-trip), templates are persistent.
"""
import logging
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.models.shopping import (
    ShoppingListItem,
    ShoppingList,
    TemplateItem,
    TemplateList,
    AddShoppingItemRequest,
    BatchAddShoppingItemsRequest,
    UpdateShoppingItemRequest,
    CheckOffRequest,
    AddFromTemplatesRequest,
    CreateTemplateRequest,
    UpdateTemplateRequest,
)
from app.models.grocery import GroceryItem
from app.data.data_manager import (
    load_shopping_list,
    save_shopping_list,
    clear_shopping_list,
    load_shopping_templates,
    save_shopping_templates,
    load_groceries,
    save_groceries,
)
from app.services.storage_categories import suggest_storage_location

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/shopping-list",
    tags=["shopping"]
)


# ===== Shopping List CRUD =====


@router.get("", response_model=ShoppingList)
async def get_shopping_list(
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Get current shopping list.

    Returns:
        ShoppingList containing all items to buy
    """
    try:
        items = load_shopping_list(workspace_id)
        logger.info(f"Retrieved {len(items)} shopping list items for workspace '{workspace_id}'")
        return ShoppingList(items=items)
    except Exception as e:
        logger.error(f"Failed to load shopping list for workspace '{workspace_id}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load shopping list: {str(e)}"
        )


@router.post("/items", response_model=ShoppingListItem)
async def add_shopping_item(
    request: AddShoppingItemRequest,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Add a single item to shopping list.

    Args:
        request: Item details (name required, quantity/category optional)
        workspace_id: Workspace identifier

    Returns:
        The added ShoppingListItem with generated ID
    """
    try:
        items = load_shopping_list(workspace_id)

        new_item = ShoppingListItem(
            name=request.name,
            canonical_name=request.canonical_name,
            quantity=request.quantity,
            category=request.category,
        )

        items.append(new_item)
        save_shopping_list(workspace_id, items)

        logger.info(f"Added shopping item: {new_item.name} to workspace '{workspace_id}'")
        return new_item

    except Exception as e:
        logger.error(f"Failed to add shopping item for workspace '{workspace_id}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to add shopping item: {str(e)}"
        )


@router.post("/items/batch", response_model=ShoppingList)
async def batch_add_shopping_items(
    request: BatchAddShoppingItemsRequest,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Add multiple items to shopping list.

    Args:
        request: List of items to add
        workspace_id: Workspace identifier

    Returns:
        Updated ShoppingList with all items
    """
    try:
        items = load_shopping_list(workspace_id)

        for item_req in request.items:
            new_item = ShoppingListItem(
                name=item_req.name,
                canonical_name=item_req.canonical_name,
                quantity=item_req.quantity,
                category=item_req.category,
            )
            items.append(new_item)

        save_shopping_list(workspace_id, items)

        logger.info(f"Batch added {len(request.items)} shopping items to workspace '{workspace_id}'")
        return ShoppingList(items=items)

    except Exception as e:
        logger.error(f"Failed to batch add shopping items for workspace '{workspace_id}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to batch add shopping items: {str(e)}"
        )


@router.patch("/items/{item_id}", response_model=ShoppingListItem)
async def update_shopping_item(
    item_id: str,
    request: UpdateShoppingItemRequest,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Update a shopping list item.

    Args:
        item_id: ID of item to update
        request: Fields to update (name, quantity, is_checked)
        workspace_id: Workspace identifier

    Returns:
        Updated ShoppingListItem

    Raises:
        HTTPException 404: Item not found
    """
    try:
        items = load_shopping_list(workspace_id)

        for i, item in enumerate(items):
            if item.id == item_id:
                if request.name is not None:
                    item.name = request.name
                if request.quantity is not None:
                    item.quantity = request.quantity
                if request.is_checked is not None:
                    item.is_checked = request.is_checked

                items[i] = item
                save_shopping_list(workspace_id, items)

                logger.info(f"Updated shopping item {item_id} in workspace '{workspace_id}'")
                return item

        raise HTTPException(status_code=404, detail=f"Shopping item {item_id} not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update shopping item for workspace '{workspace_id}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update shopping item: {str(e)}"
        )


@router.delete("/items/{item_id}", response_model=ShoppingList)
async def delete_shopping_item(
    item_id: str,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Delete a shopping list item.

    Args:
        item_id: ID of item to delete
        workspace_id: Workspace identifier

    Returns:
        Updated ShoppingList after deletion

    Raises:
        HTTPException 404: Item not found
    """
    try:
        items = load_shopping_list(workspace_id)
        original_count = len(items)

        items = [item for item in items if item.id != item_id]

        if len(items) == original_count:
            raise HTTPException(status_code=404, detail=f"Shopping item {item_id} not found")

        save_shopping_list(workspace_id, items)

        logger.info(f"Deleted shopping item {item_id} from workspace '{workspace_id}'")
        return ShoppingList(items=items)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete shopping item for workspace '{workspace_id}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete shopping item: {str(e)}"
        )


@router.delete("", response_model=ShoppingList)
async def clear_list(
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Clear entire shopping list (after shopping trip).

    Returns:
        Empty ShoppingList
    """
    try:
        clear_shopping_list(workspace_id)
        logger.info(f"Cleared shopping list for workspace '{workspace_id}'")
        return ShoppingList(items=[])

    except Exception as e:
        logger.error(f"Failed to clear shopping list for workspace '{workspace_id}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to clear shopping list: {str(e)}"
        )


# ===== Check-off with Inventory Bridge =====


@router.post("/check-off", response_model=ShoppingListItem)
async def check_off_item(
    request: CheckOffRequest,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Check off a shopping item and optionally add to inventory.

    This is the bridge between shopping list and grocery inventory:
    1. Marks the item as checked
    2. If add_to_inventory=true, creates a GroceryItem with today's date

    Args:
        request: CheckOffRequest with item_id and add_to_inventory flag
        workspace_id: Workspace identifier

    Returns:
        Updated ShoppingListItem (is_checked=True)

    Raises:
        HTTPException 404: Item not found
    """
    try:
        items = load_shopping_list(workspace_id)

        for i, item in enumerate(items):
            if item.id == request.item_id:
                # Mark as checked
                item.is_checked = True
                items[i] = item
                save_shopping_list(workspace_id, items)

                # Optionally add to inventory
                if request.add_to_inventory:
                    groceries = load_groceries(workspace_id)

                    # Create grocery item with auto-suggested storage location
                    storage = suggest_storage_location(item.name)

                    grocery_item = GroceryItem(
                        name=item.name,
                        canonical_name=item.canonical_name,
                        storage_location=storage,
                    )
                    groceries.append(grocery_item)
                    save_groceries(workspace_id, groceries)

                    logger.info(
                        f"Checked off and added to inventory: {item.name} "
                        f"(storage: {storage}) in workspace '{workspace_id}'"
                    )
                else:
                    logger.info(f"Checked off: {item.name} in workspace '{workspace_id}'")

                return item

        raise HTTPException(status_code=404, detail=f"Shopping item {request.item_id} not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to check off shopping item for workspace '{workspace_id}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to check off shopping item: {str(e)}"
        )


# ===== Generate from Templates =====


@router.post("/from-templates", response_model=ShoppingList)
async def add_from_templates(
    request: AddFromTemplatesRequest,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Add items to shopping list from selected templates.

    Args:
        request: List of template IDs to add
        workspace_id: Workspace identifier

    Returns:
        Updated ShoppingList with new items from templates
    """
    try:
        items = load_shopping_list(workspace_id)
        templates = load_shopping_templates(workspace_id)

        # Create lookup dict for templates
        template_dict = {t.id: t for t in templates}

        added_count = 0
        for template_id in request.template_ids:
            template = template_dict.get(template_id)
            if template:
                new_item = ShoppingListItem.from_template(template)
                items.append(new_item)
                added_count += 1

        save_shopping_list(workspace_id, items)

        logger.info(
            f"Added {added_count} items from templates to workspace '{workspace_id}' "
            f"({len(request.template_ids) - added_count} templates not found)"
        )
        return ShoppingList(items=items)

    except Exception as e:
        logger.error(f"Failed to add from templates for workspace '{workspace_id}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to add from templates: {str(e)}"
        )


@router.post("/from-favorites", response_model=ShoppingList)
async def add_from_favorites(
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Add all favorite templates to shopping list.

    This is a quick action to populate the list with frequently purchased items.

    Returns:
        Updated ShoppingList with all favorite items added
    """
    try:
        items = load_shopping_list(workspace_id)
        templates = load_shopping_templates(workspace_id)

        # Filter favorites
        favorites = [t for t in templates if t.is_favorite]

        for template in favorites:
            new_item = ShoppingListItem.from_template(template)
            items.append(new_item)

        save_shopping_list(workspace_id, items)

        logger.info(f"Added {len(favorites)} favorite items to workspace '{workspace_id}'")
        return ShoppingList(items=items)

    except Exception as e:
        logger.error(f"Failed to add favorites for workspace '{workspace_id}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to add favorites: {str(e)}"
        )


# ===== Templates Router (mounted at /shopping-templates) =====

templates_router = APIRouter(
    prefix="/shopping-templates",
    tags=["shopping"]
)


@templates_router.get("", response_model=TemplateList)
async def get_templates(
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Get all shopping templates.

    Returns:
        TemplateList containing all user templates
    """
    try:
        templates = load_shopping_templates(workspace_id)
        logger.info(f"Retrieved {len(templates)} templates for workspace '{workspace_id}'")
        return TemplateList(items=templates)

    except Exception as e:
        logger.error(f"Failed to load templates for workspace '{workspace_id}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load templates: {str(e)}"
        )


@templates_router.post("", response_model=TemplateItem)
async def create_template(
    request: CreateTemplateRequest,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Create a new shopping template.

    Args:
        request: Template details (name, category required)
        workspace_id: Workspace identifier

    Returns:
        Created TemplateItem with generated ID
    """
    try:
        templates = load_shopping_templates(workspace_id)

        new_template = TemplateItem(
            name=request.name,
            canonical_name=request.canonical_name,
            category=request.category,
            default_quantity=request.default_quantity,
            frequency=request.frequency,
            is_favorite=request.is_favorite,
        )

        templates.append(new_template)
        save_shopping_templates(workspace_id, templates)

        logger.info(f"Created template: {new_template.name} in workspace '{workspace_id}'")
        return new_template

    except Exception as e:
        logger.error(f"Failed to create template for workspace '{workspace_id}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create template: {str(e)}"
        )


@templates_router.patch("/{template_id}", response_model=TemplateItem)
async def update_template(
    template_id: str,
    request: UpdateTemplateRequest,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Update a shopping template.

    Args:
        template_id: ID of template to update
        request: Fields to update
        workspace_id: Workspace identifier

    Returns:
        Updated TemplateItem

    Raises:
        HTTPException 404: Template not found
    """
    try:
        templates = load_shopping_templates(workspace_id)

        for i, template in enumerate(templates):
            if template.id == template_id:
                if request.name is not None:
                    template.name = request.name
                if request.canonical_name is not None:
                    template.canonical_name = request.canonical_name
                if request.category is not None:
                    template.category = request.category
                if request.default_quantity is not None:
                    template.default_quantity = request.default_quantity
                if request.frequency is not None:
                    template.frequency = request.frequency
                if request.is_favorite is not None:
                    template.is_favorite = request.is_favorite

                templates[i] = template
                save_shopping_templates(workspace_id, templates)

                logger.info(f"Updated template {template_id} in workspace '{workspace_id}'")
                return template

        raise HTTPException(status_code=404, detail=f"Template {template_id} not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update template for workspace '{workspace_id}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update template: {str(e)}"
        )


@templates_router.delete("/{template_id}", response_model=TemplateList)
async def delete_template(
    template_id: str,
    workspace_id: str = Query(..., description="Workspace identifier")
):
    """
    Delete a shopping template.

    Args:
        template_id: ID of template to delete
        workspace_id: Workspace identifier

    Returns:
        Updated TemplateList after deletion

    Raises:
        HTTPException 404: Template not found
    """
    try:
        templates = load_shopping_templates(workspace_id)
        original_count = len(templates)

        templates = [t for t in templates if t.id != template_id]

        if len(templates) == original_count:
            raise HTTPException(status_code=404, detail=f"Template {template_id} not found")

        save_shopping_templates(workspace_id, templates)

        logger.info(f"Deleted template {template_id} from workspace '{workspace_id}'")
        return TemplateList(items=templates)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete template for workspace '{workspace_id}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete template: {str(e)}"
        )
