# Project-Wide Remediation Plan

## Purpose

This plan replaces the current assumption that the project is production-ready.
It is based on a repository audit and orders work by risk: first restore a truthful
quality baseline, then fix security and data-flow correctness, then harden the
Telegram and web clients, and finally prove the complete system in a production-
like environment.

The existing modular-monolith shape remains appropriate:

```text
Student Telegram bot ─┐
                      ├─> NestJS application services ─> PostgreSQL
Staff Telegram bot ───┤                 │
                      │                 ├─> notification delivery
Staff dashboard ──────┘                 └─> authenticated SSE
```

Do not introduce microservices, Redis, Kafka, or Kubernetes. Use PostgreSQL,
transactions, a database-backed outbox where delivery guarantees are required,
and a single backend deployment until multi-instance realtime delivery is
explicitly designed and tested.

## Verified Baseline

- `pnpm build` passes for shared types, backend, and frontend.
- The 6 backend suites and 17 tests pass, but Jest reports an open-handle leak.
- `pnpm lint` fails because the backend declares an ESLint command without
  installing/configuring ESLint. The frontend still uses `next lint`, and there is
  no shared lint/format configuration.
- There are no frontend component tests, API end-to-end tests, browser tests,
  database integration tests, or deployment smoke tests.
- `context/progress-tracker.md` says the system is production-ready, but multiple
  required quality-gate behaviors are absent or contradicted by the code.

## Release Blockers Found

### P0 — Security and privacy

1. Web authentication is a bootstrap placeholder, not a production credential
   system. Email is overloaded into `studentIdentifier`, the schema has no email or
   password hash, a known default password is used when environment variables are
   absent, and non-bootstrap staff accounts cannot authenticate successfully.
2. Production cookies use `SameSite=None`, but mutating endpoints have no CSRF
   protection. The documentation claims CSRF protection exists when it does not.
3. `JWT_SECRET`, webhook secrets, bot tokens, database URL, and allowed origins are
   not validated at startup. The backend falls back to a known JWT secret and can
   start a webhook endpoint without a required Telegram secret.
4. The global exception filter exposes raw unexpected exception messages to
   clients. Prisma, infrastructure, or internal error details could leak.
5. Logs include raw Telegram IDs for student notifications and unauthorized staff
   attempts, contrary to the project's minimization rules.
6. Any Telegram user is auto-created as a student. This conflicts with the stated
   admin-controlled school access model and needs a product decision plus an
   enrollment/allowlist implementation.
7. Sensitive-conversation access is not audited. Only login, create, message, and
   update actions are recorded, and audit write failures are swallowed.

### P0 — Functional correctness

1. The paginated API contract is broken end to end. Backend controllers return
   `{ success, data: T[], meta }`; `apiClient` returns only `data`; frontend pages
   then read the returned array as `{ data, meta }`. Conversation lists, recent
   cases, message histories, and the student directory therefore cannot behave as
   implemented.
2. Student pagination metadata omits `hasNextPage` and `hasPreviousPage`, while the
   frontend requires both, disabling navigation.
3. A student follow-up leaves an `ANSWERED` case answered. It must transition to
   `UNANSWERED` (or a separately specified pending-staff state), notify staff, and
   refresh status everywhere.
4. SSE emits named events, while the browser subscribes only through
   `EventSource.onmessage`. Named events require matching `addEventListener`
   handlers, so realtime invalidation is not proven and is likely nonfunctional.
5. Average response time is hardcoded to 35 minutes. The dashboard presents this
   placeholder as real operational data.
6. `IN_PROGRESS`, unread/read state, and `STATS_UPDATED` exist in types/specs but
   are either not implemented or are inconsistently excluded from filters and
   statistics.

### P1 — Reliability and UX

1. Telegram webhook updates have no durable idempotency protection; retries can
   duplicate cases or messages.
2. Telegram session maps never expire, are lost on restart, and can grow without
   bounds. They also make horizontal backend scaling unsafe.
3. User-authored Telegram text is rendered using Markdown without escaping.
   Markdown characters can corrupt or reject messages.
4. Telegram history is capped at 50 messages without pagination or safe chunking;
   combined output can exceed Telegram's message size limit.
5. Notification failures are logged and discarded. There is no retry, delivery
   status, dead-letter handling, or operational alert.
6. Dashboard routes have no reliable authentication gate or consistent 401
   redirect. Most queries have no visible error/retry state, and SSE can reconnect
   forever after session expiry.
