"""Users router."""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.features.auth.dependencies import get_current_user
from app.core.database import get_db
from app.core.exceptions import AppError, raise_http
from app.features.users.models import User
from app.features.users.schemas import PublicKeyUpdate, UserPublic, UserRead, UserUpdate
from app.features.users.service import user_service

router = APIRouter()


@router.get("/me", response_model=UserRead)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
) -> UserRead:
    """Get the authenticated user's profile."""
    return UserRead.model_validate(current_user)


@router.put("/me", response_model=UserRead)
def update_current_user_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserRead:
    """Update the authenticated user's profile."""
    try:
        return user_service.update_profile(db, current_user.id, payload)
    except AppError as exc:
        raise_http(exc)


@router.put("/me/public-key", response_model=UserRead)
def update_public_key(
    payload: PublicKeyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserRead:
    """Register or rotate the authenticated user's E2EE public key."""
    try:
        return user_service.set_public_key(db, current_user.id, payload)
    except AppError as exc:
        raise_http(exc)


@router.get("/{user_id}", response_model=UserPublic)
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> UserPublic:
    """Get a user's public profile by ID."""
    try:
        return user_service.get_public_profile(db, user_id)
    except AppError as exc:
        raise_http(exc)
