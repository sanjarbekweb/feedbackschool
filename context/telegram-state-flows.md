# Telegram State Flows Specification

This document specifies the exact state machines, user flows, inline keyboard structures, pagination rules, and notification formats for the **Student Telegram Bot** and **Staff Telegram Bot**, implementing the requirements defined in the `telegram-workflow` skill and `context/architecture.md`.

---

## 1. Architectural Invariant

All Telegram handlers are thin interface adapters. They:
1. Parse updates and callback queries.
2. Delegate business logic to backend application services (`ConversationService`, `MessageService`).
3. Render responses and keyboards.
4. **Never query Prisma directly**.

---

## 2. Student Telegram Bot

### 2.1 Main Menu (`/start`)
- **Trigger**: Command `/start` or navigating back to home.
- **Message Content**:
  ```text
  Welcome.

  This is the school's psychology support system.

  Your messages are handled privately by authorized psychology staff.

  What would you like to do?
  ```
- **Reply Keyboard**:
  ```text
  ┌─────────────────────────┐
  │  📝 Send a message      │
  ├─────────────────────────┤
  │  📨 My messages         │
  └─────────────────────────┘
  ```

### 2.2 "Send a Message" Flow
1. **Trigger**: Button `📝 Send a message`.
2. **Category Selection**:
   - Bot displays:
     ```text
     Please choose a category that best describes your request:
     ```
   - Inline Keyboard:
     ```text
     [ 💬 General Inquiry ]
     [ 📚 Academic Stress ]
     [ 💙 Personal / Emotional ]
     [ 👥 Social / Relationships ]
     [ 🚨 Urgent Support ]
     [ ❌ Cancel ]
     ```
3. **Message Input Prompt**:
   - Bot displays:
     ```text
     Please write your message below. Take your time.
     Your message is strictly confidential between you and the psychology team.
     ```
4. **Validation & Creation**:
   - Max length: 4000 characters. Text-only (photos/media prompt a polite text-only reminder).
   - Handlers invoke `ConversationService.createConversation({ studentTelegramId, category, initialMessage })`.
   - Backend creates `Conversation` record, generates non-sensitive Case ID (e.g. `#A81F42`), stores initial `Message`.
   - Asynchronous notification dispatched to authorized staff Telegram group and SSE stream.
5. **Confirmation to Student**:
   ```text
   Your message has been received.

   Case: #A81F42
   Category: Personal / Emotional
   Status: ⏳ Unanswered

   A member of the psychology staff will review it. You can check the status at any time in "My messages".
   ```

### 2.3 "My Messages" Flow
1. **Trigger**: Button `📨 My messages`.
2. **Conversation List (Paginated)**:
   - Handler queries `ConversationService.getStudentConversations(studentTelegramId, { page, limit: 5 })`.
   - Message Content:
     ```text
     📨 My messages (Page 1/1)
     Select a case to view history or continue the conversation:
     ```
   - Inline Keyboard:
     ```text
     [ #A81F42 — ⏳ Unanswered ]
     [ #A81F21 — 💬 Response available ]
     [ #A80F19 — 🔒 Closed ]
     [ ◀️ Prev ] [ 1/1 ] [ Next ▶️ ]
     [ 🏠 Main Menu ]
     ```
3. **Case Detail View**:
   - Displays Case ID, Status, Category, and chronological message timeline:
     ```text
     Case #A81F42
     Status: 💬 Response available
     Category: Personal / Emotional
     ────────────────────────
     🧑 You (Sep 4, 12:00):
     I have been feeling overwhelmed with exams lately.

     👩‍⚕️ Psychology Staff (Sep 4, 12:15):
     Thank you for reaching out. We are here to support you. Can we schedule a quiet time to chat tomorrow?
     ────────────────────────
     ```
   - Inline Keyboard:
     ```text
     [ 💬 Send Follow-up Message ] (if not closed)
     [ ⬅️ Back to My Messages ]
     ```

---

## 3. Staff Telegram Bot

### 3.1 Authorization Check
- On every interaction, handler checks user's Telegram ID against the database `User` table for role `STAFF` or `ADMIN`.
- If unauthorized:
  ```text
  ⛔ Access Restricted.
  This portal is exclusively for authorized school psychology staff.
  ```

### 3.2 Main Menu (`/start`)
- **Message Content**:
  ```text
  Psychology Staff Portal

  Manage student cases, view statistics, and review responses.
  ```
- **Inline Keyboard**:
  ```text
  ┌─────────────────────────┐
  │  ⏳ Unanswered Cases    │
  ├─────────────────────────┤
  │  📥 All Cases           │
  ├─────────────────────────┤
  │  ✅ Answered Cases      │
  ├─────────────────────────┤
  │  👥 Students            │
  ├─────────────────────────┤
  │  📊 Statistics          │
  └─────────────────────────┘
  ```

### 3.3 Case Lists (Paginated Triage)
- Filter options: `Unanswered`, `All`, `Answered`.
- Pagination: 5 cases per page via inline buttons.
- Display format:
  ```text
  ⏳ Unanswered Cases (Page 1/2)

  • #A81F42 | Personal | 12m ago
  • #A81F39 | Academic | 45m ago
  • #A81E99 | General  | 2h ago
  ```
- Inline Keyboard:
  ```text
  [ Open #A81F42 ]
  [ Open #A81F39 ]
  [ Open #A81E99 ]
  [ ◀️ Prev ] [ 1/2 ] [ Next ▶️ ]
  [ 🏠 Main Menu ]
  ```

### 3.4 Case Detail & Action View
- Displays: Case ID, student identifier (`Student #S-8291`), status, category, timestamps, and message timeline.
- Inline Keyboard:
  ```text
  [ 💬 Respond ]
  [ ✅ Mark Answered ]
  [ 🔒 Close Case ]
  [ ⬅️ Back to List ]
  ```

### 3.5 Staff Response Action
1. Staff clicks `💬 Respond`.
2. Bot enters conversation session state for that case:
   ```text
   Replying to Case #A81F42.
   Please send your response message:
   ```
3. Staff sends reply text.
4. Handler calls `ConversationService.addMessage({ conversationId, senderId, content, senderType: STAFF })`.
5. Backend updates conversation status to `ANSWERED`, writes audit log entry (`actorId, RESPONSE_SENT, targetId`), dispatches student notification.
6. Student receives on their Telegram bot:
   ```text
   📩 You have received a response from the psychology staff regarding Case #A81F42.

   [ 📨 View Response in My Messages ]
   ```

---

## 4. Staff Group Notifications (Zero Message Content Invariant)

Whenever a student creates a new case or sends a follow-up, an automated notification is posted to the private Staff Telegram Group.

### Notification Format:
```text
🔔 New psychology support request

Case: #A81F42
Category: Personal / Emotional
Status: ⏳ Unanswered
Received: 12:00 (Today)

Open in staff bot or dashboard to review and reply.
```

> [!IMPORTANT]
> **Strict Privacy Rule**: Under no circumstances is the student's message body, student's personal name, phone number, or Telegram handle sent to the group notification.