7. Reduced-motion support, focus management for the mobile drawer, semantic live
   announcements, and several documented responsive patterns are missing.

## Required Decisions Before Implementation

Resolve these in the context documents and progress tracker before changing
behavior:

1. **Student enrollment:** school-managed Telegram-ID allowlist, one-time invite,
   roster import, or open bot access. The current docs say admin-controlled access,
   so default to deny until explicitly enrolled.
2. **Web identity provider:** local email/password accounts or the school's SSO.
   Prefer school SSO when available; otherwise implement dedicated credential
   fields and an admin-controlled provisioning/reset flow.
3. **Case state machine:** define legal transitions, especially what a student
   follow-up does to `ANSWERED`, how `IN_PROGRESS` is entered/exited, and whether a
   closed case can be reopened.
4. **Urgent-support policy:** approved wording, response expectation, emergency
   disclaimer, escalation contacts, staff routing, and after-hours behavior. Do not
   invent clinical or safeguarding policy in code.
5. **Retention and deletion:** message, user, notification-attempt, and audit-log
   retention; legal hold/export; who can delete; and whether identities can be
   pseudonymized without deleting case history.
6. **Staff visibility:** whether every staff member can access every case or cases
   require assignment/organizational scope.
7. **Deployment topology:** keep one backend instance for the current in-memory SSE
   broadcaster, or design PostgreSQL `LISTEN/NOTIFY` before enabling multiple
   replicas.

## Execution Plan

### Phase 0 — Restore a truthful engineering baseline

Goal: make every quality signal runnable and stop calling the system complete.

- Change `progress-tracker.md` to remediation/incomplete status and list the P0
  blockers.
- Reconcile the plan path mismatch: `context/AGENTS.md` references root `plan.md`,
  while the actual file is `context/plan.md`.
- Add root ESLint and Prettier configurations compatible with NestJS, Next.js,
  TypeScript strict mode, and import rules. Replace deprecated/brittle scripts.
- Add scripts for `typecheck`, `lint`, `format:check`, unit tests, integration tests,
  end-to-end tests, Prisma validation, and a single `quality` command.
- Remove production-code `any` types, beginning with API envelopes, Prisma query
  inputs, authenticated Telegram context, and error handling.
- Fix Jest teardown/open handles and make leaked handles a CI failure.
- Add CI for frozen install, schema validation, generated-client drift, lint,
  format, typecheck, tests with coverage thresholds, build, and secret scanning.
- Document supported Node and pnpm versions and enforce them through `engines` and
  CI.

Exit gate:

- A clean checkout passes `pnpm quality` without warnings or leaked handles.
- CI protects the default branch and produces test/coverage artifacts.
- Documentation reports the real project status.

### Phase 1 — Lock contracts, domain rules, and database invariants

Goal: define one unambiguous model before fixing clients.

- Add shared, concrete types for public user summaries, conversation list/detail,
  messages, students, pagination metadata, errors, and SSE events. Do not expose
  Prisma objects as API contracts.
- Standardize one response shape. Recommended:

  ```ts
  type ApiSuccess<T, M = undefined> = {
    success: true;
    data: T;
    meta?: M;
  };
  ```

- Add contract tests proving serialization and frontend parsing for success,
  validation failure, unauthorized, forbidden/not-found, and server error cases.
- Encode the legal case transition table in one domain service. Controllers,
  Telegram handlers, and the dashboard must invoke the same transition methods.
- Decide and implement read/unread semantics or remove the unfinished claim and
  field until it is supported.
- Replace random four-digit student codes with collision-resistant unique public
  identifiers and a database unique constraint.
- Retry case-ID creation on a unique conflict or use a larger collision-resistant
  identifier.
- Add composite indexes driven by real queries, such as status/category with
  `lastMessageAt`, and conversation messages by `(conversationId, createdAt, id)`.
  Verify with `EXPLAIN ANALYZE` on representative data.
- Revisit destructive foreign keys: audit records should not disappear when an
  actor is removed, and deleting a user should not silently erase conversation
  history. Align relations with the retention policy.
- Use cursor pagination for message timelines and stable tie-breaking for every
  list; enforce server-side min/max limits on all query DTOs.

Exit gate:

- Contract and state-machine tests pass against a real PostgreSQL test database.
- Invalid transitions, pagination abuse, identifier collisions, and destructive
  cascades are covered by tests.

