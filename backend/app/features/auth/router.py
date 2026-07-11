"""Authentication router."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.features.auth.dependencies import get_current_user
from app.core.exceptions import AppError, raise_http
from app.features.users.models import User
from app.features.auth.schemas import (
    AuthResponse,
    LoginRequest,
    MessageResponse,
    OtpVerifyRequest,
    RefreshRequest,
    RegisterResponse,
    RegisterRequest,
    TokenResponse,
)
from app.features.users.schemas import UserRead
from app.features.auth.service import auth_service

router = APIRouter()


@router.post("/register", response_model=RegisterResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> RegisterResponse:
    """Register a new user account."""
    try:
        return auth_service.register(db, payload)
    except AppError as exc:
        raise_http(exc)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    """Authenticate user and return JWT tokens."""
    try:
        return auth_service.login(db, payload)
    except AppError as exc:
        raise_http(exc)


@router.post("/logout", response_model=MessageResponse)
def logout(payload: RefreshRequest) -> MessageResponse:
    """Invalidate refresh token and end session."""
    auth_service.logout(payload.refresh_token)
    return MessageResponse(message="Logged out successfully")


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshRequest) -> TokenResponse:
    """Refresh an expired access token."""
    try:
        return auth_service.refresh_token(payload.refresh_token)
    except AppError as exc:
        raise_http(exc)


@router.post("/verify-otp", response_model=AuthResponse)
def verify_otp(payload: OtpVerifyRequest, db: Session = Depends(get_db)) -> AuthResponse:
    """Verify one-time password for email confirmation."""
    try:
        return auth_service.verify_otp(db, payload)
    except AppError as exc:
        raise_http(exc)


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> UserRead:
    """Return the authenticated user."""
    return UserRead.model_validate(current_user)
