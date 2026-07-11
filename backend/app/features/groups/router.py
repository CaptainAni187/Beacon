"""Groups router."""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.features.auth.dependencies import get_current_user
from app.core.database import get_db
from app.core.exceptions import AppError, raise_http
from app.features.users.models import User
from app.core.schemas import MessageResponse
from app.features.conversations.schemas import (
    ConversationDetailResponse,
    ConversationMemberResponse,
    GroupConversationRequest,
    GroupMemberAdd,
    GroupMemberRoleUpdate,
)
from app.features.groups.service import group_service

router = APIRouter()


@router.post("/", response_model=ConversationDetailResponse, status_code=201)
def create_group(
    payload: GroupConversationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationDetailResponse:
    """Create a new group conversation."""
    try:
        return group_service.create_group(db, current_user.id, payload)
    except AppError as exc:
        raise_http(exc)


@router.get("/{group_id}/members", response_model=list[ConversationMemberResponse])
def get_group_members(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ConversationMemberResponse]:
    """Return members for a group."""
    try:
        return group_service.get_members(db, current_user.id, group_id)
    except AppError as exc:
        raise_http(exc)


@router.post("/{group_id}/members", response_model=list[ConversationMemberResponse])
def add_group_member(
    group_id: UUID,
    payload: GroupMemberAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ConversationMemberResponse]:
    """Add a member to a group."""
    try:
        return group_service.add_member(db, current_user.id, group_id, payload.user_id)
    except AppError as exc:
        raise_http(exc)


@router.delete("/{group_id}/members/{user_id}", response_model=list[ConversationMemberResponse])
def remove_group_member(
    group_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ConversationMemberResponse]:
    """Remove a member from a group."""
    try:
        return group_service.remove_member(db, current_user.id, group_id, user_id)
    except AppError as exc:
        raise_http(exc)


@router.patch("/{group_id}/members/{user_id}", response_model=list[ConversationMemberResponse])
def update_member_role(
    group_id: UUID,
    user_id: UUID,
    payload: GroupMemberRoleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ConversationMemberResponse]:
    """Promote or demote a group member (admin-only)."""
    try:
        return group_service.update_member_role(db, current_user.id, group_id, user_id, payload.role)
    except AppError as exc:
        raise_http(exc)


@router.post("/{group_id}/leave", response_model=MessageResponse)
def leave_group(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Leave a group conversation."""
    try:
        group_service.leave_group(db, current_user.id, group_id)
        return MessageResponse(message="Left group")
    except AppError as exc:
        raise_http(exc)
