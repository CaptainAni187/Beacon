"""User request and response schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.core.enums import UserStatus
from app.core.schemas import SchemaBase


class UserRead(SchemaBase):
    """Public user profile returned to clients."""

    id: UUID
    username: str
    email: EmailStr
    display_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    phone_number: Optional[str] = None
    status: UserStatus
    last_seen_at: Optional[datetime] = None
    public_key: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class UserPublic(SchemaBase):
    """Limited user profile visible to other users."""

    id: UUID
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    status: UserStatus
    last_seen_at: Optional[datetime] = None
    public_key: Optional[str] = None


class UserUpdate(BaseModel):
    """Payload for updating the authenticated user's profile."""

    display_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    avatar_url: Optional[str] = Field(default=None, max_length=512)
    bio: Optional[str] = Field(default=None, max_length=500)
    phone_number: Optional[str] = Field(default=None, max_length=20)
    status: Optional[UserStatus] = None


class PublicKeyUpdate(BaseModel):
    """Payload for registering the authenticated user's E2EE public key."""

    public_key: str = Field(min_length=1, max_length=2000)
