# UI Context

## Theme

White-first, calm, professional psychology dashboard. Not dark
mode. The interface is predominantly white surfaces with a
restrained blue hierarchy used for actions and authority — not a
site flooded with blue. It should read as a modern healthcare
communication system combined with a premium productivity
dashboard — never a colorful school app, a generic AI-generated
SaaS admin panel, or a startup landing page. The product character
is: calm, trustworthy, professional, human, private, modern,
lightweight, accessible.

Avoid: excessive gradients, neon colors, excessive glassmorphism,
giant cards, excessive rounded containers, unnecessary decoration.

## Colors

All components must use these tokens — no hardcoded hex values.

| Role                     | CSS Variable             | Value     |
| ------------------------ | ------------------------- | --------- |
| Page background          | `--bg-base`               | `#F8FAFC` |
| Surface                  | `--bg-surface`            | `#FFFFFF` |
| Primary text             | `--text-primary`          | `#0F172A` |
| Muted text               | `--text-muted`            | `#64748B` |
| Border                   | `--border-default`        | `#E2E8F0` |
| Primary accent (action)  | `--accent-primary`        | `#2196F3` |
| Primary accent, dark     | `--accent-primary-dark`   | `#0D47A1` |
| Primary accent, soft bg  | `--accent-soft`           | `#E3F2FD` |
| Secondary accent/border  | `--accent-secondary`      | `#90CAF9` |
| Success                  | `--state-success`         | `#16A34A` |
| Warning                  | `--state-warning`         | `#F59E0B` |
| Error                    | `--state-error`           | `#DC2626` |

### Color usage rules

- **White (`--bg-surface`)** — the dominant surface color: cards,
  panels, modals, input areas, conversation surfaces, dashboard
  content.
- **Very light blue (`--accent-soft`)** — used sparingly: page
  background sections, selected nav background, subtle message
  highlights, empty states, informational sections. Do not make
  the whole interface heavily blue.
- **Secondary blue (`--accent-secondary`)** — borders, subtle
  decorative elements, secondary buttons, hover states, avatar
  backgrounds, inactive accents.
- **Primary blue (`--accent-primary`)** — the action color:
  primary buttons, active navigation, links, focus rings, unread
  indicators, the send button.
- **Dark blue (`--accent-primary-dark`)** — authority/contrast
  color: headings, brand mark, strong statistics, selected icons,
  important status indicators, dashboard header accents. Not used
  for large backgrounds.
- **Semantic colors** (success/warning/error) are secondary to the
  blue system. Never communicate status using color alone — always
  pair with an icon or label.

## Typography

| Role      | Font                          | Variable      |
| --------- | ------------------------------ | ------------- |
| UI text   | Clean modern sans-serif        | `--font-sans` |
| Code/mono | Monospace                      | `--font-mono` |

Hierarchy: Display / Heading / Subheading / Body / Caption.
Prioritize readability over visual novelty; avoid excessively
large text in dashboard interfaces.

## Border Radius

| Context           | Class        |
| ------------------ | ------------ |
| Inline / small UI  | `rounded-md` |
| Cards / panels     | `rounded-lg` |
| Modals / overlays  | `rounded-xl` |

Moderate radius only — avoid excessive rounding on containers.

## Component Library

shadcn/ui on top of Tailwind CSS. Components live in
`components/ui/`. Use the shadcn CLI to add new components rather
than writing them from scratch.

## Layout Patterns

- **Dashboard**: persistent left sidebar (Dashboard / Inbox /
  Unanswered / Answered / Students / Statistics / Settings) with a
  main content area.
- **Conversation screen**: full-height split — case header (case
  ID + status) at top, scrollable message timeline in the middle
  (student messages left-aligned, staff messages right-aligned),
  response composer fixed at the bottom.
- **Sidebars**: fixed width with a border separator; the active
  item is shown with a moving indicator (Motion `layoutId`), not
  just a static highlight.
- **Modals**: centered overlay with backdrop blur, used sparingly.
- **Navbar**: top bar showing product name, staff identity, and
  online status.
- **Responsive behavior**:
  - Desktop — persistent sidebar + conversation list/detail layout
  - Tablet — collapsible sidebar
  - Mobile — compact/bottom navigation + full-screen conversation
    view (do not simply shrink the desktop UI onto mobile)

## Icons

Lucide React. Stroke-based icons only. Sizes: `h-4 w-4` for
inline, `h-5 w-5` for buttons.

## Motion

Library: Motion for React, imported as
`import { motion, AnimatePresence } from "motion/react"`.

- **Page entrance**: `opacity 0 → 1`, `y 8 → 0`, ~300ms
- **Conversation opening**: `opacity 0 → 1`, `x 12 → 0`
- **New message**: `opacity 0 → 1`, `y 10 → 0`, subtle spring
- **Sidebar active indicator**: `layoutId="active-nav"` — slides
  between items rather than being recreated on every navigation
- **Status change** (e.g. Unanswered → Answered): animate the
  status badge rather than instantly swapping it
- **Statistics**: numbers may gently count upward, but don't
  animate constantly
- **Buttons**: `whileHover: { scale: 1.01 }`,
  `whileTap: { scale: 0.98 }`

Always respect `prefers-reduced-motion`. Keep animation subtle —
target roughly 80% static UI, 15% micro-interactions, 5%
expressive animation. Animations must improve orientation and
feedback, never decoration for its own sake.

## Sensitive-content UX

- Never visually expose sensitive content unnecessarily — e.g. no
  message-content previews in notifications.
- Use clear privacy boundaries throughout the interface.
- The interface should feel safe, private, and controlled at all
  times.
- Never communicate status using color alone.
