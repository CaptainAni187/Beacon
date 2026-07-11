"""Contacts router."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.features.auth.dependencies import get_current_user
from app.core.database import get_db
from app.core.exceptions import AppError, raise_http
from app.features.users.models import User
from app.core.schemas import MessageResponse
from app.features.contacts.schemas import AddContactRequest, ContactResponse, ContactSearchResponse
from app.features.contacts.service import contact_service

router = APIRouter()


@router.get("/", response_model=list[ContactResponse])
def list_contacts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ContactResponse]:
    """List all contacts for the authenticated user."""
    return contact_service.list_contacts(db, current_user.id)


@router.post("/", response_model=ContactResponse, status_code=201)
def add_contact(
    payload: AddContactRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ContactResponse:
    """Add a contact by username or user ID."""
    try:
        return contact_service.add_contact(db, current_user.id, payload)
    except AppError as exc:
        raise_http(exc)


@router.delete("/{contact_id}", response_model=MessageResponse)
def remove_contact(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Remove a contact."""
    try:
        contact_service.remove_contact(db, current_user.id, contact_id)
        return MessageResponse(message="Contact removed")
    except AppError as exc:
        raise_http(exc)


@router.get("/search", response_model=list[ContactSearchResponse])
def search_contacts(
    q: str = Query(min_length=1, max_length=100),
    limit: int = Query(default=20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ContactSearchResponse]:
    """Search for users to add as contacts."""
    return contact_service.search_users(db, current_user.id, q, limit)
