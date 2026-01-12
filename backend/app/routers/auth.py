"""
Authentication API endpoints.

Authentication is handled by Supabase Auth on the frontend.
This router provides endpoints for:
- Getting current user info
- Invite code management for beta access
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.dependencies import get_current_user
from app.db.supabase_client import get_supabase_admin_client

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)


class UserResponse(BaseModel):
    """User information response."""
    email: str
    workspace_id: str
    user_id: Optional[str] = None


class InviteValidateRequest(BaseModel):
    """Request to validate an invite code."""
    invite_code: str
    email: str


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get the current authenticated user's information.

    Requires a valid Supabase JWT Bearer token.

    Returns:
        User information including email and workspace_id
    """
    return UserResponse(
        email=current_user["email"],
        workspace_id=current_user["workspace_id"],
        user_id=current_user.get("user_id")
    )


@router.post("/validate-invite")
async def validate_invite(request: InviteValidateRequest):
    """
    Validate an invite code before signup.

    Called by frontend before allowing new user registration.
    This checks if the code is valid but does NOT consume it.

    Args:
        request: Contains invite_code and email

    Returns:
        Success if valid, error if invalid
    """
    try:
        supabase = get_supabase_admin_client()

        # Get the invite code
        response = supabase.table("invite_codes").select("*").eq("code", request.invite_code).single().execute()

        if not response.data:
            raise HTTPException(status_code=400, detail="Invalid invite code")

        invite = response.data

        # Check if disabled
        if invite.get("disabled"):
            raise HTTPException(status_code=400, detail="This invite code has been disabled")

        # Check if expired
        if invite.get("expires_at"):
            from datetime import datetime
            expires = datetime.fromisoformat(invite["expires_at"].replace("Z", "+00:00"))
            if datetime.now(expires.tzinfo) > expires:
                raise HTTPException(status_code=400, detail="This invite code has expired")

        # Check if max uses reached
        if invite.get("max_uses") and invite.get("uses", 0) >= invite["max_uses"]:
            raise HTTPException(status_code=400, detail="This invite code has reached its maximum uses")

        # Check if email already used this code
        redemption_check = supabase.table("invite_redemptions").select("id").eq("code", request.invite_code).eq("email", request.email.lower()).execute()
        if redemption_check.data:
            raise HTTPException(status_code=400, detail="You have already used this invite code")

        return {"valid": True, "message": "Invite code is valid"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating invite code: {e}")
        raise HTTPException(status_code=500, detail="Error validating invite code")


@router.post("/use-invite")
async def use_invite(request: InviteValidateRequest):
    """
    Use (redeem) an invite code after successful signup.

    Called by frontend after Supabase Auth signup completes.
    This marks the invite as used.

    Args:
        request: Contains invite_code and email

    Returns:
        Success if redeemed
    """
    try:
        supabase = get_supabase_admin_client()

        # First validate the code
        response = supabase.table("invite_codes").select("*").eq("code", request.invite_code).single().execute()

        if not response.data:
            raise HTTPException(status_code=400, detail="Invalid invite code")

        invite = response.data

        # All validation checks from validate_invite
        if invite.get("disabled"):
            raise HTTPException(status_code=400, detail="This invite code has been disabled")

        if invite.get("expires_at"):
            from datetime import datetime
            expires = datetime.fromisoformat(invite["expires_at"].replace("Z", "+00:00"))
            if datetime.now(expires.tzinfo) > expires:
                raise HTTPException(status_code=400, detail="This invite code has expired")

        if invite.get("max_uses") and invite.get("uses", 0) >= invite["max_uses"]:
            raise HTTPException(status_code=400, detail="This invite code has reached its maximum uses")

        # Record redemption
        email_lower = request.email.lower()
        supabase.table("invite_redemptions").insert({
            "code": request.invite_code,
            "email": email_lower
        }).execute()

        # Increment use count
        supabase.table("invite_codes").update({
            "uses": (invite.get("uses", 0) or 0) + 1
        }).eq("code", request.invite_code).execute()

        logger.info(f"Invite code {request.invite_code} redeemed by {email_lower}")
        return {"success": True, "message": "Invite code redeemed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error using invite code: {e}")
        raise HTTPException(status_code=500, detail="Error redeeming invite code")
