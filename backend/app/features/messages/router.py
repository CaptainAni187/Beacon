"""Messages router."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.features.auth.dependencies import get_current_user
from app.core.database import get_db
from app.core.exceptions import AppError, raise_http
from app.features.users.models import User
from app.core.schemas import MessageResponse
from app.features.messages.schemas import MessageCreate, MessagePage, MessageRead, MessageUpdate
from app.features.messages.service import message_service

router = APIRouter()


@router.get("/", response_model=MessagePage)
def list_messages(
    conversation_id: UUID = Query(...),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessagePage:
    """List messages for a conversation with cursor pagination."""
    try:
        return message_service.list_messages(
            db, current_user.id, conversation_id, cursor=cursor, limit=limit
        )
    except AppError as exc:
        raise_http(exc)


@router.post("/", response_model=MessageRead, status_code=201)
def send_message(
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageRead:
    """Send a new message to a conversation."""
    try:
        return message_service.send_message(db, current_user.id, payload)
    except AppError as exc:
        raise_http(exc)


@router.get("/{message_id}", response_model=MessageRead)
def get_message(
    message_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageRead:
    """Get a single message by ID."""
    try:
        return message_service.get_message(db, current_user.id, message_id)
    except AppError as exc:
        raise_http(exc)


@router.put("/{message_id}", response_model=MessageRead)
def edit_message(
    message_id: UUID,
    payload: MessageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageRead:
    """Edit an existing message."""
    try:
        return message_service.edit_message(db, current_user.id, message_id, payload)
    except AppError as exc:
        raise_http(exc)


@router.delete("/{message_id}", response_model=MessageResponse)
def delete_message(
    message_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Delete a message."""
    try:
        message_service.delete_message(db, current_user.id, message_id)
        return MessageResponse(message="Message deleted")
    except AppError as exc:
        raise_http(exc)
