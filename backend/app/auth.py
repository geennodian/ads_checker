"""Simple token-based authentication for dashboard access."""

import hashlib
import secrets
import time

from app.config import settings

# In-memory token store (sufficient for single-instance deployment)
_valid_tokens: dict[str, float] = {}
TOKEN_TTL = 60 * 60 * 24  # 24 hours


def _clean_expired() -> None:
    now = time.time()
    expired = [t for t, exp in _valid_tokens.items() if now > exp]
    for t in expired:
        del _valid_tokens[t]


def verify_password(password: str) -> str | None:
    """Return a session token if password is correct, else None."""
    if not settings.dashboard_password:
        return None  # No password set — auth disabled
    if not secrets.compare_digest(password, settings.dashboard_password):
        return None
    _clean_expired()
    token = secrets.token_urlsafe(32)
    _valid_tokens[token] = time.time() + TOKEN_TTL
    return token


def is_valid_token(token: str) -> bool:
    """Check if a session token is valid."""
    if not settings.dashboard_password:
        return True  # Auth disabled
    _clean_expired()
    return token in _valid_tokens
