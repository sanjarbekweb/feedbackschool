# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 2 — Backend Foundation (COMPLETED)

## Current Goal

- Begin Phase 3 in `plan.md`: Telegram Bots (Student Telegram Bot, Staff Telegram Bot, Telegram ID authorization, and privacy-safe group notifications).

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

## In Progress

- None (Phase 2 complete, waiting to start Phase 3).

## Next Up

- Phase 3 — Telegram Bots (see `plan.md`)

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
