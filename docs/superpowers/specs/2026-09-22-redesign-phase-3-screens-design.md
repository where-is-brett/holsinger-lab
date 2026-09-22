# Redesign Phase 3, step 2 — Screens

Date: 2026-09-22. Base `redesign/integration` at `2c5d7b1` (migrations run and verified on
production). Scope: step 2 of `docs/redesign-experiment/phase-3-start-here.md`, in the plan's
order: Publications index, `/publications/[slug]`, People, Research, Resources, Home. Also
included: tightening `publication.slug` to `required()`, and deciding whether `resource` gets
its own route.

Delivered as **three PRs**, each off the integration head at the time:

| PR | Branch | Contents |
|----|--------|----------|
| A | `redesign/phase-3-publications` | Vendor the ui_kits screens; Publications index; `/publications/[slug]`; `slug` required; `backfill:publication-types` |
| B | `redesign/phase-3-people` | People |
| C | `redesign/phase-3-home` | Research, Resources, Home |

Each PR gets its own implementation plan. This spec is the shared authority.

Approvals: the PR split, the four rulings in §2, and the command centre's two notes were
approved by the command centre on Brett's behalf on 2026-09-22.

## 1. Sources of truth

- **Content and order:** `docs/redesign-experiment/design-system/agreed-ia.md` §3, the
  ordered block list per screen.
- **Composition:** the design project's `ui_kits/site/` screens (`Home.jsx`,
  `PublicationsIndex.jsx`, `PublicationPage.jsx`, `People.jsx`, `Research.jsx`,
  `LabData.jsx`, `README.md`, `index.html`). They were never vendored. PR A vendors them
  verbatim and read-only to `docs/redesign-experiment/design-system/ui_kits/site/`, beside
  `components/`.
  - Where a screen and the IA disagree on content, the IA wins.
  - Where they disagree on appearance, the screen wins.
  - The screens are static mockups. Their hardcoded counts ("19 RECORDS"), example wording
    and placeholder figures are **not** content. Every count is derived from data, and every
    placeholder is either real data or honestly absent.
- **Standing rules:** `phase-1-decisions.md` and `phase-3-decisions.md` (same-property
  rule, Tailwind 4 arbitrary values, empirical CSS proof via `npm run css:proof`,
  identifiers verbatim, no new dependencies, `scripts/` imports need extensions).

## 2. Live data, as found on 2026-09-22

| Fact | Consequence |
|------|-------------|
| 19/19 publications have unique slugs and exactly one topic | `slug` can be `required()`; the topic facet has data |
| `publication.type` is **null on all 19** | PR A ships a dry-run `backfill:publication-types`. Brett runs `--commit`. Until then the Type facet group hides itself |
| `featured` is unset on all 19 | Nothing in the IA's screens reads it; no change |
| `abstract` is a plain `text` field, present on all 19, paragraphs separated by newlines | Split on blank lines into paragraphs |
| 9 of 19 have no DOI; `url` is the fallback | `deriveLink` already does this |
| Titles can carry leading/trailing whitespace and a trailing period | Normalise at display, as `formatApaCitation` already does |
| **Zero `resource` documents** | Resources, Home block 3 and the paper page's linked-resource block render their honest empty or absent state. The lab supplies the chamber's content (command centre is raising it with Brett) |
| 6 roleGroups, ordered: Research Scientist 2 · PhD Candidate 1 · Honours Student 3 · Research Student 7 · International Interns 1 · Lab Alumni 5 | People groups are data-driven. About 22 more profiles are expected from the Wix import, mostly photo-less |
| PI profile `damian-holsinger` exists, has a page, no roleGroup, no portrait; `settings.labHead` **unset** | The spotlight must render correctly both unset and set |
| `project.researchOrder` unset now. The Wix import will set it on 4 projects (FMT = 1, Glial = 2, two new = 3, 4) | Research lists `defined(researchOrder)` projects in that order, not the IA's hardcoded 2. It must handle 4+ projects and cover images of varying aspect |
| The `maestro` project holds the MAESTRO copy (overview + `site` link) | Home's MAESTRO block reads it. **Step 4 must move this content before retiring that document** |

