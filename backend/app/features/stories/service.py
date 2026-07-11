"""Story service implementation."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.exceptions import ForbiddenError, NotFoundError
from app.features.contacts.models import Contact
from app.features.stories.models import Story, StoryView
from app.features.stories.schemas import StoryCreate, StoryFeedGroup, StoryRead

STORY_LIFETIME = timedelta(hours=24)


class StoryService:
    """Handles story creation, feed assembly, and view tracking."""

    def _to_read(self, story: Story, viewer_id: UUID) -> StoryRead:
        return StoryRead(
            id=story.id,
            author=story.author,
            type=story.type,
            text_content=story.text_content,
            background_color=story.background_color,
            media_url=story.media_url,
            created_at=story.created_at,
            expires_at=story.expires_at,
            view_count=len(story.views),
            viewed_by_me=any(view.viewer_id == viewer_id for view in story.views),
        )

    def create_story(self, db: Session, user_id: UUID, payload: StoryCreate) -> StoryRead:
        """Post a new story, expiring 24 hours from now."""
        now = datetime.now(timezone.utc)
        story = Story(
            author_id=user_id,
            type=payload.type,
            text_content=payload.text_content,
            background_color=payload.background_color,
            media_url=payload.media_url,
            expires_at=now + STORY_LIFETIME,
        )
        db.add(story)
        db.commit()
        db.refresh(story)
        return self._to_read(story, user_id)

    def get_my_stories(self, db: Session, user_id: UUID) -> list[StoryRead]:
        """Return the current user's own active stories."""
        now = datetime.now(timezone.utc)
        stories = db.execute(
            select(Story)
            .options(joinedload(Story.author), selectinload(Story.views).joinedload(StoryView.viewer))
            .where(Story.author_id == user_id, Story.expires_at > now)
            .order_by(Story.created_at.desc())
        ).unique().scalars().all()
        return [self._to_read(story, user_id) for story in stories]

    def get_feed(self, db: Session, user_id: UUID) -> list[StoryFeedGroup]:
        """Return active stories from the user's contacts, grouped by author."""
        now = datetime.now(timezone.utc)
        contact_ids = db.execute(
            select(Contact.contact_user_id).where(
                Contact.owner_id == user_id, Contact.deleted_at.is_(None)
            )
        ).scalars().all()
        if not contact_ids:
            return []

        stories = db.execute(
            select(Story)
            .options(joinedload(Story.author), selectinload(Story.views).joinedload(StoryView.viewer))
            .where(Story.author_id.in_(contact_ids), Story.expires_at > now)
            .order_by(Story.created_at.asc())
        ).unique().scalars().all()

        grouped: dict[UUID, list[Story]] = {}
        for story in stories:
            grouped.setdefault(story.author_id, []).append(story)

        return [
            StoryFeedGroup(
                author=items[0].author,
                stories=[self._to_read(story, user_id) for story in items],
            )
            for items in grouped.values()
        ]

    def view_story(self, db: Session, user_id: UUID, story_id: UUID) -> None:
        """Record that the current user viewed a story (idempotent)."""
        story = db.get(Story, story_id)
        if story is None:
            raise NotFoundError("Story not found")

        existing = db.execute(
            select(StoryView).where(
                StoryView.story_id == story_id, StoryView.viewer_id == user_id
            )
        ).scalar_one_or_none()
        if existing is None:
            db.add(StoryView(story_id=story_id, viewer_id=user_id, viewed_at=datetime.now(timezone.utc)))
            db.commit()

    def delete_story(self, db: Session, user_id: UUID, story_id: UUID) -> None:
        """Delete one of the current user's own stories."""
        story = db.get(Story, story_id)
        if story is None:
            raise NotFoundError("Story not found")
        if story.author_id != user_id:
            raise ForbiddenError("Not your story")
        db.delete(story)
        db.commit()


story_service = StoryService()
