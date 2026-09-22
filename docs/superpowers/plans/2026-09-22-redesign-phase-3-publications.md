# Redesign Phase 3 step 2, PR A — Publications: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/publications` and add `/publications/[slug]` from the redesign primitives, tighten `publication.slug` to required, and ship a dry-run `publication.type` backfill.

**Architecture:** A single pure mapping, `toPublication`, in the renamed `components/redesign/publicationModel.ts`, turns query payloads into the view model every publication surface renders. Server pages fetch and map. The index's filter/density state lives in one client screen component. Primitives gain only what real routes need: `PublicationRow` gets `href` and responsive layout; `FacetBand` gets `lg` sticky under the sticky header.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, Sanity (next-sanity, `@sanity/client`), Vitest (node env, `**/*.test.ts`), Playwright + `@axe-core/playwright`.

**Spec:** `docs/superpowers/specs/2026-09-22-redesign-phase-3-screens-design.md`. §1–§4 and §7–§8 bind this PR. Read it first.

## Global Constraints

- Branch `redesign/phase-3-publications`. The PR targets `redesign/integration`. Never touch `main` or any other checkout.
- **No new runtime or dev dependencies.** No `cn()` / `clsx` / `tailwind-merge`.
- **Two Tailwind utilities setting the same CSS property on one element at the same breakpoint never merge.** The later-generated one wins silently. Never concatenate a base string with a same-property override. Responsive pairs (`flex-col lg:flex-row`) are fine.
- **Tailwind 4 arbitrary values:** `top-(--nav-height)` when the custom property is the whole value; write `var()` explicitly inside a composite; a bare `[--x]` emits invalid CSS.
- **Empirical CSS proof is mandatory for every task that adds utilities.** `npm run css:proof -- --grep '<declaration>'` must exit 0 for each new utility. If Tailwind spells a declaration differently, find its real output in `node_modules/.cache/css-proof/index.css` and prove that.
- **Identifiers print verbatim:** DOIs, URLs, citations, topic titles. Never uppercased, never truncated in an `href`. `uppercase` goes on labels only. The first topic is `Gut–brain & non-pharm therapies` with an **en dash**.
- **Anything imported from `scripts/` needs explicit `.ts` extensions**, because it runs under plain Node.
- Vitest collects only `**/*.test.ts` in Node. There is no React render testing; rendering is proven in Playwright against the production build.
- **Every e2e assertion must hold for any valid CMS content**, not only today's dataset. Content-shaped checks go on fixtures (the gallery) or on counts derived from the page's own data.
- `.env.local` in the worktree has **no** `SANITY_API_WRITE_TOKEN`. Never write to Sanity. Schema changes are limited to Task 6's `slug` validation.
- **Do not touch:** `menuItems`, the show* flags' schema, anything `project`, `home.showcaseProjects`, `siteCopy`.
- Before any `npm run test:e2e`, make sure nothing is listening on :3000 (`lsof -i :3000`), and never leave a server there.
- Lint baseline: 0 errors, 4 warnings (`components/global/Logo.tsx`, `e2e/brand-colour.spec.ts`). **Any new warning is a regression.**
- The visual authority for the screens is the vendored `docs/redesign-experiment/design-system/ui_kits/site/*.jsx` (Task 1). Where it and `agreed-ia.md` §3 disagree on content, the IA wins. Its hardcoded counts and example wording are mockup text; derive counts from data.
- Commit messages: conventional prefix, and end with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## Review Focus

1. **A paper with no DOI and no URL** renders a row and a page with no identifier markup and no dangling "DOI"/"URL" label. The citation omits the link. Pinned in Task 2 (`toPublication`) and in Task 3's gallery fixture.
2. **A paper with no `type`** (all 19 today): no leading " · " on the tag line, no empty `Tag`, and no Type facet group. Pinned in Task 2's unit tests and Task 4's e2e.
3. **Facet combinations that match nothing** (year + type): the empty line and "Clear filters" appear, and clearing restores every record. Pinned in Task 4's e2e using years and types read from the page itself.
4. **768–1023px widths:** rows must not overflow horizontally, and the ledger grid appears only from `lg`. Pinned in Task 4's width check.
5. **An unknown or unslugged `/publications/<x>`** returns 404 rather than a crash or an empty shell. Pinned in Task 5's e2e.

---

### Task 1: Vendor the ui_kits screens

