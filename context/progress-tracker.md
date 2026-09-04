# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 3 — Telegram Bots (COMPLETED)

## Current Goal

- Begin Phase 4 in `plan.md`: Web Dashboard (Full Staff Dashboard, conversations list, triage view, message composer, SSE live update integration, and Motion animations).

## Completed

- **Phase 1 — Foundation & Specs**: Monorepo pnpm workspaces, strict TypeScript bases, `@psychology/types`, PostgreSQL Prisma schema with required indexes, API contract & auth design, Telegram state flows spec.
- **Phase 2 — Backend Foundation**:
  - NestJS modular backend established (`apps/backend`): `database`, `common`, `audit`, `users`, `auth`, `conversations`, `messages`, `notifications`, `realtime`, `statistics`.
  - Database service (`PrismaService`) initialized and Prisma client generated.
  - Staff authentication via `AuthService` and `AuthController` issuing secure `HttpOnly` JWT cookie (`POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`).
  - Server-side RBAC & ownership protection via `JwtAuthGuard`, `RolesGuard`, and `ConversationOwnershipGuard` (throwing 404 on unowned conversations to prevent student IDOR and case enumeration).
  - Core CRUD REST endpoints implemented with strict DTO validation (`class-validator` / `class-transformer`): `/api/conversations`, `/api/conversations/:id/messages`, `/api/statistics`.
  - Privacy-preserving audit logging (`AuditService`) strictly filtering and stripping any sensitive message content before persistence.
  - Realtime SSE stream (`GET /api/events`) and health endpoint (`GET /api/health`).
  - Unit tests implemented with Jest verifying zero message leakage in audit logs, IDOR ownership prevention, and auth logic (all 3 test suites passed).
  - Frontend (`apps/frontend`): Next.js App Router scaffolded with Tailwind CSS design tokens from `ui-context.md`, typed API client, and calm, accessible staff login page (`/login`) with React Hook Form + Zod.
  - Clean builds verified across the monorepo (`pnpm run build` exits with code 0).
- **Phase 3 — Telegram Bots**:
  - Installed `grammy` and integrated modular Telegram architecture (`apps/backend/src/telegram`): `TelegramModule`, `TelegramService`, `StudentBotController`, `StaffBotController`, session management, and keyboards.
  - Student Telegram Bot (`student.bot.ts`):
    - `/start` menu with persistent reply keyboard (`📝 Send a message`, `📨 My messages`).
    - "Send a message" flow with 5 domain categories (`General Inquiry`, `Academic Stress`, `Personal / Emotional`, `Social / Relationships`, `Urgent Support`), text length limits (4000 chars), non-text reminders, Case ID generation (`#...`), and confirmation.
    - "My messages" flow: paginated case history (5 per page), case detail with chronological message history, follow-up messages.
    - Server-side ownership protection (preventing students from reading or writing other students' cases).
  - Staff Telegram Bot (`staff.bot.ts`):
    - Middleware enforcing immutable Telegram user ID authorization against `User.telegramId` with `STAFF` or `ADMIN` role. Unauthorized users blocked.
    - `/start` menu and paginated triage lists (`Unanswered`, `All`, `Answered`).
    - Case detail view with anonymized student identifier (`Student #S-xxxx`), category, timestamps, and message history.
    - Case actions: Respond (updating status to `ANSWERED`, audit logging, student notification), Mark Answered, Close Case.
    - Students directory and system overview statistics.
  - Privacy-Safe Staff Group Notifications (`NotificationsService`):
    - Automated group notification dispatched on case creation and follow-ups with Case ID, category, status, and timestamp only. Zero message body or student personal identifiers.
    - Student response notifications via bot with quick link to case history.
  - Architecture invariant enforced: handlers are thin adapters calling shared backend services (`ConversationsService`, `MessagesService`, `UsersService`, `StatisticsService`). Zero direct Prisma calls from handlers.
  - 12 comprehensive unit and integration tests passing (`pnpm test`).
  - Monorepo production build verified (`pnpm build` exits with code 0).

## In Progress

- None (Phase 3 complete, ready for Phase 4).

## Next Up

- Phase 4 — Web Dashboard (see `plan.md`)

## Open Questions & Resolved Defaults

- **Categories**: Initial taxonomy locked to `GENERAL`, `ACADEMIC`, `PERSONAL`, `SOCIAL`, `URGENT` in shared types and Prisma enum.
- **Student Privacy**: Staff dashboard will show anonymized student identifiers (e.g. `Student #S-8291`) instead of personal Telegram phone numbers or raw names.
- **Message format**: Text-only; media/attachments remain out of scope for school deployment.
- **Notification routing**: Single authorized staff Telegram group receiving case ID, category, status, and timestamp only (zero message body).

## Architecture Decisions

- Monorepo with `apps/backend` (NestJS) + `apps/frontend`
  (Next.js) + `packages/types`, deployed separately (Railway for
  backend + PostgreSQL, Vercel for frontend) so Telegram bot
  uptime is decoupled from dashboard deploys.
- A single PostgreSQL database is the sole source of truth for
  both Telegram and the website, to avoid divergent state.
- Conversations are modeled as cases (a thread of messages)
  instead of isolated one-off messages — this simplifies the
  Telegram UI, dashboard, unread state, and statistics.

## Session Notes

- This project was scoped from a detailed architecture discussion
  covering the Telegram bots, web dashboard, database schema, API
  design, security/privacy requirements, and the white-first blue
  design system with Motion. See `project-overview.md`,
  `architecture.md`, and `ui-context.md` for the full detail.
- Antigravity is the coding agent for this project; project-
  specific rules live under `.agents/skills/`. Read `AGENTS.md`
  before continuing any work.
