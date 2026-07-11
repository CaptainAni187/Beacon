"""Conversation request and response schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.enums import ConversationType, DeliveryStatus, MemberRole, MessageType
from app.core.schemas import SchemaBase
from app.features.messages.schemas import MessageRead, MessageRecipientKeyRead
from app.features.users.schemas import UserPublic


class ConversationCreateRequest(BaseModel):
    """Generic conversation creation payload."""

    participant_ids: list[UUID] = Field(min_length=1, max_length=50)
    type: ConversationType = ConversationType.DIRECT
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)


class DirectConversationRequest(BaseModel):
    """Payload for creating or retrieving a direct conversation."""

    other_user_id: UUID


class GroupConversationRequest(BaseModel):
    """Payload for creating a group conversation."""

    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    member_ids: list[UUID] = Field(min_length=1, max_length=50)


class ConversationMemberResponse(SchemaBase):
    """Conversation membership details."""

    id: UUID
    user_id: UUID
    role: MemberRole
    is_muted: bool
    is_pinned: bool
    joined_at: datetime
    last_read_at: Optional[datetime] = None
    user: UserPublic


class LastMessageResponse(SchemaBase):
    """
    Latest message metadata for conversation summaries.

    When ``is_encrypted``, ``content`` is ciphertext and the client must
    decrypt it with ``recipient_key`` (this user's own wrapped copy of the
    content key) before it's fit to display as a preview.
    """

    id: UUID
    content: str
    type: MessageType
    sender_id: UUID
    sender_display_name: str
    # The sender's E2EE public key — needed by the client to unwrap
    # `recipient_key` and decrypt `content` for the sidebar preview.
    sender_public_key: Optional[str] = None
    created_at: datetime
    is_encrypted: bool = False
    iv: Optional[str] = None
    recipient_key: Optional[MessageRecipientKeyRead] = None


class ConversationSummary(SchemaBase):
    """Conversation list item for the inbox sidebar."""

    id: UUID
    type: ConversationType
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    last_message: Optional[LastMessageResponse] = None
    last_message_preview: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int
    member_count: int
    is_pinned: bool = False
    is_muted: bool = False


class ConversationResponse(SchemaBase):
    """Full conversation response."""

    id: UUID
    type: ConversationType
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    description: Optional[str] = None
    created_by_id: UUID
    members: list[ConversationMemberResponse]
    last_message: Optional[LastMessageResponse] = None
    unread_count: int = 0
    member_count: int
    created_at: datetime
    updated_at: datetime


class ConversationDetailResponse(ConversationResponse):
    """Conversation details returned by the detail endpoint."""


class PaginationResponse(SchemaBase):
    """Page metadata."""

    page: int
    page_size: int
    total: int
    total_pages: int
    has_next: bool
    has_previous: bool


class MessageHistoryResponse(SchemaBase):
    """Paginated message history."""

    messages: list[MessageRead]
    pagination: PaginationResponse


class UnreadCountResponse(SchemaBase):
    """Unread count response."""

    conversation_id: UUID
    unread_count: int


class ConversationUpdate(BaseModel):
    """Payload for updating conversation membership settings."""

    is_muted: Optional[bool] = None
    is_pinned: Optional[bool] = None
    name: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)


class GroupMemberAdd(BaseModel):
    """Payload for adding a member to a group."""

    user_id: UUID


class GroupMemberRoleUpdate(BaseModel):
    """Payload for promoting/demoting a group member."""

    role: MemberRole


# Backwards-compatible names used by older imports.
ConversationCreate = ConversationCreateRequest
ConversationPreview = ConversationSummary
ConversationRead = ConversationResponse
ConversationMemberRead = ConversationMemberResponse
GroupCreate = GroupConversationRequest
