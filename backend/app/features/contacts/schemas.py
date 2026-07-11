"""Contact request and response schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.core.enums import ContactStatus, UserStatus
from app.core.schemas import SchemaBase


class AddContactRequest(BaseModel):
    """Payload for adding a contact."""

    username: Optional[str] = Field(default=None, min_length=3, max_length=50)
    phone: Optional[str] = Field(default=None, min_length=3, max_length=20)
    user_id: Optional[UUID] = None

    @model_validator(mode="after")
    def require_identifier(self) -> "AddContactRequest":
        if not self.username and not self.phone and not self.user_id:
            raise ValueError("Provide username, phone, or user_id")
        return self


class ContactResponse(SchemaBase):
    """Current user's contact with public profile details."""

    id: UUID
    user_id: UUID
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    last_seen_at: Optional[datetime] = None
    status: UserStatus
    contact_status: ContactStatus


class ContactSearchResponse(SchemaBase):
    """User search result for contact discovery."""

    id: UUID
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    phone_number: Optional[str] = None
    last_seen_at: Optional[datetime] = None
    status: UserStatus


# Backwards-compatible names used by older imports.
ContactCreate = AddContactRequest
ContactRead = ContactResponse
ContactSearchResult = ContactSearchResponse
