"""
Invite code admin API endpoints.

Requires X-Admin-Key header for all operations.
"""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from app.dependencies import verify_admin
from app.models.invite import InviteCodeCreate, InviteCodeResponse
from app.data.invite_manager import (
    create_invite,
    get_invite,
    list_invites,
    disable_invite,
    get_redemptions_for_code
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/invites",
    tags=["invites", "admin"]
)


@router.post("", response_model=InviteCodeResponse)
async def create_invite_code(
    request: InviteCodeCreate,
    _: bool = Depends(verify_admin)
):
    """
    Create a new invite code.
    
    Args:
        request: Invite code creation options
        
    Returns:
        Created invite code details
    """
    try:
        invite = create_invite(
            code=request.code,
            max_uses=request.max_uses,
            expires_in_days=request.expires_in_days,
            note=request.note,
            created_by="admin"
        )
        return InviteCodeResponse(
            code=invite.code,
            created_at=invite.created_at,
            max_uses=invite.max_uses,
            uses=invite.uses,
            expires_at=invite.expires_at,
            note=invite.note,
            disabled=invite.disabled,
            is_valid=invite.is_valid()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[InviteCodeResponse])
async def list_invite_codes(
    include_disabled: bool = Query(False, description="Include disabled codes"),
    _: bool = Depends(verify_admin)
):
    """
    List all invite codes.
    
    Returns:
        List of invite codes with usage stats
    """
    invites = list_invites(include_disabled=include_disabled)
    return [
        InviteCodeResponse(
            code=inv.code,
            created_at=inv.created_at,
            max_uses=inv.max_uses,
            uses=inv.uses,
            expires_at=inv.expires_at,
            note=inv.note,
            disabled=inv.disabled,
            is_valid=inv.is_valid()
        )
        for inv in invites
    ]


@router.get("/{code}", response_model=InviteCodeResponse)
async def get_invite_code(
    code: str,
    _: bool = Depends(verify_admin)
):
    """
    Get details for a specific invite code.
    
    Args:
        code: The invite code
        
    Returns:
        Invite code details
    """
    invite = get_invite(code)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite code not found")
    
    return InviteCodeResponse(
        code=invite.code,
        created_at=invite.created_at,
        max_uses=invite.max_uses,
        uses=invite.uses,
        expires_at=invite.expires_at,
        note=invite.note,
        disabled=invite.disabled,
        is_valid=invite.is_valid()
    )


@router.delete("/{code}")
async def disable_invite_code(
    code: str,
    _: bool = Depends(verify_admin)
):
    """
    Disable an invite code (soft delete).
    
    Args:
        code: The invite code to disable
        
    Returns:
        Success message
    """
    if not disable_invite(code):
        raise HTTPException(status_code=404, detail="Invite code not found")
    
    return {"message": f"Invite code {code} has been disabled"}


@router.get("/{code}/redemptions")
async def get_invite_redemptions(
    code: str,
    _: bool = Depends(verify_admin)
):
    """
    Get list of users who redeemed a specific invite code.
    
    Args:
        code: The invite code
        
    Returns:
        List of redemptions with email and timestamp
    """
    invite = get_invite(code)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite code not found")
    
    redemptions = get_redemptions_for_code(code)
    return {
        "code": invite.code,
        "total_uses": invite.uses,
        "redemptions": [
            {"email": r.email, "redeemed_at": r.redeemed_at}
            for r in redemptions
        ]
    }
