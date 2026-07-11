"""Idempotent development database seeding."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.features.auth.password import hash_password
from app.core.database import SessionLocal, init_db
from app.features.messages.models import Attachment
from app.features.contacts.models import Contact
from app.features.conversations.models import Conversation
from app.features.conversations.models import ConversationMember
from app.core.enums import (
    ContactStatus,
    ConversationType,
    DeliveryStatus,
    MemberRole,
    MessageType,
    UserStatus,
)
from app.features.messages.models import Message
from app.features.messages.models import MessageStatus
from app.features.messages.models import Reaction
from app.features.users.models import User
from app.seed.seed_data import (
    DEMO_PASSWORD,
    MESSAGE_TOPICS,
    SEED_CONTACTS,
    SEED_CONVERSATIONS,
    SEED_USERS,
)

MESSAGES_PER_CONVERSATION = 8


def _get_or_create_user(db: Session, payload: dict, now: datetime) -> User:
    user = db.execute(select(User).where(User.email == payload["email"])).scalar_one_or_none()
    if user is None:
        user = db.execute(select(User).where(User.username == payload["username"])).scalar_one_or_none()
    if user:
        user.username = payload["username"]
        user.email = payload["email"]
        user.avatar_url = payload["avatar_url"]
        user.display_name = payload["display_name"]
        user.password_hash = hash_password(DEMO_PASSWORD)
        user.status = UserStatus(payload["status"])
        user.last_seen_at = now - timedelta(minutes=payload["last_seen_minutes"])
        user.deleted_at = None
        return user

    user = User(
        username=payload["username"],
        email=payload["email"],
        password_hash=hash_password(DEMO_PASSWORD),
        display_name=payload["display_name"],
        avatar_url=payload["avatar_url"],
        status=UserStatus(payload["status"]),
        last_seen_at=now - timedelta(minutes=payload["last_seen_minutes"]),
    )
    db.add(user)
    db.flush()
    return user


def _ensure_contact(db: Session, owner: User, contact: User) -> None:
    exists = db.execute(
        select(Contact).where(Contact.owner_id == owner.id, Contact.contact_user_id == contact.id)
    ).scalar_one_or_none()
    if exists:
        return
    db.add(
        Contact(
            owner_id=owner.id,
            contact_user_id=contact.id,
            status=ContactStatus.ACCEPTED,
            nickname=contact.display_name.split()[0],
        )
    )


def _find_conversation(db: Session, spec: dict, users: dict[str, User]) -> Conversation | None:
    if spec["type"] == "group":
        return db.execute(select(Conversation).where(Conversation.name == spec["name"])).scalar_one_or_none()

    member_ids = {users[username].id for username in spec["members"]}
    conversations = db.execute(
        select(Conversation).where(Conversation.type == ConversationType.DIRECT)
    ).scalars()
    for conversation in conversations:
        ids = {member.user_id for member in conversation.members if member.deleted_at is None}
        if ids == member_ids:
            return conversation
    return None


def _get_or_create_conversation(
    db: Session,
    spec: dict,
    users: dict[str, User],
) -> Conversation:
    conversation = _find_conversation(db, spec, users)
    if conversation is None:
        creator = users[spec["members"][0]]
        conversation = Conversation(
            type=ConversationType(spec["type"]),
            name=spec.get("name"),
            avatar_url=spec.get("avatar_url"),
            description="Seeded demo conversation" if spec["type"] == "group" else None,
            created_by_id=creator.id,
        )
        db.add(conversation)
        db.flush()
    else:
        conversation.deleted_at = None
        conversation.name = spec.get("name")
        conversation.avatar_url = spec.get("avatar_url")
        if spec["type"] == "group":
            conversation.description = conversation.description or "Seeded demo conversation"

    for index, username in enumerate(spec["members"]):
        user = users[username]
        member = db.execute(
            select(ConversationMember).where(
                ConversationMember.conversation_id == conversation.id,
                ConversationMember.user_id == user.id,
            )
        ).scalar_one_or_none()
        if member is None:
            db.add(
                ConversationMember(
                    conversation_id=conversation.id,
                    user_id=user.id,
                    role=MemberRole.ADMIN if index == 0 else MemberRole.MEMBER,
                    is_pinned=index == 0,
                )
            )
        else:
            member.deleted_at = None
            member.role = MemberRole.ADMIN if index == 0 else member.role
            member.is_pinned = member.is_pinned or index == 0
    return conversation


def _seed_messages(db: Session, conversation: Conversation, members: list[User], base: datetime) -> None:
    existing = db.execute(select(Message.id).where(Message.conversation_id == conversation.id)).first()
    if existing:
        return

    created_messages: list[Message] = []
    for index in range(MESSAGES_PER_CONVERSATION):
        sender = members[index % len(members)]
        created_at = base + timedelta(hours=index * 3, minutes=(index * 7) % 41)
        topic_offset = len(str(conversation.id)) + len(created_messages)
        message = Message(
            conversation_id=conversation.id,
            sender_id=sender.id,
            content=MESSAGE_TOPICS[(index + topic_offset) % len(MESSAGE_TOPICS)],
            type=MessageType.IMAGE if index == 4 else MessageType.FILE if index == 6 else MessageType.TEXT,
            reply_to_id=created_messages[index - 2].id if index in {3, 7, 10} else None,
            created_at=created_at,
            updated_at=created_at,
        )
        db.add(message)
        db.flush()
        created_messages.append(message)

        for recipient_index, member in enumerate(members):
            status = DeliveryStatus.READ if index < 5 else DeliveryStatus.DELIVERED
            if recipient_index == len(members) - 1 and index >= 6:
                status = DeliveryStatus.SENT
            db.add(MessageStatus(message_id=message.id, user_id=member.id, status=status))

        if index in {2, 5, 9, 12}:
            reactor = members[(index + 1) % len(members)]
            db.add(Reaction(message_id=message.id, user_id=reactor.id, emoji=["👍", "❤️", "😂", "🔥", "👏"][index % 5]))

        if message.type != MessageType.TEXT:
            db.add(
                Attachment(
                    message_id=message.id,
                    url=f"https://example.com/seed/{conversation.id}/{index}",
                    filename=f"beacon-demo-{index}.{'png' if message.type == MessageType.IMAGE else 'pdf'}",
                    mime_type="image/png" if message.type == MessageType.IMAGE else "application/pdf",
                    size=128000 + index * 2048,
                )
            )


def run_seed() -> None:
    """Populate the database with deterministic demo records."""
    init_db()
    seed_database()


def seed_database() -> None:
    """Populate the configured database with deterministic demo records."""
    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        users = {payload["username"]: _get_or_create_user(db, payload, now) for payload in SEED_USERS}

        for owner_name, contact_name in SEED_CONTACTS:
            _ensure_contact(db, users[owner_name], users[contact_name])
            _ensure_contact(db, users[contact_name], users[owner_name])

        conversations = []
        for spec in SEED_CONVERSATIONS:
            conversation = _get_or_create_conversation(db, spec, users)
            conversations.append((conversation, [users[name] for name in spec["members"]]))

        for index, (conversation, members) in enumerate(conversations):
            _seed_messages(db, conversation, members, now - timedelta(days=5 - index))

        db.commit()

    print("Seed complete: demo users, contacts, conversations, and messages are ready.")


def seed_if_needed() -> None:
    """Seed demo data when the database is empty or required demo users are missing."""
    required_emails = {payload["email"] for payload in SEED_USERS[:5]}
    with SessionLocal() as db:
        existing_emails = set(db.execute(select(User.email)).scalars().all())
        conversation_count = db.scalar(select(func.count(Conversation.id)))
        message_count = db.scalar(select(func.count(Message.id)))
        has_seeded_inbox = conversation_count >= len(SEED_CONVERSATIONS) and message_count >= 30

    if not existing_emails or not required_emails.issubset(existing_emails) or not has_seeded_inbox:
        seed_database()


if __name__ == "__main__":
    run_seed()
