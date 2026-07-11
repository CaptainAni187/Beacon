"""Authentication service implementation."""

from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.features.auth.jwt_handler import create_access_token, create_refresh_token, verify_refresh_token
from app.features.auth.password import hash_password, verify_password
from app.core.config import get_settings
from app.core.exceptions import ConflictError, UnauthorizedError
from app.features.users.models import User
from app.features.auth.schemas import (
    AuthResponse,
    LoginRequest,
    OtpVerifyRequest,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
)
from app.features.users.schemas import UserRead

settings = get_settings()


class AuthService:
    """Handles authentication-related business logic."""

    def _build_tokens(self, user_id: UUID) -> TokenResponse:
        subject = str(user_id)
        return TokenResponse(
            access_token=create_access_token(subject),
            refresh_token=create_refresh_token(subject),
            expires_in=settings.access_token_expire_minutes * 60,
        )

    def register(self, db: Session, payload: RegisterRequest) -> RegisterResponse:
        """Register a new user account."""
        existing = db.execute(
            select(User).where(
                or_(User.email == payload.email, User.username == payload.username),
                User.deleted_at.is_(None),
            )
        ).scalar_one_or_none()

        if existing:
            if existing.email == payload.email:
                raise ConflictError("Email already registered")
            raise ConflictError("Username already taken")

        user = User(
            email=payload.email,
            username=payload.username,
            password_hash=hash_password(payload.password),
            display_name=payload.display_name,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        return RegisterResponse(
            user=UserRead.model_validate(user),
            message="Registration successful. Verify the mock OTP to continue.",
        )

    def verify_otp(self, db: Session, payload: OtpVerifyRequest) -> AuthResponse:
        """Verify the configured mock OTP and return tokens."""
        if payload.code != settings.mock_otp_code:
            raise UnauthorizedError("Invalid OTP code")

        user = db.execute(
            select(User).where(User.email == payload.email, User.deleted_at.is_(None))
        ).scalar_one_or_none()
        if user is None:
            raise UnauthorizedError("Invalid OTP request")

        return AuthResponse(user=UserRead.model_validate(user), tokens=self._build_tokens(user.id))

    def login(self, db: Session, payload: LoginRequest) -> AuthResponse:
        """Authenticate credentials and return tokens."""
        user = db.execute(
            select(User).where(User.email == payload.email, User.deleted_at.is_(None))
        ).scalar_one_or_none()

        if user is None or not verify_password(payload.password, user.password_hash):
            raise UnauthorizedError("Invalid email or password")

        return AuthResponse(user=UserRead.model_validate(user), tokens=self._build_tokens(user.id))

    def refresh_token(self, refresh_token: str) -> TokenResponse:
        """Issue a new token pair from a valid refresh token."""
        user_id = verify_refresh_token(refresh_token)
        if user_id is None:
            raise UnauthorizedError("Invalid or expired refresh token")
        return self._build_tokens(UUID(user_id))

    def logout(self, _refresh_token: str) -> None:
        """Invalidate a refresh token. Blacklist support deferred."""
        return None


auth_service = AuthService()
