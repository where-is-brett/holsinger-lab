# Round 3 — Design system (DRAFT — finalised after Round 2 lands)

Before the session: attach the Emil design skill and the Apple HIG skill to the chat.

---

## Session 3A — codify the winning direction as a design system

Read `brief/00-brief.md`, `brief/agreed-ia.md`, and the final `03 … Screens*.dc.html`.

Create a **new project named "Holsinger Lab Design System"** (design-system type) that
codifies the winning direction so that future lab deliverables — pages, decks, posters
— can be built from it, and so engineers can port it faithfully. It must contain:

1. **Tokens** — colour (light + dark, semantic names: surface, surface-raised, text,
   text-muted, accent, accent-ink, rule), type ramp (family, size, weight, leading,
   tracking per level), spacing scale, radii, shadows/elevation, motion durations and
   easings. Express as CSS custom properties in one stylesheet, plus a human-readable
   tokens page.
2. **Components** — nav (desktop + mobile), footer, section header, person card,
   person profile header, publication entry (with year-first layout, DOI link, copy
   citation), project card, project page header, theme/tag chip, button/link styles,
   form field. Each with default / hover / focus / disabled states where relevant.
3. **Templates** — the four screens rebuilt from the components (Home, People,
   Publications, Project) so the system is proven against real content.
4. **Usage rules** — one page: what the system is for, dos and don'ts, how the
   generated-wordmark logo is treated, imagery rules, accessibility minimums (contrast,
   focus, hit sizes).

Keep it lean: no component that the four screens don't use. Give me the design-system
project link and a list of any place where the winning screens were internally
inconsistent and how you resolved it.
