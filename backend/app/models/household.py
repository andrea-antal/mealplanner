"""Household profile data models"""
from pydantic import BaseModel, Field
from typing import List


class FamilyMember(BaseModel):
    """Represents a family member with dietary constraints"""
    name: str = Field(..., min_length=1, description="Family member name")
    age_group: str = Field(..., description="Age group: toddler, child, adult")
    allergies: List[str] = Field(default_factory=list, description="List of allergies")
    dislikes: List[str] = Field(default_factory=list, description="List of dislikes")
    preferences: List[str] = Field(
        default_factory=list,
        description="Dietary preferences and patterns (e.g., 'lactose-intolerant', 'mostly pescetarian', 'low-carb')"
    )


class DaycareRules(BaseModel):
    """Daycare lunch/snack rules and restrictions"""
    no_nuts: bool = Field(default=True, description="Nut-free requirement")
    no_honey: bool = Field(default=True, description="No honey for toddlers")
    must_be_cold: bool = Field(default=False, description="Must be served cold")


class CookingPreferences(BaseModel):
    """Cooking preferences and available equipment"""
    available_appliances: List[str] = Field(
        default_factory=list,
        description="Available appliances: instant_pot, oven, blender, food_processor, microwave"
    )
    preferred_methods: List[str] = Field(
        default_factory=list,
        description="Preferred cooking methods: one_pot, sheet_pan, minimal_prep"
    )
    skill_level: str = Field(default="intermediate", description="Skill level: beginner, intermediate, advanced")
    max_active_cooking_time_weeknight: int = Field(
        default=30,
        ge=0,
        description="Maximum active cooking time on weeknights (minutes)"
    )
    max_active_cooking_time_weekend: int = Field(
        default=60,
        ge=0,
        description="Maximum active cooking time on weekends (minutes)"
    )


class Preferences(BaseModel):
    """General meal planning preferences"""
    weeknight_priority: str = Field(default="quick", description="Priority for weeknights: quick, batch-cookable, etc.")
    weekend_priority: str = Field(default="batch-cookable", description="Priority for weekends")


class HouseholdProfile(BaseModel):
    """
    Complete household profile including family members and preferences.

    This is the main configuration for meal planning, containing all constraints
    and preferences that the system must respect.
    """
    family_members: List[FamilyMember] = Field(..., min_length=1, description="Family members")
    daycare_rules: DaycareRules = Field(default_factory=DaycareRules, description="Daycare restrictions")
    cooking_preferences: CookingPreferences = Field(
        default_factory=CookingPreferences,
        description="Cooking preferences and equipment"
    )
    preferences: Preferences = Field(default_factory=Preferences, description="General preferences")

    class Config:
        json_schema_extra = {
            "example": {
                "family_members": [
                    {
                        "name": "Andrea",
                        "age_group": "adult",
                        "allergies": [],
                        "dislikes": ["cilantro"],
                        "preferences": ["lactose-intolerant", "mostly pescetarian"]
                    },
                    {
                        "name": "Toddler",
                        "age_group": "toddler",
                        "allergies": [],
                        "dislikes": [],
                        "preferences": []
                    }
                ],
                "daycare_rules": {
                    "no_nuts": True,
                    "no_honey": True,
                    "must_be_cold": False
                },
                "cooking_preferences": {
                    "available_appliances": ["instant_pot", "oven", "blender"],
                    "preferred_methods": ["one_pot", "minimal_prep"],
                    "skill_level": "intermediate",
                    "max_active_cooking_time_weeknight": 30,
                    "max_active_cooking_time_weekend": 60
                },
                "preferences": {
                    "weeknight_priority": "quick",
                    "weekend_priority": "batch-cookable"
                }
            }
        }
