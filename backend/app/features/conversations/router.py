"""Conversations router."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.features.auth.dependencies import get_current_user
from app.core.database import get_db
from app.core.exceptions import AppError, raise_http
from app.features.users.models import User
from app.core.schemas import MessageResponse
from app.features.conversations.schemas import (
    ConversationCreateRequest,
    ConversationDetailResponse,
    ConversationResponse,
    ConversationSummary,
    ConversationUpdate,
    DirectConversationRequest,
    MessageHistoryResponse,
)
from app.features.conversations.service import conversation_service

router = APIRouter()


@router.get("/", response_model=list[ConversationSummary])
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ConversationSummary]:
    """List all conversations for the authenticated user."""
    return conversation_service.list_conversations(db, current_user.id)


@router.post("/", response_model=ConversationResponse, status_code=201)
def create_conversation(
    payload: ConversationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationResponse:
    """Create a direct or group conversation."""
    try:
        return conversation_service.create_conversation(db, current_user.id, payload)
    except AppError as exc:
        raise_http(exc)


@router.post("/direct", response_model=ConversationDetailResponse, status_code=201)
def create_direct_conversation(
    payload: DirectConversationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationDetailResponse:
    """Create or return an existing direct conversation."""
    try:
        return conversation_service.create_direct(db, current_user.id, payload)
    except AppError as exc:
        raise_http(exc)


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationDetailResponse:
    """Get a single conversation by ID."""
    try:
        return conversation_service.get_conversation(db, current_user.id, conversation_id)
    except AppError as exc:
        raise_http(exc)


@router.get("/{conversation_id}/messages", response_model=MessageHistoryResponse)
def get_conversation_messages(
    conversation_id: UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageHistoryResponse:
    """Get paginated message history for a conversation."""
    try:
        return conversation_service.list_messages(
            db, current_user.id, conversation_id, page, page_size
        )
    except AppError as exc:
        raise_http(exc)


@router.patch("/{conversation_id}", response_model=ConversationDetailResponse)
def update_conversation(
    conversation_id: UUID,
    payload: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationDetailResponse:
    """Update conversation settings."""
    try:
        return conversation_service.update_settings(
            db, current_user.id, conversation_id, payload
        )
    except AppError as exc:
        raise_http(exc)


@router.delete("/{conversation_id}", response_model=MessageResponse)
def delete_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Delete or leave a conversation."""
    try:
        conversation_service.delete_conversation(db, current_user.id, conversation_id)
        return MessageResponse(message="Conversation removed")
    except AppError as exc:
        raise_http(exc)
