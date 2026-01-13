"""
FastAPI application entry point for Meal Planner.

This is the main application file that sets up:
- FastAPI app instance
- CORS middleware
- Logging configuration
- API routes
"""
import logging
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.dependencies import verify_admin

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


@app.get("/workspaces", tags=["admin"])
async def list_workspaces(_: bool = Depends(verify_admin)):
    """
    List all workspace IDs.
    Requires X-Admin-Key header.

    Returns:
        Count and sorted list of workspace IDs
    """
    from app.data.data_manager import list_workspaces as get_workspaces
    workspaces = get_workspaces()
    return {
        "count": len(workspaces),
        "workspaces": workspaces
    }


@app.get("/workspaces/summary", tags=["admin"])
async def workspaces_summary(_: bool = Depends(verify_admin)):
    """
    Get summary statistics for all workspaces.
    Requires X-Admin-Key header.

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
        stats["api_errors"] = request_stats["unacknowledged_error_count"]
        stats["last_api_call"] = request_stats["last_request"]
        summaries.append(stats)

    return {
        "count": len(summaries),
        "workspaces": summaries
    }


@app.get("/logs/requests", tags=["admin"])
async def get_request_logs(
    limit: int = 100,
    workspace_id: str = None,
    errors_only: bool = False,
    _: bool = Depends(verify_admin)
):
    """
    Get recent API request logs.
    Requires X-Admin-Key header.

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


@app.get("/logs/errors", tags=["admin"])
async def get_error_logs(limit: int = 50, workspace_id: str = None, _: bool = Depends(verify_admin)):
    """
    Get recent API errors (convenience endpoint).
    Requires X-Admin-Key header.

    Returns:
        List of request log entries with errors (most recent first)
    """
    from app.middleware.request_logger import get_recent_requests
    entries = get_recent_requests(limit=limit, workspace_id=workspace_id, errors_only=True)
    return {
        "count": len(entries),
        "errors": entries
    }


@app.get("/logs/errors/{workspace_id}", tags=["admin"])
async def get_workspace_errors(
    workspace_id: str,
    limit: int = 50,
    include_acknowledged: bool = False,
    _: bool = Depends(verify_admin)
):
    """
    Get errors for a specific workspace with acknowledgment status.
    Requires X-Admin-Key header.

    Args:
        workspace_id: Workspace to get errors for
        limit: Maximum number of errors (default 50)
        include_acknowledged: Include cleared errors (default False)

    Returns:
        List of error entries with acknowledgment status
    """
    from app.middleware.request_logger import get_errors_for_workspace
    errors = get_errors_for_workspace(
        workspace_id=workspace_id,
        limit=limit,
        include_acknowledged=include_acknowledged
    )
    return {
        "workspace_id": workspace_id,
        "count": len(errors),
        "errors": errors
    }


@app.post("/logs/errors/{workspace_id}/clear", tags=["admin"])
async def clear_workspace_errors(workspace_id: str, _: bool = Depends(verify_admin)):
    """
    Clear/acknowledge all current errors for a workspace.
    Requires X-Admin-Key header.

    This marks all current errors as acknowledged. New errors that occur
    after this call will still appear in the error count.

    Returns:
        Acknowledgment record with timestamp
    """
    from app.middleware.request_logger import clear_errors_for_workspace
    record = clear_errors_for_workspace(workspace_id)
    return {
        "message": f"Errors cleared for workspace '{workspace_id}'",
        "cleared_before": record["cleared_before"]
    }


# ===== Admin Endpoints =====

@app.get("/admin/workspaces/empty", tags=["admin"])
async def list_empty_workspaces(_: bool = Depends(verify_admin)):
    """
    List workspaces that have no data (no recipes, meal plans, groceries, or members).
    Requires X-Admin-Key header.

    Returns:
        Count and list of empty workspace IDs
    """
    from app.data.data_manager import list_workspaces as get_workspaces, is_workspace_empty

    workspaces = get_workspaces()
    empty = [ws for ws in workspaces if is_workspace_empty(ws)]

    return {
        "count": len(empty),
        "workspaces": empty
    }


@app.get("/admin/workspaces/inactive", tags=["admin"])
async def list_inactive_workspaces(days: int = 30, _: bool = Depends(verify_admin)):
    """
    List workspaces with no activity in the last N days.
    Requires X-Admin-Key header.

    Args:
        days: Number of days of inactivity threshold (default 30)

    Returns:
        Count, threshold, and list of inactive workspaces with last activity info
    """
    from datetime import datetime, timedelta
    from app.data.data_manager import list_workspaces as get_workspaces, get_workspace_stats

    workspaces = get_workspaces()
    cutoff = datetime.now() - timedelta(days=days)
    inactive = []

    for ws in workspaces:
        stats = get_workspace_stats(ws)
        last_activity = stats.get("last_activity")

        if last_activity:
            try:
                last_dt = datetime.fromisoformat(last_activity)
                if last_dt < cutoff:
                    inactive.append({
                        "workspace_id": ws,
                        "last_activity": last_activity,
                        "days_inactive": (datetime.now() - last_dt).days
                    })
            except ValueError:
                # Invalid date format, treat as inactive
                inactive.append({
                    "workspace_id": ws,
                    "last_activity": last_activity,
                    "days_inactive": None
                })
        else:
            # No activity timestamp = consider inactive
            inactive.append({
                "workspace_id": ws,
                "last_activity": None,
                "days_inactive": None
            })

    # Sort by days_inactive descending (most inactive first, None values last)
    inactive.sort(key=lambda x: x.get("days_inactive") or 9999, reverse=True)

    return {
        "count": len(inactive),
        "days_threshold": days,
        "workspaces": inactive
    }


