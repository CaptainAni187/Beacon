"""Contact service implementation."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.features.contacts.models import Contact
from app.core.enums import ContactStatus
from app.features.users.models import User
from app.features.contacts.schemas import AddContactRequest, ContactResponse, ContactSearchResponse


class ContactService:
    """Handles contact relationship management."""

    def _to_response(self, contact: Contact) -> ContactResponse:
        user = contact.contact_user
        return ContactResponse(
            id=contact.id,
            user_id=user.id,
            username=user.username,
            display_name=user.display_name,
            avatar_url=user.avatar_url,
            last_seen_at=user.last_seen_at,
            status=user.status,
            contact_status=contact.status,
        )

    def list_contacts(self, db: Session, user_id: UUID) -> list[ContactResponse]:
        """List accepted contacts for a user."""
        contacts = db.execute(
            select(Contact)
            .options(joinedload(Contact.contact_user))
            .where(Contact.owner_id == user_id, Contact.deleted_at.is_(None))
            .order_by(Contact.created_at.desc())
        ).scalars().all()
        return [self._to_response(contact) for contact in contacts]

    def add_contact(
        self, db: Session, user_id: UUID, payload: AddContactRequest
    ) -> ContactResponse:
        """Add a contact by username, phone, or user ID."""
        target: User | None = None
        if payload.user_id:
            target = db.get(User, payload.user_id)
        elif payload.username:
            target = db.execute(
                select(User).where(
                    User.username == payload.username,
                    User.deleted_at.is_(None),
                )
            ).scalar_one_or_none()
        elif payload.phone:
            target = db.execute(
                select(User).where(
                    User.phone_number == payload.phone,
                    User.deleted_at.is_(None),
                )
            ).scalar_one_or_none()

        if target is None or target.deleted_at is not None:
            raise NotFoundError("User not found")
        if target.id == user_id:
            raise ConflictError("Cannot add yourself as a contact")

        existing = db.execute(
            select(Contact).where(
                Contact.owner_id == user_id,
                Contact.contact_user_id == target.id,
                Contact.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if existing:
            raise ConflictError("Contact already exists")

        contact = Contact(
            owner_id=user_id,
            contact_user_id=target.id,
            status=ContactStatus.ACCEPTED,
        )
        db.add(contact)
        db.commit()

        contact = db.execute(
            select(Contact)
            .options(joinedload(Contact.contact_user))
            .where(Contact.id == contact.id)
        ).scalar_one()
        return self._to_response(contact)

    def remove_contact(self, db: Session, user_id: UUID, contact_id: UUID) -> None:
        """Soft-delete a contact."""
        contact = db.get(Contact, contact_id)
        if contact is None or contact.deleted_at is not None:
            raise NotFoundError("Contact not found")
        if contact.owner_id != user_id:
            raise ForbiddenError("Not your contact")
        contact.deleted_at = datetime.now(timezone.utc)
        db.commit()

    def search_users(
        self, db: Session, user_id: UUID, query: str, limit: int = 20
    ) -> list[ContactSearchResponse]:
        """Search users by username, display name, or phone, excluding existing contacts."""
        pattern = f"%{query}%"
        contact_subquery = select(Contact.contact_user_id).where(
            Contact.owner_id == user_id,
            Contact.deleted_at.is_(None),
        )
        users = db.execute(
            select(User)
            .where(
                User.id != user_id,
                User.deleted_at.is_(None),
                User.id.not_in(contact_subquery),
                or_(
                    User.username.ilike(pattern),
                    User.display_name.ilike(pattern),
                    User.phone_number.ilike(pattern),
                ),
            )
            .order_by(User.display_name)
            .limit(limit)
        ).scalars().all()

        return [
            ContactSearchResponse(
                id=user.id,
                username=user.username,
                display_name=user.display_name,
                avatar_url=user.avatar_url,
                phone_number=user.phone_number,
                last_seen_at=user.last_seen_at,
                status=user.status,
            )
            for user in users
        ]


contact_service = ContactService()
