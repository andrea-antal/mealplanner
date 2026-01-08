"""
Shared FastAPI dependencies for the Meal Planner API.
"""
import logging
from typing import Optional
from fastapi import Header, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

logger = logging.getLogger(__name__)

# Bearer token security scheme
bearer_scheme = HTTPBearer(auto_error=False)


def verify_admin(x_admin_key: str = Header(None, alias="X-Admin-Key")):
    """
    Dependency to protect admin endpoints.
    Requires X-Admin-Key header matching ADMIN_SECRET env var.
    """
    if not settings.ADMIN_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Admin endpoints are disabled (ADMIN_SECRET not configured)"
        )
    if x_admin_key != settings.ADMIN_SECRET:
        raise HTTPException(
            status_code=403,
            detail="Invalid or missing admin key"
        )
    return True


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
):
    """
    Dependency to get the current authenticated user.
    Requires a valid JWT Bearer token.

    Returns:
        dict with 'email' and 'workspace_id'

    Raises:
        HTTPException 401 if not authenticated
    """
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )

    from app.auth.jwt_handler import decode_access_token

    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return {
        "email": payload.get("sub"),
        "workspace_id": payload.get("workspace_id")
    }


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Optional[dict]:
    """
    Dependency to optionally get the current authenticated user.
    Does not raise if not authenticated (returns None).

    Returns:
        dict with 'email' and 'workspace_id', or None if not authenticated
    """
    if not credentials:
        return None

    from app.auth.jwt_handler import decode_access_token

    payload = decode_access_token(credentials.credentials)
    if not payload:
        return None

    return {
        "email": payload.get("sub"),
        "workspace_id": payload.get("workspace_id")
    }


def get_workspace_id_factory(workspace_id_param: Optional[str] = None):
    """
    Factory for dual-mode workspace ID dependency.

    Accepts either:
    1. JWT Bearer token (preferred) - workspace_id from token
    2. workspace_id query parameter (legacy) - for backwards compatibility

    During migration, both methods work. Eventually, we can deprecate
    the query parameter method.
    """
    async def get_workspace_id(
        workspace_id: Optional[str] = workspace_id_param,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
    ) -> str:
        # First, try to get workspace from JWT token
        if credentials:
            from app.auth.jwt_handler import decode_access_token
            payload = decode_access_token(credentials.credentials)
            if payload and payload.get("workspace_id"):
                logger.debug(f"Using workspace from JWT: {payload.get('workspace_id')}")
                return payload.get("workspace_id")

        # Fall back to workspace_id query parameter (legacy mode)
        if workspace_id:
            logger.debug(f"Using workspace from query param: {workspace_id}")
            return workspace_id

        # Neither provided
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Provide a Bearer token or workspace_id parameter."
        )

    return get_workspace_id


# Default dual-mode workspace dependency
# Usage: workspace_id: str = Depends(get_workspace_id)
from fastapi import Query
async def get_workspace_id(
    workspace_id: Optional[str] = Query(None, description="Workspace identifier (legacy, prefer auth)"),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> str:
    """
    Dual-mode workspace ID dependency.

    Accepts either:
    1. JWT Bearer token (preferred) - workspace_id from token
    2. workspace_id query parameter (legacy) - for backwards compatibility

    Returns:
        workspace_id string

    Raises:
        HTTPException 401 if neither auth nor workspace_id provided
    """
    # First, try to get workspace from JWT token
    if credentials:
        from app.auth.jwt_handler import decode_access_token
        payload = decode_access_token(credentials.credentials)
        if payload and payload.get("workspace_id"):
            logger.debug(f"Using workspace from JWT: {payload.get('workspace_id')}")
            return payload.get("workspace_id")

    # Fall back to workspace_id query parameter (legacy mode)
    if workspace_id:
        logger.debug(f"Using workspace from query param: {workspace_id}")
        return workspace_id

    # Neither provided
    raise HTTPException(
        status_code=401,
        detail="Authentication required. Provide a Bearer token or workspace_id parameter."
    )
