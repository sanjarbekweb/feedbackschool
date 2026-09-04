---
name: privacy-security
description: Defines and enforces the privacy-minimization and security requirements for handling sensitive student psychology communications.
---

# Privacy & Security

This application carries potentially sensitive student
communications. Privacy and security are first-class requirements
in every phase, not a final review step.

## Privacy minimization

Do not expose, to people who don't need access:

- Telegram phone numbers
- Telegram usernames unnecessarily
- Telegram IDs in the UI
- sensitive message content in public/staff group notifications

Use internal case IDs (e.g. `#A81F42`) in any shared or
lower-trust surface (the staff Telegram group). The complete
message content stays inside the secured staff bot/dashboard.

Example staff group notification:

```text
🔔 New psychology support request

Case: #A81F42
Category: Personal
Status: Unanswered
Received: 14:32

Open in staff bot →
```

## Audit logging

Log staff access to sensitive conversations: who, what action,
when, and which case. Do **not** log message content into the
audit log or into ordinary application logs.

## Authorization

- Every protected endpoint validates the authenticated user's
  role and ownership server-side. Never trust the frontend or the
  Telegram client to decide authorization.
- A student requesting `GET /api/conversations/:id` must only
  receive the conversation if it belongs to them.
- Staff access conversations according to their role
  (`STAFF`/`ADMIN`), checked server-side on every request.
- Telegram staff authorization is based on the immutable Telegram
  user ID via an admin-controlled mapping — never on Telegram
  username.

## Required security controls

- HTTPS
- HTTP-only secure cookies where applicable
- Server-side authorization and role-based access control (RBAC)
- Telegram ID verification
- Input validation and output sanitization
- Rate limiting
- CSRF protection where applicable
- Secure CORS configuration
- Environment variables for secrets — never commit secrets to Git
- Database parameterization through Prisma
- Audit logging (see above)
- Pagination and request size limits
- Structured logging that never includes message content

## Threats to explicitly prevent

- IDOR (insecure direct object reference — e.g. a student
  reaching another student's conversation by guessing an ID)
- XSS
- SQL injection
- CSRF
- Privilege escalation
- Broken access control
- Telegram spoofing
- Enumeration of student identities

Run a security review against this list before declaring any
phase of the application complete.