### Phase 2 — Replace placeholder authentication and close security gaps

Goal: create a deployable staff identity and session boundary.

- Add dedicated staff identity fields/tables: normalized unique email or external
  SSO subject, password hash only if local auth is selected, active/disabled state,
  credential version, and timestamps. Never overload student identifiers.
- Remove all default credentials and secret fallbacks. Add typed configuration
  validation that fails startup in production when any required value is absent,
  weak, malformed, or uses a placeholder.
- Add an explicit admin-controlled staff provisioning, role-change, disable, and
  password-reset/SSO flow. Audit all of these actions.
- Choose a same-site deployment/BFF strategy where practical. Otherwise keep
  cross-site cookies but implement a proven CSRF defense using an origin check plus
  CSRF token on every mutation. Test login, logout, message send, and status update.
- Set explicit cookie name, path, lifetime, secure flags, same-site policy, and
  clearing options. Add session revocation/credential-version checking.
- Return generic client errors; log sanitized structured server errors with a
  correlation ID. Never return raw internal exception messages.
- Validate UUID route parameters, body strings after trimming, enums, pagination,
  search length, request size, and content type.
- Apply per-user and per-route rate limits in addition to IP limits. Add Telegram
  per-user submission throttling and abuse monitoring.
- Make Telegram webhook mode fail closed unless distinct strong webhook secrets and
  HTTPS callback URLs are configured. Keep webhook routes body-size-limited.
- Replace raw Telegram IDs in logs with a keyed pseudonymous hash or omit them.
- Add automated checks for IDOR, privilege escalation, CSRF, XSS/markup injection,
  mass assignment, spoofed Telegram updates, brute force, and sensitive log data.

Exit gate:

- No default identity or secret can authenticate a production build.
- The threat-model suite passes and captured logs contain no message content,
  credentials, raw Telegram IDs, cookies, or tokens.

### Phase 3 — Make core case operations atomic and reliable

Goal: ensure every channel produces identical durable state.

- Refactor to explicit application commands such as `openCase`,
  `addStudentFollowUp`, `sendStaffResponse`, `markInProgress`, `closeCase`, and
  `reopenCase`. Keep controllers and bot handlers as adapters only.
- In the same database transaction, persist the message, validate/advance status,
  update `lastMessageAt`, create the audit entry, and enqueue notification/realtime
  outbox records.
- Add a PostgreSQL-backed outbox worker inside the modular monolith with retry,
  exponential backoff, idempotency key, attempt count, terminal-failure state, and
  operational metrics. Do not require Redis.
- Ensure student follow-up transitions to the approved staff-action-required state,
  sends a privacy-safe staff alert, and emits both message and status/statistics
  events.
- Ensure staff replies from REST and Telegram call the same command and create the
  same audit, state, outbox, and notification records.
- Audit sensitive reads as well as writes, without content. Decide whether audit
  failure blocks the action; for required auditability, persist it transactionally.
- Add idempotency for Telegram update IDs and, where appropriate, client mutation
  keys. Prove duplicate webhook deliveries do not duplicate domain records.
- Calculate response-time metrics from actual first student message and first staff
  response timestamps. Define how reopened/follow-up cases affect the metric.

Exit gate:

- Database integration tests prove atomicity under exceptions and concurrent
  submissions.
- The same scenario run through REST and Telegram yields identical database state.
- Notification outages do not lose work and can be replayed safely.

### Phase 4 — Harden Telegram workflows

Goal: make both bots safe under restarts, retries, malformed input, and long cases.

- Replace untyped context casts with typed grammY context/session flavors.
- Use an expiring session strategy. If only one instance is allowed, document and
  bound the in-memory store; if restart-resumable flows are required, persist only
  minimal non-sensitive state in PostgreSQL.
- Escape all user-controlled output or use HTML mode with strict escaping. Centralize
  safe rendering of case IDs, identifiers, categories, dates, and message bodies.
- Paginate case history and split rendered output below Telegram limits. Do not dump
  50 potentially long messages into one response.
- Add cancel/back behavior for every state and make callbacks stale-safe,
  authorization-safe, and idempotent.
- Do not drop pending updates automatically on normal production restarts.
- Verify staff authorization on every update and action, including after a role is
  revoked. Prevent a staff-role account from being silently reused as a student.
