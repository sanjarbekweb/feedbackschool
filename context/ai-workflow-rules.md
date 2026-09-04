# AI Workflow Rules

## Approach

Build this project incrementally using a spec-driven workflow
across a monorepo (`apps/backend`, `apps/frontend`,
`packages/types`). The context files (`project-overview.md`,
`architecture.md`, `ui-context.md`, `code-standards.md`) define
what to build and how; `progress-tracker.md` defines the current
state; `plan.md` defines the phase order. Always implement against
these specs — do not invent product behavior, security rules, or
design decisions from scratch. Follow `plan.md`'s phase order and
do not skip ahead to a later phase before the current one is done.

## Scoping Rules

- Work on one feature unit at a time.
- Prefer small, verifiable increments over large speculative
  changes.
- Do not combine unrelated system boundaries in a single
  implementation step.
- Do not implement Telegram bot logic and dashboard/API logic in
  the same step.
- Do not implement a feature for both the student bot and the
  staff bot in one step unless the shared logic is trivial.

## When to Split Work

Split an implementation step if it combines:

- UI changes and background/Telegram-bot changes
- Multiple unrelated API routes or NestJS modules
- Backend changes and frontend changes (unless it is purely a
  shared type change in `packages/types`, updated in both apps in
  the same step)
- Behavior not clearly defined in the context files (e.g. exact
  conversation status transitions, notification wording, which
  student-identifying fields staff may see)

If a change cannot be verified end to end quickly, the scope is
too broad — split it.

## Handling Missing Requirements

- Do not invent product behavior not defined in the context files.
- If a requirement is ambiguous, resolve it in the relevant
  context file before implementing.
- If a requirement is missing, add it as an open question in
  `progress-tracker.md` before continuing.
- Never invent how much of a message is exposed in a staff group
  notification — if unclear, default to case ID + category +
  status + timestamp only, per the privacy invariant in
  `architecture.md`.

## Protected Files

Do not modify the following unless explicitly instructed:

- `components/ui/*` — generated shadcn/ui components
- `packages/types/*` — only change when the change is
  intentionally a shared-type change, and update both apps in the
  same step
- Any third-party library internals
- `.agents/skills/*` — these encode the project's fixed rules
  (architecture, UI system, privacy/security, Telegram workflow,
  production quality)

## Keeping Docs in Sync

Update the relevant context file whenever implementation changes:

- System architecture or boundaries
- Storage model or schema decisions
- Code conventions or standards
- UI/design-system decisions
- Feature scope

## Before Moving to the Next Unit

1. The current unit works end to end within its defined scope.
2. No invariant defined in `architecture.md`, and no rule in the
   `privacy-security` skill, was violated.
3. `progress-tracker.md` reflects the completed work.
4. `npm run build` passes for both `apps/backend` and
   `apps/frontend`.
