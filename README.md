# Beacon

A production-ready, full-stack real-time messaging platform inspired by Signal and WhatsApp. Beacon is built with a modern **FastAPI + Next.js** architecture, supporting authentication, real-time messaging, group conversations, contacts, stories, media uploads, and WebSockets.

---

## Features

- JWT Authentication
- Email OTP verification (mock OTP for development)
- Real-time messaging via WebSockets
- One-to-one conversations
- Group chats
- Contact management
- Stories
- File & media uploads
- User profiles and avatars
- Read receipts
- Conversation management
- SQLite database with Alembic migrations
- Automatic database migrations on startup
- Production deployment with Railway and Vercel

---

## Architecture

```text
Beacon/
├── frontend/          # Next.js 15 App Router
├── backend/           # FastAPI backend
├── docs/              # Documentation
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|--------|------------|
| Frontend | Next.js 15, React, TypeScript |
| Styling | Tailwind CSS |
| State Management | Zustand |
| Forms | React Hook Form |
| API Client | Axios |
| Backend | FastAPI |
| ORM | SQLAlchemy 2.0 |
| Validation | Pydantic v2 |
| Database | SQLite |
| Database Migrations | Alembic |
| Authentication | JWT |
| Password Hashing | Passlib + bcrypt |
| Realtime | WebSockets |
| Deployment | Railway + Vercel |

---

## Project Structure

```text
Beacon/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── providers/
│   ├── store/
│   ├── styles/
│   └── types/
│
├── backend/
│   ├── alembic/
│   ├── app/
│   │   ├── core/
│   │   ├── features/
│   │   ├── models/
│   │   ├── seed/
│   │   ├── utils/
│   │   └── main.py
│   ├── static/
│   └── tests/
│
└── docs/
```

---

# Development Setup

## Prerequisites

- Node.js 18+
- Python 3.11+
- npm

---

## Backend

```bash
cd backend

python -m venv venv

# macOS / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env

alembic upgrade head

uvicorn app.main:app --reload
```

Swagger Documentation:

```
http://localhost:8000/docs
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

Application:

```
http://localhost:3000
```

---

# Environment Variables

## Backend (.env)

```env
APP_NAME=Beacon

DEBUG=true

DATABASE_URL=sqlite:///./beacon.db

SECRET_KEY=change-me

ACCESS_TOKEN_EXPIRE_MINUTES=30

REFRESH_TOKEN_EXPIRE_DAYS=7

MOCK_OTP_CODE=123456

CORS_ORIGINS=http://localhost:3000

PUBLIC_BASE_URL=http://localhost:8000

UPLOAD_DIR=static/uploads
```

---

## Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Production:

```env
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
```

> `NEXT_PUBLIC_WS_URL` is optional. Beacon automatically derives the correct WebSocket URL from `NEXT_PUBLIC_API_URL`.

---

# Demo Accounts

The backend automatically seeds demo users.

| Email | Password |
|--------|----------|
| alice@example.com | password123 |
| bob@example.com | password123 |
| charlie@example.com | password123 |
| diana@example.com | password123 |
| eve@example.com | password123 |

---

# Running Tests

```bash
cd backend

pytest
```

---

# Deployment

## Backend

- Railway
- FastAPI
- SQLite
- Alembic migrations execute automatically before application startup.

## Frontend

- Vercel

The frontend automatically converts:

```
https://your-backend.up.railway.app
```

into

```
wss://your-backend.up.railway.app/ws
```

for WebSocket connections.

---

# API

Interactive Documentation:

```
/docs
```

OpenAPI Schema:

```
/openapi.json
```

Health Check:

```
/health
```

---

# Current Functionality

- User Registration
- Email OTP Verification
- User Login
- JWT Authentication
- Token Refresh
- User Profiles
- Contacts
- Direct Conversations
- Group Conversations
- Stories
- File Uploads
- Messaging
- Read Receipts
- Real-time WebSockets
- Automatic Database Migrations
- Automatic Database Seeding
- Health Check Endpoint

---

# Roadmap

- Voice & Video Calling
- Push Notifications
- End-to-End Encryption
- Message Search
- Reactions
- Reply Threads
- Message Editing
- Message Deletion
- Archived Chats
- Multi-device Synchronization

---

# License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.
