"""Call and call-link request/response schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.enums import CallStatus, CallType
from app.core.schemas import SchemaBase
from app.features.users.schemas import UserPublic


class CallLinkCreate(BaseModel):
    """Payload for creating a shareable call link."""

    name: Optional[str] = Field(default=None, max_length=100)
    requires_admin_approval: bool = True


class CallLinkUpdate(BaseModel):
    """Payload for updating a call link's settings."""

    name: Optional[str] = Field(default=None, max_length=100)
    requires_admin_approval: Optional[bool] = None


class CallLinkRead(SchemaBase):
    """Call link details, including the joinable room key."""

    id: UUID
    name: Optional[str] = None
    requires_admin_approval: bool
    room_key: str
    created_by: UserPublic
    created_at: datetime


class CallParticipantRead(SchemaBase):
    """A participant's roster entry within a call."""

    user: UserPublic
    joined_at: Optional[datetime] = None
    left_at: Optional[datetime] = None


class CallCreate(BaseModel):
    """Payload for starting a new call."""

    conversation_id: Optional[UUID] = None
    call_link_id: Optional[UUID] = None
    type: CallType = CallType.VOICE


class CallRead(SchemaBase):
    """A call history entry."""

    id: UUID
    conversation_id: Optional[UUID] = None
    call_link_id: Optional[UUID] = None
    initiator: UserPublic
    type: CallType
    status: CallStatus
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    participants: list[CallParticipantRead] = []
    created_at: datetime
