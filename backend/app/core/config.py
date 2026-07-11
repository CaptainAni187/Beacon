"""Beacon application configuration."""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_name: str = "Beacon"
    debug: bool = True
    database_url: str = "sqlite:///./beacon.db"
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    mock_otp_code: str = "123456"
    cors_origins: str = "http://localhost:3000"
    upload_dir: str = "static/uploads"
    max_upload_size_bytes: int = 25 * 1024 * 1024
    public_base_url: str = "http://localhost:8000"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
