"""User ORM model."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Index, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, SoftDeleteMixin, TimestampMixin
from app.core.enums import UserStatus, enum_column

if TYPE_CHECKING:
    from app.features.contacts.models import Contact
    from app.features.conversations.models import Conversation, ConversationMember
    from app.features.messages.models import Message, MessageStatus, Reaction


class User(Base, TimestampMixin, SoftDeleteMixin):
    """
    Registered user account.

    Central entity linked to contacts, conversation memberships,
    sent messages, delivery statuses, and reactions.
    """

    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_status", "status"),
        Index("ix_users_deleted_at", "deleted_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    phone_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    public_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[UserStatus] = mapped_column(
        enum_column(UserStatus),
        default=UserStatus.OFFLINE,
        nullable=False,
    )
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Contacts owned by this user
    contacts: Mapped[list[Contact]] = relationship(
        "Contact",
        back_populates="owner",
        foreign_keys="Contact.owner_id",
        cascade="all, delete-orphan",
    )

    # Contact entries where this user is the contact target
    contact_of: Mapped[list[Contact]] = relationship(
        "Contact",
        back_populates="contact_user",
        foreign_keys="Contact.contact_user_id",
    )

    # Conversations created by this user
    created_conversations: Mapped[list[Conversation]] = relationship(
        "Conversation",
        back_populates="created_by",
        foreign_keys="Conversation.created_by_id",
    )

    # Conversation memberships
    conversation_memberships: Mapped[list[ConversationMember]] = relationship(
        "ConversationMember",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # Messages sent by this user
    messages: Mapped[list[Message]] = relationship(
        "Message",
        back_populates="sender",
        foreign_keys="Message.sender_id",
    )

    # Per-user message delivery statuses
    message_statuses: Mapped[list[MessageStatus]] = relationship(
        "MessageStatus",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # Message reactions by this user
    reactions: Mapped[list[Reaction]] = relationship(
        "Reaction",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} username={self.username!r}>"
