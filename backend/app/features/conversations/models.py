"""Conversation and conversation-membership ORM models."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base, SoftDeleteMixin, TimestampMixin
from app.core.enums import ConversationType, MemberRole, enum_column

if TYPE_CHECKING:
    from app.features.messages.models import Message
    from app.features.users.models import User


class Conversation(Base, TimestampMixin, SoftDeleteMixin):
    """
    A direct or group conversation.

    Direct conversations have ``name`` and ``avatar_url`` as null;
    group conversations require a ``name``.
    """

    __tablename__ = "conversations"
    __table_args__ = (
        Index("ix_conversations_type", "type"),
        Index("ix_conversations_created_by_id", "created_by_id"),
        Index("ix_conversations_deleted_at", "deleted_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    type: Mapped[ConversationType] = mapped_column(
        enum_column(ConversationType),
        nullable=False,
    )
    name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    created_by: Mapped[User] = relationship(
        "User",
        back_populates="created_conversations",
        foreign_keys=[created_by_id],
    )
    members: Mapped[list[ConversationMember]] = relationship(
        "ConversationMember",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )
    messages: Mapped[list[Message]] = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )

    def __repr__(self) -> str:
        return f"<Conversation id={self.id} type={self.type.value}>"


class ConversationMember(Base, TimestampMixin, SoftDeleteMixin):
    """
    Membership record linking a user to a conversation.

    Tracks role, notification preferences, and read position.
    """

    __tablename__ = "conversation_members"
    __table_args__ = (
        UniqueConstraint(
            "conversation_id",
            "user_id",
            name="uq_conversation_members_conversation_user",
        ),
        Index("ix_conversation_members_conversation_id", "conversation_id"),
        Index("ix_conversation_members_user_id", "user_id"),
        Index("ix_conversation_members_role", "role"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[MemberRole] = mapped_column(
        enum_column(MemberRole),
        default=MemberRole.MEMBER,
        nullable=False,
    )
    is_muted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    last_read_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    conversation: Mapped[Conversation] = relationship(
        "Conversation",
        back_populates="members",
    )
    user: Mapped[User] = relationship(
        "User",
        back_populates="conversation_memberships",
    )

    def __repr__(self) -> str:
        return (
            f"<ConversationMember conversation={self.conversation_id} "
            f"user={self.user_id} role={self.role.value}>"
        )
