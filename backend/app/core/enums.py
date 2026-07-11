"""Shared SQLAlchemy enum types for Beacon ORM models."""

import enum
from typing import Type, TypeVar

from sqlalchemy import Enum

E = TypeVar("E", bound=enum.Enum)


class ConversationType(str, enum.Enum):
    """Type of conversation."""

    DIRECT = "direct"
    GROUP = "group"


class MemberRole(str, enum.Enum):
    """Role of a user within a conversation."""

    ADMIN = "admin"
    MEMBER = "member"


class DeliveryStatus(str, enum.Enum):
    """Per-recipient delivery/read status for a message."""

    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"


class UserStatus(str, enum.Enum):
    """Online presence status for a user."""

    ONLINE = "online"
    OFFLINE = "offline"
    AWAY = "away"
    BUSY = "busy"


class MessageType(str, enum.Enum):
    """Content type of a message."""

    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    SYSTEM = "system"


class ContactStatus(str, enum.Enum):
    """Status of a contact relationship."""

    PENDING = "pending"
    ACCEPTED = "accepted"
    BLOCKED = "blocked"


class CallType(str, enum.Enum):
    """Media type of a call."""

    VOICE = "voice"
    VIDEO = "video"


class CallStatus(str, enum.Enum):
    """Lifecycle status of a call."""

    RINGING = "ringing"
    ACTIVE = "active"
    ENDED = "ended"
    MISSED = "missed"
    DECLINED = "declined"


class StoryType(str, enum.Enum):
    """Content type of a story."""

    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"


def enum_column(enum_class: Type[E], length: int = 20) -> Enum:
    """
    Build a portable SQLAlchemy Enum column type that persists enum values
    (e.g. ``direct``) rather than member names (e.g. ``DIRECT``).
    """
    return Enum(
        enum_class,
        values_callable=lambda members: [member.value for member in members],
        native_enum=False,
        length=length,
    )
