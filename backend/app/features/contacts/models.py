"""Contact ORM model."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, SoftDeleteMixin, TimestampMixin
from app.core.enums import ContactStatus, enum_column

if TYPE_CHECKING:
    from app.features.users.models import User


class Contact(Base, TimestampMixin, SoftDeleteMixin):
    """
    Directed contact relationship between two users.

    ``owner_id`` is the user who initiated or owns the contact entry.
    ``contact_user_id`` is the user being referenced.
    """

    __tablename__ = "contacts"
    __table_args__ = (
        UniqueConstraint("owner_id", "contact_user_id", name="uq_contacts_owner_contact"),
        Index("ix_contacts_owner_id", "owner_id"),
        Index("ix_contacts_contact_user_id", "contact_user_id"),
        Index("ix_contacts_status", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    contact_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[ContactStatus] = mapped_column(
        enum_column(ContactStatus),
        default=ContactStatus.PENDING,
        nullable=False,
    )
    nickname: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    owner: Mapped[User] = relationship(
        "User",
        back_populates="contacts",
        foreign_keys=[owner_id],
    )
    contact_user: Mapped[User] = relationship(
        "User",
        back_populates="contact_of",
        foreign_keys=[contact_user_id],
    )

    def __repr__(self) -> str:
        return f"<Contact id={self.id} owner={self.owner_id} contact={self.contact_user_id}>"
