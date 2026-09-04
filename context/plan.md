# Development Plan

Five phases, each spanning both `apps/backend` and `apps/frontend`
where relevant. Work through them in order — do not start a later
phase until the current one's checklist is complete (see
`context/ai-workflow-rules.md` and the `production-quality`
skill's quality gate, which applies at the end of every phase).

---

## Phase 1 — Foundation & Specs

Analyze requirements and lock down the specs before writing
application code.

**Backend**
- Confirm the monorepo scaffold: `apps/backend`, `apps/frontend`,
  `packages/types`.
- Design the Prisma schema (`User`, `Conversation`, `Message`,
  `AuditLog`) per `context/architecture.md`.
- Design the API contract (`context/architecture.md`'s API
  surface) and the authentication design (staff session/JWT,
  Telegram ID verification for bot users).
- Design the Telegram state flows for both bots (see the
  `telegram-workflow` skill).

**Frontend**
- Confirm the Next.js App Router route structure: `login/`,
  `dashboard/` with `inbox/`, `unanswered/`, `answered/`,
  `conversations/[id]/`, `students/`, `statistics/`, `settings/`.
- Confirm the shared types needed in `packages/types`
  (`UserRole`, `ConversationStatus`, `Message`, `Conversation`,
  API response/pagination types).

**Exit criteria**
- Prisma schema drafted and reviewed against `architecture.md`.
- API contract and auth design written down (in `architecture.md`
  or a linked doc).
- Telegram state flows for student and staff bots are specified.
- `progress-tracker.md` updated to reflect Phase 1 complete.

---

## Phase 2 — Backend Foundation

**Backend**
- Set up the NestJS app and modules: `auth/`, `users/`,
  `conversations/`, `messages/`, `notifications/`, `statistics/`,
  `audit/`, `realtime/`, `database/`, `common/`.
- Implement Prisma migrations for the Phase 1 schema, with the
  indexes listed in `architecture.md`.
- Implement authentication (staff login) and RBAC guards
  (`STUDENT` / `STAFF` / `ADMIN`), enforcing ownership checks per
  the `privacy-security` skill.
- Implement the core REST endpoints: `auth`, `conversations`,
  `messages`, with DTO validation and pagination.
- Implement the audit logging service (who/what/when/which case —
  never message content).
- Add a health endpoint and structured (Pino) logging that never
  logs message content.

**Frontend**
- Scaffold the Next.js app with Tailwind + shadcn/ui and the
  design tokens from `ui-context.md`.
- Build the login page against the new `auth` endpoints.

**Exit criteria**
- `npm run build` passes for `apps/backend`.
- Core CRUD endpoints for conversations/messages work and enforce
  RBAC + ownership server-side.
- Audit logging records staff actions without message content.
- Staff can log in from the frontend against the real backend.

---

## Phase 3 — Telegram Bots

**Backend**
- Implement the student Telegram bot: `/start` menu, "Send a
  message" flow (create/update conversation, generate case ID,
  notify staff), and "My messages" (paginated, own-conversations
  only).
- Implement the staff Telegram bot: `/start` menu, All/Unanswered/
  Answered lists (paginated), conversation view, Respond/Mark
  answered/Close actions.
- Implement staff Telegram authorization via Telegram user ID
  (admin-controlled mapping), never username.
- Implement the staff group notification (case ID, category,
  status, timestamp only — no content).
- Ensure all Telegram handlers call the same application services
  used by the REST API (no duplicated business logic).

**Frontend**
- No required frontend work this phase, but keep the conversation
  detail page's data model in sync with whatever the bots produce
  (statuses, message shape).

**Exit criteria**
- A student can send a message on Telegram and receive a case ID.
- Staff receive a privacy-safe group notification and can open,
  read, and respond to the case from the staff bot.
- A student cannot access another student's conversation via the
  bot; an unauthorized Telegram user cannot access staff functions.

---

## Phase 4 — Web Dashboard

**Frontend**
- Build the dashboard home: total/unanswered/answered/closed
  counts, recent submissions, response-time statistics.
- Build the conversation list: pagination, status/category
  filtering, search, sort, unread indicators.
- Build the conversation detail view: message timeline, response
  composer, mark answered, close conversation.
- Build the Students, Statistics, and Settings pages.
- Apply the full design system from `ui-context.md` and the
  `psychology-ui-system` skill (white-first surfaces, blue
  hierarchy, Motion for page/list/message transitions, the
  sidebar `layoutId` indicator, reduced-motion support).
- Wire up TanStack Query against the backend REST API and React
  Hook Form + Zod for the response composer and any forms.

**Backend**
- Implement the `GET /api/events` SSE endpoint and the
  `statistics` endpoint needed by the dashboard.
- Ensure a response submitted from the website flows through
  `ConversationService` and triggers the same student Telegram
  notification as a Telegram-originated response.

**Exit criteria**
- Staff can fully triage and respond to cases from the dashboard
  alone.
- New messages and status changes appear on the dashboard in real
  time via SSE, without a manual refresh.
- A response from the website reaches the student on Telegram, and
  a response from Telegram appears correctly on the dashboard
  (single source of truth verified both directions).

---

## Phase 5 — Integration, Security & Deployment

**Backend & Frontend**
- Run the full quality gate from the `production-quality` skill
  end to end (cross-Telegram/website consistency, RBAC/ownership,
  pagination, auth, rate limiting, error/loading/empty states,
  mobile/desktop UI, reduced motion, keyboard navigation).
- Run a security pass against the `privacy-security` skill's
  threat list (IDOR, XSS, SQL injection, CSRF, privilege
  escalation, broken access control, Telegram spoofing, student
  identity enumeration).
- Verify no secrets are committed to Git and all secrets are
  environment-based.
- Review indexes, pagination, and query patterns for N+1 issues.
- Configure production environment variables, health endpoint, and
  graceful shutdown for `apps/backend`.
- Configure `NEXT_PUBLIC_API_URL` and other required environment
  variables for `apps/frontend`.

**Deployment**
- Deploy `apps/backend` + PostgreSQL to Railway (production
  environment, Telegram webhook configured).
- Deploy `apps/frontend` to Vercel.
- Confirm separate development and production configuration for
  both apps.

**Exit criteria**
- Every item in the `production-quality` skill's quality gate is
  verified.
- The system is deployed and reachable in production on Railway
  (backend + DB) and Vercel (frontend).
- `context/progress-tracker.md` is updated to reflect the project
  as complete, with any remaining open questions carried forward.
