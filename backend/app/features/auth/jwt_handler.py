"""
JWT token handler.

Provides utilities for creating, validating, and decoding JWT tokens.
Uses python-jose for token operations.

TODO: Implement token creation and validation once auth service is ready.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt

from app.core.config import get_settings

settings = get_settings()

ALGORITHM = "HS256"


def create_access_token(
    subject: str,
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[dict] = None,
) -> str:
    """
    Create a signed JWT access token.
    TODO: Implement with configurable expiry and claims.
    """
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload: dict[str, Any] = {"sub": subject, "exp": expire, "type": "access"}
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def create_refresh_token(subject: str) -> str:
    """
    Create a signed JWT refresh token with longer expiry.
    TODO: Implement refresh token rotation strategy.
    """
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.refresh_token_expire_days
    )
    payload = {"sub": subject, "exp": expire, "type": "refresh"}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT token.
    Returns the payload dict or None if invalid/expired.
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def decode_access_token(token: str) -> Optional[dict]:
    """Decode an access token payload."""
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        return None
    return payload


def verify_access_token(token: str) -> Optional[str]:
    """
    Verify an access token and return the subject (user ID).
    Returns None if the token is invalid or not an access token.
    """
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        return None
    return payload.get("sub")


def verify_token(token: str) -> Optional[str]:
    """Compatibility wrapper for access-token verification."""
    return verify_access_token(token)


def verify_refresh_token(token: str) -> Optional[str]:
    """
    Verify a refresh token and return the subject (user ID).
    Returns None if the token is invalid or not a refresh token.
    """
    payload = decode_token(token)
    if payload is None or payload.get("type") != "refresh":
        return None
    return payload.get("sub")
