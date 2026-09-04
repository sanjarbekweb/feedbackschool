---
name: production-quality
description: Defines the development process discipline and the pre-completion quality gate for the psychology support system.
---

# Production Quality

This is a production-grade system for a real school deployment,
not a prototype. Follow this process discipline and quality gate
on every phase of `plan.md`.

## Development process discipline

- Do not generate the entire application in one pass.
- Inspect the existing implementation before modifying it; prefer
  small, verifiable changes over rewriting working code.
- Establish the backend/database foundation first, then Telegram
  functionality, then the frontend, then integration testing —
  following the phase order in `plan.md`.
- Use TypeScript strict mode, ESLint, and Prettier throughout.
- Write unit tests, integration tests, API tests, and Telegram
  handler tests where practical.

## Quality gate

Before declaring any phase — or the project — complete, verify:

- A student cannot access another student's conversations.
- Unauthorized Telegram users cannot access staff functions.
- Staff can see all conversations they are authorized for.
- Student messages appear correctly in PostgreSQL.
- Staff receive a Telegram notification for new submissions.
- The dashboard receives a realtime notification for new
  submissions.
- Staff can respond from Telegram.
- Staff can respond from the website.
- Students receive responses regardless of which channel staff
  used.
- Answered/unanswered filtering works correctly.
- Conversation history remains consistent across Telegram and the
  website.
- Pagination works on all list views (conversations, messages,
  students).
- Authentication works (dashboard login; Telegram ID verification).
- Authorization works (RBAC, ownership checks, server-side).
- Sensitive content is not unnecessarily logged (see the
  `privacy-security` skill).
- Secrets are not committed to Git.
- Rate limiting works.
- Database indexes exist as defined in `architecture.md`.
- Mobile UI works.
- Desktop UI works.
- Reduced-motion mode works.
- Keyboard navigation works.
- Error states are handled.
- Loading states are handled.
- Empty states are handled.

Do not call any phase — or the project — production-ready until
every applicable item above has been verified.

## Performance guidance

Optimize for fast response times using database indexes,
pagination, efficient Prisma queries, connection pooling,
asynchronous Telegram notifications, minimal payloads, and lazy
loading where appropriate. Do not introduce Redis, Kafka,
microservices, or Kubernetes unless a demonstrated need arises —
prefer a simple modular monolith (see the
`psychology-system-architecture` skill).