### Rulings (approved)

1. **Resources:** one `/resources` index page. There is no `resource.slug` and no
   per-resource route: the IA gives resources no pages, and one item launches.
2. **Lab head spotlight:** comes from `settings.labHead` only. It is omitted when unset.
   When set without a portrait it shows `PersonCard`'s initials treatment. It respects
   `showLabHeadOnPeople` / `showLabHeadOnHome`.
3. **People:**
   - The **Lab Alumni** group renders as the IA's inline, comma-separated name list.
   - Every other group renders as a `PersonCard` grid with the initials fallback.
   - `roleDetail` is shown when present.
4. **MAESTRO:** content comes from the `maestro` project document, and the block is
   omitted when that document is missing. `home` keeps zero editorial fields, and
   `home.showcaseProjects` is untouched.

Still binding from the Wix track: keep the `project` type and don't retire `menuItems` or the
show* flags. Step 4 is out of scope.

## 3. Shared model: `components/redesign/publicationModel.ts`

`publicationRow.ts` is **renamed** to `publicationModel.ts`. Its test becomes
`publicationModel.test.ts`. This settles the case-insensitive collision with
`PublicationRow.tsx` that phase-1-decisions.md carried forward. The existing
`splitAuthors` / `deriveLink` / `shortenLabel` move unchanged. The `Publication` view
interface gains fields:

```ts
export interface Publication {
  // existing
  year, title, authorsPre, authorsPI, authorsPost, journal, ref,
  linkKind, linkLabel, linkLabelShort?, linkHref, type, topics, cite
  // new
  id: string          // _id, the React key
  href: string | null // `/publications/${slug}`, null when unslugged
  dateLabel: string   // "23 February 2025", en-AU long form; '' when no date
  abstract: string[]  // paragraphs; [] when none
  resources: { id: string; title: string; kind: string | null }[]
}
```

`toPublication(p: PublicationPayload): Publication` is the **only** mapping from the query
payload to the view. It is pure and unit-tested:

- **Title:** trimmed, internal whitespace preserved, never rewritten. (The trailing-period
  strip exists only in the citation.)
- **`year`:** `date.slice(0, 4)`; `''` when there is no date.
- **`ref`:** `volume(issue) · pages`, dropping absent parts:
  - `11(1) · 74`
  - `23 · 11037` (no issue)
  - `38–42` (pages only)
  - `''` (none of the three)
- **Link:** `deriveLink(doi, url)`. `linkLabel` is the full label, verbatim. `linkLabelShort`
  is `shortenLabel(label, 26)`. When there is no link at all, `linkKind` / `linkLabel` /
  `linkHref` are `''` and the row renders no identifier. Identifiers are **never** truncated
  in an `href`.
- **`type`:** `p.type ?? ''`. **`topics`:** `p.topics ?? []`.
- **`cite`:** `formatApaCitation(p)`. **`abstract`:** split on `/\n\s*\n/`, trimmed, empties
  dropped.

`formatApaCitation` moves from `components/pages/publications/citation.ts` to
`lib/citation.ts` with its tests. The BibTeX helpers are **dropped**: the design has one
citation and one copy control, and nothing else calls them (ruling below).

`PublicationPayload` gains nothing: the query already returns every field used.

## 4. PR A — Publications

### 4.1 `PublicationRow` changes (primitive)

- **`href?: string | null`.** When set, the title renders as a `next/link` to it, keeping
  the existing hover and `HIT_AREA` treatment. The index and Home rows open the paper page
  this way (IA: "each row opens the publication page").
  - `onOpen` stays for the gallery.
  - With neither prop, the title is a `<span>`, as today.
- **Responsive, replacing `narrow` for real pages.** The row is stacked below `md` and a
  ledger grid from `md`, in one component. Each breakpoint's class set is self-contained:
  every property is set once per breakpoint, so no same-property pair can collide.
  - The `narrow` prop is kept so the gallery can show the stacked anatomy at any width.
  - The ledger's 4-column grid needs about 700px of content box. The `md` rail layout at
    768px leaves less, so the grid applies from **`lg`**, and `md` keeps the stacked anatomy.
    Task 2 of the plan measures this with the e2e width check below, not by eye.
