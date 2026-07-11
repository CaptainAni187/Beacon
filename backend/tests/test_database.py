"""Database layer integration tests."""

import uuid

import pytest
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import Base, SessionLocal, engine, init_db
from app.models import (
    Attachment,
    Contact,
    ContactStatus,
    Conversation,
    ConversationMember,
    ConversationType,
    DeliveryStatus,
    MemberRole,
    Message,
    MessageStatus,
    MessageType,
    Reaction,
    User,
    UserStatus,
)


def _suffix() -> str:
    return uuid.uuid4().hex[:8]


@pytest.fixture
def db() -> Session:
    """Provide a database session for each test."""
    init_db()
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def test_all_tables_exist() -> None:
    """Verify every ORM model maps to a created table."""
    init_db()
    table_names = set(inspect(engine).get_table_names())
    expected = {
        "users",
        "contacts",
        "conversations",
        "conversation_members",
        "messages",
        "message_statuses",
        "attachments",
        "reactions",
        "alembic_version",
    }
    assert expected.issubset(table_names)


def test_foreign_keys_enabled() -> None:
    """Verify SQLite foreign-key enforcement is active."""
    with engine.connect() as connection:
        result = connection.execute(text("PRAGMA foreign_keys")).scalar()
    assert result == 1


def test_user_enum_persists_values(db: Session) -> None:
    """Enum columns should store lowercase values, not member names."""
    suffix = _suffix()
    user = User(
        username=f"alice_{suffix}",
        email=f"alice_{suffix}@example.com",
        password_hash="hash",
        display_name="Alice",
        status=UserStatus.ONLINE,
    )
    db.add(user)
    db.commit()

    stored = db.execute(
        text(f"SELECT status FROM users WHERE username = 'alice_{suffix}'")
    ).scalar()
    assert stored == "online"


def test_message_foreign_key_constraint(db: Session) -> None:
    """Inserting a message with invalid FK references should fail."""
    suffix = _suffix()
    user = User(
        username=f"bob_{suffix}",
        email=f"bob_{suffix}@example.com",
        password_hash="hash",
        display_name="Bob",
    )
    db.add(user)
    db.commit()

    message = Message(
        conversation_id=uuid.uuid4(),
        sender_id=user.id,
        content="hello",
        type=MessageType.TEXT,
    )
    db.add(message)

    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_conversation_cascade_deletes_messages(db: Session) -> None:
    """Deleting a conversation should cascade to its messages."""
    suffix = _suffix()
    user = User(
        username=f"carol_{suffix}",
        email=f"carol_{suffix}@example.com",
        password_hash="hash",
        display_name="Carol",
    )
    db.add(user)
    db.flush()

    conversation = Conversation(
        type=ConversationType.DIRECT,
        created_by_id=user.id,
    )
    db.add(conversation)
    db.flush()
    message = Message(
        conversation_id=conversation.id,
        sender_id=user.id,
        content="hello",
        type=MessageType.TEXT,
    )
    db.add(message)
    db.commit()

    message_id = message.id
    db.delete(conversation)
    db.commit()

    assert db.get(Message, message_id) is None


def test_full_relationship_graph(db: Session) -> None:
    """Create and query a complete object graph across all models."""
    suffix = _suffix()
    sender = User(
        username=f"dave_{suffix}",
        email=f"dave_{suffix}@example.com",
        password_hash="hash",
        display_name="Dave",
    )
    recipient = User(
        username=f"eve_{suffix}",
        email=f"eve_{suffix}@example.com",
        password_hash="hash",
        display_name="Eve",
    )
    db.add_all([sender, recipient])
    db.flush()

    contact = Contact(
        owner_id=sender.id,
        contact_user_id=recipient.id,
        status=ContactStatus.ACCEPTED,
    )
    conversation = Conversation(
        type=ConversationType.GROUP,
        name="Team",
        created_by_id=sender.id,
    )
    db.add_all([contact, conversation])
    db.flush()

    db.add_all(
        [
            ConversationMember(
                conversation_id=conversation.id,
                user_id=sender.id,
                role=MemberRole.ADMIN,
            ),
            ConversationMember(
                conversation_id=conversation.id,
                user_id=recipient.id,
                role=MemberRole.MEMBER,
            ),
        ]
    )
    db.flush()

    parent_message = Message(
        conversation_id=conversation.id,
        sender_id=sender.id,
        content="Parent",
        type=MessageType.TEXT,
    )
    db.add(parent_message)
    db.flush()

    reply = Message(
        conversation_id=conversation.id,
        sender_id=recipient.id,
        content="Reply",
        type=MessageType.TEXT,
        reply_to_id=parent_message.id,
    )
    attachment = Attachment(
        message_id=parent_message.id,
        url="https://example.com/file.png",
        filename="file.png",
        mime_type="image/png",
        size=1024,
    )
    status = MessageStatus(
        message_id=parent_message.id,
        user_id=recipient.id,
        status=DeliveryStatus.DELIVERED,
    )
    reaction = Reaction(
        message_id=parent_message.id,
        user_id=recipient.id,
        emoji="👍",
    )
    db.add_all([reply, attachment, status, reaction])
    db.commit()

    loaded = db.get(Conversation, conversation.id)
    assert loaded is not None
    assert len(loaded.members) == 2
    assert len(loaded.messages) == 2
    assert loaded.messages[0].attachments[0].filename == "file.png"
    assert loaded.messages[0].statuses[0].status == DeliveryStatus.DELIVERED
    assert loaded.messages[0].reactions[0].emoji == "👍"
    assert loaded.messages[1].reply_to_id == parent_message.id


def test_metadata_matches_registered_models() -> None:
    """Ensure Base metadata includes every exported model table."""
    init_db()
    assert set(Base.metadata.tables.keys()) == {
        "users",
        "contacts",
        "conversations",
        "conversation_members",
        "messages",
        "message_statuses",
        "attachments",
        "reactions",
        "message_recipient_keys",
        "call_links",
        "calls",
        "call_participants",
        "stories",
        "story_views",
    }
