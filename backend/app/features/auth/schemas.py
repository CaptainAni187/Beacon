"""Authentication request and response schemas."""

from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.features.users.schemas import UserRead


class RegisterRequest(BaseModel):
    """Payload for user registration."""

    email: EmailStr
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=100)


class LoginRequest(BaseModel):
    """Payload for user login."""

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    """Payload for token refresh."""

    refresh_token: str


class TokenResponse(BaseModel):
    """JWT token pair response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthResponse(BaseModel):
    """Authentication response with user and tokens."""

    user: UserRead
    tokens: TokenResponse


class RegisterResponse(BaseModel):
    """Registration response before OTP verification completes."""

    user: UserRead
    otp_required: bool = True
    message: str


class OtpVerifyRequest(BaseModel):
    """Payload for OTP verification."""

    email: EmailStr
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class MessageResponse(BaseModel):
    """Generic response message."""

    message: str


class RefreshTokenResponse(TokenResponse):
    """Alias response for refreshed token pairs."""

    pass
