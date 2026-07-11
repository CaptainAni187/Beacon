"""
Beacon FastAPI application entry point.

Initializes the FastAPI app, CORS middleware, router registration,
and application lifecycle events.
"""

from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.core.database import run_migrations
from app.features.auth.router import router as auth_router
from app.features.calls.router import router as calls_router
from app.features.contacts.router import router as contacts_router
from app.features.conversations.router import router as conversations_router
from app.features.groups.router import router as groups_router
from app.features.messages.router import router as messages_router
from app.features.realtime.router import router as realtime_router
from app.features.stories.router import router as stories_router
from app.features.uploads.router import router as uploads_router
from app.features.users.router import router as users_router
from app.seed.seed import seed_if_needed

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown lifecycle handler."""
    # Startup
    run_migrations()
    seed_if_needed()
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    yield
    # Shutdown — cleanup resources here if needed


app = FastAPI(
    title=settings.app_name,
    description="Enterprise-grade real-time messaging platform",
    version="0.1.0",
    debug=settings.debug,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded story/message media
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Router registration
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users_router, prefix="/api/users", tags=["Users"])
app.include_router(contacts_router, prefix="/api/contacts", tags=["Contacts"])
app.include_router(
    conversations_router, prefix="/api/conversations", tags=["Conversations"]
)
app.include_router(groups_router, prefix="/api/groups", tags=["Groups"])
app.include_router(messages_router, prefix="/api/messages", tags=["Messages"])
app.include_router(calls_router, prefix="/api/calls", tags=["Calls"])
app.include_router(stories_router, prefix="/api/stories", tags=["Stories"])
app.include_router(uploads_router, prefix="/api/uploads", tags=["Uploads"])
app.include_router(realtime_router, tags=["WebSocket"])


@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """Health check endpoint for load balancers and monitoring."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": "0.1.0",
    }


@app.get("/", tags=["Root"])
async def root() -> dict:
    """Root endpoint with API information."""
    return {
        "message": "Beacon API",
        "docs": "/docs",
        "health": "/health",
    }
