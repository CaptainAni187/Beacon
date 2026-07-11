# Beacon

A production-quality, full-stack real-time messaging platform built for scalability, maintainability, and enterprise-grade reliability.

## Project Overview

Beacon is a modern messaging application featuring real-time chat, group conversations, contact management, and rich user settings. This repository contains the foundational architecture — ready for incremental feature development.

## Architecture

```
beacon/
├── frontend/     # Next.js App Router client
├── backend/      # FastAPI REST + WebSocket server
└── docs/         # Architecture and design documentation
```

See [docs/architecture.md](./docs/architecture.md) for detailed system design.

## Tech Stack

| Layer     | Technologies                                              |
|-----------|-----------------------------------------------------------|
| Frontend  | Next.js, TypeScript, TailwindCSS, Zustand, React Hook Form, Axios |
| Backend   | FastAPI, Python, Pydantic, SQLAlchemy (planned)           |
| Database  | SQLite (planned)                                          |
| Realtime  | WebSockets (planned)                                      |
| Auth      | JWT (planned)                                             |

## Folder Structure

```
beacon/
├── frontend/
│   ├── app/                    # Next.js App Router pages and layouts
│   ├── components/             # UI, auth, chat, group, contacts, shared
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # API client, socket, auth utilities
│   ├── store/                  # Zustand state stores
│   ├── types/                  # TypeScript type definitions
│   └── public/                 # Static assets
├── backend/
│   └── app/
│       ├── routers/            # FastAPI route handlers
│       ├── services/           # Business logic layer
│       ├── websocket/          # WebSocket connection management
│       ├── auth/               # JWT and dependency injection
│       ├── models/             # SQLAlchemy models (planned)
│       ├── schemas/            # Pydantic schemas (planned)
│       └── seed/               # Database seeding utilities
└── docs/
```

## Development Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- npm or yarn

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

API docs available at [http://localhost:8000/docs](http://localhost:8000/docs).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Application available at [http://localhost:3000](http://localhost:3000).

### Environment Variables

Backend (`.env`):

| Variable           | Description              | Default                  |
|--------------------|--------------------------|--------------------------|
| `APP_NAME`         | Application name         | `Beacon`                 |
| `DEBUG`            | Debug mode               | `true`                   |
| `DATABASE_URL`     | Database connection URL  | `sqlite:///./beacon.db`  |
| `SECRET_KEY`       | JWT signing key          | (change in production)   |
| `CORS_ORIGINS`     | Allowed CORS origins     | `http://localhost:3000`  |

Frontend (`.env.local`):

| Variable                  | Description        | Default                  |
|---------------------------|--------------------|--------------------------|
| `NEXT_PUBLIC_API_URL`     | Backend API URL    | `http://localhost:8000`  |
| `NEXT_PUBLIC_WS_URL`      | WebSocket URL      | `ws://localhost:8000/ws` |

## Future Roadmap

- [ ] SQLAlchemy models and database migrations
- [ ] JWT authentication (register, login, refresh tokens)
- [ ] User profiles and avatar management
- [ ] Contact management and discovery
- [ ] Direct and group conversations
- [ ] Real-time messaging via WebSockets
- [ ] Typing indicators and read receipts
- [ ] File attachments and media previews
- [ ] Push notifications
- [ ] End-to-end encryption (research phase)

## License

MIT License — see [LICENSE](./LICENSE) for details.