- **No identifier markup when `linkHref === ''`.**
- **Type/topic line:** join only the non-empty parts. No leading " · " when `type` is empty.

### 4.2 `FacetBand` changes (primitive)

- **Sticky only from `lg`,** at `top: var(--nav-height)`: `lg:sticky lg:top-(--nav-height)`.
  It is static below `lg`, because on a phone three wrapped chip groups plus density would
  pin half the screen.
  - The source's `top: 0` assumed a non-sticky header. This site's header is sticky
    (step 1, decision 4), which is the case the source's own comment anticipates.
- **An empty `groups` entry (no chips) is not rendered.** The Type group vanishes until the
  type backfill runs.

### 4.3 `/publications` — `app/publications/page.tsx` + `components/redesign/screens/PublicationsIndex.tsx`

Server page (unchanged responsibilities: settings, metadata, `notFound` on
`showPublications === false`, ItemList JSON-LD). It maps payloads through `toPublication`
and renders the client `PublicationsIndex` inside `Layout` with `childrenStyles="px-0"`. The
screens own their rails; Layout's gutter would double them.

`PublicationsIndex` (`'use client'`) owns the filter and density state, per the ui_kit:

1. **`PageTitle "Publications"`.** Meta, derived:
   - unfiltered: `"{n} RECORDS · {minYear}–{maxYear}"`, or `"{n} RECORDS · {year}"` when
     there is only one year;
   - filtered: `"{shown} OF {n} RECORDS SHOWN"`, with `accentMeta`.
2. **`FacetBand num="01" label="Filter"`.**
   - **Year:** every year present, descending.
   - **Type:** fixed order Article, Review, Case report. Only values present. Hidden when
     none.
   - **Topic:** taxonomy order from `schemas/lib/topics.ts`. Only topics present. Counts
     cover all of a paper's topics.
   - **Density:** COMFORTABLE / COMPACT.
   - **Note:** the ui_kit's note text verbatim.
   - Filtering uses `toggleFacet` / `applyFacets` from `facets.ts`.
3. **`SectionRail num="02" label="Record"`.**
   - The column-head row (Year · Title · Authors · Tags · Journal · Link · Cite) shows from
     `lg` only.
   - Then one `PublicationRow` per filtered paper, `href` set, in `date desc` order.
   - **Empty result:** a single line, "No records match these filters.", with a `Button`
     "Clear filters" that resets all three facets.

**Dropped from the old page:** search, year jump-links, APA/BibTeX toggle. The IA's
Publications block list is count + facets + list, and a 19-record list with three facets
doesn't need search (ruling below).

### 4.4 `/publications/[slug]` — `app/publications/[slug]/page.tsx` + `components/redesign/screens/PublicationPage.tsx`

- `generateStaticParams` from `publicationPaths`. `notFound()` when the slug is unknown or
  `showPublications === false`.
- `revalidate = 60`, matching the others.
- **Metadata:** `buildMetadata({ path: '/publications/<slug>', title: <trimmed title>,
  description: truncateAtWordBoundary(first abstract paragraph, 160) })`.
- **JSON-LD:** a single `ScholarlyArticle` (new `buildScholarlyArticleJsonLd` in
  `lib/json-ld.ts`, unit-tested, sharing the field mapping with the ItemList builder).

Blocks, per the IA with the ui_kit composition:

1. **`SectionRail 01 "Paper"`:**
   - a `← All publications` link to `/publications`;
   - `h1` title;
   - authors with the PI in `<strong>`;
   - a mono line: `journal · ref · dateLabel`, empty parts dropped;
   - `Tag`s for type (if any), then each topic. The Tags are informational, not links.
2. **`SectionRail 02 "Abstract"`:** one `<p>` per paragraph. The block is omitted when
   there are none.
