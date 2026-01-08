"""
Authentication module for Meal Planner.

Provides magic link authentication with JWT session tokens.
"""
from app.auth.jwt_handler import create_access_token, decode_access_token
from app.auth.magic_link import create_magic_link_token, verify_magic_link_token, send_magic_link_email

__all__ = [
    "create_access_token",
    "decode_access_token",
    "create_magic_link_token",
    "verify_magic_link_token",
    "send_magic_link_email",
]
