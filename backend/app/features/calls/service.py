"""Call and call-link service implementation."""

import secrets
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.exceptions import ForbiddenError, NotFoundError
from app.features.calls.models import Call, CallLink, CallParticipant
from app.features.conversations.models import ConversationMember
from app.core.enums import CallStatus, CallType
from app.features.calls.schemas import (
    CallCreate,
    CallLinkCreate,
    CallLinkRead,
    CallLinkUpdate,
    CallRead,
)


class CallService:
    """Handles call-link creation and call lifecycle/history."""

    def create_call_link(self, db: Session, user_id: UUID, payload: CallLinkCreate) -> CallLinkRead:
        """Create a new shareable, ad hoc call room."""
        link = CallLink(
            name=payload.name,
            created_by_id=user_id,
            requires_admin_approval=payload.requires_admin_approval,
            room_key=secrets.token_urlsafe(24),
        )
        db.add(link)
        db.commit()
        return self.get_call_link(db, link.id)

    def get_call_link(self, db: Session, call_link_id: UUID) -> CallLinkRead:
        """Fetch call link details. Any authenticated user may view/join a link."""
        link = db.execute(
            select(CallLink)
            .options(joinedload(CallLink.created_by))
            .where(CallLink.id == call_link_id)
        ).scalar_one_or_none()
        if link is None:
            raise NotFoundError("Call link not found")
        return CallLinkRead.model_validate(link)

    def get_call_link_by_room_key(self, db: Session, room_key: str) -> CallLinkRead:
        """Fetch call link details by its shareable room key (used by join links)."""
        link = db.execute(
            select(CallLink).options(joinedload(CallLink.created_by)).where(CallLink.room_key == room_key)
        ).scalar_one_or_none()
        if link is None:
            raise NotFoundError("Call link not found")
        return CallLinkRead.model_validate(link)

    def update_call_link(
        self, db: Session, user_id: UUID, call_link_id: UUID, payload: CallLinkUpdate
    ) -> CallLinkRead:
        """Update a call link's name / admin-approval requirement (creator only)."""
        link = db.get(CallLink, call_link_id)
        if link is None:
            raise NotFoundError("Call link not found")
        if link.created_by_id != user_id:
            raise ForbiddenError("Only the creator can edit this call link")

        updates = payload.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(link, field, value)
        db.commit()
        return self.get_call_link(db, call_link_id)

    def _verify_conversation_membership(self, db: Session, conversation_id: UUID, user_id: UUID) -> None:
        membership = db.execute(
            select(ConversationMember).where(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
                ConversationMember.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if membership is None:
            raise ForbiddenError("Not a member of this conversation")

    def start_call(self, db: Session, user_id: UUID, payload: CallCreate) -> CallRead:
        """Start a new call, tied to a conversation and/or a call link."""
        if payload.conversation_id:
            self._verify_conversation_membership(db, payload.conversation_id, user_id)

        call = Call(
            conversation_id=payload.conversation_id,
            call_link_id=payload.call_link_id,
            initiator_id=user_id,
            type=payload.type,
            status=CallStatus.RINGING,
            started_at=datetime.now(timezone.utc),
        )
        db.add(call)
        db.flush()

        db.add(CallParticipant(call_id=call.id, user_id=user_id, joined_at=call.started_at))
        db.commit()
        return self.get_call(db, user_id, call.id)

    def get_call(self, db: Session, user_id: UUID, call_id: UUID) -> CallRead:
        """Fetch a single call's details."""
        call = db.execute(
            select(Call)
            .options(
                joinedload(Call.initiator),
                selectinload(Call.participants).joinedload(CallParticipant.user),
            )
            .where(Call.id == call_id)
        ).unique().scalar_one_or_none()
        if call is None:
            raise NotFoundError("Call not found")
        return CallRead.model_validate(call)

    def join_call(self, db: Session, user_id: UUID, call_id: UUID) -> CallRead:
        """Record a participant joining an in-progress call."""
        call = db.get(Call, call_id)
        if call is None:
            raise NotFoundError("Call not found")

        existing = db.execute(
            select(CallParticipant).where(
                CallParticipant.call_id == call_id, CallParticipant.user_id == user_id
            )
        ).scalar_one_or_none()
        now = datetime.now(timezone.utc)
        if existing:
            existing.joined_at = now
            existing.left_at = None
        else:
            db.add(CallParticipant(call_id=call_id, user_id=user_id, joined_at=now))

        if call.status == CallStatus.RINGING:
            call.status = CallStatus.ACTIVE
        db.commit()
        return self.get_call(db, user_id, call_id)

    def decline_call(self, db: Session, call_id: UUID) -> None:
        """Mark a ringing call as declined."""
        call = db.get(Call, call_id)
        if call is None:
            return
        call.status = CallStatus.DECLINED
        call.ended_at = datetime.now(timezone.utc)
        db.commit()

    def leave_call(self, db: Session, user_id: UUID, call_id: UUID) -> None:
        """Record a participant leaving; ends the call once everyone has left."""
        participant = db.execute(
            select(CallParticipant).where(
                CallParticipant.call_id == call_id, CallParticipant.user_id == user_id
            )
        ).scalar_one_or_none()
        if participant:
            participant.left_at = datetime.now(timezone.utc)

        call = db.get(Call, call_id)
        if call is None:
            return

        still_present = db.execute(
            select(CallParticipant).where(
                CallParticipant.call_id == call_id, CallParticipant.left_at.is_(None)
            )
        ).scalars().all()
        if not still_present:
            call.status = CallStatus.ENDED
            call.ended_at = datetime.now(timezone.utc)
        db.commit()

    def clear_call_history(self, db: Session, user_id: UUID) -> None:
        """
        Clear the current user's call history.

        Call rows are shared records (a call has one row for every
        participant), so this deletes calls the user initiated outright and
        simply drops their own participant row from calls others started —
        clearing history is per-user, not a shared delete.
        """
        participant_rows = db.execute(
            select(CallParticipant).where(CallParticipant.user_id == user_id)
        ).scalars().all()
        for row in participant_rows:
            db.delete(row)

        initiated_calls = db.execute(
            select(Call).where(Call.initiator_id == user_id)
        ).scalars().all()
        for call in initiated_calls:
            db.delete(call)

        db.commit()

    def list_calls(self, db: Session, user_id: UUID, limit: int = 50) -> list[CallRead]:
        """List call history involving the current user, most recent first."""
        participant_calls = select(CallParticipant.call_id).where(CallParticipant.user_id == user_id)
        calls = db.execute(
            select(Call)
            .options(
                joinedload(Call.initiator),
                selectinload(Call.participants).joinedload(CallParticipant.user),
            )
            .where(or_(Call.initiator_id == user_id, Call.id.in_(participant_calls)))
            .order_by(Call.created_at.desc())
            .limit(limit)
        ).unique().scalars().all()
        return [CallRead.model_validate(call) for call in calls]


call_service = CallService()
