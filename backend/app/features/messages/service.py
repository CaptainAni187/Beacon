"""Message service implementation."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.features.conversations.models import ConversationMember
from app.core.enums import DeliveryStatus
from app.features.messages.models import Message
from app.features.messages.models import MessageRecipientKey
from app.features.messages.models import MessageStatus
from app.features.messages.schemas import (
    MessageCreate,
    MessagePage,
    MessageRead,
    MessageRecipientKeyRead,
    MessageUpdate,
)


def _attach_recipient_key(read: MessageRead, message: Message, user_id: UUID) -> MessageRead:
    """Populate `recipient_key` with only the requesting user's own wrapped key."""
    for key in message.recipient_keys:
        if key.user_id == user_id:
            read.recipient_key = MessageRecipientKeyRead(
                wrapped_key=key.wrapped_key, wrap_iv=key.wrap_iv
            )
            break
    return read


class MessageService:
    """Handles message CRUD and delivery status tracking."""

    def _verify_membership(self, db: Session, conversation_id: UUID, user_id: UUID) -> None:
        membership = db.execute(
            select(ConversationMember).where(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
                ConversationMember.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if membership is None:
            raise ForbiddenError("Not a member of this conversation")

    def list_messages(
        self,
        db: Session,
        user_id: UUID,
        conversation_id: UUID,
        cursor: str | None = None,
        limit: int = 50,
    ) -> MessagePage:
        """Return paginated messages for a conversation."""
        self._verify_membership(db, conversation_id, user_id)

        query = (
            select(Message)
            .options(
                joinedload(Message.sender),
                joinedload(Message.attachments),
                joinedload(Message.reactions),
                joinedload(Message.statuses),
                joinedload(Message.recipient_keys),
            )
            .where(Message.conversation_id == conversation_id, Message.deleted_at.is_(None))
            .order_by(Message.created_at.desc())
            .limit(limit + 1)
        )

        if cursor:
            cursor_msg = db.get(Message, UUID(cursor))
            if cursor_msg:
                query = query.where(Message.created_at < cursor_msg.created_at)

        messages = db.execute(query).unique().scalars().all()
        has_more = len(messages) > limit
        if has_more:
            messages = messages[:limit]

        messages = list(reversed(messages))
        next_cursor = str(messages[0].id) if has_more and messages else None

        return MessagePage(
            messages=[
                _attach_recipient_key(MessageRead.model_validate(m), m, user_id) for m in messages
            ],
            has_more=has_more,
            next_cursor=next_cursor,
        )

    def send_message(self, db: Session, user_id: UUID, payload: MessageCreate) -> MessageRead:
        """Create and persist a new message."""
        self._verify_membership(db, payload.conversation_id, user_id)

        if payload.reply_to_id:
            reply = db.get(Message, payload.reply_to_id)
            if reply is None or reply.conversation_id != payload.conversation_id:
                raise NotFoundError("Reply target not found")

        members = db.execute(
            select(ConversationMember.user_id).where(
                ConversationMember.conversation_id == payload.conversation_id,
                ConversationMember.deleted_at.is_(None),
            )
        ).scalars().all()

        if payload.is_encrypted:
            if not payload.iv:
                raise ConflictError("Encrypted messages require an iv")
            member_ids = set(members)
            key_user_ids = {key.user_id for key in payload.recipient_keys}
            if not key_user_ids.issubset(member_ids):
                raise ConflictError("recipient_keys must only reference conversation members")

        message = Message(
            conversation_id=payload.conversation_id,
            sender_id=user_id,
            content=payload.content,
            type=payload.type,
            reply_to_id=payload.reply_to_id,
            is_encrypted=payload.is_encrypted,
            iv=payload.iv,
        )
        db.add(message)
        db.flush()

        for member_id in members:
            db.add(
                MessageStatus(
                    message_id=message.id, user_id=member_id, status=DeliveryStatus.SENT
                )
            )

        for key in payload.recipient_keys:
            db.add(
                MessageRecipientKey(
                    message_id=message.id,
                    user_id=key.user_id,
                    wrapped_key=key.wrapped_key,
                    wrap_iv=key.wrap_iv,
                )
            )

        db.commit()
        return self.get_message(db, user_id, message.id)

    def get_message(self, db: Session, user_id: UUID, message_id: UUID) -> MessageRead:
        """Retrieve a single message."""
        message = db.execute(
            select(Message)
            .options(
                joinedload(Message.sender),
                joinedload(Message.attachments),
                joinedload(Message.reactions),
                joinedload(Message.statuses),
                joinedload(Message.recipient_keys),
            )
            .where(Message.id == message_id, Message.deleted_at.is_(None))
        ).unique().scalar_one_or_none()

        if message is None:
            raise NotFoundError("Message not found")

        self._verify_membership(db, message.conversation_id, user_id)
        return _attach_recipient_key(MessageRead.model_validate(message), message, user_id)

    def edit_message(
        self, db: Session, user_id: UUID, message_id: UUID, payload: MessageUpdate
    ) -> MessageRead:
        """Edit an existing message (sender only)."""
        message = db.get(Message, message_id)
        if message is None or message.deleted_at is not None:
            raise NotFoundError("Message not found")
        if message.sender_id != user_id:
            raise ForbiddenError("Only the sender can edit this message")

        message.content = payload.content
        db.commit()
        return self.get_message(db, user_id, message_id)

    def delete_message(self, db: Session, user_id: UUID, message_id: UUID) -> None:
        """Soft-delete a message."""
        message = db.get(Message, message_id)
        if message is None or message.deleted_at is not None:
            raise NotFoundError("Message not found")
        if message.sender_id != user_id:
            raise ForbiddenError("Only the sender can delete this message")

        message.deleted_at = datetime.now(timezone.utc)
        db.commit()

    def mark_as_read(
        self, db: Session, user_id: UUID, conversation_id: UUID, up_to_message_id: UUID
    ) -> None:
        """Mark messages as read up to a given message."""
        membership = db.execute(
            select(ConversationMember).where(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
                ConversationMember.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if membership is None:
            raise ForbiddenError("Not a member of this conversation")

        up_to = db.get(Message, up_to_message_id)
        if up_to is None:
            raise NotFoundError("Message not found")

        membership.last_read_at = up_to.created_at

        statuses = db.execute(
            select(MessageStatus).where(
                MessageStatus.user_id == user_id,
                MessageStatus.message_id == up_to_message_id,
            )
        ).scalar_one_or_none()
        if statuses:
            statuses.status = DeliveryStatus.READ

        db.commit()

    _STATUS_ORDER = {
        DeliveryStatus.SENT: 0,
        DeliveryStatus.DELIVERED: 1,
        DeliveryStatus.READ: 2,
    }

    def update_status(
        self, db: Session, user_id: UUID, message_id: UUID, status: DeliveryStatus
    ) -> dict:
        """
        Update a single recipient's delivery status for a message (WebSocket ack path).

        Status only moves forward (sent -> delivered -> read); a stale ack can't
        regress an already-read message back to delivered.
        """
        message = db.get(Message, message_id)
        if message is None or message.deleted_at is not None:
            raise NotFoundError("Message not found")

        self._verify_membership(db, message.conversation_id, user_id)

        status_row = db.execute(
            select(MessageStatus).where(
                MessageStatus.message_id == message_id,
                MessageStatus.user_id == user_id,
            )
        ).scalar_one_or_none()
        if status_row is None:
            raise NotFoundError("Status record not found")

        if self._STATUS_ORDER[status] > self._STATUS_ORDER[status_row.status]:
            status_row.status = status
            db.commit()

        return {
            "message_id": str(message_id),
            "conversation_id": str(message.conversation_id),
            "user_id": str(user_id),
            "status": status_row.status.value,
            "sender_id": str(message.sender_id),
        }


message_service = MessageService()
