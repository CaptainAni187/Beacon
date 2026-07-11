"""Shared Pydantic schema utilities and base types."""

from datetime import datetime
from typing import Generic, Optional, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class SchemaBase(BaseModel):
    """Base schema with ORM mode enabled."""

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(SchemaBase):
    """Generic message response."""

    message: str


class PaginationParams(SchemaBase):
    """Cursor/offset pagination parameters."""

    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=100)


class PaginatedResponse(SchemaBase, Generic[T]):
    """Generic paginated list response."""

    items: list[T]
    total: int
    has_more: bool


class TimestampSchema(SchemaBase):
    """Shared timestamp fields."""

    created_at: datetime
    updated_at: datetime


class IDSchema(SchemaBase):
    """Entity with UUID primary key."""

    id: UUID