**Files:**
- Create: `docs/redesign-experiment/design-system/ui_kits/site/{README.md,index.html,Home.jsx,LabData.jsx,People.jsx,PublicationPage.jsx,PublicationsIndex.jsx,Research.jsx}`
- Modify: `docs/redesign-experiment/design-system/README.md` (one bullet)

- [ ] **Step 1: Fetch each file** from the Claude Design project `81465533-cb59-4875-826f-7592ef09f62d` with the `mcp__claude-design__read_file` tool, path `ui_kits/site/<name>`. For files over the read cap, read in `offset`/`limit` windows until `total_lines` is covered. The tool returns HTML-entity-escaped bodies: decode `&amp;` `&lt;` `&gt;` (and `&quot;`, `&#39;` if present) back to the original characters. Write each file byte-for-byte as decoded.
- [ ] **Step 2: Verify the decoding.** `grep -c '&amp;\|&lt;\|&gt;' docs/redesign-experiment/design-system/ui_kits/site/*` must print 0 for every `.jsx` file. `LabData.jsx` must contain the literal `Gut–brain & non-pharm therapies` with an en dash (`grep -c 'Gut–brain & non-pharm' …/LabData.jsx` → at least 1).
- [ ] **Step 3: Document it.** In `docs/redesign-experiment/design-system/README.md`, add a bullet after the `components/` bullet: `` - `ui_kits/site/` — the five screen compositions (Home, PublicationsIndex, PublicationPage, People, Research) and their content derivations, vendored 2026-09-22 for Phase 3 step 2. Composition authority for the screens; hardcoded counts and example wording in them are mockup text. ``
- [ ] **Step 4: Confirm nothing else changes.** `docs/**` is excluded from lint and type-check, and `styles/index.css` has `@source not "../docs"`, so Tailwind must not pick up classes from these files. Prove it: `npm run css:proof` succeeds, and `npm run lint && npm run type-check` are unchanged.
- [ ] **Step 5: Commit** `docs: vendor the ui_kits screen compositions from the design project`

---

### Task 2: `publicationModel.ts` — rename, `toPublication`, citation move

**Files:**
- Rename: `components/redesign/publicationRow.ts` → `components/redesign/publicationModel.ts`; `publicationRow.test.ts` → `publicationModel.test.ts` (`git mv`)
- Create: `lib/citation.ts`, `lib/citation.test.ts` (moved from `components/pages/publications/citation.ts` / `citation.test.ts`, APA only)
- Modify (imports only): `components/redesign/PublicationRow.tsx`, `facets.ts`, `facets.test.ts`, `fixtures.ts`, `app/preview/components/Gallery.tsx` (drop the explicit-extension workaround and its comment), `components/redesign/navModel.ts` (comment)
- Delete: `components/pages/publications/citation.ts`, `citation.test.ts`. The rest of that folder is deleted in Task 4. Until then `Publications.tsx` / `Publication.tsx` import `formatApaCitation` / BibTeX from `./citation`, so point those imports at `lib/citation` and keep compiling. If they use the BibTeX helpers, **move them into `lib/citation.ts` for now, marked with a `// removed in Task 4` comment**, and Task 4 deletes them with their last caller.

**Interfaces:**
- Produces, in `components/redesign/publicationModel.ts`:
  - the existing `splitAuthors`, `deriveLink`, `shortenLabel`, unchanged;
  - `interface Publication`, with the fields listed in spec §3: `id`, `href: string | null`, `dateLabel`, `abstract: string[]`, `resources: { id: string; title: string; kind: string | null }[]`, plus every existing field;
  - `function formatRef(volume: number | null, issue: number | null, pages: string | null): string`;
  - `function toPublication(p: PublicationPayload): Publication`.
- Produces `lib/citation.ts`: `interface CitationFields` and `formatApaCitation(pub: CitationFields): string`, both unchanged.

- [ ] **Step 1: Move the files.** `git mv` both files, update every import (grep `publicationRow'` and `publicationRow.ts'`), and run `npm test && npm run type-check`: green, same count. Commit `refactor: rename publicationRow.ts to publicationModel.ts to end the case collision`.
- [ ] **Step 2: Move the citation module** to `lib/citation.ts` + `lib/citation.test.ts` (per the Files note). Run `npm test`: green. Commit.
- [ ] **Step 3: Write the failing tests** by appending to `components/redesign/publicationModel.test.ts`:

