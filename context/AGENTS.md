## Application Building Context (Antigravity)

This project is built with Antigravity. Antigravity discovers
workspace skills automatically from `.agents/skills/` — no manual
loading step is required, but you should still consciously apply
the relevant skill(s) below for whatever part of the system you're
touching.

Read the following files in order before implementing or making
any architectural decision:

1. `context/project-overview.md` — product definition, goals,
   features, and scope
2. `context/architecture.md` — system structure, boundaries,
   storage model, and invariants
3. `context/ui-context.md` — theme, colors, typography, and
   component conventions
4. `context/code-standards.md` — implementation rules and
   conventions
5. `context/ai-workflow-rules.md` — development workflow, scoping
   rules, and delivery approach
6. `context/progress-tracker.md` — current phase, completed work,
   open questions, and next steps
7. `plan.md` — the phase-by-phase development plan; follow its
   order and do not skip ahead

## Project skills (`.agents/skills/`)

- `psychology-system-architecture` — monorepo layout, service
  boundaries, single-source-of-truth rules
- `psychology-ui-system` — the white-first blue design system,
  typography, layout, and Motion rules
- `privacy-security` — privacy minimization, audit logging,
  authorization, and required security controls
- `telegram-workflow` — student bot and staff bot flows,
  keyboards, and notification conventions
- `production-quality` — development process discipline and the
  pre-completion quality gate

Apply the skill(s) relevant to the current task in addition to the
context files above.

## Keeping context in sync

Update `context/progress-tracker.md` after each meaningful
implementation change.

If implementation changes the architecture, scope, UI system, or
standards documented in the context files, update the relevant
file before continuing — do not let the docs drift from the code.
