"""Conversation service implementation."""

from __future__ import annotations

from datetime import datetime, timezone
from math import ceil
from uuid import UUID

from sqlalchemy import Integer, func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.features.messages.models import Attachment
from app.features.conversations.models import Conversation
from app.features.conversations.models import ConversationMember
from app.core.enums import ConversationType, DeliveryStatus, MemberRole
from app.features.messages.models import Message
from app.features.messages.models import MessageStatus
from app.features.messages.models import Reaction
from app.features.users.models import User
from app.features.conversations.schemas import (
    ConversationCreateRequest,
    ConversationDetailResponse,
    ConversationMemberResponse,
    ConversationResponse,
    ConversationSummary,
    DirectConversationRequest,
    GroupConversationRequest,
    LastMessageResponse,
    MessageHistoryResponse,
    PaginationResponse,
)
from app.features.messages.schemas import MessageRead, MessageRecipientKeyRead
from app.features.messages.service import _attach_recipient_key


class ConversationService:
    """Handles conversation lookup, creation, summaries, and authorization."""

    def _get_membership(
        self, db: Session, conversation_id: UUID, user_id: UUID
    ) -> ConversationMember:
        membership = db.execute(
            select(ConversationMember).where(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
                ConversationMember.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if membership is None:
            raise ForbiddenError("Not a member of this conversation")
        return membership

    def _load_conversation(self, db: Session, conversation_id: UUID) -> Conversation:
        conversation = db.execute(
            select(Conversation)
            .options(
                selectinload(Conversation.members).joinedload(ConversationMember.user),
            )
            .where(Conversation.id == conversation_id, Conversation.deleted_at.is_(None))
        ).scalar_one_or_none()
        if conversation is None:
            raise NotFoundError("Conversation not found")
        return conversation

    def _last_message(self, db: Session, conversation_id: UUID) -> Message | None:
        return db.execute(
            select(Message)
            .options(joinedload(Message.sender), joinedload(Message.recipient_keys))
            .where(Message.conversation_id == conversation_id, Message.deleted_at.is_(None))
            .order_by(Message.created_at.desc())
            .limit(1)
        ).unique().scalar_one_or_none()

    def _last_message_response(
        self, message: Message | None, current_user_id: UUID
    ) -> LastMessageResponse | None:
        if message is None:
            return None

        recipient_key = None
        for key in message.recipient_keys:
            if key.user_id == current_user_id:
                recipient_key = MessageRecipientKeyRead(
                    wrapped_key=key.wrapped_key, wrap_iv=key.wrap_iv
                )
                break

        return LastMessageResponse(
            id=message.id,
            content=message.content,
            type=message.type,
            sender_id=message.sender_id,
            sender_display_name=message.sender.display_name,
            sender_public_key=message.sender.public_key,
            created_at=message.created_at,
            is_encrypted=message.is_encrypted,
            iv=message.iv,
            recipient_key=recipient_key,
        )

    def _unread_count(self, db: Session, conversation_id: UUID, user_id: UUID) -> int:
        return db.execute(
            select(func.count(MessageStatus.id))
            .join(Message, Message.id == MessageStatus.message_id)
            .where(
                Message.conversation_id == conversation_id,
                Message.deleted_at.is_(None),
                MessageStatus.user_id == user_id,
                MessageStatus.status != DeliveryStatus.READ,
            )
        ).scalar_one()

    def _member_count(self, conversation: Conversation) -> int:
        return len([member for member in conversation.members if member.deleted_at is None])

    def _display_name(self, conversation: Conversation, current_user_id: UUID) -> str | None:
        if conversation.type == ConversationType.GROUP:
            return conversation.name
        other_member = next(
            (
                member
                for member in conversation.members
                if member.user_id != current_user_id and member.deleted_at is None
            ),
            None,
        )
        return other_member.user.display_name if other_member else conversation.name

    def _display_avatar(self, conversation: Conversation, current_user_id: UUID) -> str | None:
        if conversation.type == ConversationType.GROUP:
            return conversation.avatar_url
        other_member = next(
            (
                member
                for member in conversation.members
                if member.user_id != current_user_id and member.deleted_at is None
            ),
            None,
        )
        return other_member.user.avatar_url if other_member else conversation.avatar_url

    def _member_response(self, member: ConversationMember) -> ConversationMemberResponse:
        return ConversationMemberResponse(
            id=member.id,
            user_id=member.user_id,
            role=member.role,
            is_muted=member.is_muted,
            is_pinned=member.is_pinned,
            joined_at=member.joined_at,
            last_read_at=member.last_read_at,
            user=member.user,
        )

    def _to_response(
        self, db: Session, conversation: Conversation, current_user_id: UUID
    ) -> ConversationResponse:
        last_message = self._last_message_response(
            self._last_message(db, conversation.id), current_user_id
        )
        members = [
            self._member_response(member)
            for member in conversation.members
            if member.deleted_at is None
        ]
        return ConversationResponse(
            id=conversation.id,
            type=conversation.type,
            name=self._display_name(conversation, current_user_id),
            avatar_url=self._display_avatar(conversation, current_user_id),
            description=conversation.description,
            created_by_id=conversation.created_by_id,
            members=members,
            last_message=last_message,
            unread_count=self._unread_count(db, conversation.id, current_user_id),
            member_count=len(members),
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
        )

    def _to_summary(
        self, db: Session, membership: ConversationMember
    ) -> ConversationSummary | None:
        conversation = membership.conversation
        if conversation.deleted_at is not None:
            return None
        last_message = self._last_message_response(
            self._last_message(db, conversation.id), membership.user_id
        )
        # Encrypted content can't be previewed server-side — the client decrypts
        # `last_message` itself and builds its own preview text from that.
        preview_text = (
            None
            if last_message is None
            else (None if last_message.is_encrypted else last_message.content[:120])
        )
        return ConversationSummary(
            id=conversation.id,
            type=conversation.type,
            name=self._display_name(conversation, membership.user_id),
            avatar_url=self._display_avatar(conversation, membership.user_id),
            last_message=last_message,
            last_message_preview=preview_text,
            last_message_at=last_message.created_at if last_message else None,
            unread_count=self._unread_count(db, conversation.id, membership.user_id),
            member_count=self._member_count(conversation),
            is_pinned=membership.is_pinned,
            is_muted=membership.is_muted,
        )

    def _find_direct_conversation(
        self, db: Session, user_a: UUID, user_b: UUID
    ) -> Conversation | None:
        member_subquery = (
            select(ConversationMember.conversation_id)
            .join(Conversation, Conversation.id == ConversationMember.conversation_id)
            .where(
                Conversation.type == ConversationType.DIRECT,
                Conversation.deleted_at.is_(None),
                ConversationMember.deleted_at.is_(None),
            )
            .group_by(ConversationMember.conversation_id)
            .having(func.count(ConversationMember.id) == 2)
            .having(
                func.sum(
                    ConversationMember.user_id.in_([user_a, user_b]).cast(Integer)
                )
                == 2
            )
        )
        conversation_id = db.execute(member_subquery).scalar_one_or_none()
        return self._load_conversation(db, conversation_id) if conversation_id else None

    def list_conversations(self, db: Session, user_id: UUID) -> list[ConversationSummary]:
        """Return conversations for a user sorted by latest message first."""
        memberships = db.execute(
            select(ConversationMember)
            .options(
                joinedload(ConversationMember.conversation).selectinload(Conversation.members).joinedload(ConversationMember.user)
            )
            .where(
                ConversationMember.user_id == user_id,
                ConversationMember.deleted_at.is_(None),
            )
        ).unique().scalars().all()

        summaries = [
            summary
            for membership in memberships
            if (summary := self._to_summary(db, membership)) is not None
        ]
        summaries.sort(
            key=lambda item: item.last_message_at or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )
        return summaries

    def get_conversation(
        self, db: Session, user_id: UUID, conversation_id: UUID
    ) -> ConversationDetailResponse:
        """Retrieve a conversation with members and metadata."""
        self._get_membership(db, conversation_id, user_id)
        return ConversationDetailResponse.model_validate(
            self._to_response(db, self._load_conversation(db, conversation_id), user_id)
        )

    def create_direct(
        self, db: Session, user_id: UUID, payload: DirectConversationRequest
    ) -> ConversationDetailResponse:
        """Create or retrieve a direct conversation with another user."""
        if payload.other_user_id == user_id:
            raise ConflictError("Cannot create a direct conversation with yourself")
        target = db.get(User, payload.other_user_id)
        if target is None or target.deleted_at is not None:
            raise NotFoundError("User not found")

        existing = self._find_direct_conversation(db, user_id, payload.other_user_id)
        if existing:
            return self.get_conversation(db, user_id, existing.id)

        conversation = Conversation(type=ConversationType.DIRECT, created_by_id=user_id)
        db.add(conversation)
        db.flush()
        db.add_all(
            [
                ConversationMember(
                    conversation_id=conversation.id,
                    user_id=user_id,
                    role=MemberRole.ADMIN,
                ),
                ConversationMember(
                    conversation_id=conversation.id,
                    user_id=payload.other_user_id,
                    role=MemberRole.MEMBER,
                ),
            ]
        )
        db.commit()
        return self.get_conversation(db, user_id, conversation.id)

    def create_group(
        self, db: Session, user_id: UUID, payload: GroupConversationRequest
    ) -> ConversationDetailResponse:
        """Create a group conversation."""
        member_ids = list(dict.fromkeys([user_id, *payload.member_ids]))
        if len(member_ids) < 3:
            raise ConflictError("Groups require at least three members including the creator")

        found_count = db.scalar(
            select(func.count(User.id)).where(
                User.id.in_(member_ids),
                User.deleted_at.is_(None),
            )
        )
        if found_count != len(member_ids):
            raise NotFoundError("One or more users were not found")

        conversation = Conversation(
            type=ConversationType.GROUP,
            name=payload.name,
            description=payload.description,
            created_by_id=user_id,
        )
        db.add(conversation)
        db.flush()
        for member_id in member_ids:
            db.add(
                ConversationMember(
                    conversation_id=conversation.id,
                    user_id=member_id,
                    role=MemberRole.ADMIN if member_id == user_id else MemberRole.MEMBER,
                )
            )
        db.commit()
        return self.get_conversation(db, user_id, conversation.id)

    def create_conversation(
        self, db: Session, user_id: UUID, payload: ConversationCreateRequest
    ) -> ConversationDetailResponse:
        """Compatibility wrapper for generic conversation creation."""
        if payload.type == ConversationType.DIRECT:
            other_ids = [participant for participant in payload.participant_ids if participant != user_id]
            if len(other_ids) != 1:
                raise ConflictError("Direct conversations require exactly one other participant")
            return self.create_direct(db, user_id, DirectConversationRequest(other_user_id=other_ids[0]))
        if not payload.name:
            raise ConflictError("Group conversations require a name")
        return self.create_group(
            db,
            user_id,
            GroupConversationRequest(name=payload.name, member_ids=payload.participant_ids),
        )

    def list_messages(
        self,
        db: Session,
        user_id: UUID,
        conversation_id: UUID,
        page: int,
        page_size: int,
    ) -> MessageHistoryResponse:
        """Return page-based message history, newest page ordered oldest-to-newest."""
        self._get_membership(db, conversation_id, user_id)
        total = db.scalar(
            select(func.count(Message.id)).where(
                Message.conversation_id == conversation_id,
                Message.deleted_at.is_(None),
            )
        )
        offset = (page - 1) * page_size
        messages = db.execute(
            select(Message)
            .options(
                joinedload(Message.sender),
                joinedload(Message.reply_to),
                selectinload(Message.attachments),
                selectinload(Message.reactions).joinedload(Reaction.user),
                selectinload(Message.statuses),
                selectinload(Message.recipient_keys),
            )
            .where(Message.conversation_id == conversation_id, Message.deleted_at.is_(None))
            .order_by(Message.created_at.desc())
            .offset(offset)
            .limit(page_size)
        ).unique().scalars().all()
        ordered = list(reversed(messages))
        total_pages = ceil(total / page_size) if total else 0
        return MessageHistoryResponse(
            messages=[
                _attach_recipient_key(MessageRead.model_validate(message), message, user_id)
                for message in ordered
            ],
            pagination=PaginationResponse(
                page=page,
                page_size=page_size,
                total=total,
                total_pages=total_pages,
                has_next=page < total_pages,
                has_previous=page > 1,
            ),
        )

    def update_settings(
        self,
        db: Session,
        user_id: UUID,
        conversation_id: UUID,
        payload,
    ) -> ConversationDetailResponse:
        """Update per-user settings and admin-editable group metadata."""
        membership = self._get_membership(db, conversation_id, user_id)
        conversation = self._load_conversation(db, conversation_id)

        if payload.is_muted is not None:
            membership.is_muted = payload.is_muted
        if payload.is_pinned is not None:
            membership.is_pinned = payload.is_pinned
        if conversation.type == ConversationType.GROUP:
            if payload.name is not None:
                if membership.role != MemberRole.ADMIN:
                    raise ForbiddenError("Only admins can rename the group")
                conversation.name = payload.name
            if payload.description is not None:
                if membership.role != MemberRole.ADMIN:
                    raise ForbiddenError("Only admins can update the description")
                conversation.description = payload.description

        db.commit()
        return self.get_conversation(db, user_id, conversation_id)

    def delete_conversation(self, db: Session, user_id: UUID, conversation_id: UUID) -> None:
        """Soft-delete the user's membership; admins can delete groups."""
        membership = self._get_membership(db, conversation_id, user_id)
        conversation = self._load_conversation(db, conversation_id)
        now = datetime.now(timezone.utc)
        if conversation.type == ConversationType.GROUP and membership.role == MemberRole.ADMIN:
            conversation.deleted_at = now
        membership.deleted_at = now
        db.commit()

    def get_members(
        self, db: Session, user_id: UUID, group_id: UUID
    ) -> list[ConversationMemberResponse]:
        """Return group members."""
        self._get_membership(db, group_id, user_id)
        conversation = self._load_conversation(db, group_id)
        if conversation.type != ConversationType.GROUP:
            raise NotFoundError("Group not found")
        return [
            self._member_response(member)
            for member in conversation.members
            if member.deleted_at is None
        ]

    def add_group_member(
        self, db: Session, user_id: UUID, group_id: UUID, target_id: UUID
    ) -> list[ConversationMemberResponse]:
        """Add a member to a group conversation."""
        membership = self._get_membership(db, group_id, user_id)
        if membership.role != MemberRole.ADMIN:
            raise ForbiddenError("Only admins can add members")
        conversation = self._load_conversation(db, group_id)
        if conversation.type != ConversationType.GROUP:
            raise NotFoundError("Group not found")
        target = db.get(User, target_id)
        if target is None or target.deleted_at is not None:
            raise NotFoundError("User not found")
        existing = db.execute(
            select(ConversationMember).where(
                ConversationMember.conversation_id == group_id,
                ConversationMember.user_id == target_id,
                ConversationMember.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if existing:
            raise ConflictError("User is already a member")

        db.add(ConversationMember(conversation_id=group_id, user_id=target_id))
        db.commit()
        return self.get_members(db, user_id, group_id)

    def remove_group_member(
        self, db: Session, user_id: UUID, group_id: UUID, target_id: UUID
    ) -> list[ConversationMemberResponse]:
        """Remove a member from a group conversation."""
        membership = self._get_membership(db, group_id, user_id)
        if membership.role != MemberRole.ADMIN:
            raise ForbiddenError("Only admins can remove members")
        target_membership = db.execute(
            select(ConversationMember).where(
                ConversationMember.conversation_id == group_id,
                ConversationMember.user_id == target_id,
                ConversationMember.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if target_membership is None:
            raise NotFoundError("Member not found")
        if target_membership.role == MemberRole.ADMIN:
            admin_count = db.scalar(
                select(func.count(ConversationMember.id)).where(
                    ConversationMember.conversation_id == group_id,
                    ConversationMember.role == MemberRole.ADMIN,
                    ConversationMember.deleted_at.is_(None),
                )
            )
            if admin_count <= 1:
                raise ConflictError("Cannot remove the final admin")

        target_membership.deleted_at = datetime.now(timezone.utc)
        db.commit()
        return self.get_members(db, user_id, group_id)

    def update_member_role(
        self, db: Session, user_id: UUID, group_id: UUID, target_id: UUID, role: MemberRole
    ) -> list[ConversationMemberResponse]:
        """Promote or demote a group member. Admin-only; cannot demote the last admin."""
        membership = self._get_membership(db, group_id, user_id)
        if membership.role != MemberRole.ADMIN:
            raise ForbiddenError("Only admins can change member roles")

        target_membership = db.execute(
            select(ConversationMember).where(
                ConversationMember.conversation_id == group_id,
                ConversationMember.user_id == target_id,
                ConversationMember.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if target_membership is None:
            raise NotFoundError("Member not found")

        if target_membership.role == MemberRole.ADMIN and role == MemberRole.MEMBER:
            admin_count = db.scalar(
                select(func.count(ConversationMember.id)).where(
                    ConversationMember.conversation_id == group_id,
                    ConversationMember.role == MemberRole.ADMIN,
                    ConversationMember.deleted_at.is_(None),
                )
            )
            if admin_count <= 1:
                raise ConflictError("Cannot demote the final admin")

        target_membership.role = role
        db.commit()
        return self.get_members(db, user_id, group_id)

    def leave_group(self, db: Session, user_id: UUID, group_id: UUID) -> None:
        """
        Leave a group conversation.

        If the leaving member was the sole admin and others remain, the
        earliest-joined remaining member is auto-promoted so the group is
        never left without an admin. If no members remain, the conversation
        itself is soft-deleted.
        """
        membership = self._get_membership(db, group_id, user_id)
        conversation = self._load_conversation(db, group_id)
        if conversation.type != ConversationType.GROUP:
            raise ConflictError("Only group conversations can be left")

        now = datetime.now(timezone.utc)
        membership.deleted_at = now

        remaining = [
            member
            for member in conversation.members
            if member.deleted_at is None and member.user_id != user_id
        ]

        if not remaining:
            conversation.deleted_at = now
        elif membership.role == MemberRole.ADMIN and not any(
            member.role == MemberRole.ADMIN for member in remaining
        ):
            remaining.sort(key=lambda member: member.joined_at)
            remaining[0].role = MemberRole.ADMIN

        db.commit()


conversation_service = ConversationService()
