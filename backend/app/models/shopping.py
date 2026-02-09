"""
Shopping list and template data models.

Shopping list items are ephemeral (per-shopping-trip).
Templates are persistent (user's recurring favorites).
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import date as Date, datetime
from uuid import uuid4


class ShoppingListItem(BaseModel):
    """Individual shopping list item (ephemeral, per-shopping-trip)"""

    id: str = Field(default_factory=lambda: str(uuid4()), description="Unique item ID")
    name: str = Field(..., description="Item name (in user's language)")
    canonical_name: Optional[str] = Field(
        None, description="English canonical name for matching"
    )
    quantity: Optional[str] = Field(
        None, description="Quantity/portion (e.g., '2', '1 dozen')"
    )
    category: Optional[str] = Field(
        None, description="Category for grouping (e.g., dairy, produce)"
    )
    is_checked: bool = Field(default=False, description="Whether item has been checked off")
    template_id: Optional[str] = Field(
        None, description="Link to source template (if created from template)"
    )
    added_at: datetime = Field(
        default_factory=datetime.now, description="When item was added to list"
    )

    @classmethod
    def from_template(
        cls, template: "TemplateItem", quantity: Optional[str] = None
    ) -> "ShoppingListItem":
        """Create a shopping list item from a template.

        Args:
            template: The template to create from
            quantity: Override quantity (uses template's default if not provided)

        Returns:
            New ShoppingListItem linked to the template
        """
        return cls(
            name=template.name,
            canonical_name=template.canonical_name,
            quantity=quantity or template.default_quantity,
            category=template.category,
            template_id=template.id,
            is_checked=False,
        )


class TemplateItem(BaseModel):
    """Shopping template item (persistent, user's recurring favorites)"""

    id: str = Field(default_factory=lambda: str(uuid4()), description="Unique template ID")
    name: str = Field(..., description="Item name (in user's language)")
    canonical_name: Optional[str] = Field(
        None, description="English canonical name for matching"
    )
    default_quantity: Optional[str] = Field(
        None, description="Default quantity when adding to shopping list"
    )
    category: str = Field(..., description="Category (required for organization)")
    frequency: Optional[Literal["weekly", "biweekly", "monthly", "as_needed"]] = Field(
        None, description="How often this item is typically purchased"
    )
    last_purchased: Optional[Date] = Field(
        None, description="Last purchase date (for smart suggestions in V1.1)"
    )
    is_favorite: bool = Field(
        default=False, description="Quick-add favorite items"
    )
    created_at: datetime = Field(
        default_factory=datetime.now, description="When template was created"
    )


class ShoppingList(BaseModel):
    """Container for shopping list items"""

    items: List[ShoppingListItem] = Field(default_factory=list)


class TemplateList(BaseModel):
    """Container for template items"""

    items: List[TemplateItem] = Field(default_factory=list)


# Request/Response models for API endpoints


class AddShoppingItemRequest(BaseModel):
    """Request to add item(s) to shopping list"""

    name: str = Field(..., min_length=1, description="Item name")
    canonical_name: Optional[str] = Field(None, description="English canonical name")
    quantity: Optional[str] = Field(None, description="Quantity/portion")
    category: Optional[str] = Field(None, description="Category for grouping")


class BatchAddShoppingItemsRequest(BaseModel):
    """Request to add multiple items to shopping list"""

    items: List[AddShoppingItemRequest] = Field(
        ..., min_length=1, description="Items to add"
    )


class UpdateShoppingItemRequest(BaseModel):
    """Request to update a shopping list item"""

    name: Optional[str] = Field(None, description="New item name")
    quantity: Optional[str] = Field(None, description="New quantity")
    is_checked: Optional[bool] = Field(None, description="Check/uncheck item")


class CheckOffRequest(BaseModel):
    """Request to check off item and optionally add to inventory"""

    item_id: str = Field(..., description="Shopping list item ID to check off")
    add_to_inventory: bool = Field(
        default=False, description="Whether to add checked item to grocery inventory"
    )


class AddFromTemplatesRequest(BaseModel):
    """Request to add items from templates"""

    template_ids: List[str] = Field(
        ..., min_length=1, description="Template IDs to add to shopping list"
    )


class CreateTemplateRequest(BaseModel):
    """Request to create a new template"""

    name: str = Field(..., min_length=1, description="Item name")
    canonical_name: Optional[str] = Field(None, description="English canonical name")
    category: str = Field(..., min_length=1, description="Category (required)")
    default_quantity: Optional[str] = Field(None, description="Default quantity")
    frequency: Optional[Literal["weekly", "biweekly", "monthly", "as_needed"]] = Field(
        None, description="Purchase frequency"
    )
    is_favorite: bool = Field(default=False, description="Mark as favorite")


class UpdateTemplateRequest(BaseModel):
    """Request to update a template"""

    name: Optional[str] = Field(None, description="New item name")
    canonical_name: Optional[str] = Field(None, description="English canonical name")
    category: Optional[str] = Field(None, description="New category")
    default_quantity: Optional[str] = Field(None, description="New default quantity")
    frequency: Optional[Literal["weekly", "biweekly", "monthly", "as_needed"]] = Field(
        None, description="New frequency"
    )
    is_favorite: Optional[bool] = Field(None, description="Update favorite status")
