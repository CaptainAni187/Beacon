"""Story request/response schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.core.enums import StoryType
from app.core.schemas import SchemaBase
from app.features.users.schemas import UserPublic


class StoryCreate(BaseModel):
    """Payload for posting a new story."""

    type: StoryType
    text_content: Optional[str] = Field(default=None, max_length=700)
    background_color: Optional[str] = Field(default=None, max_length=20)
    media_url: Optional[str] = Field(default=None, max_length=1024)

    @model_validator(mode="after")
    def require_content(self) -> "StoryCreate":
        if self.type == StoryType.TEXT and not self.text_content:
            raise ValueError("Text stories require text_content")
        if self.type in (StoryType.IMAGE, StoryType.VIDEO) and not self.media_url:
            raise ValueError("Media stories require media_url")
        return self


class StoryViewRead(SchemaBase):
    """A single viewer record for a story."""

    viewer: UserPublic
    viewed_at: datetime


class StoryRead(SchemaBase):
    """A single story item."""

    id: UUID
    author: UserPublic
    type: StoryType
    text_content: Optional[str] = None
    background_color: Optional[str] = None
    media_url: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    view_count: int = 0
    viewed_by_me: bool = False


class StoryFeedGroup(SchemaBase):
    """All of one author's active stories, grouped for the Stories list."""

    author: UserPublic
    stories: list[StoryRead]
