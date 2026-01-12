"""
Shared FastAPI dependencies for the Meal Planner API.

Authentication is handled by Supabase. The frontend obtains a JWT from Supabase Auth,
and the backend validates it to extract user information.
"""
import logging
from typing import Optional
from fastapi import Header, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.config import settings
from app.db.supabase_client import get_supabase_admin_client

logger = logging.getLogger(__name__)

# Bearer token security scheme
bearer_scheme = HTTPBearer(auto_error=False)

# Supabase JWT settings
# The JWT secret is derived from your project's JWT secret in Supabase dashboard
# For now, we'll use the Supabase API to validate tokens
SUPABASE_JWT_SECRET = None  # We'll validate via Supabase API instead


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
) -> dict:
    """
    Dependency to get the current authenticated user from Supabase JWT.

    The frontend sends the Supabase access token in the Authorization header.
    We validate it and extract the user's email and workspace_id.

    Returns:
        dict with 'email', 'workspace_id', and 'user_id' (Supabase UUID)

    Raises:
        HTTPException 401 if not authenticated
    """
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials

    try:
        # Use Supabase admin client to get user from token
        supabase = get_supabase_admin_client()
        user_response = supabase.auth.get_user(token)

        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"}
            )

        user = user_response.user

        # Get the user's profile to get workspace_id
        profile_response = supabase.table("profiles").select("workspace_id").eq("id", user.id).single().execute()

        if not profile_response.data:
            # Profile doesn't exist yet - this shouldn't happen if trigger worked
            # But handle gracefully by creating workspace_id from email
            workspace_id = _email_to_workspace_id(user.email)
            logger.warning(f"No profile found for user {user.id}, using derived workspace_id: {workspace_id}")
        else:
            workspace_id = profile_response.data["workspace_id"]

        return {
            "user_id": str(user.id),
            "email": user.email,
            "workspace_id": workspace_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating Supabase token: {e}")
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Optional[dict]:
    """
    Dependency to optionally get the current authenticated user.
    Does not raise if not authenticated (returns None).

    Returns:
        dict with 'email', 'workspace_id', and 'user_id', or None if not authenticated
    """
    if not credentials:
        return None

    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


async def get_workspace_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> str:
    """
    Dependency to get the current user's workspace_id.

    Returns:
        workspace_id string

    Raises:
        HTTPException 401 if not authenticated
    """
    user = await get_current_user(credentials)
    return user["workspace_id"]


def _email_to_workspace_id(email: str) -> str:
    """
    Convert email to workspace_id.

    Same logic as the database trigger:
    - Take the part before @
    - Replace non-alphanumeric with hyphens
    - Lowercase

    Example: "Andrea.Chan@gmail.com" -> "andrea-chan"
    """
    import re
    username = email.split("@")[0]
    workspace_id = re.sub(r'[^a-z0-9]', '-', username.lower())
    return workspace_id
