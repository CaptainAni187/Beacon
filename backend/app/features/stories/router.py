"""Stories router."""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.features.auth.dependencies import get_current_user
from app.core.database import get_db
from app.core.exceptions import AppError, raise_http
from app.features.users.models import User
from app.core.schemas import MessageResponse
from app.features.stories.schemas import StoryCreate, StoryFeedGroup, StoryRead
from app.features.stories.service import story_service

router = APIRouter()


@router.get("/me", response_model=list[StoryRead])
def get_my_stories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[StoryRead]:
    """List the current user's own active stories."""
    return story_service.get_my_stories(db, current_user.id)


@router.get("/feed", response_model=list[StoryFeedGroup])
def get_story_feed(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[StoryFeedGroup]:
    """List active stories from contacts, grouped by author."""
    return story_service.get_feed(db, current_user.id)


@router.post("/", response_model=StoryRead, status_code=201)
def create_story(
    payload: StoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StoryRead:
    """Post a new story."""
    try:
        return story_service.create_story(db, current_user.id, payload)
    except AppError as exc:
        raise_http(exc)


@router.post("/{story_id}/view", response_model=MessageResponse)
def view_story(
    story_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Mark a story as viewed by the current user."""
    try:
        story_service.view_story(db, current_user.id, story_id)
        return MessageResponse(message="Story viewed")
    except AppError as exc:
        raise_http(exc)


@router.delete("/{story_id}", response_model=MessageResponse)
def delete_story(
    story_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Delete one of the current user's own stories."""
    try:
        story_service.delete_story(db, current_user.id, story_id)
        return MessageResponse(message="Story deleted")
    except AppError as exc:
        raise_http(exc)
