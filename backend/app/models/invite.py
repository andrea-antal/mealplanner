"""
Invite code models for beta access control.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class InviteCode(BaseModel):
    """An invite code for beta access."""
    code: str
    created_at: datetime
    created_by: Optional[str] = None  # Admin or user who created it
    max_uses: Optional[int] = None  # None = unlimited
    uses: int = 0
    expires_at: Optional[datetime] = None
    note: Optional[str] = None  # e.g., "For Product Hunt launch"
    disabled: bool = False

    def is_valid(self) -> bool:
        """Check if this invite code can still be used."""
        if self.disabled:
            return False
        if self.max_uses is not None and self.uses >= self.max_uses:
            return False
        if self.expires_at and datetime.now(self.expires_at.tzinfo) > self.expires_at:
            return False
        return True


class InviteCodeCreate(BaseModel):
    """Request model for creating an invite code."""
    code: Optional[str] = None  # Auto-generate if not provided
    max_uses: Optional[int] = None
    expires_in_days: Optional[int] = None
    note: Optional[str] = None


class InviteCodeResponse(BaseModel):
    """Response model for invite code info."""
    code: str
    created_at: datetime
    max_uses: Optional[int] = None
    uses: int = 0
    expires_at: Optional[datetime] = None
    note: Optional[str] = None
    disabled: bool = False
    is_valid: bool


class InviteRedemption(BaseModel):
    """Record of an invite code being used."""
    code: str
    email: str
    redeemed_at: datetime
