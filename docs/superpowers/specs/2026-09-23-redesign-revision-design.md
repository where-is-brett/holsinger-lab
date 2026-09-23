# Redesign revision — after Brett's review of the preview

Date: 2026-09-23. Base `redesign/integration` at `a544f94`. Four PRs, each off the integration
head at the time, in this order: **1 Foundations → 2 Home → 3 Publications → 4 People /
PI / Research / Contact.**

## Why

Brett, on the preview: "doesn't look very good; Home confusing, especially the left
numbering; inadequate in many places." A design review, commissioned by the command centre,
found the root cause and the fixes below. The command centre relayed its outcome, with Brett's
approval, on 2026-09-23. This spec records those decisions and pins the details the review
left open.

**The root cause is typographic, not structural.** The design's fonts never shipped:

- `styles/index.css` sets `--font-sans: var(--font-antarctican-mono)`, the old site's mono face;
- `app/layout.tsx` loads only IBM Plex Mono, PT Serif and two local faces;
- **Archivo**, which the design system specifies for all display, heading, UI and reading text
  (`design-system/tokens/fonts.css`, `tokens/typography.css`), is loaded nowhere.

So every heading, abstract and bio renders in a mono face. At a 375px viewport the display
heading breaks "Laborato/ry" mid-word, because `break-words` is doing the work that fluid type
should.

## What stays

- The publication row anatomy and grid discipline.
- The colour tokens, dark mode and the `warm` preset.
- The contrast guards in `styles/tokens.test.ts`.
- The fixture-level axe coverage, and axe on every route.
- No horizontal scroll from 320px to 1440px.
- CMS text printed verbatim.
- The same-property rule, css:proof for every new utility, and e2e that holds for any valid
  dataset.
- The data seams: `publicationModel`, `peopleModel`, `researchModel`, `resourceModel`,
  `homeModel`.

**Verification target:** the preview reads the `wix-preview` dataset. Every PR is also built
and checked against it (`NEXT_PUBLIC_SANITY_DATASET=wix-preview`), after `rm -rf
.next/cache/fetch-cache`. **After each PR, send before/after screenshots at 1440px and 375px**
of the affected pages. The "before" set was captured from `a544f94` against wix-preview, in
`.superpowers/screenshots/before/` (git-ignored).

---

## PR 1 — Foundations

### 1.1 Fonts
- **Archivo via `next/font/google`:** weights 400, 500, 600 and 700, exposed as
  `--font-archivo`.
- **`--font-sans`:** `var(--font-archivo), "Helvetica Neue", Helvetica, Arial, sans-serif`.
  `body` uses it, so all reading text becomes Archivo.
- **IBM Plex Mono stays `--font-mono`, for data only:** years, DOIs, volume/issue/pages,
  counts, dates, identifiers. Plex Mono weight 400 is added, since the design specifies
  400/500/600 and the app loads only 500/700.
- **Legacy faces:** the local Antarctican Mono and Ariana Pro, and PT Serif, stay loaded,
  because legacy pages still consume them (`/[slug]`, `/projects/*`, the old contact form, the
  Logo wordmark). A face is removed only when a grep shows no consumer left. PR 4 revisits this
  after Contact is rebuilt.

### 1.2 Type scale
Tokens in `styles/index.css` `@theme`:

| Token | New value |
|---|---|
| `--text-display` | `clamp(2.25rem, 6vw, 4rem)`, line-height 1.05, weight 600, tracking −0.02em |
| `--text-title` | `clamp(1.75rem, 4.5vw, 2.75rem)`, line-height 1.1 |
| `--text-heading` | `clamp(1.375rem, 3vw, 2rem)`, line-height 1.2 |
| `--text-lead` | 1.1875rem (19px) / 1.6 |
| `--text-body` | **1.0625rem (17px) / 1.6**, the reading size |
| `--text-meta` / `--text-label` | unchanged; these are mono data sizes |

