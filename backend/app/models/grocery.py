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
    name: str = Field(..., description="Grocery item name")
    date_added: Date = Field(default_factory=Date.today, description="When item was added to list")
    purchase_date: Optional[Date] = Field(None, description="When item was purchased (defaults to today)")
    expiry_type: Optional[Literal["expiry_date", "best_before_date"]] = Field(None, description="Type of expiry")
    expiry_date: Optional[Date] = Field(None, description="Expiry or best before date")

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
