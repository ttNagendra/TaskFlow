# TaskFlow — Real-Time Task Collaboration Platform

A full-stack, lightweight **Trello/Notion hybrid** with boards, lists, tasks, drag-and-drop, real-time sync via WebSockets, and user authentication. Built as a monorepo with a Node.js/Express backend and React/Vite frontend.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Demo Credentials](#demo-credentials)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Frontend Architecture](#frontend-architecture)
6. [Backend Architecture](#backend-architecture)
7. [Database Schema & Indexing](#database-schema--indexing)
8. [API Documentation](#api-documentation)
9. [Real-Time Synchronization Strategy](#real-time-synchronization-strategy)
10. [Testing](#testing)
11. [Assumptions & Trade-offs](#assumptions--trade-offs)
12. [Scalability Considerations](#scalability-considerations)

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm

### 1. Backend Setup

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
node prisma/seed.js        # Seed demo data (3 users, 1 board, 4 lists, 7 tasks)
npm run dev                # Starts Express server on http://localhost:3001
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev                # Starts Vite dev server on http://localhost:5173
```

### 3. Open the App

Navigate to **http://localhost:5173** in your browser.

---

## Demo Credentials

| Name            | Email               | Password      |
|-----------------|---------------------|---------------|
| Alice Johnson   | alice@example.com   | password123   |
| Bob Smith       | bob@example.com     | password123   |
| Carol Williams  | carol@example.com   | password123   |

The seed script creates a **"Product Launch"** board with 4 lists (Backlog, In Progress, In Review, Done) and 7 sample tasks with different priorities and assignees.

---

## Tech Stack

| Layer           | Technology                                                       |
|-----------------|------------------------------------------------------------------|
| **Frontend**    | React 18, Vite, React Router v7, Zustand, @hello-pangea/dnd, Socket.IO Client, Lucide Icons |
| **Backend**     | Node.js, Express 4, Socket.IO 4, JWT (jsonwebtoken), bcryptjs   |
| **Database**    | SQLite + Prisma ORM                                              |
| **Testing**     | Vitest (backend integration tests)                               |

---

## Project Structure

```
taskflow/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # Database models (6 tables)
│   │   └── seed.js               # Demo data seeder
│   ├── src/
│   │   ├── server.js             # Express + Socket.IO entrypoint
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT verification middleware
│   │   ├── routes/
│   │   │   ├── auth.js           # POST /signup, /login, GET /me
│   │   │   ├── boards.js         # Board CRUD + members + task search
│   │   │   ├── lists.js          # List CRUD
│   │   │   ├── tasks.js          # Task CRUD + move/assign
│   │   │   └── activity.js       # Activity history
│   │   └── socket/
│   │       └── index.js          # WebSocket auth & room management
│   ├── tests/
│   │   └── auth.test.js          # Vitest integration tests
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── main.jsx              # React root
│   │   ├── App.jsx               # Routes + auth guards
│   │   ├── pages/
│   │   │   ├── Login.jsx         # Login page
│   │   │   ├── Signup.jsx        # Registration page
│   │   │   ├── Boards.jsx        # Board listing + create modal
│   │   │   └── BoardDetail.jsx   # Kanban board (main view)
│   │   ├── components/
│   │   │   ├── Header.jsx        # Navigation header
│   │   │   ├── TaskCard.jsx      # Draggable task card
│   │   │   ├── TaskModal.jsx     # Task edit/delete modal
│   │   │   ├── ActivityPanel.jsx # Activity history panel
│   │   │   └── SearchBar.jsx     # Debounced task search
│   │   ├── store/
│   │   │   ├── authStore.js      # Auth state (Zustand)
│   │   │   └── boardStore.js     # Board/list/task state (Zustand)
│   │   ├── services/
│   │   │   ├── api.js            # Fetch-based REST client
│   │   │   └── socket.js         # Socket.IO client wrapper
│   │   └── styles/
│   │       └── index.css         # Design system (CSS custom properties)
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## Frontend Architecture

### Routing & Auth Guards

```
/login       → PublicRoute  → Login.jsx
/signup      → PublicRoute  → Signup.jsx
/boards      → PrivateRoute → Boards.jsx
/boards/:id  → PrivateRoute → BoardDetail.jsx
/*           → Redirect to /boards
```

`PrivateRoute` checks for a JWT token in the Zustand auth store; unauthenticated users are redirected to `/login`. `PublicRoute` redirects authenticated users to `/boards`.

### State Management (Zustand)

Two stores with clear separation of concerns:

**`authStore`** — Authentication state
- `token`, `user` — persisted to `localStorage`
- `login(email, password)` — calls API, stores token
- `signup(name, email, password)` — calls API, stores token
- `logout()` — clears state and localStorage

**`boardStore`** — Application state
- `boards[]`, `currentBoard`, `activities[]`, `searchResults`
- CRUD methods: `createBoard`, `createList`, `createTask`, `updateTask`, `deleteTask`, etc.
- Optimistic updates: `optimisticMoveTask()` for instant drag-and-drop feedback
- Real-time handlers: `handleTaskCreated`, `handleTaskMoved`, `handleTaskDeleted`, etc.

### Drag & Drop

Built with `@hello-pangea/dnd` (maintained fork of react-beautiful-dnd):
- Each `List` is a `<Droppable>` zone
- Each `TaskCard` is a `<Draggable>` item
- On drop: optimistic local state update → REST API call → server broadcasts to other clients
- If API call fails, state reverts via full board re-fetch

### Component Hierarchy

```
App
├── Login / Signup (auth pages)
├── Boards (board listing)
│   └── BoardCard (clickable card)
└── BoardDetail (kanban view)
    ├── Header (nav + logout)
    ├── SearchBar (debounced search with dropdown)
    ├── DragDropContext
    │   ├── KanbanList (Droppable)
    │   │   ├── TaskCard (Draggable)
    │   │   └── Add Task form
    │   └── Add List button
    ├── TaskModal (edit/delete overlay)
    └── ActivityPanel (slide-in sidebar)
```

### Design System

CSS custom properties for consistent theming:
- **Dark theme** with `#0f0f1a` base
- **Glassmorphism** cards with backdrop-filter blur
- **Gradient accents** using indigo/violet palette
- **Micro-animations**: card hover lift, modal slide-up, activity panel slide-in, loading spinner, error shake
- **Responsive**: breakpoints at 768px for mobile

---

## Backend Architecture

### Express Server

```
server.js
  ├── CORS middleware (allows frontend origins)
  ├── JSON body parser
  ├── Route registration
  │   ├── /api/auth     → auth.js
  │   ├── /api/boards   → boards.js
  │   ├── /api/lists    → lists.js
  │   ├── /api/tasks    → tasks.js
  │   └── /api/activity → activity.js
  ├── Socket.IO server (attached to HTTP server)
  └── Health check: GET /api/health
```

### Authentication Flow

1. **Signup**: Hash password with `bcryptjs` (10 salt rounds) → store user → return JWT
2. **Login**: Find user by email → compare password hash → return JWT
3. **Protected routes**: `authenticate` middleware extracts JWT from `Authorization: Bearer <token>` header, verifies with `jsonwebtoken`, attaches `req.userId`
4. **Token**: 7-day expiry, signed with `JWT_SECRET` from `.env`

### Authorization

Every board-related endpoint verifies membership via `BoardMember` table lookup before granting access. Only board owners can update/delete boards.

### Activity Tracking

All CRUD operations (create/update/move/delete tasks, create/delete lists, add members) automatically log to the `Activity` table with:
- Action type (created, updated, moved, deleted, assigned, added_member)
- Entity reference (type + ID)
- Human-readable description
- Performing user reference
- Board reference
- Timestamp

---

## Database Schema & Indexing

### Entity-Relationship Diagram

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│   User   │────→│ BoardMember  │←────│  Board   │
│──────────│     │──────────────│     │──────────│
│ id (PK)  │     │ id (PK)      │     │ id (PK)  │
│ name     │     │ boardId (FK) │     │ title    │
│ email (U)│     │ userId (FK)  │     │ desc     │
│ passHash │     │ role         │     │ ownerId  │
│ createdAt│     │ (UK: b+u)    │     │ created  │
└──────────┘     └──────────────┘     │ updated  │
      │                                └──────────┘
      │                                     │
      │          ┌──────────┐          ┌──────────┐
      │          │   Task   │←─────────│   List   │
      │          │──────────│          │──────────│
      └─────────→│ id (PK)  │          │ id (PK)  │
   (assignee)    │ title    │          │ title    │
                 │ desc     │          │ position │
                 │ position │          │ boardId  │
                 │ priority │          └──────────┘
                 │ dueDate  │
                 │ listId   │          ┌──────────┐
                 │ assignee │          │ Activity │
                 │ created  │          │──────────│
                 │ updated  │          │ id (PK)  │
                 └──────────┘          │ action   │
                                       │ entity   │
                                       │ details  │
                                       │ userId   │
                                       │ boardId  │
                                       │ createdAt│
                                       └──────────┘
```

### Models (6 tables)

| Model | Key Fields | Relationships |
|-------|-----------|---------------|
| **User** | id, name, email (unique), passwordHash | → BoardMember, → Task (assignee), → Activity |
| **Board** | id, title, description, ownerId | → BoardMember, → List, → Activity |
| **BoardMember** | id, boardId, userId, role | Unique constraint: (boardId, userId) |
| **List** | id, title, position, boardId | → Task |
| **Task** | id, title, description, position, priority, dueDate, listId, assigneeId | |
| **Activity** | id, action, entityType, entityId, details, userId, boardId | |

### Indexing

- `User.email` — **Unique index** for fast login lookups
- `BoardMember.(boardId, userId)` — **Composite unique index** for O(1) membership checks
- `Board.ownerId` — Foreign key index for owner-based queries
- `List.boardId` — Foreign key index for fetching lists by board
- `Task.listId` — Foreign key index for fetching tasks by list
- `Task.assigneeId` — Foreign key index for assignee-based queries
- `Activity.boardId` — Foreign key index for board activity timeline
- Prisma auto-creates indexes on all foreign key columns in SQLite

### Cascade Deletes

- Deleting a Board → deletes all BoardMembers, Lists, Activities
- Deleting a List → deletes all Tasks
- Deleting a User (assignee) → sets Task.assigneeId to NULL

---

## API Documentation

All endpoints (except auth) require `Authorization: Bearer <jwt_token>` header.

### Authentication

| Method | Endpoint | Body | Response | Status |
|--------|----------|------|----------|--------|
| POST | `/api/auth/signup` | `{ name, email, password }` | `{ token, user }` | 201 |
| POST | `/api/auth/login` | `{ email, password }` | `{ token, user }` | 200 |
| GET | `/api/auth/me` | — | `{ user }` | 200 |

### Boards

| Method | Endpoint | Body / Query | Response | Status |
|--------|----------|-------------|----------|--------|
| GET | `/api/boards` | — | `{ boards[] }` | 200 |
| POST | `/api/boards` | `{ title, description? }` | `{ board }` | 201 |
| GET | `/api/boards/:id` | — | `{ board }` (with lists, tasks, members) | 200 |
| PUT | `/api/boards/:id` | `{ title?, description? }` | `{ board }` | 200 |
| DELETE | `/api/boards/:id` | — | `{ message }` | 200 |
| POST | `/api/boards/:id/members` | `{ email }` | `{ member }` | 201 |
| GET | `/api/boards/:id/tasks` | `?search=&page=1&limit=20` | `{ tasks[], pagination }` | 200 |

### Lists

| Method | Endpoint | Body | Response | Status |
|--------|----------|------|----------|--------|
| POST | `/api/lists/:boardId` | `{ title }` | `{ list }` | 201 |
| PUT | `/api/lists/:id` | `{ title?, position? }` | `{ list }` | 200 |
| DELETE | `/api/lists/:id` | — | `{ message }` | 200 |

### Tasks

| Method | Endpoint | Body | Response | Status |
|--------|----------|------|----------|--------|
| POST | `/api/tasks/:listId` | `{ title, description?, priority?, assigneeId?, dueDate? }` | `{ task }` | 201 |
| PUT | `/api/tasks/:id` | `{ title?, description?, priority?, assigneeId?, listId?, position? }` | `{ task }` | 200 |
| DELETE | `/api/tasks/:id` | — | `{ message }` | 200 |

### Activity

| Method | Endpoint | Query | Response | Status |
|--------|----------|-------|----------|--------|
| GET | `/api/activity/:boardId` | `?page=1&limit=20` | `{ activities[], pagination }` | 200 |

### Error Responses

```json
{ "error": "Error message string" }
```

| Status | Meaning |
|--------|---------|
| 400 | Validation error (missing required fields) |
| 401 | Authentication required or invalid token |
| 403 | Access denied (not a board member / not owner) |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, already a member) |
| 500 | Internal server error |

### Pagination Response Format

```json
{
  "tasks": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

---

## Real-Time Synchronization Strategy

### Transport

- **Socket.IO** over WebSockets with automatic long-polling fallback
- Connected on the same HTTP server as Express (port 3001)

### Authentication

- Clients send JWT token during socket handshake (`socket.handshake.auth.token`)
- Server-side middleware verifies the token before allowing connection

### Room-Based Broadcasting

Each board is a Socket.IO **room** (`board:{boardId}`):

```
Client opens board → socket.emit('board:join', boardId)
Client leaves board → socket.emit('board:leave', boardId)
```

### Event Flow

```
1. Client makes REST API call (e.g., create task)
2. Server persists change to database
3. Server logs activity to Activity table
4. Server broadcasts Socket.IO event to the board room
5. All connected clients receive the event
6. Each client's socket handler updates the Zustand store
7. React re-renders the affected components
```

### Events Emitted by Server

| Event | Payload | Trigger |
|-------|---------|---------|
| `task:created` | `{ task, boardId }` | Task created |
| `task:updated` | `{ task, boardId }` | Task edited |
| `task:moved` | `{ task, boardId, previousListId }` | Task moved across lists |
| `task:deleted` | `{ taskId, listId, boardId }` | Task deleted |
| `list:created` | `{ list, boardId }` | List created |
| `list:deleted` | `{ listId, boardId }` | List deleted |
| `member:added` | `{ member, boardId }` | New member added |

### Optimistic Updates

For drag-and-drop, the client uses **optimistic updates**:
1. Immediately update local state (move the card visually)
2. Send API request in the background
3. If the request fails, revert by re-fetching the board

---

## Testing

### Running Tests

```bash
# Ensure backend is running first
cd backend
npm run dev

# In another terminal
cd backend
npm test
```

### Test Coverage

**Integration tests** (Vitest) covering:
- ✅ User signup (success + duplicate email rejection)
- ✅ User login (success + wrong password rejection)
- ✅ Protected route access (authenticated + unauthenticated)
- ✅ Board creation
- ✅ Board listing
- ✅ Board detail retrieval
- ✅ List creation

---

## Assumptions & Trade-offs

### Assumptions

1. **Single-server deployment**: The app is designed to run on a single server instance. Socket.IO rooms work in-memory, sufficient for demo/small team use.
2. **SQLite for portability**: Chosen for zero-config setup. No external database service needed. Data persists in a single file (`dev.db`).
3. **Email-based user lookup**: Users are identified by email; usernames are display-only.
4. **Board-level access control**: Any board member can create/edit/delete lists and tasks within a board. Only the board owner can delete the board itself.
5. **No file uploads**: Task attachments are out of scope for this version.
6. **No email/notification service**: Real-time notifications happen only via WebSocket for currently connected users.

### Trade-offs

| Decision | Trade-off |
|----------|-----------|
| **SQLite over PostgreSQL** | Zero setup complexity, but lacks concurrent write performance and advanced query features. Easily migratable via Prisma. |
| **JWT over sessions** | Stateless and horizontally scalable, but tokens can't be revoked before expiry without a blacklist. |
| **Optimistic drag-and-drop** | Instant visual feedback, but requires fallback re-fetch if API fails. Position conflicts possible with concurrent edits. |
| **Socket.IO over raw WebSocket** | Built-in reconnection, rooms, and fallback transport, but adds ~40KB to the client bundle. |
| **Zustand over Redux** | Minimal boilerplate and simpler API, but less ecosystem tooling (devtools, middleware). |
| **CSS custom properties over Tailwind** | Full design control and smaller bundle, but more manual styling effort. |
| **Vitest integration tests over unit tests** | Tests real API behavior end-to-end, but requires a running server. |
| **No TypeScript** | Faster development velocity for this scope, but loses compile-time type safety. |

---

## Scalability Considerations

| Concern | Current | Production Path |
|---------|---------|-----------------|
| **Database** | SQLite (single file) | Swap to PostgreSQL via `prisma/schema.prisma` datasource change |
| **WebSocket scaling** | In-memory rooms | Add Socket.IO Redis adapter for multi-server broadcasts |
| **Horizontal scaling** | Single instance | Stateless JWT auth + Redis adapter enables multiple instances behind a load balancer |
| **API pagination** | All list endpoints paginated | Cursor-based pagination for very large datasets |
| **Search** | SQL LIKE queries | Full-text search with PostgreSQL `tsvector` or Elasticsearch |
| **File storage** | Not implemented | S3/R2 for attachments with presigned URLs |
| **Deployment** | Local dev | Backend → Railway/Render, Frontend → Vercel/Netlify |
| **Rate limiting** | Not implemented | Express rate-limit middleware |
| **Caching** | None | Redis for hot data (board state, user sessions) |

---

## Features Checklist

- ✅ User authentication (signup/login with JWT)
- ✅ Create, view, update, and delete boards
- ✅ Create, update, and delete lists with auto-positioning
- ✅ Create, edit, delete tasks with priority and assignee
- ✅ Drag and drop tasks across lists (optimistic updates)
- ✅ Real-time updates via WebSockets (Socket.IO rooms)
- ✅ Activity history tracking per board (all operations logged)
- ✅ Task search with debounced input and pagination
- ✅ Add board members by email
- ✅ Board-level authorization / access control
- ✅ Premium dark-theme UI with glassmorphism and micro-animations
- ✅ Responsive design (mobile-friendly)
- ✅ Backend integration tests (Vitest)
- ✅ Deployment-ready project structure

---

## License

MIT
