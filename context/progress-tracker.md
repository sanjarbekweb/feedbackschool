# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 1 — Foundation & Specs (COMPLETED)

## Current Goal

- Begin Phase 2 in `plan.md`: Backend Foundation (NestJS modules, Prisma migrations, auth & RBAC guards, REST endpoints, audit logging, and frontend login scaffolding).

## Completed

- Monorepo scaffold initialized with pnpm workspaces (`apps/backend`, `apps/frontend`, `packages/types`), root `package.json`, `.gitignore`, and base strict TypeScript configuration (`tsconfig.base.json`).
- `@psychology/types` package created and verified with full domain types (`UserRole`, `ConversationStatus`, `SenderType`, `ConversationCategory`), entities (`User`, `Conversation`, `Message`, `AuditLog`), pagination types, API contracts, and SSE event schemas.
- PostgreSQL Prisma schema created in `apps/backend/prisma/schema.prisma` with all required indexes (`telegramId`, `status`, `studentId`, `lastMessageAt`, `conversationId`, `createdAt`, `actorId, createdAt`, `targetId`) and validated via `prisma validate`.
- API contract & auth design documented in `context/api-contract-and-auth.md`.
- Telegram bot state flows for both student and staff bots documented in `context/telegram-state-flows.md`.
- Frontend Next.js App Router route structure confirmed.

## In Progress

- None (Phase 1 complete, waiting to start Phase 2).

## Next Up

- Phase 2 — Backend Foundation (see `plan.md`)

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
