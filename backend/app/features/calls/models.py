"""Call and call-link ORM models."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin
from app.core.enums import CallStatus, CallType, enum_column

if TYPE_CHECKING:
    from app.features.users.models import User


class CallLink(Base, TimestampMixin):
    """
    A shareable, persistent link that starts an ad hoc call room.

    Anyone with the link (and a Beacon account) can join the room it
    points to; the creator can require admin approval before new
    participants are let in.
    """

    __tablename__ = "call_links"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    requires_admin_approval: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    room_key: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)

    created_by: Mapped[User] = relationship("User")

    def __repr__(self) -> str:
        return f"<CallLink id={self.id} name={self.name!r}>"


class Call(Base, TimestampMixin):
    """
    A single call instance (direct, group, or via a call link), used to
    render call history in the Calls tab.
    """

    __tablename__ = "calls"
    __table_args__ = (
        Index("ix_calls_initiator_id", "initiator_id"),
        Index("ix_calls_conversation_id", "conversation_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    conversation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("conversations.id", ondelete="SET NULL"),
        nullable=True,
    )
    call_link_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("call_links.id", ondelete="SET NULL"),
        nullable=True,
    )
    initiator_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[CallType] = mapped_column(enum_column(CallType), nullable=False)
    status: Mapped[CallStatus] = mapped_column(
        enum_column(CallStatus), default=CallStatus.RINGING, nullable=False
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    initiator: Mapped[User] = relationship("User")
    participants: Mapped[list["CallParticipant"]] = relationship(
        "CallParticipant", back_populates="call", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Call id={self.id} status={self.status.value}>"


class CallParticipant(Base, TimestampMixin):
    """A user who joined (or was invited to) a call, for history/roster display."""

    __tablename__ = "call_participants"
    __table_args__ = (Index("ix_call_participants_call_id", "call_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    call_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("calls.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    joined_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    left_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    call: Mapped[Call] = relationship("Call", back_populates="participants")
    user: Mapped[User] = relationship("User")
