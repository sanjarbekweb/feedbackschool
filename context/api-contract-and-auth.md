# API Contract and Authentication Design

This document details the REST API surface, Server-Sent Events (SSE) realtime contract, and the authentication/authorization model for the School Psychology Support System (`feedbackschool`).

---

## 1. Authentication & Authorization Model

### 1.1 Web Dashboard (Staff & Admin)
- **Mechanism**: JWT stored in a secure, `HttpOnly`, `SameSite=Lax`, `Secure` (in production) cookie.
- **Payload**:
  ```json
  {
    "sub": "user-uuid",
    "role": "STAFF",
    "iat": 1725450000,
    "exp": 1725536400
  }
  ```
- **Session Duration**: 24 hours.
- **CSRF Protection**: Enforced on mutating state endpoints (`POST`, `PATCH`, `DELETE`).
- **Endpoints**:
  - `POST /api/auth/login`: Validates credentials, issues HttpOnly cookie.
  - `POST /api/auth/logout`: Clears the session cookie.
  - `GET /api/auth/me`: Returns `CurrentUser` representation of authenticated staff.

### 1.2 Telegram Bot Users (Students & Staff)
- **Identification**: Users are identified exclusively by their immutable **Telegram User ID** (`telegramId`).
- **Student Authorization**:
  - When a student initiates a Telegram conversation, their record in the `users` table is resolved or created with role `STUDENT`.
  - Student identity is tied strictly to `telegramId`.
- **Staff Authorization**:
  - Staff users are mapped via an admin-controlled database table/configuration mapping `telegramId` → `STAFF` or `ADMIN`.
  - Usernames (`@username`) are never trusted for authorization as they are mutable.

### 1.3 Server-Side Access Control & Invariants
- **Ownership Verification**:
  - `GET /api/conversations/:id` and `GET /api/conversations/:id/messages` verify whether the requesting user is the student owner (`conversation.studentId === currentUser.id`) OR possesses `STAFF` / `ADMIN` role.
  - If a student requests a conversation ID they do not own, return `404 Not Found` (or `403 Forbidden`) to prevent IDOR and case enumeration.
- **Zero Raw Message Logging**:
  - Audit logs record: `actorId`, `action`, `targetType`, `targetId`, `timestamp`, and non-sensitive metadata (e.g. `statusChangedFrom`, `statusChangedTo`).
  - Raw message text is NEVER stored in `audit_logs` or written to application log streams.

---

## 2. REST API Surface

### 2.1 Auth Endpoints

#### `POST /api/auth/login`
Staff login to the web dashboard.
- **Request Body**:
  ```json
  {
    "email": "staff@school.edu",
    "password": "secure-password"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "uuid-v4",
        "role": "STAFF",
        "studentIdentifier": null
      },
      "expiresAt": "2026-09-05T14:30:00.000Z"
    }
  }
  ```
- **Response `401 Unauthorized`**:
  ```json
  {
    "success": false,
    "error": {
      "code": "INVALID_CREDENTIALS",
      "message": "Invalid credentials provided."
    }
  }
  ```

#### `POST /api/auth/logout`
Clears session cookie.
- **Response `200 OK`**:
  ```json
  {
    "success": true
  }
  ```

#### `GET /api/auth/me`
Retrieves current authenticated profile.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid-v4",
      "role": "STAFF"
    }
  }
  ```

---

### 2.2 Conversations (`/api/conversations`)

#### `GET /api/conversations`
List conversations with pagination, status/category filtering, search, and sorting.
- **Access**: `STAFF`, `ADMIN` (or `STUDENT` restricted to own conversations).
- **Query Parameters**:
  - `status`: `UNANSWERED` | `IN_PROGRESS` | `ANSWERED` | `CLOSED` (optional)
  - `category`: `GENERAL` | `ACADEMIC` | `PERSONAL` | `SOCIAL` | `URGENT` (optional)
  - `search`: string (matches `caseId` e.g. `#A81F42`) (optional)
  - `page`: integer (default: `1`)
  - `limit`: integer (default: `20`, max: `100`)
  - `sortBy`: `newest` | `oldest` | `lastMessage` (default: `lastMessage`)
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "uuid-v4",
        "caseId": "#A81F42",
        "studentId": "uuid-v4",
        "studentIdentifier": "Student #S-8291",
        "status": "UNANSWERED",
        "category": "PERSONAL",
        "createdAt": "2026-09-04T12:00:00.000Z",
        "updatedAt": "2026-09-04T12:00:00.000Z",
        "lastMessageAt": "2026-09-04T12:00:00.000Z",
        "_count": {
          "messages": 1
        }
      }
    ],
    "meta": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
  ```

#### `GET /api/conversations/:id`
Retrieves full details of a conversation.
- **Access**: Conversation owner (`STUDENT`), or `STAFF`/`ADMIN`.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid-v4",
      "caseId": "#A81F42",
      "status": "UNANSWERED",
      "category": "PERSONAL",
      "studentIdentifier": "Student #S-8291",
      "createdAt": "2026-09-04T12:00:00.000Z",
      "updatedAt": "2026-09-04T12:00:00.000Z",
      "lastMessageAt": "2026-09-04T12:00:00.000Z"
    }
  }
  ```

