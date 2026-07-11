"""Calls router: call links, call history, and lifecycle."""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.features.auth.dependencies import get_current_user
from app.core.database import get_db
from app.core.exceptions import AppError, raise_http
from app.features.users.models import User
from app.features.calls.schemas import (
    CallCreate,
    CallLinkCreate,
    CallLinkRead,
    CallLinkUpdate,
    CallRead,
)
from app.features.calls.service import call_service

router = APIRouter()


@router.get("/", response_model=list[CallRead])
def list_calls(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CallRead]:
    """List call history for the current user."""
    return call_service.list_calls(db, current_user.id)


@router.delete("/", status_code=204)
def clear_call_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Clear the current user's call history."""
    call_service.clear_call_history(db, current_user.id)


@router.post("/", response_model=CallRead, status_code=201)
def start_call(
    payload: CallCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CallRead:
    """Start a new call."""
    try:
        return call_service.start_call(db, current_user.id, payload)
    except AppError as exc:
        raise_http(exc)


@router.get("/{call_id}", response_model=CallRead)
def get_call(
    call_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CallRead:
    """Get a call's details."""
    try:
        return call_service.get_call(db, current_user.id, call_id)
    except AppError as exc:
        raise_http(exc)


@router.post("/{call_id}/join", response_model=CallRead)
def join_call(
    call_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CallRead:
    """Join an in-progress call."""
    try:
        return call_service.join_call(db, current_user.id, call_id)
    except AppError as exc:
        raise_http(exc)


@router.post("/{call_id}/leave", status_code=204)
def leave_call(
    call_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Leave a call."""
    call_service.leave_call(db, current_user.id, call_id)


@router.post("/links", response_model=CallLinkRead, status_code=201)
def create_call_link(
    payload: CallLinkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CallLinkRead:
    """Create a shareable call link."""
    return call_service.create_call_link(db, current_user.id, payload)


@router.get("/links/by-key/{room_key}", response_model=CallLinkRead)
def get_call_link_by_room_key(
    room_key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CallLinkRead:
    """Get call link details by its shareable room key (used by join links)."""
    try:
        return call_service.get_call_link_by_room_key(db, room_key)
    except AppError as exc:
        raise_http(exc)


@router.get("/links/{call_link_id}", response_model=CallLinkRead)
def get_call_link(
    call_link_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CallLinkRead:
    """Get call link details (used by the join screen)."""
    try:
        return call_service.get_call_link(db, call_link_id)
    except AppError as exc:
        raise_http(exc)


@router.patch("/links/{call_link_id}", response_model=CallLinkRead)
def update_call_link(
    call_link_id: UUID,
    payload: CallLinkUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CallLinkRead:
    """Update a call link's settings (creator only)."""
    try:
        return call_service.update_call_link(db, current_user.id, call_link_id, payload)
    except AppError as exc:
        raise_http(exc)
