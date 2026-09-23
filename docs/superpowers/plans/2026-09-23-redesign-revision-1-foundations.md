# Redesign revision PR 1 — Foundations: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the design's real typography (Archivo for reading, Plex Mono for data, fluid display type that never breaks mid-word), replace the numbered rail with a sentence-case section label, remove developer-facing copy, and cut the uppercase micro-labels to a measured budget. This must work across every redesign screen, with no screen left broken between tasks.

**Architecture:** Tokens and fonts change centrally: `app/layout.tsx` and `styles/index.css`. The rail primitive is replaced in place. `SectionRail` is renamed `Section`, and every screen is migrated in the same task, so the build never holds two layout systems. Copy and label cleanup follow, with an e2e budget that keeps the cut from regressing.

**Tech Stack:** Next.js 16 (`next/font/google`), Tailwind 4, Vitest, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-09-23-redesign-revision-design.md`, "Why", "What stays" and PR 1 (§1.1–§1.5), plus the rulings table. Read them first.

## Global Constraints

- Branch `redesign/revision-foundations`, off `redesign/integration` at `a544f94`. PR into `redesign/integration`. Never touch `main` or another checkout.
- **No new npm dependencies.** `next/font/google` is part of Next.
- **Two Tailwind utilities setting the same CSS property on one element at the same breakpoint never merge.** Use responsive pairs, or pick one of two whole class strings.
- **Tailwind 4 arbitrary values:** `h-(--x)` when the custom property is the whole value; explicit `var()` inside composites.
- **Empirical CSS proof for every new utility:** `npm run css:proof -- --grep '<declaration>'` exits 0; report the exact commands.
- **CMS text prints verbatim.** Case transforms only on labels, never on names, titles, DOIs or other content.
- **Every e2e assertion holds for any valid dataset.** States the live data can't show go on gallery fixtures at `/preview/components`.
- **No horizontal overflow at 320, 375, 768, 1024, 1280 and 1440px** on every redesign route. Measure `document.documentElement.scrollWidth <= clientWidth`; `html { overflow-x: hidden }` hides overflow otherwise. A grid item holding text needs an explicit track.
- **Keep axe green,** including the fixture-level axe checks added in PR #41.
- **Before any local e2e or build:** `rm -rf .next/cache/fetch-cache`. Confirm :3000 is free and stays free, and leave nothing running.
- **A local `npm run build` rewrites `next-env.d.ts`.** Before committing, run `git checkout origin/redesign/integration -- next-env.d.ts`, and never commit a change to it.
- **Lint baseline:** 0 errors, 4 warnings. Any new warning is a regression.
- **Do not touch:** any schema; `menuItems` or the show* flags; `project` retirement; legacy pages' layout (`/[slug]`, `/projects/*` and `/contact` keep their current markup until PR 4).
- **Commit messages:** conventional prefix, ending with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## Review Focus

1. **Long single words at 320px** ("Neuroscience", "Pathophysiology", "Microbiome") in display and title headings. They must fit or hyphenate, never split without a hyphen. Pinned by Task 1's word-split e2e.
2. **The section label below `lg`.** It sits above the content with no leftover rail column, rule or padding, and content starts at the gutter. Pinned by Task 2's layout e2e at 375px and 1023px.
3. **The inverse `Section`** (Research enquiries, Home MAESTRO until PR 2) still renders correctly, with contrast intact, now that the rail column is gone. Pinned by the gallery axe checks.
4. **Every screen's section labels read correctly in sentence case, with no leftover numbers.** Pinned by Task 2's e2e: no element in the redesign screens renders a lone two-digit section number.
5. **The uppercase-label budget measured against wix-preview content** (more people, projects and a resource), not just production. Pinned by Task 3's e2e plus the controller's wix-preview build check.

---

### Task 1: Fonts and type scale

**Files:** `app/layout.tsx`, `styles/index.css`, `styles/tokens.test.ts` (only if it pins the changed type tokens), and any component whose display, title or heading element carries `break-words`. Plus a new `e2e/typography.spec.ts`.

1. Load **Archivo** with `next/font/google`: `subsets: ['latin']`, weights `['400','500','600','700']`, `variable: '--font-archivo'`, `display: 'swap'`. Add its variable to `<html>`'s className beside the existing font variables. Add weight `400` to the existing `IBM_Plex_Mono` load, keeping 500 and 700.
2. In `styles/index.css`, set `--font-sans` to `var(--font-archivo), "Helvetica Neue", Helvetica, Arial, sans-serif`. Also check the `@theme` block maps `--font-sans` correctly for Tailwind's `font-sans` utility. Leave `--font-antarctican`, `--font-ariana` and `--font-serif` in place for the legacy pages.
3. **Type tokens.** Apply exactly the values in spec §1.2: display, title and heading are fluid `clamp()`; lead is 1.1875rem/1.6; body is 1.0625rem/1.6. Keep every companion token (`--line-height`, `--letter-spacing`, `--font-weight`) consistent with the new values.
4. **Headings never split mid-word.**
   - Find every display, title and heading element in `components/redesign/**`: `PageTitle`'s `h1`, the screens' `h1`/`h2`, the paper page `h1`, `PersonPage`, and any `text-display` / `text-title` / `text-heading` / `text-[..px]` heading.
   - Remove `break-words` from those elements, and add `hyphens-auto` (Tailwind 4 `hyphens-auto`, proven by css:proof). Keep `text-balance` on display headings.
   - Body text, identifiers, emails and URLs **keep** `break-words` / `break-all`: an unbreakable token there must still wrap.
5. **Reading text.** The screens' body paragraphs (abstract, bios, overviews, summaries) use `text-body` (17px/1.6) in Archivo. `PortableBody`'s body/lead/inverse variants map to `text-body` / `text-lead`. Remove any leftover mono class from reading text. Mono (`font-mono`) stays only on data: years, DOIs, vol(issue)·pages, counts, dates, identifiers and data column heads.
6. **e2e (`e2e/typography.spec.ts`):**
   - (a) On `/`, `/research`, `/people` and `/preview/components`, at 320px and 375px, for every `h1`/`h2`, assert that no word is split across lines without a hyphen. For each text node, compute each word's client rects with a `Range`; a word with more than one rect must end its first line with a hyphen (`hyphens` rendering), which you can detect with a width comparison. Keep it simple and dataset-independent, and say how you did it.
   - (b) `getComputedStyle(document.body).fontFamily` starts with the Archivo family name that `next/font` generates.
   - (c) A DOI element on `/publications` has a monospace `font-family`.
7. **Gallery fixture for Review Focus 1:** add a heading instance with long single words ("Neuroscience", "Pathophysiology", "Microbiome") so (a) is exercised regardless of dataset.
8. Run css:proof for every new utility, then the full verification: type-check, lint, unit, build, and the full e2e.

- [ ] Write the e2e first (red on the current branch: body font is Antarctican), then implement, verify and commit: `feat: ship Archivo and a fluid type scale; headings never split mid-word`.

---

### Task 2: Numbered rail → sentence-case `Section`

**Files:**
- `components/redesign/SectionRail.tsx` → rename to `components/redesign/Section.tsx` with `git mv`;
- `components/redesign/PageTitle.tsx`, `FacetBand.tsx`, `tokens.ts`;
- every screen in `components/redesign/screens/*.tsx`;
- `app/preview/components/Gallery.tsx`, `components/redesign/fixtures.ts`;
- `styles/index.css` (rail tokens), `styles/*.test.ts` that pin them;
- the e2e specs whose selectors depend on rail markup or numbers.

**`Section` props:** `{ label?: string; inverse?: boolean; id?: string; children: ReactNode }`, plus any existing padding props that screens genuinely use (`pad`, `padTop`, `borderTop`). Keep those only if they are still needed after the migration, and delete any that become unused.

1. **Layout**, per spec §1.3:
   - **From `lg`:** a grid `lg:grid-cols-[10rem_minmax(0,1fr)]`. The label is in the first column, top-aligned, with the hairline divider kept (a top border on the section, as today).
   - **Below `lg`:** a single column (`grid-cols-1`). The label is a block above the content, with a small gap. There is no rail column, no vertical rule, and no rail padding.
   - **Label style:** Archivo, 13px (0.8125rem), weight 500, text-muted, **sentence case**. No `uppercase`, no tracking, no number, no vertical writing mode. Render it as a `<p>` (or `<h2>` if the section has no other heading; decide per use and say how).
   - **Inverse:** the same structure on the inverse surface, with the label in `text-text-inverse-muted`.
2. **`PageTitle`:**
   - Remove the rail column. The `h1` is left-aligned to the content gutter.
   - `meta` becomes one sentence-case muted line in Archivo, 15px. Drop the mono caps.
   - Keep `headingLevel`.
   - The screens' meta strings move from shouty caps ("19 RECORDS · 2020–2025", "3 ACTIVE PROJECTS") to sentence case ("19 publications, 2020–2025", "3 active projects"). Update each screen's meta formatter and its unit and e2e tests.
3. **`FacetBand`:** remove its rail column and the "01 / Filter" label. PR 3 replaces the band; here it only loses the numbering and rail.
4. **Every screen:** remove the `num` arrays and render-order numbering, and pass `label`. Labels are sentence case:

   | Screen | Labels |
   |---|---|
   | Home | "The lab", "Recent work", "Resources", "Outreach" |
   | Publications | "Filter", "Record" |
   | Paper | "Paper", "Abstract", "Cite and access", "Resource" |
   | People | "Lab head", "Members", "Alumni" |
   | Research | the project's first tag or "Project" as now (PR 4 changes this), "Enquiries" |
   | Resources | the kind |
   | Person | "Profile" |

   Keep each block's existing content.
5. **Remove `RAIL_GRID`** and the rail tokens (`--spacing-rail`, `--spacing-rail-sm`) once nothing consumes them. Grep, and update any test that pins them.
6. **e2e:**
   - (a) At 1440px, a `Section` label and its content share one grid row. At 375px and 1023px, the label's bottom is above the content's top, and the content's left edge is at the gutter (within 1px of the label's left edge).
   - (b) No redesign route renders a standalone two-digit section number: no element whose trimmed text matches `/^\d{2}$/` sits in a section label position. Scope this to the label elements, via a `data-testid="section-label"`.
   - (c) Update existing specs that located sections by number or rail markup.
7. Gallery: update every instance. Keep the People, Home and Research fixtures rendering.
8. css:proof, then the full verification, including the no-overflow sweep at all six widths and axe (light and dark).

- [ ] Write the e2e first and run it red, migrate everything, verify, and commit: `feat: replace the numbered rail with a sentence-case section label`.

---

### Task 3: Developer copy out; micro-label budget

**Files:** every redesign screen and primitive that prints builder-facing copy or tracked uppercase micro-labels; `components/redesign/tokens.ts` (`LABEL` / `LABEL_BASE`); `components/redesign/SiteNav.tsx` / `MobileHeader.tsx` / `SiteFooter.tsx` only if the budget requires it; a new `e2e/label-budget.spec.ts`.

1. **Remove developer-facing copy.** At minimum:
   - the FacetBand `note` text on `/publications`;
   - the paper page's "The DOI is the paper's permanent address…" line.

   Grep all screens and primitives for other copy addressed to the builder or explaining the system ("click again to clear", "kept honest", "example wording", "mockup", "untagged paper") and remove it. List every removal in the report.
2. **Micro-labels.** Only **data column heads** keep tracked uppercase mono: the publication ledger's head row (Year / Title… / Journal / Link…), and any equivalent data table head. Every other uppercase 10–12px label either becomes sentence-case Archivo at 13–14px, or is deleted where the adjacent heading already says it. This includes kickers such as "THE UNIVERSITY OF SYDNEY", "PRINCIPAL INVESTIGATOR", "CURRENT MEMBERS", "KIND"/"SOURCE"/"DOI" meta labels, and "ALL 21 PUBLICATIONS →" style links. Links become sentence case ("All 21 publications →").
   - `ResourceBlock`'s meta labels (KIND / SOURCE / DOI) become sentence-case definition terms.
   - `LABEL` in `tokens.ts` is kept only for data column heads. Rename or split it if that makes the intent clearer.
3. **Nav and footer.** Measure first. If a page is over budget only because of the nav or footer, switch those to sentence case too. Otherwise leave them.
4. **e2e (`e2e/label-budget.spec.ts`):**
   - On `/`, `/publications`, `/people`, `/research` and `/resources` at 1440px, count visible elements with no element children and non-empty text, whose computed `text-transform` is `uppercase` and whose computed `font-size` is ≤ 12px. Exclude any element inside `[data-testid="ledger-head"]` (add that test id to the publication ledger's head row).
   - Assert the count is ≤ 6. Log the measured count per page in the test output.
   - Also run it on the gallery's Home, People and Research instances, so it holds regardless of dataset.
5. css:proof for any new utilities, then the full verification.

- [ ] Write the e2e first (red today: Home has ~25), clean up, verify, and commit: `fix: remove developer-facing copy; cut uppercase micro-labels to data heads`.

---

### Task 4: Docs

- [ ] `docs/redesign-experiment/phase-3-decisions.md`: add a "Revision PR 1 — Foundations" section covering:
  - the root cause (fonts);
  - the type scale and the never-split-mid-word rule;
  - `Section` replacing `SectionRail`, and why the numbering went;
  - the copy removed;
  - the label budget and each page's measured counts;
  - the legacy font faces kept, and why;
  - the verification table (unit / lint / typegen / build / e2e).
- [ ] Commit: `docs: revision PR 1 decisions`.
