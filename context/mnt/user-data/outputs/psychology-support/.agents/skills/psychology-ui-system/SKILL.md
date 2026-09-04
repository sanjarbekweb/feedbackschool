---
name: psychology-ui-system
description: Defines and enforces the visual design system, UX patterns, accessibility, responsive behavior, and Motion animation rules for the school psychology support dashboard.
---

# Psychology UI System

## Product character

The interface must feel:

- calm
- trustworthy
- professional
- human
- private
- modern
- lightweight
- accessible

Never make the interface feel like a gaming product, crypto
dashboard, AI landing page, or flashy SaaS template.

## Color system

```text
Primary:            #2196F3
Dark primary:        #0D47A1
Light primary:        #90CAF9
Very light primary:    #E3F2FD
White:                  #FFFFFF

Primary text:   #0F172A
Secondary text: #64748B
Border:         #E2E8F0
Muted background: #F8FAFC

Success: #16A34A
Warning: #F59E0B
Danger:  #DC2626
```

## Color rules

- Use white as the dominant surface color.
- Use `#E3F2FD` for subtle backgrounds.
- Use `#2196F3` for primary actions and active states.
- Use `#0D47A1` for strong contrast and important headings.
- Use `#90CAF9` primarily for borders and secondary accents.
- Do not make the entire interface blue.
- Avoid excessive gradients.

## Typography

Prioritize readability over visual novelty. Use a clean modern
sans-serif. Strong hierarchy: Display, Heading, Subheading, Body,
Caption. Do not use excessively large text in dashboard
interfaces.

## Surfaces

Prefer white cards, subtle borders, restrained shadows, and a
moderate corner radius. Avoid excessive glassmorphism.

## Motion

Use Motion for React (`motion/react`), not the legacy
`framer-motion` package. Prefer opacity, transform, scale, and
layout animations. Use subtle durations. Use spring physics for
interactive movement. Use `AnimatePresence` for enter/exit states.
Use `layoutId` for shared visual indicators. Respect
`prefers-reduced-motion`. Do not animate everything — animations
must improve orientation and feedback rather than serve as
decoration.

## Accessibility

All interactive elements must:

- have keyboard support
- have visible focus states
- have appropriate ARIA labels
- maintain sufficient contrast
- work without animation

Never communicate status using color alone.

## Responsive behavior

- Desktop: persistent sidebar; conversation list + detail layout
- Tablet: collapsible sidebar
- Mobile: bottom/compact navigation; full-screen conversation view

Do not simply shrink desktop UI onto mobile.

## Sensitive-content UX

Never visually expose sensitive content unnecessarily. Use clear
privacy boundaries. Avoid unnecessary previews of student messages
in notifications. The interface should feel safe and controlled.
