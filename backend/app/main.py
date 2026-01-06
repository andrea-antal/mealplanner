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

# Add request logging middleware
from app.middleware import RequestLoggerMiddleware
app.add_middleware(RequestLoggerMiddleware)

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


@app.get("/workspaces")
async def list_workspaces():
    """
    List all workspace IDs.

    Returns:
        Count and sorted list of workspace IDs
    """
    from app.data.data_manager import list_workspaces as get_workspaces
    workspaces = get_workspaces()
    return {
        "count": len(workspaces),
        "workspaces": workspaces
    }


@app.get("/workspaces/summary")
async def workspaces_summary():
    """
    Get summary statistics for all workspaces.

    Returns:
        List of workspace stats including recipe count, meal plan count,
        grocery count, member count, and last activity.
    """
    from app.data.data_manager import list_workspaces as get_workspaces, get_workspace_stats
    from app.middleware.request_logger import get_workspace_request_stats
    workspaces = get_workspaces()

    summaries = []
    for ws in workspaces:
        stats = get_workspace_stats(ws)
        request_stats = get_workspace_request_stats(ws)
        stats["api_requests"] = request_stats["total_requests"]
        stats["api_errors"] = request_stats["error_count"]
        stats["last_api_call"] = request_stats["last_request"]
        summaries.append(stats)

    return {
        "count": len(summaries),
        "workspaces": summaries
    }


@app.get("/logs/requests")
async def get_request_logs(
    limit: int = 100,
    workspace_id: str = None,
    errors_only: bool = False
):
    """
    Get recent API request logs.

    Args:
        limit: Maximum entries to return (default 100)
        workspace_id: Filter by workspace (optional)
        errors_only: Only show requests with errors

    Returns:
        List of request log entries (most recent first)
    """
    from app.middleware.request_logger import get_recent_requests
    entries = get_recent_requests(limit=limit, workspace_id=workspace_id, errors_only=errors_only)
    return {
        "count": len(entries),
        "requests": entries
    }


@app.get("/logs/errors")
async def get_error_logs(limit: int = 50, workspace_id: str = None):
    """
    Get recent API errors (convenience endpoint).

    Returns:
        List of request log entries with errors (most recent first)
    """
    from app.middleware.request_logger import get_recent_requests
    entries = get_recent_requests(limit=limit, workspace_id=workspace_id, errors_only=True)
    return {
        "count": len(entries),
        "errors": entries
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
