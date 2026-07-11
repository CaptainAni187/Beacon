# Beacon Architecture

## Overview

Beacon is a full-stack real-time messaging platform designed for scalability, maintainability, and enterprise-grade reliability.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  Next.js App Router · Zustand · WebSocket Client · Axios   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│                        API Layer                             │
│  FastAPI · JWT Auth · REST Routers · WebSocket Handler       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      Service Layer                           │
│  Auth · Conversations · Messages · Contacts · Groups         │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      Data Layer                              │
│  SQLAlchemy · SQLite (dev) · Migrations (future)             │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

- **App Router**: Route groups `(auth)` and `(main)` separate public and authenticated layouts.
- **State**: Zustand stores for auth, conversations, and UI preferences.
- **API Layer**: Centralized Axios instance with JWT interceptors.
- **Realtime**: Singleton WebSocket client with pub/sub event model.

## Backend Architecture

- **Routers**: Thin HTTP handlers delegating to services.
- **Services**: Business logic isolation (placeholder phase).
- **WebSocket**: ConnectionManager with event-driven handler pattern.
- **Auth**: JWT handler and FastAPI dependencies (placeholder phase).

## Future Considerations

- Database migrations via Alembic
- Redis for pub/sub scaling
- Horizontal WebSocket scaling with sticky sessions
- Rate limiting and request validation middleware
