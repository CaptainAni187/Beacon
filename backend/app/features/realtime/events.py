"""
WebSocket event type definitions.

Defines the event envelope structure and all supported event types
for client-server WebSocket communication.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel


class EventType(str, Enum):
    """Supported WebSocket event types."""

    # Connection lifecycle
    CONNECT = "connect"
    DISCONNECT = "disconnect"
    ERROR = "error"

    # Messaging
    MESSAGE_NEW = "message.new"
    MESSAGE_EDIT = "message.edit"
    MESSAGE_DELETE = "message.delete"
    MESSAGE_READ = "message.read"
    MESSAGE_DELIVERED = "message.delivered"

    # Presence
    TYPING_START = "typing.start"
    TYPING_STOP = "typing.stop"
    USER_ONLINE = "user.online"
    USER_OFFLINE = "user.offline"

    # Conversations
    CONVERSATION_CREATED = "conversation.created"
    CONVERSATION_UPDATED = "conversation.updated"

    # Groups
    GROUP_MEMBER_ADDED = "group.member.added"
    GROUP_MEMBER_REMOVED = "group.member.removed"

    # Calls (WebRTC signaling relay)
    CALL_INVITE = "call.invite"
    CALL_RING = "call.ring"
    CALL_OFFER = "call.offer"
    CALL_ANSWER = "call.answer"
    CALL_ICE_CANDIDATE = "call.ice-candidate"
    CALL_ACCEPT = "call.accept"
    CALL_DECLINE = "call.decline"
    CALL_END = "call.end"
    CALL_JOIN_REQUEST = "call.join-request"
    CALL_JOIN_APPROVED = "call.join-approved"
    CALL_JOIN_DENIED = "call.join-denied"

    # Call room membership (mesh WebRTC signaling for group/call-link calls)
    CALL_ROOM_JOIN = "call.room.join"
    CALL_ROOM_PEERS = "call.room.peers"
    CALL_ROOM_PEER_JOINED = "call.room.peer-joined"
    CALL_ROOM_PEER_LEFT = "call.room.peer-left"


class WebSocketEvent(BaseModel):
    """Standard WebSocket event envelope."""

    type: EventType
    payload: Any
    timestamp: Optional[str] = None
    sender_id: Optional[str] = None


def create_event(
    event_type: EventType,
    payload: Any,
    sender_id: Optional[str] = None,
) -> dict:
    """Create a serialized WebSocket event dictionary."""
    return {
        "type": event_type.value,
        "payload": payload,
        "sender_id": sender_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
