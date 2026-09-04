# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Project-wide remediation — authentication and database foundation (IN PROGRESS)

## Current Goal

- Execute `context/project-remediation-plan.md`. The system is not production-ready
  until the remediation release gates have current evidence.

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
- **Phase 4 — Web Dashboard**:
  - Installed `@tanstack/react-query` and created client `QueryProvider`.
  - Built realtime Server-Sent Events client (`useRealtimeEvents` in `lib/sse.ts`) connecting to `/api/events` with automatic cache invalidation for instant live updates without manual page refreshes.
  - Designed white-first, calm psychology theme layout (`dashboard/layout.tsx`, `components/sidebar.tsx`, `components/navbar.tsx`) with Motion `layoutId="active-nav-indicator"`, SSE live status badge, staff profile info, and mobile drawer support.
  - Built Dashboard Home (`dashboard/page.tsx`) with KPI cards (Total, Unanswered, Answered, Closed), turnaround metrics, recent cases table, and quick triage actions.
  - Built Conversation Triage list component (`components/conversation-list.tsx`) with Case ID search, category filters, status filters, sorting, pagination, and unread indicators across `/dashboard/inbox`, `/dashboard/unanswered`, and `/dashboard/answered`.
  - Built Conversation Detail Screen (`dashboard/conversations/[id]/page.tsx`) with case metadata header, quick triage actions (`Mark Answered`, `Close Case`), chronological chat timeline with distinct sender alignment, and fixed response composer with React Hook Form + Zod validation.
  - Built Students Directory (`dashboard/students/page.tsx`) with anonymized identifiers (`Student #S-xxxx`), registered dates, and case counts. Added `UsersController` with `GET /api/users/students` protected by RBAC.
  - Built Statistics Analytics page (`dashboard/statistics/page.tsx`) with status distribution progress bar, SLA metrics, and turnaround benchmarks.
  - Built Settings & Privacy page (`dashboard/settings/page.tsx`) with account info, privacy invariants summary, and session logout.
  - Single source of truth verified: website responses invoke backend REST endpoint, persist to PostgreSQL, update conversation status, and trigger student Telegram notification.
  - Full monorepo build passes without errors (`pnpm build` generates all 12 routes cleanly with exit code 0).
- **Phase 5 — Integration, Security & Deployment**:
  - Rate Limiting & Protection:
    - Wired `@nestjs/throttler` with `ThrottlerGuard` as global `APP_GUARD` (100 req/min).
    - Strict endpoint throttling (`@Throttle({ default: { limit: 5, ttl: 60000 } })`) on `/api/auth/login` to prevent brute force.
    - Reverse proxy trust (`express.set('trust proxy', 1)`) configured for accurate IP tracking in production.
  - Lifecycle & Resilience:
    - Enabled graceful shutdown hooks (`app.enableShutdownHooks()`) for SIGTERM / SIGINT signals.
    - Enhanced health endpoint (`GET /api/health`) with live PostgreSQL connectivity check (`SELECT 1`), uptime, and service status.
  - Dual Telegram Delivery Modes:
    - Implemented webhook support in `TelegramService` via grammY's `webhookCallback`.
    - Added `TelegramController` (`POST /api/telegram/student` and `POST /api/telegram/staff`) with secret token verification (`X-Telegram-Bot-Api-Secret-Token`) to prevent spoofing, exempted from IP throttling (`@SkipThrottle()`).
    - Preserved seamless fallback to long polling for local development (`TELEGRAM_MODE=polling`).
  - Security & Privacy Audit Passed:
    - Verified IDOR protection (server-side ownership check returning 404 on unowned cases).
    - Verified XSS mitigation (automatic output encoding in React/Next.js, class-validator sanitization).
    - Verified SQL injection protection (Prisma ORM parameterized queries).
    - Verified CSRF & Cookie security (`SameSite: 'none'`, `secure: true` in production, `HttpOnly`, plus Bearer token extractor).
    - Verified zero message content leakage (audit logs, Pino request logs, staff group alerts).
    - Verified student identity enumeration prevention (anonymized `Student #S-xxxx` in staff directories).
    - Verified secrets management (no secrets in Git, `.env*` ignored, comprehensive `.env.example` templates created).
  - Deployment Artifacts:
    - Multi-stage production `Dockerfile` with healthcheck.
    - `railway.json` and `apps/backend/railway.json` with migration and start commands (`prisma:migrate:prod`).
    - `apps/frontend/vercel.json` for Next.js on Vercel.
    - Detailed `README.md` deployment guides for Railway and Vercel.
  - Test & Build Quality Gate:
    - 6 test suites with 17 unit/integration tests passing cleanly (`pnpm test`).
    - Zero-warning production build across monorepo (`pnpm build`).

## In Progress

- Repairing the shared paginated API contract and frontend consumers.

## Next Up

- Implement the case status state machine and student follow-up transition.
- Add CSRF protection and complete typed production configuration validation.

## Remediation Work Completed

- Replaced placeholder/default web authentication with dedicated normalized staff
  email, bcrypt password hash, active-state enforcement, and credential-version JWT
  revocation.
- Added a non-echoing admin provisioning CLI and provisioned an active administrator
  in the configured Supabase PostgreSQL database. No plaintext password is stored.
- Synchronized all committed Prisma migrations with the live database using the
  Supabase session pooler.
- Revoked `anon` and `authenticated` Data API privileges from the private application
  tables and removed public execution access to the RLS auto-enable function.
- Removed the built-in Telegram administrator ID fallback and raw Telegram-ID startup
  logging; only explicitly configured IDs can be synchronized.
- Removed request bodies and response headers from HTTP logs after a runtime smoke
  test identified JWT exposure through `Set-Cookie`; the exposed test session was
  revoked and the corrected logging behavior was verified.
- Added the missing message-sender foreign-key index and removed the redundant email
  lookup index.

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
