"""Group service facade."""

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.enums import MemberRole
from app.features.conversations.schemas import (
    ConversationDetailResponse,
    ConversationMemberResponse,
    GroupConversationRequest,
)
from app.features.conversations.service import conversation_service


class GroupService:
    """Coordinates group-specific operations."""

    def create_group(
        self, db: Session, user_id: UUID, payload: GroupConversationRequest
    ) -> ConversationDetailResponse:
        return conversation_service.create_group(db, user_id, payload)

    def get_members(
        self, db: Session, user_id: UUID, group_id: UUID
    ) -> list[ConversationMemberResponse]:
        return conversation_service.get_members(db, user_id, group_id)

    def add_member(
        self, db: Session, user_id: UUID, group_id: UUID, target_id: UUID
    ) -> list[ConversationMemberResponse]:
        return conversation_service.add_group_member(db, user_id, group_id, target_id)

    def remove_member(
        self, db: Session, user_id: UUID, group_id: UUID, target_id: UUID
    ) -> list[ConversationMemberResponse]:
        return conversation_service.remove_group_member(db, user_id, group_id, target_id)

    def update_member_role(
        self, db: Session, user_id: UUID, group_id: UUID, target_id: UUID, role: MemberRole
    ) -> list[ConversationMemberResponse]:
        return conversation_service.update_member_role(db, user_id, group_id, target_id, role)

    def leave_group(self, db: Session, user_id: UUID, group_id: UUID) -> None:
        conversation_service.leave_group(db, user_id, group_id)


group_service = GroupService()