#### `POST /api/conversations`
Creates a new conversation case and appends the initial message.
- **Access**: `STUDENT` (via Telegram service layer) or `STAFF`.
- **Request Body**:
  ```json
  {
    "category": "PERSONAL",
    "initialMessage": "I have been feeling overwhelmed with exams lately.",
    "studentTelegramId": "123456789"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid-v4",
      "caseId": "#A81F42",
      "status": "UNANSWERED",
      "category": "PERSONAL",
      "createdAt": "2026-09-04T12:00:00.000Z"
    }
  }
  ```

#### `PATCH /api/conversations/:id`
Updates conversation status or category.
- **Access**: `STAFF`, `ADMIN`.
- **Request Body**:
  ```json
  {
    "status": "ANSWERED",
    "category": "PERSONAL"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid-v4",
      "caseId": "#A81F42",
      "status": "ANSWERED",
      "updatedAt": "2026-09-04T12:35:00.000Z"
    }
  }
  ```

---

### 2.3 Messages (`/api/conversations/:id/messages`)

#### `GET /api/conversations/:id/messages`
Retrieves timeline of messages in a conversation.
- **Access**: Conversation owner (`STUDENT`), or `STAFF`/`ADMIN`.
- **Query Parameters**:
  - `page`: integer (default: `1`)
  - `limit`: integer (default: `50`)
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "msg-uuid-1",
        "conversationId": "conv-uuid",
        "senderType": "STUDENT",
        "content": "I have been feeling overwhelmed with exams lately.",
        "createdAt": "2026-09-04T12:00:00.000Z",
        "readAt": "2026-09-04T12:05:00.000Z"
      },
      {
        "id": "msg-uuid-2",
        "conversationId": "conv-uuid",
        "senderType": "STAFF",
        "content": "Thank you for reaching out. We are here to support you. Can we schedule a quiet time to chat tomorrow?",
        "createdAt": "2026-09-04T12:15:00.000Z",
        "readAt": null
      }
    ],
    "meta": {
      "total": 2,
      "page": 1,
      "limit": 50,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
  ```

#### `POST /api/conversations/:id/messages`
Appends a response or follow-up message to a conversation.
- **Access**: Conversation owner (`STUDENT`), or `STAFF`/`ADMIN`.
- **Request Body**:
  ```json
  {
    "content": "Thank you for reaching out. We are here to support you."
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "data": {
      "id": "msg-uuid-2",
      "conversationId": "conv-uuid",
      "senderType": "STAFF",
      "content": "Thank you for reaching out. We are here to support you.",
      "createdAt": "2026-09-04T12:15:00.000Z"
    }
  }
  ```

---

### 2.4 Statistics (`/api/statistics`)

#### `GET /api/statistics`
Provides aggregated metrics for the staff dashboard.
- **Access**: `STAFF`, `ADMIN`.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "totalConversations": 142,
      "unansweredCount": 7,
      "answeredCount": 110,
      "closedCount": 25,
      "averageResponseTimeMinutes": 38,
      "recentActivityCount": 14
    }
  }
  ```

---

### 2.5 Realtime SSE Events (`/api/events`)

#### `GET /api/events`
HTTP Server-Sent Events stream for push updates to the staff dashboard.
- **Headers**:
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
- **Events Emitted**:
  1. `CONVERSATION_CREATED`: New student case submitted.
  2. `CONVERSATION_UPDATED`: Status transition (e.g. Unanswered -> Answered).
  3. `MESSAGE_CREATED`: New message appended to a case timeline.
  4. `STATS_UPDATED`: Refreshed dashboard counter aggregates.