- Implement the approved urgent-support policy and test its exact wording/routing.
- Add handler tests for Markdown/HTML control characters, 4,000-character messages,
  non-text updates, pagination boundaries, expired sessions, closed cases,
  unauthorized users, duplicate updates, Telegram API failures, and role revocation.

Exit gate:

- Student and staff workflows pass end-to-end against a test database and mocked
  Telegram API, including retry and long-history scenarios.

### Phase 5 — Repair the web API integration and authentication boundary

Goal: make the dashboard accurately render backend state and fail safely.

- Fix the API helper and every query to preserve typed pagination metadata. Remove
  all `PaginatedResponse<any>` and entity `any` usage.
- Add a single session/auth provider that blocks protected rendering until `/me`
  succeeds, redirects once on 401, stops SSE on expiry, and never shows placeholder
  staff identity as if authenticated.
- Handle 403, 404, 409, 422/400, 429, offline, timeout, and 500 states consistently.
  Add retry buttons only where retry is safe.
- Subscribe to named SSE events with `addEventListener`, or emit default message
  events consistently. Add heartbeat comments/events, bounded reconnect backoff,
  cleanup, and revalidation after reconnect because SSE is not a replay log.
- If multiple backend instances become necessary, replace the process-local Subject
  with PostgreSQL `LISTEN/NOTIFY` or outbox polling before scaling.
- Correct all query keys and invalidation rules. Use optimistic updates only after
  conflict behavior is specified; otherwise refetch authoritative state.
- Implement cursor/infinite pagination for message history, preserve scroll position
  when older messages load, and announce newly arrived messages accessibly.
- Use shared category/status labels rather than duplicating mappings across pages
  and bots.

Exit gate:

- Browser tests prove login, protected-route redirect, list pagination, search,
  filters, case detail, reply, status transitions, logout, expiry, errors, and live
  refresh against the real API.

### Phase 6 — UI architecture, accessibility, and responsive quality

Goal: meet the documented calm, private, accessible design system.

- Split large client components into focused page shells, query hooks, domain
  components, forms, and presentational components. Default to server components
  where the cross-origin auth architecture permits it.
- Replace non-token Tailwind palette usage with documented semantic design tokens.
  Add any missing semantic surface/border tokens to the design system first.
- Implement `useReducedMotion` and a global `prefers-reduced-motion` fallback for
  Motion and CSS animations, including spinners/pulses where appropriate.
- Add route-level loading, error, and not-found UI plus component-level empty,
  validation, mutation, and reconnect states.
- Make the mobile navigation a proper accessible dialog/drawer: focus trap, initial
  focus, Escape close, focus restoration, close control, inert background, and
  correct labels. Validate whether the specified compact/bottom navigation is still
  required.
- Add visible focus styles, correctly associated error descriptions, `aria-live`
  regions for async outcomes/realtime updates, and non-color status cues.
- Test keyboard-only use, screen-reader landmarks/names, contrast, 200% zoom,
  reduced motion, narrow phones, tablets, desktop, and long translated strings.
- Add a privacy UX review so sensitive message text appears only in intentional
  case-detail contexts, never incidental previews or browser notifications.

Exit gate:

- Automated accessibility checks have no serious violations, and the manual matrix
  passes for keyboard, screen reader, reduced motion, zoom, and responsive layouts.

### Phase 7 — Complete the test strategy

Goal: make the production-quality gate executable rather than declarative.

- Unit tests: state machine, identifier generation, DTO/config validation, auth,
  audit sanitizer, render escaping, notification formatting, statistics.
- PostgreSQL integration tests: repositories, transactions, indexes, pagination,
  ownership, constraints, idempotency, outbox retries, retention behavior.
- API tests: every route, role matrix, ownership/IDOR, CSRF, throttling, errors,
  payload limits, pagination, concurrency.
- Telegram tests: complete student/staff flows and failure/retry cases.
- Frontend tests: API client envelopes, query hooks, forms, accessible components,
  auth expiry, SSE handlers.
- Playwright end-to-end tests: Telegram fixture/API -> PostgreSQL -> dashboard ->
  response -> student notification in both response-channel directions.
- Add coverage thresholds by risk; prioritize domain/security branches over a single
  vanity percentage.
- Add a production-quality checklist test report mapping every item in
  `production-quality/SKILL.md` to a repeatable test or named manual verification.

Exit gate:

- Every required quality-gate item has current evidence, an owner, and an automated
  test where feasible. No phase is marked complete based only on build success.

