"""
ORM model aggregator.

Every model lives inside its own feature package (``app/features/<name>/models.py``).
This module's only job is to import all of them into one place so Alembic
autogenerate and ``init_db()`` can discover the full metadata graph via a
single ``import app.models``.
"""

from app.core.enums import (
    CallStatus,
    CallType,
    ContactStatus,
    ConversationType,
    DeliveryStatus,
    MemberRole,
    MessageType,
    StoryType,
    UserStatus,
    enum_column,
)
from app.features.calls.models import Call, CallLink, CallParticipant
from app.features.contacts.models import Contact
from app.features.conversations.models import Conversation, ConversationMember
from app.features.messages.models import Attachment, Message, MessageRecipientKey, MessageStatus, Reaction
from app.features.stories.models import Story, StoryView
from app.features.users.models import User

__all__ = [
    "Attachment",
    "Call",
    "CallLink",
    "CallParticipant",
    "CallStatus",
    "CallType",
    "Contact",
    "ContactStatus",
    "Conversation",
    "ConversationMember",
    "ConversationType",
    "DeliveryStatus",
    "MemberRole",
    "Message",
    "MessageRecipientKey",
    "MessageStatus",
    "MessageType",
    "Reaction",
    "Story",
    "StoryType",
    "StoryView",
    "User",
    "UserStatus",
    "enum_column",
]