3. **`SectionRail 03 "Cite & access"`:**
   - Canonical link: label `Canonical link — DOI` or `Canonical link — URL`, then the full
     `linkHref` as an identifier. The block is omitted when there is no link.
   - Explanatory line, generic: "The DOI is the paper's permanent address. Where a paper
     has none, the recorded publisher URL stands in." The ui_kit's "9 papers" count is
     mockup text.
   - Formatted citation box, with `CopyCitation cite copiedLabel="✓ COPIED — CITATION ON
     CLIPBOARD"`.
   - Two columns from `lg`, stacked below.
4. **`SectionRail 04 "Resource"`:** only when `resources.length > 0`. A `ResourceBlock`
   per linked resource (title, `KIND`), each linking to `/resources`. Absent today, because
   there are no resource documents.

### 4.5 `publication.slug` → `required()`

`schemas/documents/publication.ts`: add `validation: (Rule) => Rule.required()`, and update
the comment that explains why it was optional. Re-run `npm run typegen`. If `slug` becomes
non-nullable in the generated types, update fixtures and the `publicationPaths` comment.
The comment's "19 live records have none" is now false.

### 4.6 `backfill:publication-types`

`scripts/publicationTypes.ts` (the mapping and a pure `classify` function, unit-tested) and
`scripts/backfill-publication-types.ts` (the runner). Both are modelled on the existing
`publicationTopics.ts` / `backfill-publication-topics.ts`, including explicit `.ts`
import extensions.

- **Rules:** year + distinctive title keyword → type. There are 19 rules, taken from
  agreed-ia §2 and the ui_kit's `LabData.jsx`: Article 11 · Review 7 · Case report 1.
- **Behaviour:**
  - Dry-run by default.
  - It prints unmatched papers, multiply-matched papers, and rules that matched nothing.
  - It writes only unambiguous matches, and never overwrites an existing `type`.
  - `--commit` needs `SANITY_API_WRITE_TOKEN`. The worktree `.env.local` deliberately lacks
    it.
- The PR body carries the dry-run output. **Brett runs `--commit`.**

### 4.7 Also in PR A

- **`app/sitemap.ts`:** add `/publications/<slug>` entries.
- **`app/api/revalidate/route.ts`:** on `publication`, also `revalidatePath('/publications/[slug]', 'page')`.
- **Delete** `components/pages/publications/*` except what moves (`citation.ts` →
  `lib/citation.ts`). Delete their tests with them.
  `components/pages/interactive-elements-contract.test.ts` may reference them; update it.
- **Gallery:** switch its import to `publicationModel.ts`. `fixtures.ts` gains the new
  fields.
