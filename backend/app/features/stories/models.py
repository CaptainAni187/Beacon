"""Story and story-view ORM models."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin
from app.core.enums import StoryType, enum_column

if TYPE_CHECKING:
    from app.features.users.models import User


class Story(Base, TimestampMixin):
    """
    A 24-hour ephemeral status update, either a text card or an
    image/video attachment.
    """

    __tablename__ = "stories"
    __table_args__ = (
        Index("ix_stories_author_id", "author_id"),
        Index("ix_stories_expires_at", "expires_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[StoryType] = mapped_column(enum_column(StoryType), nullable=False)
    text_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    background_color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    media_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    author: Mapped[User] = relationship("User")
    views: Mapped[list["StoryView"]] = relationship(
        "StoryView", back_populates="story", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Story id={self.id} author={self.author_id} type={self.type.value}>"


class StoryView(Base, TimestampMixin):
    """Records that a user has viewed a story."""

    __tablename__ = "story_views"
    __table_args__ = (Index("ix_story_views_story_id", "story_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    story_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("stories.id", ondelete="CASCADE"),
        nullable=False,
    )
    viewer_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    viewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    story: Mapped[Story] = relationship("Story", back_populates="views")
    viewer: Mapped[User] = relationship("User")