### Phase 8 — Performance, observability, and operations

Goal: make failures detectable and recovery routine.

- Establish target workload, latency SLOs, notification-delivery SLOs, availability,
  recovery-point objective, and recovery-time objective.
- Load-test conversation lists, long histories, simultaneous Telegram submissions,
  login throttling, SSE connections, and outbox processing with anonymized synthetic
  data.
- Add structured metrics for HTTP latency/errors, auth failures, DB pool saturation,
  Telegram update lag, outbox depth/age/failures, notification success, active SSE
  clients, and reconnect rate. Do not use student/message labels.
- Add traces/correlation IDs across HTTP/Telegram command, transaction, outbox, and
  delivery without recording content.
- Separate liveness from readiness. Readiness should verify database connectivity
  and required runtime configuration without logging secrets.
- Configure alerts and a runbook for database outage, Telegram outage, webhook
  rejection, growing outbox, authentication failure spike, migration failure, and
  frontend/backend contract mismatch.
- Implement encrypted backups, restore drills, migration rollback/forward-fix
  procedure, key/secret rotation, bot-token rotation, staff offboarding, and an
  incident-response/privacy-breach playbook.
- Run dependency, container, license, and secret scans in CI. Pin and schedule safe
  dependency updates after test coverage is in place.

Exit gate:

- SLO dashboards and alerts work, a restore drill succeeds, and operational runbooks
  have been exercised in staging.

### Phase 9 — Deployment and production readiness

Goal: deploy only the system that was tested.

- Remove ambiguity between root and backend Railway manifests; select and document
  one build context and one deployment path.
- Add a staging environment with separate database, bot tokens, webhook secrets,
  cookies/origins, and test staff identities. Never reuse production student data.
- Build a minimal production image with production dependencies, a non-root user,
  pinned runtime, image scanning, and an explicit migration release step rather
  than coupling risky migrations to every app replica startup.
- Verify frontend/backend origin and cookie behavior using the real staging domains,
  including CSRF, CORS preflight, SSE credentials, logout, and expiration.
- Run the full end-to-end matrix in staging, then perform a documented security and
  privacy sign-off with the school owner.
- Roll out with rollback criteria, migration compatibility, monitoring, and an
  initial support window.
- Update `README.md`, architecture, API contract, state flows, environment reference,
  runbooks, and progress tracker to match the delivered behavior.

Exit gate:

- All P0/P1 issues are closed, every quality-gate item has evidence, no placeholder
  metrics or credentials remain, staging sign-off is complete, and rollback/restore
  procedures have been demonstrated.

## Recommended Work Units

Keep each pull request independently reviewable and deployable where possible:

1. Quality scripts, lint/format config, CI, and truthful tracker.
2. Shared response contracts plus backend/frontend contract tests.
3. Pagination fix across conversations, messages, and students.
4. Case transition policy and domain state machine.
5. Real staff identity schema and migration.
6. Production config validation, cookie/CSRF model, and sanitized error/logging.
7. Atomic command services plus transactional audit/outbox.
8. Student follow-up and cross-channel consistency.
9. Telegram idempotency, safe rendering, bounded sessions, and history pagination.
10. Dashboard auth gate, error states, and typed data hooks.
11. SSE event/heartbeat/reconnect repair.
12. Accessibility, reduced motion, and responsive navigation.
13. Real statistics and performance/index validation.
14. Full integration/E2E security matrix.
15. Staging operations, restore drill, deployment hardening, and final sign-off.

Do not combine credential migration, domain-state changes, Telegram workflow
changes, and frontend redesign in one pull request. Each unit must include its own
tests, migration notes when applicable, documentation update, and rollback plan.

## Definition of Done for Every Work Unit

- Requirements and security/privacy impact are stated.
- Types and API/schema changes are explicit and backward-compatible or migrated.
- Authorization is enforced server-side and covered by negative tests.
- Sensitive data is absent from logs, audit metadata, notifications, fixtures, and
  screenshots.
- Loading, empty, error, timeout, retry, and concurrency behavior are handled.
- Unit/integration/end-to-end tests are added at the appropriate layer.
- Lint, format, typecheck, tests, Prisma validation, and builds pass.
- Accessibility and responsive impact are verified for UI changes.
- Observability is sufficient to detect failure without exposing content.
- Context docs and `progress-tracker.md` match the code.

