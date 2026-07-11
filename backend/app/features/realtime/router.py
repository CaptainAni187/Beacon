"""WebSocket route registration."""

from fastapi import APIRouter, WebSocket

from app.features.realtime.handler import ws_handler

router = APIRouter()


@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str) -> None:
    """Authenticated real-time messaging socket. Token is the JWT access token."""
    await ws_handler.handle_connection(websocket, token)
