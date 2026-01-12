"""
User model for authentication.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class User(BaseModel):
    """User account model."""
    email: str  # Using str instead of EmailStr for flexibility
    workspace_id: str
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    """Request model for creating a new user."""
    email: str


class MagicLinkRequest(BaseModel):
    """Request model for sending a magic link."""
    email: str
    invite_code: Optional[str] = None  # Required for new users during beta


class TokenResponse(BaseModel):
    """Response model for successful authentication."""
    access_token: str
    token_type: str = "bearer"
    workspace_id: str
    email: str


class UserResponse(BaseModel):
    """Response model for user info."""
    email: str
    workspace_id: str
    created_at: datetime
    last_login: Optional[datetime] = None