```ts
import type { PublicationPayload } from 'types'

import { formatRef, toPublication } from './publicationModel'

function payload(over: Partial<PublicationPayload> = {}): PublicationPayload {
  return {
    _id: 'p1',
    title: ' Chromobox protein homolog 7 suppresses glioblastoma. ',
    author: 'Ni K., Holsinger R.M.D., Jiao J.',
    journal: 'Cell Death Discovery',
    volume: 11,
    issue: 1,
    pages: '74',
    abstract: 'First paragraph.\n\nSecond paragraph.\n\n\n',
    url: 'https://doi.org/10.1038/s41420-025-02362-7',
    doi: '10.1038/s41420-025-02362-7',
    date: '2025-02-23',
    slug: 'chromobox-2025',
    type: null,
    topics: ['Neuro-oncology & biomarkers'],
    featured: null,
    resources: [],
    ...over,
  } as PublicationPayload
}

describe('formatRef', () => {
  it.each([
    [11, 1, '74', '11(1) · 74'],
    [23, null, '11037', '23 · 11037'],
    [null, null, '38–42', '38–42'],
    [12, 2, null, '12(2)'],
    [null, null, null, ''],
  ])('%s/%s/%s -> %s', (v, i, p, out) => {
    expect(formatRef(v as number | null, i as number | null, p as string | null)).toBe(out)
  })
})

describe('toPublication', () => {
  it('maps a DOI paper', () => {
    const pub = toPublication(payload())
    expect(pub.id).toBe('p1')
    expect(pub.title).toBe('Chromobox protein homolog 7 suppresses glioblastoma.')
    expect(pub.year).toBe('2025')
    expect(pub.dateLabel).toBe('23 February 2025')
    expect(pub.href).toBe('/publications/chromobox-2025')
    expect(pub.ref).toBe('11(1) · 74')
    expect(pub.linkKind).toBe('DOI')
    expect(pub.linkLabel).toBe('10.1038/s41420-025-02362-7')
    expect(pub.linkHref).toBe('https://doi.org/10.1038/s41420-025-02362-7')
    expect(pub.authorsPI).toBe('Holsinger R.M.D.')
    expect(pub.type).toBe('')
    expect(pub.topics).toEqual(['Neuro-oncology & biomarkers'])
    expect(pub.abstract).toEqual(['First paragraph.', 'Second paragraph.'])
    expect(pub.cite).toContain('https://doi.org/10.1038/s41420-025-02362-7')
  })

  it('falls back to the URL and keeps the href whole', () => {
    const url = 'https://www.jneuro.com/abstract/diagnostic-conundrums-in-cerebellar-cryptic-arteriovenous-malformations-37612.html'
    const pub = toPublication(payload({ doi: null, url }))
    expect(pub.linkKind).toBe('URL')
    expect(pub.linkHref).toBe(url)
    expect(pub.linkLabel).toBe(url.replace('https://www.', ''))
    expect(pub.linkLabelShort!.length).toBeLessThanOrEqual(26)
  })

  it('renders no link at all when neither exists', () => {
    const pub = toPublication(payload({ doi: null, url: null }))
    expect([pub.linkKind, pub.linkLabel, pub.linkHref]).toEqual(['', '', ''])
    expect(pub.cite).not.toMatch(/https?:/)
  })

  it('tolerates missing optional data', () => {
    const pub = toPublication(
      payload({ slug: null, date: null, abstract: null, topics: null, volume: null, issue: null, pages: null } as Partial<PublicationPayload>)
    )
    expect(pub.href).toBeNull()
    expect(pub.year).toBe('')
    expect(pub.dateLabel).toBe('')
    expect(pub.abstract).toEqual([])
    expect(pub.topics).toEqual([])
    expect(pub.ref).toBe('')
  })

  it('passes the type through when set', () => {
    expect(toPublication(payload({ type: 'Review' })).type).toBe('Review')
  })

  it('maps linked resources', () => {
    const pub = toPublication(
      payload({ resources: [{ _id: 'r1', title: 'ES chamber', kind: 'hardware' }] } as Partial<PublicationPayload>)
    )
    expect(pub.resources).toEqual([{ id: 'r1', title: 'ES chamber', kind: 'hardware' }])
  })
})
```

  If the type-check shows `slug` is already non-nullable (it won't be until Task 6), keep the `as Partial<…>` cast. Task 6 revisits it.

- [ ] **Step 4: Run and confirm the failure:** `npx vitest run components/redesign/publicationModel.test.ts`. It fails because `formatRef` / `toPublication` are not exported.
- [ ] **Step 5: Implement** in `publicationModel.ts`:

```ts
import { formatApaCitation } from 'lib/citation'
import type { PublicationPayload } from 'types'

// (existing Publication interface gains:)
//   id: string
//   href: string | null
//   dateLabel: string
//   abstract: string[]
//   resources: { id: string; title: string; kind: string | null }[]

export function formatRef(volume: number | null, issue: number | null, pages: string | null): string {
  const vol = volume !== null ? `${volume}${issue !== null ? `(${issue})` : ''}` : ''
  return [vol, pages ?? ''].filter(Boolean).join(' · ')
}

const DATE_LABEL = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

export function toPublication(p: PublicationPayload): Publication {
  const title = (p.title ?? '').trim()
  const authors = (p.author ?? '').trim()
  const { pre, pi, post } = splitAuthors(authors)
  const link = deriveLink(p.doi ?? null, p.url ?? null)
  return {
    id: p._id,
    href: p.slug ? `/publications/${p.slug}` : null,
    year: p.date ? p.date.slice(0, 4) : '',
    dateLabel: p.date ? DATE_LABEL.format(new Date(`${p.date}T00:00:00Z`)) : '',
    title,
    authorsPre: pre,
    authorsPI: pi,
    authorsPost: post,
    journal: (p.journal ?? '').trim(),
    ref: formatRef(p.volume ?? null, p.issue ?? null, p.pages ?? null),
    linkKind: link?.kind ?? '',
    linkLabel: link?.label ?? '',
    linkLabelShort: link ? shortenLabel(link.label, 26) : '',
    linkHref: link?.href ?? '',
    type: p.type ?? '',
    topics: p.topics ?? [],
    cite: formatApaCitation(p),
    abstract: (p.abstract ?? '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean),
    resources: (p.resources ?? []).map((r) => ({ id: r._id, title: r.title ?? '', kind: r.kind ?? null })),
  }
}
```

  `linkKind`'s type widens to `'DOI' | 'URL' | ''`. Update the interface, and fix any consumer the type-checker names. `fixtures.ts` must build objects that satisfy the widened interface: add `id` (for example the DOI), `href: null`, `dateLabel: ''`, `abstract: []`, `resources: []`.
  Check whether `DATE_LABEL` output in Node matches `'23 February 2025'` exactly (ICU). If it does not, derive the label from a month-name array instead of `Intl`, and keep the test.
- [ ] **Step 6: Run** `npm test && npm run type-check && npm run lint`: green, 0/4.
- [ ] **Step 7: Commit** `feat: toPublication, the one mapping from query payload to publication view`

---

### Task 3: `PublicationRow` and `FacetBand` for real routes

**Files:**
- Modify: `components/redesign/PublicationRow.tsx`, `components/redesign/FacetBand.tsx`, `app/preview/components/Gallery.tsx`, `components/redesign/fixtures.ts`, `e2e/redesign-components.spec.ts`

**Interfaces:**
- Consumes: `Publication` (Task 2).
- Produces:
  - `PublicationRow` props: `{ pub; density?; variant?; narrow?; onOpen?; href?: string | null }`.
  - `FacetBand` props: unchanged. Behaviour changes: sticky only from `lg` at `var(--nav-height)`, and chip-less groups are skipped.

Behaviour required (spec §4.1–§4.2):

1. **Title element:**
   - With `href`: the title is a `next/link` `<Link href={href}>` carrying the same classes as today's `onOpen` button (`TITLE_HOVER`, `HIT_AREA`, block).
   - Else with `onOpen`: the button, as today.
   - Else: a `<span>`.
2. **Responsive layout.** Without `narrow`, the row renders the **stacked anatomy below `lg`** and the existing ledger grid **from `lg`**, for both `density` values and `variant="home"`.
   - Implement it as one DOM tree whose container classes switch at `lg`, not as two trees toggled with `hidden`: the title link must exist once, for accessibility and for e2e counting.
   - `GRID` becomes `lg:grid lg:grid-cols-[64px_1fr_230px_250px] lg:gap-x-[28px]`.
   - The stacked styling (year + journal kicker line, title, identifier line) applies below `lg` via the unprefixed classes, and cells that exist only in the ledger (authors, meta column, CopyCitation) use `hidden lg:block` / `lg:flex`.
   - **The authors line and CopyCitation must still render below `lg` in the index variant.** Only the separate journal column collapses into the kicker line.
   - Check every element's class list against the same-property rule at each breakpoint.
   - `narrow={true}` keeps forcing the stacked anatomy at every width, for the gallery's 700px specimen.
3. **Empty link.** When `pub.linkHref === ''`, render no identifier element anywhere (no "DOI"/"URL" label).
4. **Tag line.** Render `[pub.type, ...pub.topics].filter(Boolean).join(' · ')`, and omit the element when that is empty.
5. **`FacetBand` root:** `static lg:sticky lg:top-(--nav-height)` when `sticky`, `static` otherwise. Groups with `chips.length === 0` are not rendered.

- [ ] **Step 1: Gallery fixtures and e2e first.**
  - Add to `fixtures.ts` a `NO_LINK_PUB` (no DOI, no URL, `type: ''`) and give one fixture an `href: '/publications/example'`.
  - In the gallery's publication-row section, add a row for `NO_LINK_PUB` and a row using `href`.
  - In `e2e/redesign-components.spec.ts` add:
    - (a) the `href` row's title is a link with that `href`;
    - (b) the no-link row contains no `[data-identifier]` and no text matching `/^(DOI|URL)\s/`;
    - (c) at 1024px a comfortable index row's computed `display` is `grid`, and at 900px it is not `grid`.
  - Run them against the current code; (a)–(c) fail.
- [ ] **Step 2: Implement** points 1–5.
- [ ] **Step 3: CSS proof.** Each must exit 0. Also confirm in the generated file that the `lg:` grid rules sit inside `@media (width >= 64rem)`.

```bash
npm run css:proof -- --grep 'grid-template-columns: 64px 1fr 230px 250px'
npm run css:proof -- --grep 'top: var(--nav-height)'
npm run css:proof -- --grep 'position: sticky'
```
- [ ] **Step 4: Verify** (:3000 free): `npm run type-check && npm run lint && npm test && npm run test:e2e -- e2e/redesign-components.spec.ts e2e/axe.spec.ts`. The old `/publications` page still renders with its old components; that is fine.
- [ ] **Step 5: Commit** `feat: PublicationRow links, stacks below lg and drops empty identifiers; FacetBand sticks under the header`

---

### Task 4: The `/publications` index screen

**Files:**
- Create: `components/redesign/screens/PublicationsIndex.tsx`
- Modify: `app/publications/page.tsx`, `components/pages/interactive-elements-contract.test.ts`, `e2e/publications-interactive.spec.ts`, `e2e/nav-logo.spec.ts`
- Delete: every remaining file in `components/pages/publications/` (`Publications.tsx`, `Publication.tsx`, `CopyButton.tsx`, `Toggle.tsx`, `filterPublications.ts` + test, `groupByYear.ts` + test), plus any BibTeX helpers parked in `lib/citation.ts` by Task 2.

**Interfaces:**
- Consumes: `toPublication`, `Publication` (Task 2); `PublicationRow`, `FacetBand` (Task 3); `PageTitle`, `SectionRail`, `Button` (existing); `toggleFacet`, `applyFacets`, `countBy` from `facets.ts`; `TOPIC_TITLES` from `schemas/lib/topics.ts`.
- Produces: `PublicationsIndex({ publications }: { publications: Publication[] })`, `'use client'`.

Behaviour: spec §4.3, composed after `ui_kits/site/PublicationsIndex.jsx`.

- **Page:** `app/publications/page.tsx` keeps its fetch, metadata, `notFound` and ItemList JSON-LD. It renders `<Layout settings={settings} childrenStyles="px-0"><JsonLd …/><PublicationsIndex publications={publications.map(toPublication)} /></Layout>`.
- **Record-list padding:** the ui_kit's `padding: "32px var(--spacing-gutter-lg) var(--spacing-stack-lg) var(--spacing-gutter-md)"` becomes `pt-8 pr-[var(--spacing-gutter-lg)] pb-[var(--spacing-stack-lg)] pl-[var(--spacing-gutter-md)]` from `lg`. Below `lg`, use the gutter token `px-(--spacing-gutter)`, as a responsive pair per property.
- **Column heads:** a `hidden lg:grid` row with the ledger's grid template and the ui_kit's `LABEL` styling (`LABEL` from `tokens.ts` if it matches, else the ui_kit values).
- **Meta line:**
  - unfiltered: `` `${n} RECORDS · ${min}–${max}` `` (en dash), or `` `${n} RECORDS · ${year}` `` when there is one year;
  - filtered: `` `${shown} OF ${n} RECORDS SHOWN` `` with `accentMeta`.
- **Facet groups:**
  - **Year:** distinct `year` values, excluding `''`, sorted descending.
  - **Type:** `['Article', 'Review', 'Case report']` filtered to those present.
  - **Topic:** `TOPIC_TITLES` filtered to those present.
  - Counts come from `countBy`. Topic counts include every topic of every paper.
- **Density:** `['COMFORTABLE', 'COMPACT']`, mapped to the row `density`.
- **Empty result:** `<p>` "No records match these filters." plus `<Button onClick={clearAll}>Clear filters</Button>`.
- **Record identity:** each row gets `key={pub.id}` and `href={pub.href}`.

- [ ] **Step 1: Rewrite `e2e/publications-interactive.spec.ts`** before touching the page. Keep the `People role grouping` describe **verbatim** at the bottom of the file; PR B moves it. New tests:
  1. The page shows one row per record, and the meta reads `/^\d+ RECORDS · /`. Count the rows via the title links inside `main`, and compare with the digits in the meta.
  2. Clicking the first Year chip filters: every visible row's year equals the chip label, the meta switches to `/ OF \d+ RECORDS SHOWN$/`, and clicking the chip again restores the full count.
  3. The Type group, if present, filters likewise. `test.skip` with a reason when the page renders no Type group, because the type backfill hasn't run. The reason string must say so.
  4. The empty state: choose a year chip and a type chip whose combination the page's own data does not contain (compute it in the test from the rendered rows). Expect "No records match these filters." Then "Clear filters" restores the full count. Skip with a reason if no such combination exists.
  5. The density toggle: after COMPACT, a row's title element has the `truncate` class, or its computed `white-space` is `nowrap`.
  6. Copy citation: with clipboard permissions granted, clicking the first row's copy control shows the copied state, and the clipboard text contains the row's title.
  7. **DOI/URL split:** the count of rows whose identifier label starts with `DOI` plus the count starting with `URL` equals the row count, and the DOI count equals the number of `[data-identifier][href^="https://doi.org/"]` links. This replaces "exactly 10" with a self-consistent check. **Also** keep one dataset-pinned assertion, `DOI count === 10`, in a separate test named to say it pins the live dataset and why (the Phase 3B backfill), mirroring the old test's intent.
  8. A row title navigates to `/publications/<slug>` (for Task 5; mark it `test.fixme` in this task, and Task 5 turns it on).
- [ ] **Step 2: Update `e2e/nav-logo.spec.ts`.**
  - The sticky-bar test becomes: at 1280px, the FacetBand (locate it as the element containing the text "Density") has computed `position: sticky` and `top` equal to the header height.
  - At 375px its `position` is `static`.
  - Delete the year jump-link test; the jump-links are gone (spec §7).
- [ ] **Step 3: Confirm failure:** `npm run test:e2e -- e2e/publications-interactive.spec.ts` fails against the old page.
- [ ] **Step 4: Implement** `PublicationsIndex.tsx` and the page change. Delete the old folder. Update `components/pages/interactive-elements-contract.test.ts`: remove the `Toggle.tsx` entry, and add the new screen file if the contract applies to it (read the test to decide, and record the decision in the report).
- [ ] **Step 5: CSS proof** for every new utility you introduce, including `padding-left: var(--spacing-gutter-md)` and `padding-bottom: var(--spacing-stack-lg)`.
- [ ] **Step 6: Width check.** Add to `e2e/publications-interactive.spec.ts`: at 768, 1023, 1024 and 1280px, `document.documentElement.scrollWidth <= document.documentElement.clientWidth` on `/publications`.
- [ ] **Step 7: Verify** (:3000 free): `npm run type-check && npm run lint && npm test && npm run build && npm run test:e2e`. Report exact counts.
- [ ] **Step 8: Commit** `feat: rebuild /publications on the redesign primitives`

---

### Task 5: `/publications/[slug]`

**Files:**
- Create: `app/publications/[slug]/page.tsx`, `components/redesign/screens/PublicationPage.tsx`, `e2e/publication-page.spec.ts`
- Modify:
  - `lib/json-ld.ts` + `lib/json-ld.test.ts` (new `buildScholarlyArticleJsonLd`, sharing the item mapping with the list builder via one private helper);
  - `lib/paths.ts` (add `publicationPaths` → `/publications/<slug>`);
  - `lib/sanity.links.ts` (+ its test) if `resolveHref` needs a `publication` case;
  - `app/api/revalidate/route.ts` (the `publication` case also calls `revalidatePath('/publications/[slug]', 'page')`);
  - `e2e/axe.spec.ts` (add one paper path);
  - `e2e/publications-interactive.spec.ts` (un-fixme test 8).

**Interfaces:**
- Consumes: `toPublication` (Task 2); `SectionRail`, `Tag`, `CopyCitation`, `ResourceBlock`; `publicationBySlugQuery`, `publicationPaths`, `settingsQuery`, `homePageTitleQuery`; `buildMetadata`; `truncateAtWordBoundary` from `lib/text.ts`.
- Produces: `PublicationPage({ pub }: { pub: Publication })` (a server component, with no handlers of its own; `CopyCitation` is already a client component) and `buildScholarlyArticleJsonLd(p: PublicationPayload): ScholarlyArticleJsonLd & { '@context': 'https://schema.org' }`.

Behaviour: spec §4.4, composed after `ui_kits/site/PublicationPage.jsx`.

- **Page:**
  - `generateStaticParams` returns `{ slug }` for each path.
  - Fetch the settings and the publication with `stega: false` for metadata.
  - `notFound()` when the publication is null or `settings.showPublications === false`.
  - Render `<Layout settings={settings} childrenStyles="px-0"><JsonLd data={buildScholarlyArticleJsonLd(p)} /><PublicationPage pub={toPublication(p)} /></Layout>`.
- **Metadata:** `buildMetadata({ path: \`/publications/${slug}\`, siteName, baseTitle: homePageTitle, title: pub.title, description: truncateAtWordBoundary(pub.abstract[0] ?? '', 160) || undefined, image: settings.ogImage })`, following `app/publications/page.tsx`.
- **Blocks**, each in a `SectionRail` numbered in render order, so an omitted block leaves no gap in the numbering:
  1. **Paper:**
     - a link `← All publications` → `/publications`, in link colour with mono label styling;
     - an `h1` title;
     - an authors `<p>` with the PI in `<strong className="font-semibold text-text">`;
     - a mono line `[journal, ref, dateLabel].filter(Boolean).join(' · ')`;
     - `Tag`s: `type`, if any, then each topic.
  2. **Abstract:** only if `pub.abstract.length`. One `<p>` per paragraph, in the lead size.
  3. **Cite & access:**
     - Canonical-link column, only if `pub.linkHref`:
       - label `Canonical link — ${pub.linkKind}`;
       - an `<a data-identifier>` with the full `linkHref` as both `href` and text, and `break-all`;
       - the generic explanatory line from spec §4.4.
     - Citation column: a bordered box with the `cite` text (`data-identifier`, mono) and `<CopyCitation cite={pub.cite} copiedLabel="✓ COPIED — CITATION ON CLIPBOARD" />`.
     - Two columns from `lg` (`lg:grid lg:grid-cols-[1fr_1.2fr]`), stacked below.
  4. **Resource:** only if `pub.resources.length`. A `ResourceBlock` per resource: `title`, `meta={[{ label: 'KIND', value: kind ?? '—' }, { label: 'MORE', value: 'Resources', href: '/resources' }]}`.
- **JSON-LD:** `{ '@context', '@type': 'ScholarlyArticle', headline, author?, isPartOf?, datePublished?, url? }`, where `url` is the canonical link (DOI URL when there is a DOI, else `url`). Unit-test a DOI paper, a URL paper, and a paper with neither.

- [ ] **Step 1: Write the failing unit tests** for `buildScholarlyArticleJsonLd` in `lib/json-ld.test.ts`.
- [ ] **Step 2: Write `e2e/publication-page.spec.ts`:**
  - Go to `/publications`, collect the first row's `href` and a URL-fallback row's `href` (a row whose identifier label starts with `URL`), and visit each.
  - Assert: the `h1` equals the row title; the "Abstract" rail exists when the paper has one; the canonical link's `href` equals the row's identifier `href` and its text is that same full URL, verbatim; the citation box's text contains the title.
  - Copy works with clipboard permission granted.
  - `/publications/definitely-not-a-real-slug` returns status 404.
  - The page's `ScholarlyArticle` JSON-LD parses, and its `headline` equals the `h1`.
  - Un-fixme test 8 in the index spec.
- [ ] **Step 3: Confirm the failures,** then implement.
- [ ] **Step 4: Sitemap.** Add a unit test if `lib/paths` has one (else rely on e2e): `/sitemap.xml` contains at least one `/publications/` URL. Add an e2e assertion for that in `e2e/manifest-and-robots.spec.ts` if the sitemap is tested there.
- [ ] **Step 5: CSS proof** for new utilities, including `grid-template-columns: 1fr 1.2fr`.
- [ ] **Step 6: Verify** (:3000 free): `npm run type-check && npm run lint && npm test && npm run build && npm run test:e2e`. The build must now list the `/publications/[slug]` paths. Report the route count.
- [ ] **Step 7: Commit** `feat: one page per publication`

---

### Task 6: `slug` required + `backfill:publication-types`

**Files:**
- Modify: `schemas/documents/publication.ts`, `lib/sanity.queries.ts` (the stale `publicationPaths` comment), `sanity.types.ts` / generated types (via `npm run typegen`), `package.json` (script)
- Create: `scripts/publicationTypes.ts`, `scripts/publicationTypes.test.ts`, `scripts/backfill-publication-types.ts`

**Interfaces:**
- Produces: `TYPE_RULES: TypeRule[]` (`{ label; year; keyword; type: 'Article' | 'Review' | 'Case report' }`) and `matchingTypeRules(title: string, date: string | null): TypeRule[]`. The same shape as `scripts/publicationTopics.ts`, and the same matching (year equality plus lowercase substring).

- [ ] **Step 1: slug → required.** Add `validation: (Rule) => Rule.required()` to the `slug` field and rewrite its comment: the backfill ran on 2026-09-22, 19/19 slugged and unique. Run `npm run typegen`. If the generated `slug` types change, fix the fallout (fixtures, the `as` casts in `publicationModel.test.ts`) and keep `toPublication`'s null guard, because drafts can still lack a slug. Update the `publicationPaths` comment in `lib/sanity.queries.ts`, which says the live records have no slugs.
- [ ] **Step 2: Write the failing test.** `scripts/publicationTypes.test.ts` holds a table of all 19 real `[year, title]` pairs, copied from `docs/redesign-experiment/design-system/ui_kits/site/LabData.jsx` (`y` and `t`). For each pair, assert:
  - exactly one rule matches;
  - the rule's type equals that entry's `ty` in `LabData.jsx`;
  - every rule matches exactly one pair;
  - the totals are Article 11, Review 7, Case report 1.

  Import with explicit extensions: `from './publicationTypes.ts'`.
- [ ] **Step 3: Implement** `scripts/publicationTypes.ts`. Model it on `scripts/publicationTopics.ts`: pick one distinctive lowercase keyword per paper, and reuse the topic rules' keywords where they are unique within their year. The two 2023 and 2022 FMT papers are separated by year.
- [ ] **Step 4: Implement** `scripts/backfill-publication-types.ts`. Copy `backfill-publication-topics.ts`'s structure and flags exactly: dry-run by default; `--commit` requires `SANITY_API_WRITE_TOKEN`; it never overwrites an existing `type`; and it prints planned writes, unmatched papers, multiply-matched papers and unused rules. Add `"backfill:publication-types": "node scripts/backfill-publication-types.ts"` to `package.json` next to the topics script.
- [ ] **Step 5: Dry run for real.** Run `npm run backfill:publication-types`: the dataset is publicly readable and no token is needed. Paste the full output into the report. It must plan 19 writes, with no unmatched or multiple matches and no unused rules. If it doesn't, fix the rules; never loosen the checks. **Do not pass `--commit`.**
- [ ] **Step 6: Verify:** `npm run type-check && npm run lint && npm test && npm run typegen`. Typegen must be clean, and its query and schema-type counts are reported.
- [ ] **Step 7: Commit** `feat: require publication.slug; add a dry-run publication type backfill`

---

### Task 7: Record decisions

**Files:**
- Modify: `docs/redesign-experiment/phase-3-decisions.md`, `docs/redesign-experiment/phase-3-start-here.md`

- [ ] **Step 1:** Add to `phase-3-decisions.md` a "Step 2 — PR A (Publications)" section covering:
  - the ui_kits vendoring;
  - the `publicationModel` rename (it settles the carried case-collision item);
  - the spec §7 rulings (search, jump-links and BibTeX dropped; grid from `lg`; FacetBand sticky from `lg`; tags aren't links);
  - `slug` required;
  - that the type backfill must be committed by Brett;
  - the data gaps from spec §2 (zero resources; type null; researchOrder pending);
  - the Resources route ruling (index only, no slug);
  - that step 4 must move the `maestro` project's content before retiring that doc, because Home reads it;
  - the verification table with the real numbers from Task 5 Step 6.
- [ ] **Step 2:** In `phase-3-start-here.md`, mark step 2 as in progress (PR A: publications), with a pointer.
- [ ] **Step 3: Commit** `docs: Phase 3 step 2 PR A decisions`
