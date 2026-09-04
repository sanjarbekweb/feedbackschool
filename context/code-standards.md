# Code Standards

## General

- Keep modules small and single-purpose; keep business logic out
  of Telegram handlers and HTTP controllers — both call into
  shared services (e.g. `ConversationService`), which call the
  repository/Prisma layer.
- Fix root causes, do not layer workarounds.
- Do not mix unrelated concerns in one component, route, or
  Telegram handler.
- Treat message content as sensitive at every layer — never log
  it into ordinary application logs, audit logs, or Telegram group
  notifications.
- No unnecessary abstractions, and no premature microservices.

## TypeScript

- Strict mode is required throughout the project (both
  `apps/backend` and `apps/frontend`).
- Avoid `any` — use explicit interfaces or narrowly scoped types.
- Validate unknown external input (API request bodies, Telegram
  update payloads) at system boundaries before trusting it, using
  Zod or `class-validator` DTOs.
- Shared domain types (`UserRole`, `ConversationStatus`,
  `Message`, `Conversation`, API response/pagination types) live
  in `packages/types` and must never be duplicated independently
  in the frontend and backend.

## NestJS (backend)

- Organize by feature module: `auth/`, `users/`, `conversations/`,
  `messages/`, `telegram/` (`student/`, `staff/`, `keyboards/`,
  `handlers/`), `notifications/`, `statistics/`, `audit/`,
  `realtime/`, `database/`, `common/`.
- Use guards for RBAC and ownership checks on every protected
  endpoint — never trust a role or ownership claim from the client.
- Use DTOs and validation pipes for all request input.
- Use interceptors/exception filters for consistent response and
  error shapes.
- Telegram handlers call application services (e.g.
  `ConversationService`); they never query Prisma directly.

```text
Telegram Handler          REST Controller
       ↓                        ↓
ConversationService  ==  ConversationService
       ↓                        ↓
Repository / Prisma      Repository / Prisma
```

## Next.js (frontend, App Router)

- Default to server components; add `use client` only when browser
  interactivity (forms, realtime subscriptions, Motion animations)
  requires it.
- Keep route handlers/pages focused on a single responsibility.
- Data fetching goes through TanStack Query against the backend
  REST API — never direct database access from the frontend.
- Forms use React Hook Form + Zod validation.
- Route structure: `login/`, `dashboard/` with `conversations/`,
  `unanswered/`, `answered/`, `students/`, `statistics/`,
  `settings/`.

## Styling

- Use the CSS custom property tokens defined in `ui-context.md` —
  no hardcoded hex values in components.
- Follow the border radius scale and color hierarchy defined in
  `ui-context.md`.
- Tailwind CSS + shadcn/ui components live in `components/ui/`;
  use the shadcn CLI to add new components rather than writing
  them from scratch.

## Motion

- Use `motion` (Motion for React), imported as
  `import { motion, AnimatePresence } from "motion/react"` — not
  the legacy `framer-motion` package.
- Animate `transform`, `opacity`, `scale`, and `layout` only; avoid
  continuously animating `width`, `height`, `top`, `left`,
  `margin`, or `padding`.
- Use `layoutId` for shared visual indicators (e.g. the active
  sidebar nav item) instead of recreating them on every navigation.
- Respect `prefers-reduced-motion` via `useReducedMotion`.
- Keep animation subtle — this is a psychology product, not an
  entertainment product. Target roughly 80% static UI, 15%
  micro-interactions, 5% expressive animation.

## API Routes

- Validate and parse request input (DTO + Zod/class-validator)
  before any logic runs.
- Enforce auth and ownership before any mutation — a student's
  request for a conversation must confirm they own it; staff/admin
  requests check role.
- Return consistent, predictable response shapes and structured
  error formats.
- Apply rate limiting (NestJS throttler) and request size limits.
- Use pagination on all list endpoints (conversations, messages,
  students).

## Data and Storage

- Metadata, relationships, and message content all belong in
  PostgreSQL via Prisma — there is currently no separate blob/file
  store.
- Use database indexes on: `users.telegramId`,
  `conversations.status`, `conversations.studentId`,
  `conversations.lastMessageAt`, `messages.conversationId`,
  `messages.createdAt`.
- Use transactions when multiple related records must change
  atomically.
- Use foreign keys with appropriate cascading rules.
- Avoid N+1 queries — use Prisma `include`/`select` deliberately.

## File Organization

- `apps/backend/src/` — NestJS modules (see NestJS section above)
- `apps/backend/prisma/` — Prisma schema and migrations
- `apps/frontend/app/` — Next.js App Router routes (`login/`,
  `dashboard/` with `inbox/`, `unanswered/`, `answered/`,
  `conversations/[id]/`, `students/`, `statistics/`, `settings/`)
- `apps/frontend/components/` — `dashboard/`, `conversation/`,
  `sidebar/`, `ui/` (shadcn components)
- `apps/frontend/lib/` — `api.ts`, `auth.ts`, `sse.ts`
- `packages/types/` — shared TypeScript types used by both apps
