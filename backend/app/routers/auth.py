"""
Authentication API endpoints.

Provides magic link login and session management.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from app.models.user import MagicLinkRequest, TokenResponse, UserResponse
from app.auth.magic_link import create_magic_link_token, verify_magic_link_token, send_magic_link_email
from app.auth.jwt_handler import create_access_token
from app.data.user_manager import get_or_create_user, update_last_login, get_user_by_email
from app.dependencies import get_current_user
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)


@router.post("/magic-link")
async def request_magic_link(request: MagicLinkRequest):
    """
    Request a magic link to be sent to the user's email.

    The magic link will be valid for 15 minutes.

    Args:
        request: Contains the email address

    Returns:
        Success message (always returns success to prevent email enumeration)
    """
    email = request.email.lower().strip()

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")

    # Check if auth is configured
    if not settings.JWT_SECRET_KEY:
        raise HTTPException(
            status_code=503,
            detail="Authentication not configured (JWT_SECRET_KEY missing)"
        )

    # Create magic link token
    token = create_magic_link_token(email)

    # Build magic link URL - frontend will handle this route
    # In production, this should use a configured frontend URL
    frontend_url = "http://localhost:5173"  # Default for development
    if settings.CORS_ORIGINS:
        # Use first non-localhost origin as production frontend URL
        for origin in settings.cors_origins_list:
            if "localhost" not in origin and "127.0.0.1" not in origin:
                frontend_url = origin
                break

    magic_link_url = f"{frontend_url}/auth/verify?token={token}"

    # Send email
    if settings.RESEND_API_KEY:
        success, error = send_magic_link_email(email, magic_link_url)
        if not success:
            logger.error(f"Failed to send magic link to {email}: {error}")
            # Don't reveal email sending failures to prevent enumeration
    else:
        # Development mode - log the link
        logger.warning(f"RESEND_API_KEY not configured. Magic link for {email}: {magic_link_url}")

    # Always return success to prevent email enumeration
    return {
        "message": "If that email is registered, you will receive a login link shortly.",
        "email": email
    }


@router.get("/verify", response_model=TokenResponse)
async def verify_magic_link(token: str = Query(..., description="Magic link token")):
    """
    Verify a magic link token and return a session JWT.

    This endpoint is called when the user clicks the magic link in their email.

    Args:
        token: The magic link token from the email

    Returns:
        JWT access token for authenticated sessions
    """
    # Verify the magic link token
    email = verify_magic_link_token(token)
    if not email:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired magic link"
        )

    # Get or create user
    user = get_or_create_user(email)

    # Update last login
    update_last_login(email)

    # Create access token
    access_token = create_access_token(email=user.email, workspace_id=user.workspace_id)

    logger.info(f"User {email} authenticated via magic link")

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        workspace_id=user.workspace_id,
        email=user.email
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get the current authenticated user's information.

    Requires a valid JWT Bearer token.

    Returns:
        User information including email and workspace_id
    """
    user = get_user_by_email(current_user["email"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(
        email=user.email,
        workspace_id=user.workspace_id,
        created_at=user.created_at,
        last_login=user.last_login
    )


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Log out the current user.

    Note: JWT tokens are stateless, so this endpoint just returns success.
    The client should discard the token. For true token invalidation,
    you would need a token blacklist (not implemented here).

    Returns:
        Success message
    """
    logger.info(f"User {current_user['email']} logged out")
    return {"message": "Logged out successfully"}
