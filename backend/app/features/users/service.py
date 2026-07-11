"""User service implementation."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.features.users.models import User
from app.features.users.schemas import UserPublic, UserRead, UserUpdate, PublicKeyUpdate


class UserService:
    """Handles user profile operations."""

    def get_by_id(self, db: Session, user_id: UUID) -> User:
        """Fetch a user by ID or raise NotFoundError."""
        user = db.get(User, user_id)
        if user is None or user.deleted_at is not None:
            raise NotFoundError("User not found")
        return user

    def get_profile(self, db: Session, user_id: UUID) -> UserRead:
        """Return the authenticated user's full profile."""
        return UserRead.model_validate(self.get_by_id(db, user_id))

    def get_public_profile(self, db: Session, user_id: UUID) -> UserPublic:
        """Return a user's public profile."""
        return UserPublic.model_validate(self.get_by_id(db, user_id))

    def update_profile(self, db: Session, user_id: UUID, payload: UserUpdate) -> UserRead:
        """Update the authenticated user's profile."""
        user = self.get_by_id(db, user_id)
        updates = payload.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(user, field, value)
        db.commit()
        db.refresh(user)
        return UserRead.model_validate(user)

    def set_public_key(self, db: Session, user_id: UUID, payload: PublicKeyUpdate) -> UserRead:
        """
        Register (or rotate) the caller's E2EE public key.

        Rotating the key means anyone who encrypted a message-key wrapper
        for the old key can no longer be decrypted with the new one —
        expected the first time each browser/device generates its own
        keypair, since Beacon does not sync private keys across devices.
        """
        user = self.get_by_id(db, user_id)
        user.public_key = payload.public_key
        db.commit()
        db.refresh(user)
        return UserRead.model_validate(user)


user_service = UserService()
