"""Generation config model for meal plan generation settings."""
from pydantic import BaseModel, Field
from typing import List, Optional


class MemberWeight(BaseModel):
    """Preference weight for a single household member."""
    name: str = Field(..., description="Household member name")
    weight: int = Field(default=50, ge=0, le=100, description="Preference weight 0-100")


class GenerationConfig(BaseModel):
    """
    Configuration for how the AI generates meal plans.

    Controls preference weighting, recipe sourcing, and available appliances.
    All fields are optional with sensible defaults for backward compatibility.
    """
    member_weights: Optional[List[MemberWeight]] = Field(
        default=None,
        description="Preference weight per household member (0-100). Higher weight = more influence on meal choices."
    )
    recipe_source: Optional[str] = Field(
        default="mix",
        description="Recipe sourcing strategy: library_only, ai_generated_only, or mix"
    )
    appliances: Optional[List[str]] = Field(
        default=None,
        description="Appliances available for this generation run"
    )
