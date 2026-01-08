"""
Magic link authentication.

Generates time-limited tokens sent via email for passwordless login.
"""
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from jose import jwt, JWTError
import resend
from app.config import settings

logger = logging.getLogger(__name__)

# Magic link tokens expire in 15 minutes
MAGIC_LINK_EXPIRATION_MINUTES = 15
ALGORITHM = "HS256"


def create_magic_link_token(email: str) -> str:
    """
    Create a short-lived token for magic link authentication.

    Args:
        email: User's email address

    Returns:
        Encoded JWT token for magic link

    Raises:
        ValueError: If JWT_SECRET_KEY is not configured
    """
    if not settings.JWT_SECRET_KEY:
        raise ValueError("JWT_SECRET_KEY not configured")

    expire = datetime.now(timezone.utc) + timedelta(minutes=MAGIC_LINK_EXPIRATION_MINUTES)

    # Add a random nonce for extra security
    nonce = secrets.token_urlsafe(16)

    payload = {
        "sub": email,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "magic_link",
        "nonce": nonce
    }

    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)
    logger.info(f"Created magic link token for {email}, expires in {MAGIC_LINK_EXPIRATION_MINUTES} minutes")
    return token


def verify_magic_link_token(token: str) -> Optional[str]:
    """
    Verify a magic link token and return the email if valid.

    Args:
        token: Magic link JWT token

    Returns:
        Email address if token is valid, None otherwise
    """
    if not settings.JWT_SECRET_KEY:
        logger.error("JWT_SECRET_KEY not configured")
        return None

    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[ALGORITHM])

        # Verify this is a magic link token
        if payload.get("type") != "magic_link":
            logger.warning("Token is not a magic link token")
            return None

        email = payload.get("sub")
        if not email:
            logger.warning("Magic link token missing email")
            return None

        logger.info(f"Magic link token verified for {email}")
        return email

    except JWTError as e:
        logger.warning(f"Magic link token verification failed: {e}")
        return None


def send_magic_link_email(email: str, magic_link_url: str) -> Tuple[bool, Optional[str]]:
    """
    Send magic link email via Resend.

    Args:
        email: Recipient email address
        magic_link_url: Full URL with magic link token

    Returns:
        Tuple of (success: bool, error_message: Optional[str])
    """
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured, cannot send email")
        return False, "Email service not configured"

    resend.api_key = settings.RESEND_API_KEY

    try:
        # Email HTML template
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .button {{
                    display: inline-block;
                    background-color: #10b981;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: 500;
                }}
                .footer {{ margin-top: 30px; color: #6b7280; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Sign in to Meal Planner</h2>
                <p>Click the button below to sign in. This link expires in {MAGIC_LINK_EXPIRATION_MINUTES} minutes.</p>
                <p style="margin: 30px 0;">
                    <a href="{magic_link_url}" class="button">Sign In</a>
                </p>
                <p class="footer">
                    If you didn't request this email, you can safely ignore it.<br>
                    This link can only be used once.
                </p>
            </div>
        </body>
        </html>
        """

        # Plain text fallback
        text_content = f"""
Sign in to Meal Planner

Click the link below to sign in (expires in {MAGIC_LINK_EXPIRATION_MINUTES} minutes):

{magic_link_url}

If you didn't request this email, you can safely ignore it.
        """

        result = resend.Emails.send({
            "from": "Meal Planner <noreply@resend.dev>",  # Use verified domain in production
            "to": [email],
            "subject": "Sign in to Meal Planner",
            "html": html_content,
            "text": text_content
        })

        logger.info(f"Magic link email sent to {email}, id: {result.get('id')}")
        return True, None

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to send magic link email to {email}: {error_msg}")
        return False, error_msg
