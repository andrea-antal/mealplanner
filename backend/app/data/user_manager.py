"""
User data management for authentication.

Stores users in JSON files under data/users/.
"""
import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from app.config import settings
from app.models.user import User

logger = logging.getLogger(__name__)


def _get_users_dir() -> Path:
    """Get the users data directory."""
    data_dir = Path(settings.DATA_DIR)
    users_dir = data_dir / "users"
    users_dir.mkdir(parents=True, exist_ok=True)
    return users_dir


def _email_to_filename(email: str) -> str:
    """Convert email to safe filename."""
    # Replace @ and . with underscores, lowercase
    safe_name = re.sub(r'[^a-zA-Z0-9]', '_', email.lower())
    return f"{safe_name}.json"


def _email_to_workspace_id(email: str) -> str:
    """
    Generate a workspace ID from email.
    Uses the part before @ and makes it URL-safe.
    """
    # Get username part of email
    username = email.split("@")[0].lower()
    # Replace non-alphanumeric with hyphens
    workspace_id = re.sub(r'[^a-z0-9]', '-', username)
    # Remove leading/trailing hyphens and collapse multiple hyphens
    workspace_id = re.sub(r'-+', '-', workspace_id).strip('-')
    return workspace_id or "user"


def get_user_by_email(email: str) -> Optional[User]:
    """
    Load a user by email address.

    Args:
        email: User's email address

    Returns:
        User object if found, None otherwise
    """
    users_dir = _get_users_dir()
    user_file = users_dir / _email_to_filename(email)

    if not user_file.exists():
        return None

    try:
        with open(user_file, 'r') as f:
            data = json.load(f)
        return User(**data)
    except Exception as e:
        logger.error(f"Error loading user {email}: {e}")
        return None


def create_user(email: str) -> User:
    """
    Create a new user account.

    Args:
        email: User's email address

    Returns:
        Created User object
    """
    workspace_id = _email_to_workspace_id(email)
    now = datetime.now(timezone.utc)

    user = User(
        email=email,
        workspace_id=workspace_id,
        created_at=now,
        last_login=now
    )

    save_user(user)
    logger.info(f"Created new user: {email} with workspace {workspace_id}")
    return user


def save_user(user: User) -> None:
    """
    Save a user to storage.

    Args:
        user: User object to save
    """
    users_dir = _get_users_dir()
    user_file = users_dir / _email_to_filename(user.email)

    data = user.model_dump()
    # Convert datetime to ISO strings for JSON
    data["created_at"] = user.created_at.isoformat()
    if user.last_login:
        data["last_login"] = user.last_login.isoformat()

    with open(user_file, 'w') as f:
        json.dump(data, f, indent=2)

    logger.debug(f"Saved user: {user.email}")


def update_last_login(email: str) -> Optional[User]:
    """
    Update a user's last login timestamp.

    Args:
        email: User's email address

    Returns:
        Updated User object, or None if user not found
    """
    user = get_user_by_email(email)
    if not user:
        return None

    user.last_login = datetime.now(timezone.utc)
    save_user(user)
    return user


def get_or_create_user(email: str) -> User:
    """
    Get an existing user or create a new one.

    Args:
        email: User's email address

    Returns:
        User object (existing or newly created)
    """
    user = get_user_by_email(email)
    if user:
        return user
    return create_user(email)
