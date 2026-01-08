"""API routers for meal planner"""

from .meal_plans import router as meal_plans_router
from .household import router as household_router
from .recipes import router as recipes_router
from .groceries import router as groceries_router
from .feedback import router as feedback_router
from .auth import router as auth_router

__all__ = ["meal_plans_router", "household_router", "recipes_router", "groceries_router", "feedback_router", "auth_router"]
