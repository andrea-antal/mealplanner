"""
Invite code data management.

Stores invite codes in JSON file under data/invites.json.
"""
import json
import logging
import secrets
import string
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Tuple, Dict, Optional, List
from app.config import settings
from app.models.invite import InviteCode, InviteRedemption

logger = logging.getLogger(__name__)


def _get_invites_file() -> Path:
    """Get the invites data file path."""
    data_dir = Path(settings.DATA_DIR)
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "invites.json"


def _get_redemptions_file() -> Path:
    """Get the redemptions data file path."""
    data_dir = Path(settings.DATA_DIR)
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "invite_redemptions.json"


def _load_invites() -> Dict[str, dict]:
    """Load all invite codes from storage."""
    invites_file = _get_invites_file()
    if not invites_file.exists():
        return {}
    try:
        with open(invites_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading invites: {e}")
        return {}


def _save_invites(invites: Dict[str, dict]) -> None:
    """Save all invite codes to storage."""
    invites_file = _get_invites_file()
    with open(invites_file, 'w') as f:
        json.dump(invites, f, indent=2, default=str)


def _load_redemptions() -> List[dict]:
    """Load all redemptions from storage."""
    redemptions_file = _get_redemptions_file()
    if not redemptions_file.exists():
        return []
    try:
        with open(redemptions_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading redemptions: {e}")
        return []


def _save_redemptions(redemptions: List[dict]) -> None:
    """Save all redemptions to storage."""
    redemptions_file = _get_redemptions_file()
    with open(redemptions_file, 'w') as f:
        json.dump(redemptions, f, indent=2, default=str)


def generate_code(prefix: str = "MEAL") -> str:
    """
    Generate a random invite code.
    
    Format: PREFIX-XXXX where X is alphanumeric uppercase.
    """
    chars = string.ascii_uppercase + string.digits
    random_part = ''.join(secrets.choice(chars) for _ in range(6))
    return f"{prefix}-{random_part}"


def create_invite(
    code: Optional[str] = None,
    max_uses: Optional[int] = None,
    expires_in_days: Optional[int] = None,
    note: Optional[str] = None,
    created_by: Optional[str] = None
) -> InviteCode:
    """
    Create a new invite code.
    
    Args:
        code: Custom code, or auto-generate if None
        max_uses: Maximum redemptions allowed
        expires_in_days: Days until expiry
        note: Optional description
        created_by: Admin/user who created it
        
    Returns:
        Created InviteCode
    """
    invites = _load_invites()
    
    # Generate code if not provided
    if not code:
        code = generate_code()
        # Ensure uniqueness
        while code in invites:
            code = generate_code()
    else:
        code = code.upper().strip()
        if code in invites:
            raise ValueError(f"Invite code '{code}' already exists")
    
    now = datetime.now(timezone.utc)
    expires_at = None
    if expires_in_days:
        expires_at = now + timedelta(days=expires_in_days)
    
    invite = InviteCode(
        code=code,
        created_at=now,
        created_by=created_by,
        max_uses=max_uses,
        uses=0,
        expires_at=expires_at,
        note=note,
        disabled=False
    )
    
    # Save
    invites[code] = invite.model_dump()
    invites[code]["created_at"] = invite.created_at.isoformat()
    if invite.expires_at:
        invites[code]["expires_at"] = invite.expires_at.isoformat()
    _save_invites(invites)
    
    logger.info(f"Created invite code: {code}")
    return invite


def get_invite(code: str) -> Optional[InviteCode]:
    """Get an invite code by its code string."""
    invites = _load_invites()
    code = code.upper().strip()
    
    if code not in invites:
        return None
    
    data = invites[code]
    # Parse datetime strings
    data["created_at"] = datetime.fromisoformat(data["created_at"])
    if data.get("expires_at"):
        data["expires_at"] = datetime.fromisoformat(data["expires_at"])
    
    return InviteCode(**data)


def validate_and_use_invite(code: str, email: str) -> Tuple[bool, str]:
    """
    Validate an invite code and record its use.
    
    Args:
        code: The invite code to validate
        email: Email of user redeeming it
        
    Returns:
        Tuple of (success, message)
    """
    invite = get_invite(code)
    
    if not invite:
        return False, "Invalid invite code"
    
    if not invite.is_valid():
        if invite.disabled:
            return False, "This invite code has been disabled"
        if invite.max_uses and invite.uses >= invite.max_uses:
            return False, "This invite code has reached its usage limit"
        if invite.expires_at:
            return False, "This invite code has expired"
        return False, "Invalid invite code"
    
    # Record redemption
    invites = _load_invites()
    invites[invite.code]["uses"] = invite.uses + 1
    _save_invites(invites)
    
    # Log redemption
    redemptions = _load_redemptions()
    redemptions.append({
        "code": invite.code,
        "email": email,
        "redeemed_at": datetime.now(timezone.utc).isoformat()
    })
    _save_redemptions(redemptions)
    
    logger.info(f"Invite code {code} redeemed by {email}")
    return True, "Invite code accepted"


def list_invites(include_disabled: bool = False) -> List[InviteCode]:
    """List all invite codes."""
    invites = _load_invites()
    result = []
    
    for data in invites.values():
        data["created_at"] = datetime.fromisoformat(data["created_at"])
        if data.get("expires_at"):
            data["expires_at"] = datetime.fromisoformat(data["expires_at"])
        invite = InviteCode(**data)
        if include_disabled or not invite.disabled:
            result.append(invite)
    
    return sorted(result, key=lambda x: x.created_at, reverse=True)


def disable_invite(code: str) -> bool:
    """Disable an invite code."""
    invites = _load_invites()
    code = code.upper().strip()
    
    if code not in invites:
        return False
    
    invites[code]["disabled"] = True
    _save_invites(invites)
    logger.info(f"Disabled invite code: {code}")
    return True


def get_redemptions_for_code(code: str) -> List[InviteRedemption]:
    """Get all redemptions for a specific invite code."""
    redemptions = _load_redemptions()
    code = code.upper().strip()
    
    return [
        InviteRedemption(
            code=r["code"],
            email=r["email"],
            redeemed_at=datetime.fromisoformat(r["redeemed_at"])
        )
        for r in redemptions
        if r["code"] == code
    ]
