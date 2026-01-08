"""
JWT token handling for session management.

Uses python-jose for JWT creation and verification.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt, JWTError
from app.config import settings

logger = logging.getLogger(__name__)

# JWT algorithm
ALGORITHM = "HS256"


def create_access_token(email: str, workspace_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token for authenticated sessions.

    Args:
        email: User's email address
        workspace_id: User's workspace identifier
        expires_delta: Optional custom expiration time

    Returns:
        Encoded JWT token string

    Raises:
        ValueError: If JWT_SECRET_KEY is not configured
    """
    if not settings.JWT_SECRET_KEY:
        raise ValueError("JWT_SECRET_KEY not configured")

    if expires_delta is None:
        expires_delta = timedelta(hours=settings.JWT_EXPIRATION_HOURS)

    expire = datetime.now(timezone.utc) + expires_delta

    payload = {
        "sub": email,
        "workspace_id": workspace_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access"
    }

    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)
    logger.debug(f"Created access token for {email}, expires {expire}")
    return token


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and verify a JWT access token.

    Args:
        token: JWT token string

    Returns:
        Decoded payload dict with 'sub' (email) and 'workspace_id',
        or None if token is invalid/expired
    """
    if not settings.JWT_SECRET_KEY:
        logger.error("JWT_SECRET_KEY not configured")
        return None

    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[ALGORITHM])

        # Verify this is an access token
        if payload.get("type") != "access":
            logger.warning("Token is not an access token")
            return None

        return payload
    except JWTError as e:
        logger.warning(f"JWT decode error: {e}")
        return None
