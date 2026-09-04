# Architecture Context

## Stack

| Layer      | Technology                                              | Role                                                              |
| ---------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| Backend    | NestJS + TypeScript                                     | REST API, auth/RBAC, Telegram bots, notifications, statistics, audit |
| Frontend   | Next.js (App Router) + TypeScript                       | Staff web dashboard                                               |
| UI         | Tailwind CSS + shadcn/ui + Motion for React (`motion/react`) | Styling, component library, subtle animation                     |
| Database   | PostgreSQL + Prisma                                     | Single source of truth for users, conversations, messages, audit  |
| Telegram   | grammY (or Telegraf), run inside the backend            | Student bot + Staff bot interfaces                                |
| Realtime   | Server-Sent Events (SSE)                                | Push new messages / status changes to the dashboard               |
| Data layer | TanStack Query (frontend) + Prisma (backend)            | Fetching/caching on the client; typed queries on the server       |
| Forms      | React Hook Form + Zod                                   | Dashboard form handling and validation                            |
| Validation | Zod / class-validator                                   | Request DTO validation on the backend                             |
| Logging    | Pino                                                    | Structured logging (never message content)                        |
| Repo       | GitHub monorepo (`apps/backend`, `apps/frontend`, `packages/types`) | Independent deploys, shared types                     |
| Deployment | Railway (backend + PostgreSQL), Vercel (frontend)       | Hosting                                                            |

## System Boundaries

- `apps/backend` — NestJS app: REST API, the student and staff
  Telegram bots, auth/RBAC, the notification service, realtime
  (SSE), statistics, audit logging, and all Prisma/database
  access. This is the single source of truth; Telegram and the
  website are both clients of it and never talk to each other
  directly.
- `apps/frontend` — Next.js dashboard: login, conversation views,
  students, statistics, settings. Never talks to Telegram or the
  database directly — only via the backend's REST/SSE API.
- `packages/types` — shared TypeScript types (`UserRole`,
  `ConversationStatus`, `Message`, `Conversation`, API response
  and pagination types) consumed by both apps so they are never
  duplicated independently.
- `apps/backend/src/telegram/{student,staff,keyboards,handlers}` —
  owns all Telegram-specific UX (keyboards, callback queries,
  conversation state, pagination) but must call shared application
  services (e.g. `ConversationService`) rather than embedding
  business logic or querying Prisma directly.

## Storage Model

- **Database (PostgreSQL via Prisma)**: all metadata, ownership,
  relationships, and message content. There is currently no
  separate blob/file store — messages are text-only.

### Database Schema (minimum)

**users**
`id, telegramId (nullable for web-only staff), email (normalized, nullable for students), passwordHash (staff only), role (STUDENT | STAFF | ADMIN), isActive, credentialVersion, studentIdentifier, createdAt, updatedAt`

**conversations** (a.k.a. "cases")
`id, caseId, studentId, status (UNANSWERED | IN_PROGRESS | ANSWERED | CLOSED), category, createdAt, updatedAt, lastMessageAt`

**messages**
`id, conversationId, senderId, senderType, content, createdAt, readAt`

**audit_logs**
`id, actorId, action, targetType, targetId, metadata, createdAt`
(records *who did what, when, on which case* — never the message
content itself)

Indexes: `users.telegramId`, `conversations.status`,
`conversations.studentId`, `conversations.lastMessageAt`,
`messages.conversationId`, `messages.createdAt`.

## API Surface (REST)

```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/conversations              (supports ?status=, pagination, search)
GET    /api/conversations/:id
POST   /api/conversations
PATCH  /api/conversations/:id

GET    /api/conversations/:id/messages
POST   /api/conversations/:id/messages

GET    /api/statistics
GET    /api/events                     (SSE stream for realtime updates)
```

## Auth and Access Model

- Staff sign in to the web dashboard via secure, HTTP-only,
  session/JWT-based authentication.
- Staff web identities use a dedicated normalized email and bcrypt password hash.
  Plaintext passwords and bootstrap/default credentials are never stored or
  accepted. `credentialVersion` invalidates existing JWTs when credentials change.
- Telegram users (students and staff) are identified by their
  immutable Telegram user ID — never by username.
- Every user has a role: `STUDENT`, `STAFF`, or `ADMIN`, stored on
  the `users` table.
- Ownership: a conversation belongs to exactly one student; only
  that student (via their Telegram ID) or authorized staff/admin
  can access it.
- Access control is enforced server-side on every request — the
  frontend and the Telegram client are never trusted to decide
  authorization. E.g. `GET /api/conversations/:id` must confirm
  the requester is either the owning student or has `STAFF`/
  `ADMIN` role before returning anything.
- Staff Telegram access is authorized through an admin-controlled
  mapping of Telegram ID → `STAFF` role, never hardcoded usernames.

## Invariants

1. PostgreSQL and the backend are the single source of truth —
   Telegram and the website must never maintain independent or
   divergent state, or separate message databases.
2. A student can only ever read or write conversations they own;
   staff/admin authorization is always re-checked server-side,
   never inferred from the frontend or the Telegram client.
3. Sensitive message content is never sent to the staff Telegram
   group notification, written into ordinary application logs, or
   written into `audit_logs` — only case ID, category, status, and
   timestamps are ever exposed there.
4. Business logic lives in shared application services (e.g.
   `ConversationService`), called identically by REST controllers
   and Telegram handlers — it is never duplicated or embedded
   directly in a controller or a Telegram handler.
5. Any state-changing action (respond, mark answered, close) has
   its transition validated server-side; conversation status is
   never set arbitrarily from the frontend.
6. Do not introduce Redis, Kafka, microservices, or Kubernetes
   without a demonstrated need — this is a modular monolith sized
   for a school-scale workload (indexes + pagination + connection
   pooling + async notifications are sufficient).
