"""Message request and response schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.enums import DeliveryStatus, MessageType
from app.core.schemas import SchemaBase, TimestampSchema
from app.features.users.schemas import UserPublic


class AttachmentRead(TimestampSchema):
    """File attachment metadata."""

    id: UUID
    message_id: UUID
    url: str
    filename: str
    mime_type: str
    size: int


class ReactionRead(TimestampSchema):
    """Message reaction."""

    id: UUID
    message_id: UUID
    user_id: UUID
    emoji: str
    user: UserPublic


class MessageStatusRead(TimestampSchema):
    """Per-user message delivery status."""

    id: UUID
    message_id: UUID
    user_id: UUID
    status: DeliveryStatus


class MessageRecipientKeyCreate(BaseModel):
    """One recipient's wrapped copy of an encrypted message's content key."""

    user_id: UUID
    wrapped_key: str
    wrap_iv: str


class MessageRecipientKeyRead(SchemaBase):
    """The requesting user's own wrapped content-key entry for a message."""

    wrapped_key: str
    wrap_iv: str


class MessageRead(TimestampSchema):
    """Full message with related data."""

    id: UUID
    conversation_id: UUID
    sender_id: UUID
    content: str
    type: MessageType
    reply_to_id: Optional[UUID] = None
    reply_to: Optional["MessagePreview"] = None
    sender: UserPublic
    attachments: list[AttachmentRead] = []
    reactions: list[ReactionRead] = []
    statuses: list[MessageStatusRead] = []
    is_encrypted: bool = False
    iv: Optional[str] = None
    # Only the requesting user's own wrapped content-key — never anyone else's.
    recipient_key: Optional[MessageRecipientKeyRead] = None


class MessagePreview(SchemaBase):
    """Lightweight message for conversation previews."""

    id: UUID
    content: str
    type: MessageType
    sender_id: UUID
    created_at: datetime


class MessageCreate(BaseModel):
    """
    Payload for sending a message.

    When ``is_encrypted`` is set, ``content`` is base64 AES-GCM ciphertext
    (encrypted client-side) and ``recipient_keys`` must carry one wrapped
    copy of the content key per conversation member, each individually
    encrypted for that member via ECDH. The server never sees plaintext.
    """

    conversation_id: UUID
    content: str = Field(min_length=1, max_length=20000)
    type: MessageType = MessageType.TEXT
    reply_to_id: Optional[UUID] = None
    is_encrypted: bool = False
    iv: Optional[str] = None
    recipient_keys: list[MessageRecipientKeyCreate] = []


class MessageUpdate(BaseModel):
    """Payload for editing a message."""

    content: str = Field(min_length=1, max_length=10000)


class MessagePage(SchemaBase):
    """Paginated message list."""

    messages: list[MessageRead]
    has_more: bool
    next_cursor: Optional[str] = None
