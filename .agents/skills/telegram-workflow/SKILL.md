---
name: telegram-workflow
description: Defines the student and staff Telegram bot flows, keyboards, pagination, and notification conventions for the psychology support system.
---

# Telegram Workflow

## Student bot

### `/start`

```text
Welcome.

This is the school's psychology support system.

Your messages are handled by authorized psychology staff.

What would you like to do?
```

Buttons:

```text
[📝 Send a message]
[📨 My messages]
```

### Send message flow

1. Student selects "Send a message."
2. Bot asks the student to write their message.
3. Validate the message.
4. Create a conversation ("case") if one doesn't already apply.
5. Store the message in PostgreSQL via `ConversationService`.
6. Generate a non-sensitive case ID (e.g. `#A81F42`).
7. Notify authorized psychology staff (case ID only — see the
   `privacy-security` skill).
8. Confirm to the student:

```text
Your message has been received.

Case: #A81F42

A member of the psychology staff will review it.
```

### "My messages" flow

Show only conversations belonging to the authenticated Telegram
user, paginated:

```text
📨 My messages

#A81F42 — ⏳ Unanswered
#A81F21 — 💬 Response available
#A80F19 — 🔒 Closed
```

Selecting a case shows its full message history. Never expose
another student's conversation, under any circumstance.

## Staff bot

### `/start`

```text
Psychology Staff Portal

[📥 All messages]
[⏳ Unanswered]
[✅ Answered]
[👥 Students]
[📊 Statistics]
```

Staff authentication must be based on the Telegram user ID plus
backend authorization (admin-controlled STAFF mapping) — never on
username alone.

### All / Unanswered / Answered

Paginated conversation lists using inline keyboards. Keep
individual messages small; never dump a huge unpaginated list.

### Conversation view

Display: case ID, student identifier (per school privacy policy),
category, status, timestamps, and message history.

Buttons:

```text
[💬 Respond]
[✅ Mark answered]
[🔒 Close]
[⬅️ Back]
```

When staff select "Respond," collect the reply, store it as a new
message via `ConversationService`, and update the conversation
status. The student must receive a Telegram notification:

```text
📩 You have received a response
from the psychology staff.

[View response]
```

## Staff group notifications

Post a notification to the authorized staff group whenever a
student submits a message. Never include message content — only
case ID, category, status, and timestamp (see the
`privacy-security` skill for the exact format).

## Shared rules

- Telegram handlers never contain business logic directly — they
  call the same application services used by the REST API (see
  the `psychology-system-architecture` skill).
- Use inline keyboards and pagination throughout; avoid oversized
  single messages.
- A response given via Telegram and a response given via the
  website must produce identical resulting state (same
  conversation, same message, same status) — there is one source
  of truth.
