# Vendored design system — "Modern Instrument"

Read-only copy of the Holsinger Lab Design System, exported from Claude Design
project 81465533-cb59-4875-826f-7592ef09f62d on 2026-08-19.

**Nothing here is compiled or imported by the app.** It is the source of truth
that `components/redesign/*` is ported from, kept in-repo so the port is
reviewable without design-tool access.

- `tokens/` — the token definitions. Colour values are oklch here; the app
  stores hex (see the plan's Global Constraints).
- `components/` — reference JSX plus `.d.ts` prop contracts. The `.d.ts` doc
  comments carry behavioural rules that the ported components must honour.
- `agreed-ia.md` — the information-architecture contract the screens implement.

If a ported component and its vendored source disagree, the source wins unless
the divergence is recorded in the plan.
