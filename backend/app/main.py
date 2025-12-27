"""
FastAPI application entry point for Meal Planner.

This is the main application file that sets up:
- FastAPI app instance
- CORS middleware
- Logging configuration
- API routes
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Meal Planner API",
    description="RAG-powered meal planning with household constraints",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info(f"CORS enabled for origins: {settings.cors_origins_list}")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Meal Planner API",
        "version": "0.1.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint.

    Returns:
        Status indicating the API is running
    """
    return {
        "status": "ok",
        "service": "meal-planner-api",
        "version": "0.1.0"
    }


# Include routers
from app.routers import meal_plans_router, household_router, recipes_router, groceries_router, feedback_router

app.include_router(meal_plans_router)
app.include_router(household_router)
app.include_router(recipes_router)
app.include_router(groceries_router)
app.include_router(feedback_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