- **e2e:**
  - Rewrite `publications-interactive.spec.ts`: facets filter and clear; the meta line
    tracks the count; density toggles; copy-citation works; a row title navigates to its
    paper; exactly 10 rows show a `DOI` identifier and 9 a `URL`. The "People role
    grouping" describe moves to PR B untouched.
  - New `publication-page.spec.ts`: a DOI paper and a URL-fallback paper render title,
    abstract, canonical link and citation; copy works; an unknown slug 404s;
    ScholarlyArticle JSON-LD is valid.
  - `nav-logo.spec.ts`: the sticky-bar assertions retarget the FacetBand (`lg` sticky at
    the header's height). The year jump-link test is deleted with the jump-links.
  - `axe.spec.ts`: add one paper path.
  - `json-ld.spec.ts`: keep the ItemList test.
  - Width check: rows at 768 / 1023 / 1024 / 1280 never overflow horizontally, and the
    ledger grid appears only from `lg`.

## 5. PR B — People (design level; its plan details it)

`app/people/page.tsx` + `components/redesign/screens/People.tsx`, rebuilt per the ui_kit:

1. **`PageTitle "People"`.** Meta derived from data: `LAB HEAD + {n} CURRENT MEMBERS ·
   {g} GROUPS`. "Current" excludes Lab Alumni, and "LAB HEAD +" appears only when the
   spotlight renders.
2. **`01 "Lab head"`:** from `settings.labHead` (ruling 2).
   - Portrait at 4:5, or the initials treatment.
   - Label, name `h2`, bio (portable text, rendered through the existing `CustomPortableText`
     restyled, or plain paragraphs), and email as an identifier.
   - Links to `/people/<slug>` when `hasPage`.
3. **`02 "Members"`:** every roleGroup except the alumni group, in `orderRank`.
   - Each group has a heading plus a count, then a `PersonCard` grid: 2 columns on phone,
     3 at `md`, 6 at `lg`.
   - `role` shows, with `roleDetail` appended when present.
   - Empty groups are omitted.
   - Profiles with no roleGroup, other than the lab head, go in a trailing unheaded group,
     so nobody disappears.
4. **`03 "Alumni"`:** the alumni group as one inline run of names, comma-separated, each
   linking to its page when `hasPage`. Omitted when empty. The alumni group is identified
   by title `"Lab Alumni"`; the plan pins how.
5. **`/people/[slug]`:** restyled on the same primitives (PageTitle + rails). Its data is
   unchanged.

## 6. PR C — Research, Resources, Home (design level)

- **Research** (`/research`, new): `PageTitle` with the meta `"{n} ACTIVE PROJECTS"`. One
  `SectionRail` per `defined(researchOrder)` project, in order. Each narrative has:
  - a kicker: `Since {duration.start year}`, plus tags in the accent colour;
  - an `h2` title;
  - the overview (portable text);
  - the cover image at its own aspect ratio, never cropped to a fixed box.

  Then an inverse "Enquiries" band with the IA's single enquiry line and the PI's email
  from the lab head, or `siteCopy.contact` / a constant (the plan pins which). Empty state
  when no project has `researchOrder`.
- **Resources** (`/resources`, new): `PageTitle` + one `ResourceBlock` per resource (kind,
  source paper linking to its page, how to obtain). An honest empty line when there are
  none.
- **Home:** rebuilt per the ui_kit.
  - **Identity** (site name + the IA tagline): the tagline comes from `siteCopy.hero` when
    set, else the IA text; the plan pins this.
  - **Recent work:** latest 5 by date, `variant="home"`, plus "All {n} publications →".
  - **Resource:** the first resource, or omitted.
  - **MAESTRO:** ruling 4.
  - **The lab:** the PI when `labHead` is set and `showLabHeadOnHome`; the member count;
    Support.
  - Zero editorial fields.
- **Nav:** `research` and `resources` flip to `live: true` in `navModel.ts`. `lab` stays off
  until a Lab page exists; Contact keeps standing in. The command centre decides whether
  step 2 includes a Lab page.

## 7. Rulings this spec takes

| Ruling | Why | Cost if wrong |
|--------|-----|---------------|
| Drop search, year jump-links and BibTeX from Publications | The IA's block list is count + facets + list. The design has one citation. 19 records | Re-adding search is a `FormField` above the band plus the old filter function (deleted, still in git) |
| Grid ledger from `lg`, stacked below | The 4-column grid needs ~700px of content; `md` with the rail doesn't have it | A breakpoint change |
| FacetBand sticky only from `lg` | Pinned chip groups would cover half a phone screen | One class |
| Rename `publicationRow.ts` → `publicationModel.ts` now | Settles the carried case-collision while the model is growing | None |
| Tags on the paper page are not links | No URL filter state exists, and adding it is scope | Later: `?topic=` state in the index |

## 8. Testing

Unit (vitest, `*.test.ts`) for every pure function:

- `toPublication` (every `ref` shape; link absent / DOI / URL; whitespace title; abstract
  splitting);
- `buildScholarlyArticleJsonLd`;
- type classification (19 rules, each matching exactly one real title);
- PR B/C's grouping and count helpers.

Rendering is proven in Playwright against the production build, with axe on every new
route. CSS proof for every new utility. Every e2e assertion must hold for any valid CMS
content, not just today's dataset (the lesson from step 1, and from PR #17 before it).
Content-shaped checks go on fixtures.
