---
name: psychology-system-architecture
description: Defines and enforces the monorepo layout, service boundaries, and single-source-of-truth rules for the school psychology support system.
---

# Psychology System Architecture

## Monorepo layout

```text
psychology-support/
├── .agents/
│   └── skills/
├── apps/
│   ├── backend/     (NestJS)
│   └── frontend/    (Next.js)
├── packages/
│   └── types/
├── context/
├── plan.md
├── AGENTS.md
└── package.json
```

Deploy `apps/backend` (+ PostgreSQL) to Railway and `apps/frontend`
to Vercel, but develop them in one Git repository.

## Non-negotiable architecture rule

The Telegram bots and the web dashboard must **never** communicate
directly with each other. Both are clients of the backend:

```text
Student Telegram Bot        Staff Web Dashboard
        │                           │
        └──────────► Backend ◄──────┘
                        │
                    PostgreSQL
                        │
                Staff Telegram Bot
```

There is exactly one source of truth: PostgreSQL, accessed only
through backend application services. Never create or maintain a
separate stateful store for Telegram vs. the website.

## Service layer pattern

Both the REST controllers and the Telegram handlers must call the
same application services (e.g. `ConversationService`,
`MessageService`, `NotificationService`), which are the only
callers of the Prisma repository layer. Do not put business logic
directly into a Telegram handler or an HTTP controller.

```text
Telegram Handler          REST Controller
       ↓                        ↓
ConversationService  ==  ConversationService
       ↓                        ↓
Repository / Prisma      Repository / Prisma
```

## Deployment shape

- `apps/backend` → Railway (runs the API, the Telegram bots, and
  the SSE realtime endpoint continuously)
- PostgreSQL → Railway PostgreSQL
- `apps/frontend` → Vercel

This split lets the frontend redeploy without ever restarting the
Telegram bot, and lets the backend scale independently.

## Sizing

This is a modular monolith for a school-scale workload. Do not
introduce Redis, Kafka, microservices, or Kubernetes unless a
demonstrated need appears — indexes, pagination, connection
pooling, and asynchronous notifications are the default toolkit.

## Data model shape

Model the domain as `Conversation` (a "case") containing many
`Message` records, not as isolated one-off messages. This keeps
the Telegram UI, the dashboard, unread-state tracking, and
statistics consistent across both clients.
