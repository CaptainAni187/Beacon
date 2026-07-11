"""
Message and message-child ORM models: Message, per-recipient delivery
status, E2EE content-key wrappers, attachments, and reactions.

Kept in one file since these tables only ever exist in service of a
Message and are never queried independently of it.
"""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import BigInteger, Boolean, ForeignKey, Index, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, SoftDeleteMixin, TimestampMixin
from app.core.enums import DeliveryStatus, MessageType, enum_column

if TYPE_CHECKING:
    from app.features.conversations.models import Conversation
    from app.features.users.models import User


class Message(Base, TimestampMixin, SoftDeleteMixin):
    """
    A message within a conversation.

    Supports text and media content, optional reply threading,
    and cascading child records for statuses, attachments, and reactions.
    """

    __tablename__ = "messages"
    __table_args__ = (
        Index("ix_messages_conversation_id", "conversation_id"),
        Index("ix_messages_sender_id", "sender_id"),
        Index("ix_messages_conversation_created_at", "conversation_id", "created_at"),
        Index("ix_messages_reply_to_id", "reply_to_id"),
        Index("ix_messages_deleted_at", "deleted_at"),
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
    sender_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[MessageType] = mapped_column(
        enum_column(MessageType),
        default=MessageType.TEXT,
        nullable=False,
    )
    reply_to_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("messages.id", ondelete="SET NULL"),
        nullable=True,
    )
    # End-to-end encryption: when is_encrypted, `content` is base64 AES-GCM
    # ciphertext and `iv` is the nonce used to produce it. The AES key itself
    # is never sent in the clear — see MessageRecipientKey for the per-user
    # wrapped copies. Seeded demo messages are stored as plaintext
    # (is_encrypted=False) since there's no client to encrypt them.
    is_encrypted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    iv: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    conversation: Mapped[Conversation] = relationship(
        "Conversation",
        back_populates="messages",
    )
    sender: Mapped[User] = relationship(
        "User",
        back_populates="messages",
        foreign_keys=[sender_id],
    )
    reply_to: Mapped[Optional[Message]] = relationship(
        "Message",
        remote_side="Message.id",
        back_populates="replies",
        foreign_keys=[reply_to_id],
    )
    replies: Mapped[list[Message]] = relationship(
        "Message",
        back_populates="reply_to",
        foreign_keys="Message.reply_to_id",
    )
    statuses: Mapped[list[MessageStatus]] = relationship(
        "MessageStatus",
        back_populates="message",
        cascade="all, delete-orphan",
    )
    attachments: Mapped[list[Attachment]] = relationship(
        "Attachment",
        back_populates="message",
        cascade="all, delete-orphan",
    )
    reactions: Mapped[list[Reaction]] = relationship(
        "Reaction",
        back_populates="message",
        cascade="all, delete-orphan",
    )
    recipient_keys: Mapped[list[MessageRecipientKey]] = relationship(
        "MessageRecipientKey",
        back_populates="message",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Message id={self.id} conversation={self.conversation_id}>"


class MessageStatus(Base, TimestampMixin):
    """
    Per-recipient delivery/read status for a message.

    One row per (message, user) pair tracking whether the message
    has been sent, delivered, or read by that recipient.
    """

    __tablename__ = "message_statuses"
    __table_args__ = (
        UniqueConstraint("message_id", "user_id", name="uq_message_statuses_message_user"),
        Index("ix_message_statuses_message_id", "message_id"),
        Index("ix_message_statuses_user_id", "user_id"),
        Index("ix_message_statuses_status", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    message_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[DeliveryStatus] = mapped_column(
        enum_column(DeliveryStatus),
        default=DeliveryStatus.SENT,
        nullable=False,
    )

    message: Mapped[Message] = relationship(
        "Message",
        back_populates="statuses",
    )
    user: Mapped[User] = relationship(
        "User",
        back_populates="message_statuses",
    )

    def __repr__(self) -> str:
        return (
            f"<MessageStatus message={self.message_id} "
            f"user={self.user_id} status={self.status.value}>"
        )


class MessageRecipientKey(Base, TimestampMixin):
    """
    One row per (message, recipient) holding that recipient's encrypted
    copy of the message's random AES-256-GCM content key.

    The sender generates a fresh AES key per message, encrypts the
    message body with it, then "wraps" (encrypts) that AES key once per
    conversation member using an ECDH-derived shared secret between the
    sender and that member. The server only ever stores wrapped key
    material — it cannot decrypt message content.
    """

    __tablename__ = "message_recipient_keys"
    __table_args__ = (
        UniqueConstraint("message_id", "user_id", name="uq_message_recipient_keys_message_user"),
        Index("ix_message_recipient_keys_message_id", "message_id"),
        Index("ix_message_recipient_keys_user_id", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    message_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    wrapped_key: Mapped[str] = mapped_column(Text, nullable=False)
    wrap_iv: Mapped[str] = mapped_column(Text, nullable=False)

    message: Mapped[Message] = relationship("Message", back_populates="recipient_keys")
    user: Mapped[User] = relationship("User")


class Attachment(Base, TimestampMixin):
    """
    File attachment linked to a message.

    Stores metadata only; actual file bytes live in object storage.
    """

    __tablename__ = "attachments"
    __table_args__ = (
        Index("ix_attachments_message_id", "message_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    message_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=False,
    )
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(127), nullable=False)
    size: Mapped[int] = mapped_column(BigInteger, nullable=False)

    message: Mapped[Message] = relationship(
        "Message",
        back_populates="attachments",
    )

    def __repr__(self) -> str:
        return f"<Attachment id={self.id} filename={self.filename!r}>"


class Reaction(Base, TimestampMixin):
    """
    Emoji reaction to a message by a user.

    Each user may react once per emoji per message.
    """

    __tablename__ = "reactions"
    __table_args__ = (
        UniqueConstraint(
            "message_id",
            "user_id",
            "emoji",
            name="uq_reactions_message_user_emoji",
        ),
        Index("ix_reactions_message_id", "message_id"),
        Index("ix_reactions_user_id", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    message_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    emoji: Mapped[str] = mapped_column(String(32), nullable=False)

    message: Mapped[Message] = relationship(
        "Message",
        back_populates="reactions",
    )
    user: Mapped[User] = relationship(
        "User",
        back_populates="reactions",
    )

    def __repr__(self) -> str:
        return f"<Reaction message={self.message_id} user={self.user_id} emoji={self.emoji!r}>"
