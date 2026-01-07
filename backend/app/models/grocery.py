"""
Grocery data models.

Defines Pydantic models for grocery items with optional date tracking
and expiry management.
"""
from pydantic import BaseModel, Field, model_validator
from typing import Optional, Literal
from datetime import date as Date


class GroceryItem(BaseModel):
    """Individual grocery item with optional date tracking"""
    name: str = Field(..., description="Grocery item name (in user's language)")
    canonical_name: Optional[str] = Field(None, description="English canonical name for matching (e.g., 'eggs' for '雞蛋')")
    date_added: Date = Field(default_factory=Date.today, description="When item was added to list")
    purchase_date: Optional[Date] = Field(None, description="When item was purchased (defaults to today)")
    expiry_type: Optional[Literal["expiry_date", "best_before_date"]] = Field(None, description="Type of expiry")
    expiry_date: Optional[Date] = Field(None, description="Expiry or best before date")
    storage_location: Literal["fridge", "pantry"] = Field(
        default="fridge",
        description="Storage location: fridge/freezer or pantry"
    )

    @model_validator(mode='after')
    def validate_expiry_type(self):
        """If expiry_date is set, expiry_type must also be set"""
        if self.expiry_date and not self.expiry_type:
            raise ValueError("expiry_type required when expiry_date is set")
        return self

    def is_expiring_soon(self, days_ahead: int = 1) -> bool:
        """
        Check if item expires within N days.

        Args:
            days_ahead: Number of days to check ahead (default: 1)

        Returns:
            True if item expires within the specified days, False otherwise

        Note:
            Returns False if:
            - Item has no expiry_date
            - purchase_date >= expiry_date (prevents impossible scenarios)
            - Item already expired (days_until_expiry < 0)
        """
        if not self.expiry_date:
            return False

        # Don't show reminder if purchase_date >= expiry_date
        if self.purchase_date and self.purchase_date >= self.expiry_date:
            return False

        days_until_expiry = (self.expiry_date - Date.today()).days
        return 0 <= days_until_expiry <= days_ahead


class GroceryList(BaseModel):
    """Complete grocery list"""
    items: list[GroceryItem] = Field(default_factory=list)


# Voice parsing models for Sprint 4 Phase 1


class ProposedGroceryItem(BaseModel):
    """
    Grocery item proposed by AI parsing with confidence score.

    This extends the concept of GroceryItem with additional fields
    for AI-assisted input (confidence, notes, portion).
    """
    name: str = Field(..., description="Grocery item name (in user's language)")
    canonical_name: Optional[str] = Field(None, description="English canonical name for matching (e.g., 'eggs' for '雞蛋')")
    date_added: Optional[Date] = Field(None, description="When item was added (optional for proposed items)")
    purchase_date: Optional[Date] = Field(None, description="When item was purchased")
    expiry_type: Optional[Literal["expiry_date", "best_before_date"]] = Field(None, description="Type of expiry")
    expiry_date: Optional[Date] = Field(None, description="Expiry or best before date")
    storage_location: Literal["fridge", "pantry"] = Field(
        default="fridge",
        description="Storage location: fridge/freezer or pantry"
    )
    portion: Optional[str] = Field(None, description="Quantity/portion (e.g., '2 lbs', '1 gallon')")
    confidence: Literal["high", "medium", "low"] = Field("high", description="AI parsing confidence level")
    notes: Optional[str] = Field(None, description="AI reasoning or explanation")

    @model_validator(mode='after')
    def validate_expiry_type(self):
        """If expiry_date is set, expiry_type must also be set"""
        if self.expiry_date and not self.expiry_type:
            raise ValueError("expiry_type required when expiry_date is set")
        return self


class VoiceParseRequest(BaseModel):
    """Request to parse voice transcription into groceries"""
    transcription: str = Field(..., min_length=1, description="Voice transcription text")


class VoiceParseResponse(BaseModel):
    """Response from voice parsing with proposed items and warnings"""
    proposed_items: list[ProposedGroceryItem] = Field(
        default_factory=list,
        description="List of proposed grocery items parsed from voice"
    )
    transcription_used: str = Field(..., description="The transcription that was parsed")
    warnings: list[str] = Field(
        default_factory=list,
        description="User-facing warnings (e.g., duplicates, ambiguities)"
    )


class BatchAddRequest(BaseModel):
    """Request to add multiple grocery items at once"""
    items: list[GroceryItem] = Field(..., min_length=1, description="Items to add (must have at least one)")


class BatchDeleteRequest(BaseModel):
    """Request to delete multiple grocery items at once"""
    item_names: list[str] = Field(..., min_length=1, description="Names of items to delete (must have at least one)")


class UpdateStorageLocationRequest(BaseModel):
    """Request to update storage location for multiple grocery items"""
    item_names: list[str] = Field(..., min_length=1, description="Names of items to update")
    storage_location: Literal["fridge", "pantry"] = Field(..., description="New storage location")


# Receipt OCR models for Sprint 4 Phase 2


class ReceiptParseRequest(BaseModel):
    """Request to parse receipt image using OCR"""
    image_base64: str = Field(..., min_length=1, description="Base64 encoded receipt image")


class ExcludedReceiptItem(BaseModel):
    """Item excluded from receipt parsing (non-food, tax, etc.)"""
    name: str = Field(..., description="Item name as it appeared on receipt")
    reason: str = Field(..., description="Why item was excluded (e.g., 'non-food item', 'tax/total')")


class ReceiptParseResponse(BaseModel):
    """Response from receipt OCR parsing with proposed items and metadata"""
    proposed_items: list[ProposedGroceryItem] = Field(
        default_factory=list,
        description="List of proposed grocery items parsed from receipt"
    )
    excluded_items: list[ExcludedReceiptItem] = Field(
        default_factory=list,
        description="Items excluded from parsing (non-food, tax, totals, etc.)"
    )
    detected_purchase_date: Optional[Date] = Field(None, description="Purchase date from receipt header")
    detected_store: Optional[str] = Field(None, description="Store name from receipt header")
    warnings: list[str] = Field(
        default_factory=list,
        description="OCR warnings (e.g., unreadable items, low confidence)"
    )