@app.delete("/admin/workspaces/{workspace_id}", tags=["admin"])
async def admin_delete_workspace(workspace_id: str, _: bool = Depends(verify_admin)):
    """
    Admin endpoint to completely delete a workspace and all its data.
    Requires X-Admin-Key header.

    This permanently removes:
    - All recipes
    - All meal plans
    - Household profile
    - Groceries list
    - Recipe ratings
    - Chroma DB entries

    WARNING: This operation is irreversible!

    Args:
        workspace_id: Workspace identifier to delete

    Returns:
        Success message if deleted

    Raises:
        404: If workspace doesn't exist
        400: If workspace_id is invalid
    """
    from app.data.data_manager import delete_workspace

    try:
        deleted = delete_workspace(workspace_id)
        if deleted:
            return {"message": f"Workspace '{workspace_id}' deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail=f"Workspace '{workspace_id}' not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to delete workspace '{workspace_id}': {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete workspace: {str(e)}")


@app.get("/admin/debug-supabase", tags=["admin"])
async def debug_supabase(_: bool = Depends(verify_admin)):
    """Debug endpoint to check Supabase connection."""
    from app.config import settings
    from app.db.supabase_client import get_supabase_admin_client

    debug_info = {
        "supabase_url": settings.SUPABASE_URL,
        "secret_key_length": len(settings.SUPABASE_SECRET_KEY) if settings.SUPABASE_SECRET_KEY else 0,
        "secret_key_first_20": settings.SUPABASE_SECRET_KEY[:20] if settings.SUPABASE_SECRET_KEY else None,
        "secret_key_last_10": settings.SUPABASE_SECRET_KEY[-10:] if settings.SUPABASE_SECRET_KEY else None,
    }

    try:
        client = get_supabase_admin_client()
        result = client.table("profiles").select("*").limit(1).execute()
        debug_info["connection"] = "success"
        debug_info["profiles_count"] = len(result.data)
    except Exception as e:
        debug_info["connection"] = "failed"
        debug_info["error"] = str(e)

    return debug_info


@app.post("/admin/migrate-to-supabase", tags=["admin"])
async def migrate_to_supabase(_: bool = Depends(verify_admin)):
    """
    One-time migration endpoint to move data from JSON files to Supabase.
    Requires X-Admin-Key header.

    This reads from the local data/ directory (JSON files) and writes to Supabase.
    Safe to run multiple times (uses upsert operations).

    Returns:
        Migration statistics including counts of migrated items
    """
    import sys
    from pathlib import Path

    # Add scripts directory to path for imports
    scripts_dir = Path(__file__).parent.parent / "scripts"
    if str(scripts_dir) not in sys.path:
        sys.path.insert(0, str(scripts_dir))

    try:
        # Use the app's Supabase client (which uses settings) instead of migration script's client
        from app.db.supabase_client import get_supabase_admin_client
        from migrate_to_supabase import (
            list_workspaces, migrate_household_profile,
            migrate_recipes, migrate_meal_plans, migrate_groceries,
            migrate_recipe_ratings, migrate_invites
        )

        supabase = get_supabase_admin_client()
        workspaces = list_workspaces()

        logger.info(f"Starting Supabase migration for {len(workspaces)} workspaces")

        stats = {
            "workspaces": len(workspaces),
            "household_profiles": 0,
            "recipes": 0,
            "meal_plans": 0,
            "groceries": 0,
            "ratings": 0,
            "invites": 0
        }

        for workspace_id in workspaces:
            logger.info(f"Migrating workspace: {workspace_id}")
            if migrate_household_profile(supabase, workspace_id):
                stats["household_profiles"] += 1
            stats["recipes"] += migrate_recipes(supabase, workspace_id)
            stats["meal_plans"] += migrate_meal_plans(supabase, workspace_id)
            if migrate_groceries(supabase, workspace_id):
                stats["groceries"] += 1
            stats["ratings"] += migrate_recipe_ratings(supabase, workspace_id)

        stats["invites"] = migrate_invites(supabase)

        logger.info(f"Migration complete: {stats}")
        return {"status": "success", "stats": stats}

    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")


# Include routers
from app.routers import (
    meal_plans_router, household_router, recipes_router, groceries_router,
    feedback_router, auth_router, invites_router, shopping_router, templates_router
)

app.include_router(auth_router)  # Auth first for visibility in docs
app.include_router(meal_plans_router)
app.include_router(household_router)
app.include_router(recipes_router)
app.include_router(groceries_router)
app.include_router(shopping_router)
app.include_router(templates_router)
app.include_router(feedback_router)
app.include_router(invites_router)  # Admin-only invite management


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
