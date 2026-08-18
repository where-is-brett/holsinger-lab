# Round 2 — Visual directions (DRAFT — finalised after Round 1 lands)

Before each session: attach the Emil design skill and the Apple HIG skill to the chat.
These prompts assume `brief/agreed-ia.md` exists.

---

## Session 2A — three divergent directions, Home only

Read `brief/00-brief.md`, `brief/content.json`, and `brief/agreed-ia.md`. Use your
`frontend-design` skill: no design system governs this yet and I want you to commit to
bold, distinct directions.

Produce **one canvas** (`02 Visual Directions.dc.html`) with **three high-fidelity
Home page directions side by side** at 1440 wide, each following the agreed IA's Home
block order exactly. Beside each screen show its **type ramp** (display, H1–H3, body,
meta/mono) and **palette swatches** (light + dark surfaces, text, one or two accents in
oklch, with names). Under each, a two-line rationale: what stance it takes and who it
flatters most.

Directions must differ in stance — type system, colour logic, composition, density,
motion — not be one layout recoloured. Starting hypotheses (counter-propose if you have
better):

1. **Editorial / journal** — serif-led, generous margins, footnote-like metadata, a
   single quiet accent; reads like a beautifully set monograph.
2. **Modern instrument** — grid-forward, mono for data (years, DOIs, roles), sharp
   hierarchy, colour used structurally; the "elegant product" end of the spectrum.
3. **Warm studio** — humanist sans, portrait/photography-led people and project
   surfaces, softer tonality; most inviting to prospective students.

Rules: real content only; portraits from `content.json` image URLs; other imagery as
labelled placeholders; consider the generated-wordmark logo mechanism (style it, don't
replace it); no filler; avoid generic AI-site tropes; the standard is *academic and
elegant*. Show a dark-mode swatch strip for each direction even if the screen is shown
in light.

Give me the canvas link and, for each direction, one sentence on what it would be like
to live with for five years.

---

## Session 2B — extend the chosen direction

We're going with **<direction name>** (with these tweaks: …).

Read the brief files and the chosen frame in `02 Visual Directions*.dc.html`. Produce
`03 <Direction> — Screens.dc.html` with, at 1440 wide: **Home** (refined), **People**,
**Publications**, **Project**, plus a **390-wide mobile Home**. Follow
`brief/agreed-ia.md` block order for each screen. Include hover/focus states for the
key interactive components (nav, person card, publication entry, project card, copy-
citation control) as small state strips beside the screens.

---

## Session 2C — refinements from pins

Read the brief files, open the latest `03 … Screens*.dc.html`, apply every pinned
comment, save as v2 (keep v1), summarise per comment.
