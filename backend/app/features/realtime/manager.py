"""
WebSocket connection manager.

Manages active WebSocket connections, user-to-socket mapping,
and broadcast capabilities for real-time messaging.
"""

from typing import Dict, Iterable, List, Set

from fastapi import WebSocket


class ConnectionManager:
    """
    Tracks active WebSocket connections and provides broadcast utilities.

    Each authenticated user may have one or more active connections
    (e.g., multiple browser tabs/devices).
    """

    def __init__(self) -> None:
        # Maps user_id -> list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Maps call room key (call id or call-link id) -> set of user_ids
        # currently in that room, for mesh WebRTC signaling.
        self.call_rooms: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, user_id: str) -> None:
        """Accept a new WebSocket connection and register it for the user."""
        await websocket.accept()
        self.active_connections.setdefault(user_id, []).append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str) -> None:
        """Remove a WebSocket connection from the active pool."""
        if user_id in self.active_connections:
            self.active_connections[user_id] = [
                conn for conn in self.active_connections[user_id] if conn != websocket
            ]
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal(self, message: dict, user_id: str) -> None:
        """Send a message to all connections belonging to a specific user."""
        for connection in list(self.active_connections.get(user_id, [])):
            try:
                await connection.send_json(message)
            except Exception:
                pass

    async def broadcast(self, message: dict, exclude_user_id: str | None = None) -> None:
        """Broadcast a message to all connected users."""
        for user_id in list(self.active_connections.keys()):
            if user_id == exclude_user_id:
                continue
            await self.send_personal(message, user_id)

    async def broadcast_to_conversation(
        self, message: dict, participant_ids: Iterable[str]
    ) -> None:
        """Broadcast a message to a specific set of conversation participants."""
        for user_id in participant_ids:
            await self.send_personal(message, user_id)

    def get_online_users(self) -> List[str]:
        """Return list of currently connected user IDs."""
        return list(self.active_connections.keys())

    def is_user_online(self, user_id: str) -> bool:
        """Check whether a user has any active connections."""
        return user_id in self.active_connections

    def join_call_room(self, room_key: str, user_id: str) -> List[str]:
        """Add a user to a call room, returning the OTHER members already present."""
        room = self.call_rooms.setdefault(room_key, set())
        existing = [member for member in room if member != user_id]
        room.add(user_id)
        return existing

    def leave_call_room(self, room_key: str, user_id: str) -> List[str]:
        """Remove a user from a call room, returning the members still present."""
        room = self.call_rooms.get(room_key)
        if room is None:
            return []
        room.discard(user_id)
        remaining = list(room)
        if not room:
            del self.call_rooms[room_key]
        return remaining

    def get_call_room_members(self, room_key: str) -> List[str]:
        """Return current members of a call room."""
        return list(self.call_rooms.get(room_key, set()))

    def leave_all_call_rooms(self, user_id: str) -> Dict[str, List[str]]:
        """Remove a user from every call room they're in (e.g. on disconnect)."""
        affected: Dict[str, List[str]] = {}
        for room_key in list(self.call_rooms.keys()):
            if user_id in self.call_rooms[room_key]:
                affected[room_key] = self.leave_call_room(room_key, user_id)
        return affected


# Singleton connection manager instance
manager = ConnectionManager()