**Word-fit budget, not an unconditional "never split mid-word" rule (revised 2026-09-23,
PR 1; figures corrected in PR 1's final-review fix round).** The literal rule above turned
out to be unenforceable: Blink (Chromium) never hyphenates a capitalised word
(`hyphenate_capitalized_word_` defaults to `false`), and CMS titles are almost all
title-case, so `hyphens: auto` was inert on nearly every heading this rule covers — and
where it *did* fire (a lowercase word with room to spare), it hyphenated words nobody
needed hyphenated, and only on platforms whose Chromium ships a dictionary. `hyphens-auto`
is removed from every heading entirely (final-review fix round, finding 1); `break-words`
(`overflow-wrap: break-word`) alone is the fallback — removing it too would let an
unhyphenatable word overflow the page, a direct violation of the unconditional
no-horizontal-overflow floor.

Instead, each level carries a **measured word-fit budget** at 320px — the longest word its
own column must fit without a raw mid-word split:

| Level | Budget word | Fits at 320px? |
|---|---|---|
| display (`--text-display`, Home's `h1`) | "Neuroscience" | yes (222px word in a 244px column) |
| title (`--text-title`, `PageTitle`'s `h1`/`h2`) | "Pathophysiology" | yes (211px in 244px) |
| heading (`--text-heading`, e.g. a research project's `h2`) | "Neurodegenerative" | yes (191px in 244px) |

Re-verified at 1024px (PR 1's final whole-branch review, after `PageTitle` moved into the
content column): the tightest case is a `/research` `h2` beside a cover, 266px in a 292px
column — still comfortable margin, and no live title anywhere needed a raw split at that
width either.

A word **longer** than its level's budget may still split raw rather than overflow — this
is a documented exception, not a defect. `PublicationPage`'s paper-title role (previously a
fixed `2.3125rem`, outside any clamp token) moved onto the **title** level's own clamp
(`clamp(1.75rem, 4.5vw, 2.3125rem)`) specifically so real DOI-paper titles like
"…Alzheimer's Disease Pathophysiology" fit without a raw split at 320/375px. Keep
`text-wrap: balance` on display headings.

**Proof:**
- **Live routes** (`/`, `/research`, `/people`, `/preview/components`) keep only a
  no-overflow assertion per word (`Range#getClientRects`, every fragment's right edge
  within the heading's own right edge) — this holds for any valid dataset and doesn't
  assume a raw split never happens, since `break-words` already guarantees no overflow.
- **The raw-split budget itself** is proven on dedicated full-width gallery fixtures at
  `/preview/components` only, one per level, each pairing that level's budget word
  (capitalised, so Blink couldn't have hyphenated it even before `hyphens-auto` was
  removed) with short, non-budget filler words. The check temporarily clears
  `overflow-wrap` (`overflow-wrap: normal`, plus `hyphens: manual` as belt-and-braces
  against any future heading that reintroduces `hyphens: auto`) on the fixture's own
  heading and re-measures `scrollWidth` vs `clientWidth` — this is what makes the guard
  **Linux-CI safe**: it asserts the word fits with no fallback mechanism engaged at all,
  independent of whether the CI runner's Chromium ships a hyphenation dictionary (Linux
  Chromium typically doesn't).

### 1.3 The numbered rail goes; `SectionLabel` replaces it
- **`SectionRail` becomes `Section`.** The file is renamed, and every import is updated.
  - Props: `label?: string`, `inverse?`, `id?`, `children`. **No `num`.**
  - The label is **sentence case**, at 13px Archivo 500 in the text-muted colour. It is not
    uppercase, not tracked, and never a number.
- **Layout:**
  - from `lg` (1024px): a `[label | content]` grid, with a narrow label column (~160px) and
    the hairline rule kept;
  - below `lg`: the label sits **above** the section content, full width, with no rail column
    and no vertical rule.
- **`PageTitle`:** drops its rail column too. The title is left-aligned to the content edge.
  `meta` becomes a sentence-case muted line in Archivo, not a mono-caps line.
- **`FacetBand`'s own rail** (its "01 Filter" label) goes as well. PR 3 replaces the band;
  PR 1 only removes the numbering, so no screen is left broken between PRs.
- **`RAIL_GRID`** and the rail tokens (`--spacing-rail`, `--spacing-rail-sm`) are removed once
  there are no consumers. `tokens.test.ts` / `nav-height.test.ts` assertions on them are updated
  accordingly.
- Every screen drops its `num` array and render-order numbering. **Labels** are the section's
  name in sentence case: "Recent work", "Resources", "The lab", "Abstract", "Cite and access",
  and so on.

### 1.4 Developer-facing copy removed
Remove every sentence addressed to the builder rather than the visitor. Known cases:

- the FacetBand note ("Click to filter · click again to clear · an untagged paper still
  appears…");
- the paper page's DOI explanation ("The DOI is the paper's permanent address…").

Audit every redesign screen for more, and list what was removed.

### 1.5 Micro-label budget
The review counted about 25 tracked, uppercase, 10–11px labels on Home.

- **Rule:** uppercase mono labels are for **data column heads only** (the publication
  ledger's Year / Title / Journal / Link heads, and similar). Everything else becomes sentence
  case in Archivo, or is deleted when the heading already says it.
- **Budget, enforced by e2e:** on `/`, `/publications`, `/people`, `/research` and
  `/resources`, count visible elements whose computed `text-transform` is `uppercase` and whose
  font-size is ≤ 12px.
  - The count is ≤ 6 per page at 1440px, excluding the publication ledger's column-head row.
  - Nav links and the footer count toward the budget. The nav's uppercase may stay only if the
    page stays inside the budget. Otherwise the nav becomes sentence case as well.
  - The number actually measured is reported per page.

---

## PR 2 — Home

1. **Hero:**
   - the lab name as the `h1` (`home.title`, else the site name);
   - then a **plain-English, two-sentence lab statement that says "Alzheimer's"**;
   - then a **lab-head card**: photo, name, role and email, each part only when set.
   - **Statement source:** the existing shared **`siteCopy`** singleton. Use `about.body` (plain
     text) when set, else `hero.subheading`, else the IA tagline. Don't add a field: one source
     of truth for both designs.
   - This relaxes the IA's "zero editorial fields on Home" rule. That relaxation is **accepted**
     (command centre, on Brett's behalf) and is recorded in `phase-3-decisions.md`.
   - `siteCopy` is populated in wix-preview but empty in production today, so the fallbacks
     keep production correct.
2. **Recent papers:** the newest as a **larger lead row** (title at heading size, authors,
   journal · year, link), then the next four in the existing `PublicationRow` home format. Then
   "All N publications →".
3. **Research themes as cards:**
   - Source: the `researchOrder` projects, each a card with title, a one-sentence excerpt of the
     resolved body, and its cover when set, linking to `/research#<slug>`.
   - When no project has `researchOrder`, fall back to `siteCopy.about.themes` (title and
     summary, with a leading "- " stripped).
   - When neither exists, omit the block.
4. **People strip:** 6–8 colour portraits of current members who have photos (alumni and the
   lab head excluded), in `orderRank` order. Then "Meet the lab →" to `/people` and "Support
   our research →" when the Support page exists.
5. **Resource:** as now.
6. **MAESTRO:** a **normal-weight card**, not an inverted band.
   - The CMS title at `--text-heading` size, verbatim.
   - The overview as body text.
   - **One** register link (to `site`); the second, duplicate link is removed.
7. **Name the PI once:** in the hero card. The old "The lab" block goes. Its member count moves
   into the People strip's link text ("Meet the lab — 20 people"), and Support moves there too.

## PR 3 — Publications

- **Filters are not sticky.** This landed early, in PR 1: wrapping `FacetBand` in a
  `Section label="Filter"` (needed for the label/alignment fix) left the band's grid cell
  exactly as tall as the band itself, so `position: sticky` had nowhere to travel. Rather
  than un-wrap it to preserve sticky, the controller ruled to drop sticky positioning
  outright — this was already PR 3's own intent (Brett's feedback) — so PR 1 shipped it
  ahead of schedule instead of shipping a band that would only lose sticky again one PR
  later. `phase-3-decisions.md`'s Revision PR 1 section has the full history.
  - From `md` (768px): **one row of three native `<select>`s** (Year ▾, Type ▾, Topic ▾), each
    with an "All" option, plus a "Clear" text button when any filter is set.
  - Below `md`: a **"Filter (n)" button**, where n is the number of active filters, opening a
    sheet (Headless UI `Dialog`, as `MobileHeader` uses). The sheet holds the same three selects
    plus Clear and "Show N results".
  - Native selects are chosen for accessibility and zero dependencies.
- **The density toggle is removed.** It was a design embellishment the IA never asked for, and
  it adds a control a visitor doesn't need.
- **The first paper is visible without scrolling at 375×812.** e2e measures the first row's top
  against the viewport height.
- **Author bolding matches only the PI's name token.**
  - `splitAuthors` today bolds from "Holsinger" to the next comma. That misses initials after a
    comma ("Holsinger, RMD.") and swallows "and Jiao J." when no comma follows.
  - Replace it with a token match: `Holsinger` plus an optional comma, whitespace and initials in
    any format (`R.M.D.`, `RMD`, `R M D`, `R.M.D`). It never extends past the initials.
  - Unit-test every author format present in the dataset, plus the "and" case.
- **Paper page:**
  - a primary **"Read paper ↗"** button to the canonical link (`Button` with `href`, opening in a
    new tab with `rel="noopener noreferrer"`);
  - the abstract in Archivo at `--text-body` (17px) / 1.6;
  - the DOI shown as data (Plex Mono, small, verbatim).

## PR 4 — People, PI profile, Research, Contact

- **People:**
  - One continuous grid of cards, each with a **small group label**, e.g. "PhD candidate". No
    half-empty rows per group.
  - Groups stay in `orderRank` order, and the grid flows continuously.
  - A **quiet initials tile**, with no "[ NO PORTRAIT ON FILE ]" text.
  - Alumni in a 3–4 column name list from `md` (1 column on phones).
- **PI profile (`/people/[slug]`):**
  - add **"Publications (n)"**, listing the publications whose authors include the person's
    surname token (the PR 3 matcher, generalised) with the `PublicationRow` component;
  - add an **email button** when `email` is set.
  - In the People spotlight, drop "Full profile →" unless the profile page says more than the
    spotlight does (it has publications, or `fullBio` differs from `bio`). When shown, it reads
    "Profile and publications →".
- **Research:**
  - Section labels are the **project's title**, not its first tag.
  - The meta line counts only projects whose resolved body is non-empty.
- **Contact:** rebuilt on the redesign shell.
  - Left column: email, phone and address from `settings.contact` (the Wix track added it), plus
    a link to The University of Sydney. That URL is a constant, `https://www.sydney.edu.au/`,
    because `settings.contact` has no URL field.
  - Right column: the existing form, restyled. Its Formspree endpoint and behaviour stay
    unchanged.
  - Stacked below `lg`.

---

## Rulings this spec takes (the review left these open)

| Ruling | Why | Cost if wrong |
|---|---|---|
| Home statement: `siteCopy.about.body` → `hero.subheading` → IA tagline | about.body is the two-sentence plain-English statement and mentions Alzheimer's in wix-preview; the fallbacks keep production correct | Reorder the fallback chain |
| Research cards come from `researchOrder` projects, falling back to `siteCopy.about.themes` | Projects are the lab's actual research and link somewhere. The themes' summaries are raw "- …" strings | Swap the source |
| Native `<select>` filters, with a Dialog sheet below `md` | Accessible and zero-dependency, and native pickers are good on phones | A custom listbox later |
| Density toggle removed | Not in the IA; fewer controls | One toggle to restore |
| Uppercase label budget ≤ 6 per page, e2e-enforced | Makes "cut hard" measurable and keeps it cut | Adjust the number |
| Legacy font faces stay loaded until no consumer remains | Legacy pages still use them; removing them would restyle pages this revision doesn't touch | Some font bytes |
| University link is a constant | `settings.contact` has no URL field, and schemas are out of scope | Move it to the schema later |

## Data issues found along the way (for the Wix track, not fixed here)

- **Two Wix-imported publications in wix-preview have no `slug`**, including the newest, "Non-invasive
  Bdnf mRNA therapy…" (2026-04-20). They have no paper page, and their row title does not link.
  `slug` is `required()` in the schema, so the importer should set it.
- **2026-09-23, command centre:** the Wix importer will set slugs going forward; this hasn't
  landed in `wix-preview` yet (next data window). Until it does, **PR 2's Home must render a
  lead or recent paper with no slug as an unlinked title, with no crash** — the same shape as
  the still-unslugged live rows above, since PR 2's own dataset window may still predate the
  importer fix. Cover it with a gallery fixture (an unslugged lead paper on `/preview/
  components`) and a `homeModel` unit test, not a live-data-dependent e2e.
