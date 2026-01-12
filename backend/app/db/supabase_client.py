"""
Supabase client initialization.

Provides two client types:
- Regular client (uses Publishable key): Respects Row-Level Security
- Admin client (uses Secret key): Bypasses RLS for migrations and admin operations
"""
import logging
from functools import lru_cache
from supabase import create_client, Client
from app.config import settings

logger = logging.getLogger(__name__)


@lru_cache()
def get_supabase_client() -> Client:
    """
    Get Supabase client using the Publishable API key.

    This client respects Row-Level Security policies.
    Use this for normal user operations.

    Returns:
        Supabase Client instance
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_PUBLISHABLE_KEY:
        raise RuntimeError(
            "Supabase not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY environment variables."
        )

    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_PUBLISHABLE_KEY)
    logger.info("Supabase client initialized (Publishable key)")
    return client


@lru_cache()
def get_supabase_admin_client() -> Client:
    """
    Get Supabase client using the Secret API key.

    This client BYPASSES Row-Level Security policies.
    Use only for:
    - Data migrations
    - Admin operations
    - Background jobs that need full access

    NEVER expose this client to user-facing endpoints.

    Returns:
        Supabase Client instance with admin privileges
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SECRET_KEY:
        raise RuntimeError(
            "Supabase admin not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY environment variables."
        )

    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SECRET_KEY)
    logger.info("Supabase admin client initialized (Secret key)")
    return client


def get_user_client(access_token: str) -> Client:
    """
    Get a Supabase client authenticated as a specific user.

    This allows making requests with the user's RLS context.

    Args:
        access_token: The user's JWT access token from Supabase Auth

    Returns:
        Supabase Client instance authenticated as the user
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_PUBLISHABLE_KEY:
        raise RuntimeError(
            "Supabase not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY environment variables."
        )

    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_PUBLISHABLE_KEY)
    client.auth.set_session(access_token, "")  # Set just the access token
    return client
