# School Psychology Support System

## Overview

A system that lets school students privately contact psychology
staff over Telegram, and lets psychology staff manage and respond
to those conversations from either Telegram or a secure web
dashboard. The Telegram bot and the dashboard never talk to each
other directly — both go through a single backend + PostgreSQL
database, so there is exactly one source of truth for every
conversation. The product is treated as a production system for a
real school deployment, not a prototype, because it carries
sensitive student communications.

## Goals

1. Give students a private, low-friction channel to reach
   psychology staff via Telegram, without needing to create an
   account or learn a new tool.
2. Give psychology staff a fast, reliable way to triage and
   respond to unanswered cases — from Telegram on the go, or from
   a more powerful web dashboard.
3. Guarantee one source of truth (PostgreSQL + backend services)
   so Telegram and the website can never diverge or duplicate
   state, and so authorization is enforced consistently everywhere.

## Core User Flow

1. Student opens the Telegram bot and selects "Send a message."
2. Student writes their message; the backend creates or updates a
   conversation ("case") and stores the message in PostgreSQL,
   generating a non-sensitive case ID (e.g. `#A81F42`).
3. The backend notifies authorized psychology staff — a Telegram
   group notification containing only the case ID, category,
   status, and timestamp (never the message content) — and pushes
   a realtime event to the staff dashboard.
4. Staff open the case from Telegram or the dashboard, read the
   full conversation history, and respond.
5. The backend stores the response as a new message, updates the
   conversation status, and notifies the student on Telegram.
6. The student can open "My messages" at any time to see case
   status, read the response, and continue the conversation.

## Features

### Student Telegram Bot

- Main menu: `[📝 Send a message]` `[📨 My messages]`
- Conversations are modeled as cases (a thread of messages), not
  isolated one-off messages
- A student can see only their own conversations, never another
  student's
- Each case shows status (⏳ Unanswered / 💬 Response available /
  🔒 Closed) and full message history
- Students can continue an existing conversation after a response

### Staff Telegram Bot

- Main menu: `[📥 All messages]` `[⏳ Unanswered]` `[✅ Answered]`
  `[👥 Students]` `[📊 Statistics]`
- Browse and filter conversations, open a case, view full history
- Respond directly from Telegram, mark a case answered, close a case
- Staff authorization is based on the staff member's immutable
  Telegram user ID (via an admin-controlled mapping), never on
  Telegram username

### Staff Web Dashboard (primary management interface)

- Secure login (session/JWT-based)
- Dashboard home: total / unanswered / answered / closed counts,
  recent submissions, response-time statistics
- Conversation list: pagination, status and category filtering,
  search, sort by newest/oldest, unread indicators
- Conversation detail: full message timeline, response composer,
  mark answered, close conversation
- Students section, Statistics section, Settings
- Realtime updates (SSE) — new messages and status changes appear
  without a manual refresh

### Backend / Shared

- One REST API + PostgreSQL database is the sole source of truth
  for both the Telegram bots and the dashboard
- The student bot and staff bot run inside the backend but call
  the same shared application services as the REST API — no
  duplicated business logic
- Notification service posts case-ID-only alerts to the staff
  Telegram group (no message content)
- Audit logging of staff actions on cases (who / what / when /
  which case) — never the message content itself

## Scope

### In Scope

- Student Telegram bot (send message, view own case history)
- Staff Telegram bot (browse, filter, respond, mark answered, close)
- Staff web dashboard (browse, filter, respond, statistics, settings)
- Single backend + PostgreSQL as source of truth for both clients
- Realtime dashboard updates via SSE
- Role-based access control (STUDENT / STAFF / ADMIN) enforced
  server-side
- Audit logging of staff access/actions on cases
- Privacy-conscious notifications (case ID only, no content, in
  the staff group)

### Out of Scope (for now)

- Kubernetes, microservices, Kafka, or other heavy infrastructure
  — this is a modular monolith sized for a school-scale workload
- A native mobile app (the architecture allows adding one later as
  another client of the same backend API)
- Public self-service sign-up outside the school — access is
  Telegram-ID-based and admin-controlled
- Storing full sensitive message content in the staff Telegram
  group chat

## Success Criteria

1. A student can send a message on Telegram and see it appear as
   a case with a generated case ID.
2. Psychology staff receive a notification containing only the
   case ID, category, status, and timestamp, and can open, read,
   and respond to the case from either Telegram or the dashboard.
3. A student can never access another student's conversation, and
   staff/admin access is enforced server-side by role — never
   inferred from the frontend or the Telegram client.
4. A response given from either Telegram or the website reaches
   the student and is reflected identically in both interfaces
   (single source of truth — no independent or divergent state).
5. The dashboard reflects new messages and status changes in real
   time via SSE, without requiring a manual page refresh.
