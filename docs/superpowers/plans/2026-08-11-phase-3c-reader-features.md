# Phase 3C — Reader Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the reader-facing features Phase 3B's schema fields unblock: publications search + year filter + jump nav + copy-citation (APA/BibTeX) + DOI links, People role grouping, and a project `status` field — all degrading gracefully against the live dataset's current state (`doi` and `roleGroup` both unset on every document).

**Architecture:** Pure logic first (citation formatting, search/filter matching — both independently testable, no Sanity/React dependency), then the two schema-field wirings 3C needs that 3B didn't do (`doi` into `publicationsQuery`, `roleGroup` into `profileQuery`), then the UI tasks that consume them. Publications' two components (`Publication.tsx`, `Publications.tsx`) are one task, not two — they share a new required prop (`citeKey`) that only type-checks when both change together. People's role-grouping logic and its card's visual redesign are two tasks — a reviewer could approve one while rejecting the other. Project `status` is self-contained (schema + query + render in one task, avoiding a dependency-ordering trap the other query wirings don't have, since `status` doesn't exist in the schema until this task creates it).

**Tech Stack:** Next 16.3.0 App Router, Tailwind 4 semantic tokens (Phase 3A), Sanity Studio 6.9.1, Vitest, Playwright + `@axe-core/playwright`.

## Global Constraints

- **Every task ends with `npx tsc --noEmit`, `npx eslint .`, `npm run build`, and `npm test` green**, run with `NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production`.
- **Every reader-facing feature in this phase must render correctly with `doi` and `roleGroup` unset on every document** — that is the live dataset's actual current state (confirmed 2026-08-11: 0/19 publications have `doi`, 0/19 profiles have `roleGroup`) and will remain so until the lab confirms the `roleGroup` taxonomy and someone runs the DOI backfill script, both deliberately deferred by Phase 3B. Do not build anything that assumes either field is populated. Test the unset case explicitly, not just the populated case.
- **Schema changes (`status` on `project`) must regenerate `sanity.types.ts`** and be committed in the same commit as the schema edit. This phase's other two field additions (`doi`, `roleGroup`) already exist on the schema from Phase 3B — this phase only adds them to GROQ queries, which does not change `sanity.types.ts`'s per-document types (it changes the query-result types, which come from the same generation step — still run `npm run typegen` after any query edit).
- **Citation and search-matching tests use real field values from the live dataset** (project `j3f9z8os`, dataset `production`, queried 2026-08-11), not invented data, for anything where realism affects correctness — this phase's own research surfaced a real BibTeX cite-key collision (two 2023 publications share "Olufunmilayo" as first author) that an invented fixture would likely have missed.
- **No normalisation of the 19 existing `author`/`role` free-text strings.** Search matches them as-is (design doc §1.1: a normalisation layer "nobody can fully trust"); citation formatting only trims whitespace and a redundant trailing period, it does not rewrite name order or spelling.
- **This phase does not touch `schemas/documents/publication.ts` or `schemas/documents/profile.ts`** — both already have the fields this phase needs from Phase 3B. Only `schemas/documents/project.ts` gets a schema change.

---

## File Structure

| File | Responsibility after this phase |
|---|---|
| `components/pages/publications/citation.ts` | Pure functions: APA citation formatting, BibTeX formatting, BibTeX cite-key assignment (with collision disambiguation). |
| `components/pages/publications/filterPublications.ts` | Pure functions: search-query + year matching, distinct-years extraction. |
| `components/pages/publications/CopyButton.tsx` | Small reusable "copy to clipboard, then show confirmation" button. |
| `components/pages/publications/Publication.tsx` | Gains a `citeKey` prop, a DOI link, citation text built from `citation.ts` with copy buttons; the pre-existing swapped Abstract/Citation comments are fixed. |
| `components/pages/publications/Publications.tsx` | Becomes a client component: search input, year-filter select, jump nav, year-section `id`s; computes cite keys once for the whole list. |
| `components/pages/people/groupByRoleGroup.ts` | Pure function: buckets profiles by `roleGroup` in a fixed order, "Other" catch-all last, empty buckets omitted. |
| `components/pages/people/People.tsx` | Renders one `<section>` per non-empty role-group bucket instead of one flat grid. |
| `components/pages/people/Profile.tsx` | Card gets a frame + grayscale-to-colour hover treatment (design doc §1.2's suggested mitigation for heterogeneous source photography). |
| `schemas/documents/project.ts` | Gains a `status` field (`active` / `completed` / `seeking-students`, optional). |
| `components/pages/project/ProjectPage.tsx` | Renders `status` in the metadata strip; the `duration?.start!` non-null assertion is replaced with real optional handling. |
| `lib/sanity.queries.ts` | `publicationsQuery` gains `doi`; `profileQuery` gains `roleGroup`; `projectBySlugQuery` gains `status`. |
| `e2e/*.spec.ts` | New coverage for search/filter/jump-nav/copy/role-grouping; `axe.spec.ts` re-verified, not expected to change. |

---

## Task 1: Citation formatting (`citation.ts`)

**Files:**
- Create: `components/pages/publications/citation.ts`
- Create: `components/pages/publications/citation.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `formatApaCitation(pub: CitationFields): string`, `formatBibtexCitation(pub: CitationFields, citeKey: string): string`, `assignBibtexCiteKeys<T extends {_id, author, date}>(publications: T[]): Map<string, string>`, and the `CitationFields` interface — used by Task 4.

**Real fixtures used below** — three publications from the live dataset (project `j3f9z8os`, queried 2026-08-11), chosen because their raw field values exercise real messiness: `CBX7`'s title carries a leading space and a redundant trailing period in the stored data; `BIOCHIMIE_2020` has `volume`/`issue` both `null`. A fourth pair, `OLUFUNMILAYO_SEPT`/`OLUFUNMILAYO_FEB`, are two genuinely distinct 2023 publications that both start with "Olufunmilayo" as first author — a real BibTeX cite-key collision this plan's own research found while preparing fixtures, not a hypothetical.

- [ ] **Step 1: Write the failing tests**

Create `components/pages/publications/citation.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  assignBibtexCiteKeys,
  formatApaCitation,
  formatBibtexCitation,
} from './citation'

// Real field values from the live dataset (project j3f9z8os, dataset production),
// queried 2026-08-11.
const CBX7 = {
  author:
    'Ni K., Liu Y., DI P., Wang L., Huang H., Holsinger R.M.D., Kiang K.M. and Jiao J.',
  title:
    ' Chromobox protein homolog 7 suppresses the stem-like phenotype of glioblastoma cells by regulating the myosin heavy chain 9-NF-κB signaling pathway. ',
  journal: 'Cell Death Discovery',
  volume: 11,
  issue: 1,
  pages: '74',
  date: '2025-02-23',
  doi: null,
  url: 'https://doi.org/10.1038/s41420-025-02362-7',
}

const BIOCHIMIE_2020 = {
  author: 'Elangovan, S., Holsinger, RMD.',
  title:
    "Cyclical amyloid beta-astrocyte activity induces oxidative stress in Alzheimer's disease.",
  journal: 'Biochimie',
  volume: null,
  issue: null,
  pages: '38-42',
  date: '2020-02-20',
  doi: null,
  url: 'https://doi.org/10.1016/j.biochi.2020.02.003',
}

describe('formatApaCitation', () => {
  it('formats a full record, trimming whitespace and a redundant trailing period from the title', () => {
    expect(formatApaCitation(CBX7)).toBe(
      'Ni K., Liu Y., DI P., Wang L., Huang H., Holsinger R.M.D., Kiang K.M. and Jiao J. (2025). Chromobox protein homolog 7 suppresses the stem-like phenotype of glioblastoma cells by regulating the myosin heavy chain 9-NF-κB signaling pathway. Cell Death Discovery, 11(1), 74. https://doi.org/10.1038/s41420-025-02362-7'
    )
  })

  it('omits the volume/issue block and its comma entirely when both are absent', () => {
    expect(formatApaCitation(BIOCHIMIE_2020)).toBe(
      "Elangovan, S., Holsinger, RMD. (2020). Cyclical amyloid beta-astrocyte activity induces oxidative stress in Alzheimer's disease. Biochimie, 38-42. https://doi.org/10.1016/j.biochi.2020.02.003"
    )
  })

  it('prefers doi over url when both are present', () => {
    const withBoth = { ...CBX7, doi: '10.1038/s41420-025-02362-7', url: 'https://example.com/wrong' }
    const result = formatApaCitation(withBoth)
    expect(result).toContain('https://doi.org/10.1038/s41420-025-02362-7')
    expect(result).not.toContain('example.com')
  })

  it('falls back to "n.d." when date is missing', () => {
    expect(formatApaCitation({ ...CBX7, date: null })).toContain('(n.d.)')
  })

  it('falls back gracefully when author/title are missing', () => {
    const result = formatApaCitation({ ...CBX7, author: null, title: null })
    expect(result).toContain('Unknown author')
    expect(result).toContain('Untitled')
  })
})

describe('assignBibtexCiteKeys', () => {
  // Real collision: two 2023 publications share "Olufunmilayo" as first author --
  // the INPP5D/SHIP1 review (2023-09-23) and the Oxidative Stress paper
  // (2023-02-18). publicationsQuery sorts date desc, so September is encountered
  // first in list order.
  const OLUFUNMILAYO_SEPT = {
    _id: 'a',
    author: 'Olufunmilayo, E. and Holsinger, R.M.D.',
    date: '2023-09-23',
  }
  const OLUFUNMILAYO_FEB = {
    _id: 'b',
    author: 'Olufunmilayo, E., Gerke, M., Holsinger, R.M.D.',
    date: '2023-02-18',
  }
  const UNRELATED = {
    _id: 'c',
    author: 'Mirza, F., Zahid, S., Holsinger, R.M.D.',
    date: '2023-03-02',
  }

  it('assigns the bare key to the first occurrence and an "a" suffix to the next collision', () => {
    const keys = assignBibtexCiteKeys([OLUFUNMILAYO_SEPT, OLUFUNMILAYO_FEB, UNRELATED])
    expect(keys.get('a')).toBe('olufunmilayo2023')
    expect(keys.get('b')).toBe('olufunmilayo2023a')
    expect(keys.get('c')).toBe('mirza2023')
  })

  it('assigns a "b" suffix to a third collision', () => {
    const third = { _id: 'd', author: 'Olufunmilayo, E.', date: '2023-01-01' }
    const keys = assignBibtexCiteKeys([OLUFUNMILAYO_SEPT, OLUFUNMILAYO_FEB, third])
    expect(keys.get('d')).toBe('olufunmilayo2023b')
  })

  it('strips non-ASCII characters from the base key', () => {
    // Real author string (2020-11-06 piezoelectric thin-films paper) -- stored
    // with a leading space in the live dataset.
    const keys = assignBibtexCiteKeys([
      { _id: 'e', author: ' Gaukås NH, Huynh QS, Pratap AA.', date: '2020-11-06' },
    ])
    expect(keys.get('e')).toBe('gauks2020')
  })

  it('falls back to "unknown" when author is null or empty', () => {
    const keys = assignBibtexCiteKeys([{ _id: 'f', author: null, date: '2022-01-01' }])
    expect(keys.get('f')).toBe('unknown2022')
  })
})

describe('formatBibtexCitation', () => {
  it('formats a complete @article entry, only including fields that are present', () => {
    const result = formatBibtexCitation(CBX7, 'ni2025')
    expect(result).toBe(
      `@article{ni2025,
  author = {Ni K., Liu Y., DI P., Wang L., Huang H., Holsinger R.M.D., Kiang K.M. and Jiao J.},
  title = {Chromobox protein homolog 7 suppresses the stem-like phenotype of glioblastoma cells by regulating the myosin heavy chain 9-NF-κB signaling pathway},
  journal = {Cell Death Discovery},
  year = {2025},
  volume = {11},
  number = {1},
  pages = {74},
  url = {https://doi.org/10.1038/s41420-025-02362-7},
}`
    )
  })

  it('omits volume/number when absent, and prefers doi over url when doi is set', () => {
    const withDoi = { ...BIOCHIMIE_2020, doi: '10.1016/j.biochi.2020.02.003' }
    const result = formatBibtexCitation(withDoi, 'elangovan2020')
    expect(result).not.toContain('volume')
    expect(result).not.toContain('number')
    expect(result).toContain('doi = {10.1016/j.biochi.2020.02.003}')
    expect(result).not.toContain('url =')
  })

  it('escapes literal braces in a field value', () => {
    const result = formatBibtexCitation({ ...CBX7, title: 'A {weird} title' }, 'x2025')
    expect(result).toContain('title = {A weird title}')
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npx vitest run components/pages/publications/citation.test.ts
```

Expected: FAIL — the module doesn't exist yet.

- [ ] **Step 3: Implement `citation.ts`**

```ts
export interface CitationFields {
  author: string | null
  title: string | null
  journal: string | null
  volume: number | null
  issue: number | null
  pages: string | null
  date: string | null
  doi: string | null
  url: string | null
}

function citationYear(date: string | null): string {
  return date ? date.slice(0, 4) : 'n.d.'
}

/**
 * Trims whitespace and strips one redundant trailing period. The live dataset's
 * raw title strings sometimes carry both (e.g. one is stored as
 * " ...pathway. " with a leading space and a trailing ". ") -- this function
 * exists so the caller can append exactly one period without producing "..".
 * Display-time normalisation only; it never writes back to Sanity.
 */
function normalizeTitle(title: string | null): string {
  const trimmed = (title ?? '').trim()
  if (!trimmed) return 'Untitled'
  return trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed
}

/**
 * Trims whitespace only -- unlike the title, author strings legitimately end
 * in a period as an abbreviation marker (e.g. "Holsinger RMD."), so stripping
 * a trailing period here would corrupt real data.
 */
function normalizeAuthor(author: string | null): string {
  const trimmed = (author ?? '').trim()
  return trimmed || 'Unknown author'
}

/** Formats an APA-shaped citation as plain text -- the same string is used for display and for the copy-to-clipboard action, since the clipboard only ever carries plain text anyway. */
export function formatApaCitation(pub: CitationFields): string {
  const year = citationYear(pub.date)
  const author = normalizeAuthor(pub.author)
  const title = normalizeTitle(pub.title)
  const journal = pub.journal?.trim()
  const volumeIssue =
    pub.volume !== null
      ? `, ${pub.volume}${pub.issue !== null ? `(${pub.issue})` : ''}`
      : ''
  const pagesPart = pub.pages ? `, ${pub.pages}` : ''
  const journalPart = journal ? ` ${journal}${volumeIssue}${pagesPart}.` : ''
  const link = pub.doi ? `https://doi.org/${pub.doi}` : pub.url?.trim()

  return `${author} (${year}). ${title}.${journalPart}${link ? ` ${link}` : ''}`
}

/** Base cite key: first "word" of the author string (through the first space/comma), ASCII-only, lowercased, plus the year. Not unique across a list on its own -- see assignBibtexCiteKeys. */
function bibtexCiteKeyBase(author: string | null, date: string | null): string {
  const year = citationYear(date)
  const firstToken = (author ?? '').trim().split(/[\s,]+/)[0] ?? ''
  const asciiToken = firstToken.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${asciiToken || 'unknown'}${year}`
}

/**
 * Assigns a unique BibTeX cite key to each publication in `publications`, keyed
 * by `_id`. Two publications can share the same first-author-token + year --
 * this dataset has three such pairs (verified against the live data while
 * writing this plan, e.g. two 2023 publications both starting "Olufunmilayo").
 * The first occurrence in list order keeps the bare key; later ones get an
 * a/b/c/... suffix, matching the convention reference managers like
 * Zotero/Mendeley use to disambiguate.
 */
export function assignBibtexCiteKeys<
  T extends { _id: string; author: string | null; date: string | null },
>(publications: T[]): Map<string, string> {
  const seenCounts = new Map<string, number>()
  const keys = new Map<string, string>()

  for (const pub of publications) {
    const base = bibtexCiteKeyBase(pub.author, pub.date)
    const count = seenCounts.get(base) ?? 0
    seenCounts.set(base, count + 1)
    const suffix = count === 0 ? '' : String.fromCharCode(96 + count) // 1 -> 'a', 2 -> 'b', ...
    keys.set(pub._id, `${base}${suffix}`)
  }

  return keys
}

/** Strips BibTeX's field-terminating braces so free-text values don't break the entry. */
function escapeBibtexField(value: string): string {
  return value.replace(/[{}]/g, '')
}

/**
 * Formats a BibTeX @article entry. Every publication in this corpus is a
 * journal article (verified against the live dataset, design doc §1.1) --
 * @article is a stated assumption, not a guess, and would need revisiting if
 * a non-journal-article record is ever added (the publication schema has no
 * type field to check).
 */
export function formatBibtexCitation(pub: CitationFields, citeKey: string): string {
  const year = citationYear(pub.date)
  const fields: [string, string | null][] = [
    ['author', normalizeAuthor(pub.author)],
    ['title', normalizeTitle(pub.title)],
    ['journal', pub.journal?.trim() ?? null],
    ['year', year],
    ['volume', pub.volume !== null ? String(pub.volume) : null],
    ['number', pub.issue !== null ? String(pub.issue) : null],
    ['pages', pub.pages],
    ['doi', pub.doi],
    ['url', pub.doi ? null : (pub.url?.trim() ?? null)],
  ]

  const body = fields
    .filter((entry): entry is [string, string] => entry[1] !== null && entry[1] !== '')
    .map(([key, value]) => `  ${key} = {${escapeBibtexField(value)}},`)
    .join('\n')

  return `@article{${citeKey},\n${body}\n}`
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run components/pages/publications/citation.test.ts
```

Expected: PASS, all cases.

- [ ] **Step 5: Verify and commit**

```bash
npx tsc --noEmit && npx eslint . && npm run build && npm test
```

```bash
git add components/pages/publications/citation.ts components/pages/publications/citation.test.ts
git commit -m "feat: add APA/BibTeX citation formatting with cite-key disambiguation

formatApaCitation/formatBibtexCitation build plain-text citations
(the same string serves display and copy-to-clipboard). Both trim
whitespace and a redundant trailing period from titles, matching
real messiness found in the live dataset's stored strings.

assignBibtexCiteKeys disambiguates first-author+year collisions
across a list with an a/b/c suffix -- a real requirement, not
speculative: three pairs of live publications collide on this basis,
found while preparing this task's test fixtures.

Tested against real field values from the live dataset, not invented
data, per design doc §5."
```

---

## Task 2: Search and year filtering (`filterPublications.ts`)

**Files:**
- Create: `components/pages/publications/filterPublications.ts`
- Create: `components/pages/publications/filterPublications.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `filterPublications<T>(publications: T[], filter: PublicationFilter): T[]`, `getAvailableYears(publications): string[]`, and the `PublicationFilter`/`FilterablePublication` interfaces — used by Task 4.

- [ ] **Step 1: Write the failing tests**

Create `components/pages/publications/filterPublications.test.ts`. Fixtures are built from real field values (titles/authors/journals from the live dataset) plus one short, clearly-synthetic abstract for the abstract-matching case — design doc §5's "real data" mandate is about DOI/URL parsing and Crossref specifically; free-text search matching has no format assumptions to get wrong, so a representative fixture is sufficient here.

```ts
import { describe, expect, it } from 'vitest'

import { filterPublications, getAvailableYears } from './filterPublications'

const CBX7 = {
  _id: 'cbx7',
  title:
    'Chromobox protein homolog 7 suppresses the stem-like phenotype of glioblastoma cells',
  author: 'Ni K., Liu Y., Holsinger R.M.D.',
  journal: 'Cell Death Discovery',
  abstract: null,
  date: '2025-02-23',
}

const PHARMACEUTICALS = {
  _id: 'pharma',
  title:
    'Fiber and Electrical Field Alignment Increases BDNF Expression in SH-SY5Y Cells following Electrical Stimulation',
  author: 'Huynh Q-S, Holsinger RMD.',
  journal: 'Pharmaceuticals',
  abstract: 'Electrical stimulation has shown promise in promoting neural growth.',
  date: '2023-01-17',
}

const BIOCHIMIE = {
  _id: 'biochimie',
  title:
    "Cyclical amyloid beta-astrocyte activity induces oxidative stress in Alzheimer's disease",
  author: 'Elangovan, S., Holsinger, RMD.',
  journal: 'Biochimie',
  abstract: 'Amyloid beta accumulation is a hallmark of Alzheimer’s disease pathology.',
  date: '2020-02-20',
}

const ALL = [CBX7, PHARMACEUTICALS, BIOCHIMIE]

describe('filterPublications', () => {
  it('matches a title substring, case-insensitively', () => {
    expect(filterPublications(ALL, { query: 'CHROMOBOX' }).map((p) => p._id)).toEqual(['cbx7'])
  })

  it('matches an author substring', () => {
    expect(filterPublications(ALL, { query: 'huynh' }).map((p) => p._id)).toEqual(['pharma'])
  })

  it('matches a journal substring', () => {
    expect(filterPublications(ALL, { query: 'pharmaceuticals' }).map((p) => p._id)).toEqual([
      'pharma',
    ])
  })

  it('matches an abstract substring', () => {
    expect(filterPublications(ALL, { query: 'amyloid beta' }).map((p) => p._id)).toEqual([
      'biochimie',
    ])
  })

  it('returns everything for an empty or whitespace-only query', () => {
    expect(filterPublications(ALL, { query: '' })).toHaveLength(3)
    expect(filterPublications(ALL, { query: '   ' })).toHaveLength(3)
  })

  it('filters by year', () => {
    expect(filterPublications(ALL, { year: '2020' }).map((p) => p._id)).toEqual(['biochimie'])
  })

  it('treats an empty year as "all years"', () => {
    expect(filterPublications(ALL, { year: '' })).toHaveLength(3)
  })

  it('combines query and year as AND, not OR', () => {
    expect(filterPublications(ALL, { query: 'amyloid', year: '2020' })).toHaveLength(1)
    expect(filterPublications(ALL, { query: 'amyloid', year: '2023' })).toHaveLength(0)
  })

  it('buckets a null date under "Undated" for the year filter', () => {
    const undated = { ...CBX7, date: null }
    expect(filterPublications([undated], { year: 'Undated' })).toHaveLength(1)
    expect(filterPublications([undated], { year: '2025' })).toHaveLength(0)
  })
})

describe('getAvailableYears', () => {
  it('returns distinct years in input order (assumes date-desc-sorted input)', () => {
    expect(getAvailableYears(ALL)).toEqual(['2025', '2023', '2020'])
  })

  it('returns an empty array for an empty input', () => {
    expect(getAvailableYears([])).toEqual([])
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npx vitest run components/pages/publications/filterPublications.test.ts
```

Expected: FAIL — the module doesn't exist yet.

- [ ] **Step 3: Implement `filterPublications.ts`**

```ts
export interface FilterablePublication {
  _id: string
  title: string | null
  author: string | null
  journal: string | null
  abstract: string | null
  date: string | null
}

export interface PublicationFilter {
  query?: string
  year?: string
}

/** Case-insensitive substring match across title, author, journal, and abstract. */
function matchesQuery(pub: FilterablePublication, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const haystack = [pub.title, pub.author, pub.journal, pub.abstract]
    .filter((field): field is string => field !== null)
    .join(' \n ')
    .toLowerCase()
  return haystack.includes(needle)
}

function matchesYear(pub: FilterablePublication, year: string): boolean {
  if (!year) return true
  return (pub.date?.slice(0, 4) ?? 'Undated') === year
}

/** Filters `publications` by a free-text query (title/author/journal/abstract, case-insensitive substring) and/or an exact year, combined as AND. Either filter alone matches everything when empty. */
export function filterPublications<T extends FilterablePublication>(
  publications: T[],
  filter: PublicationFilter
): T[] {
  const query = filter.query ?? ''
  const year = filter.year ?? ''
  return publications.filter((pub) => matchesQuery(pub, query) && matchesYear(pub, year))
}

/**
 * Distinct years present in `publications`, in input order (descending, since
 * publicationsQuery sorts date desc) -- the year filter's option list. Single
 * pass assuming same-year entries are already contiguous, same assumption
 * groupByYear.ts documents and relies on.
 */
export function getAvailableYears(publications: FilterablePublication[]): string[] {
  const years: string[] = []
  for (const pub of publications) {
    const year = pub.date?.slice(0, 4) ?? 'Undated'
    if (years[years.length - 1] !== year) years.push(year)
  }
  return years
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run components/pages/publications/filterPublications.test.ts
```

Expected: PASS, all cases.

- [ ] **Step 5: Verify and commit**

```bash
npx tsc --noEmit && npx eslint . && npm run build && npm test
```

```bash
git add components/pages/publications/filterPublications.ts components/pages/publications/filterPublications.test.ts
git commit -m "feat: add publications search and year filtering

filterPublications matches a free-text query against
title/author/journal/abstract (case-insensitive substring) and an
exact year, combined as AND -- no normalisation of the existing
messy author strings, per design doc §1.1's finding that a
normalisation layer 'nobody can fully trust' isn't worth building at
this corpus size.

getAvailableYears extracts the year-filter's option list."
```

---

## Task 3: Wire `doi` and `roleGroup` into the reader-facing queries

**Files:**
- Modify: `lib/sanity.queries.ts`
- Modify: `sanity.types.ts` (regenerated)

**Interfaces:**
- Consumes: nothing (the `doi`/`roleGroup` schema fields already exist from Phase 3B).
- Produces: `PublicationPayload` gains `doi: string | null`; `ProfilePayload` gains `roleGroup: 'lab-head' | 'research-scientist' | 'phd-student' | 'honours-student' | 'research-student' | 'undergraduate' | 'alumni' | null` — both via `types/index.ts`'s existing typegen-derived re-exports, no changes needed there. Used by Task 4 (`doi`) and Task 5 (`roleGroup`).

- [ ] **Step 1: Add the two fields**

In `lib/sanity.queries.ts`, add `doi` to `publicationsQuery` (after `url`, before `date`) and `roleGroup` to `profileQuery` (after `role`, before `email`):

```ts
export const publicationsQuery = groq`
  *[_type == "publication"] | order(date desc) {
    _id,
    title,
    author,
    journal,
    volume,
    issue,
    pages,
    abstract,
    url,
    doi,
    date,
  }
`

export const profileQuery = groq`
  *[_type == "profile"] | order(orderRank) {
    _id,
    image,
    orderRank,
    name,
    role,
    roleGroup,
    email,
    phone,
    bio
  }
`
```

- [ ] **Step 2: Regenerate TypeGen**

```bash
export NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production
npm run typegen
git diff sanity.types.ts
```

Expected: `PublicationsQueryResult`'s array-element type gains `doi: string | null`; `ProfileQueryResult`'s gains `roleGroup: ... | null` with the seven-value union plus `null`.

- [ ] **Step 3: Confirm the payload types picked it up**

```bash
npx tsc --noEmit
```

This alone won't fail if the fields aren't used anywhere yet (Tasks 4/5 consume them) — just confirms nothing broke. Then spot-check by temporarily adding `console.log(typeof publication.doi)` in `Publication.tsx` mentally (don't actually add it) — or more directly, grep the regenerated file:

```bash
grep -A2 "doi" sanity.types.ts | grep -B1 "string | null" | head -5
```

Expected: shows `doi` typed `string | null` somewhere in the diff.

- [ ] **Step 4: Verify and commit**

```bash
npx tsc --noEmit && npx eslint . && npm run build && npm test
```

```bash
git add lib/sanity.queries.ts sanity.types.ts
git commit -m "feat: wire doi and roleGroup into the reader-facing queries

publicationsQuery now selects doi (added to the publication schema
in Phase 3B); profileQuery now selects roleGroup. Both are currently
unset on every live document -- 0/19 publications have doi, 0/19
profiles have roleGroup, confirmed against production. Tasks 4 and 5
build the reader-facing features that consume these fields, and both
must degrade correctly against that unset state."
```

---

## Task 4: Publications page — search, filter, jump nav, DOI links, citation

**Files:**
- Create: `components/pages/publications/CopyButton.tsx`
- Modify: `components/pages/publications/Publication.tsx`
- Modify: `components/pages/publications/Publications.tsx`

**Interfaces:**
- Consumes: `formatApaCitation`, `formatBibtexCitation`, `assignBibtexCiteKeys` (Task 1); `filterPublications`, `getAvailableYears` (Task 2); `publication.doi` (Task 3).
- Produces: `Publication` gains a required `citeKey: string` prop — this is why this task changes both files together, not separately (a `Publications.tsx` that doesn't pass `citeKey` and a `Publication.tsx` that requires it can't both type-check at the same commit).

This task has no new pure-logic tests of its own — Tasks 1 and 2 already tested the logic it wires together. Its own verification is the manual/Playwright check in Steps 4-5 plus Task 8's e2e coverage.

- [ ] **Step 1: Add the copy-to-clipboard button**

Create `components/pages/publications/CopyButton.tsx`:

```tsx
'use client'

import { useState } from 'react'

export function CopyButton({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false)

  const handleClick = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      // Stable accessible name even while the visible text flips to
      // "Copied!" -- without this, an e2e test (or a screen reader) that
      // locates the button by its accessible name loses track of it the
      // instant the click succeeds, since the name would otherwise change
      // along with the visible text.
      aria-label={label}
      className="underline hover:cursor-pointer"
    >
      {copied ? 'Copied!' : label}
    </button>
  )
}
```

- [ ] **Step 2: Redesign `Publication.tsx`**

Replace the full file:

```tsx
'use client'
import { LaunchIcon } from '@sanity/icons/Launch'
import { useState } from 'react'
import type { PublicationPayload } from 'types'

import { formatApaCitation, formatBibtexCitation } from './citation'
import { CopyButton } from './CopyButton'
import { Toggle, ToggleContent } from './Toggle'

export default function Publication({
  publication,
  citeKey,
}: {
  publication: PublicationPayload
  citeKey: string
}) {
  const [showAbstract, setShowAbstract] = useState(false)
  const [showCitation, setShowCitation] = useState(false)
  const handleShowCitation = () => {
    setShowAbstract(false) // Hide abstract
    setShowCitation(!showCitation) // Toggle citation visibility
  }
  const handleShowAbstract = () => {
    setShowCitation(false) // Hide citation
    setShowAbstract(!showAbstract) // Toggle abstract visibility
  }

  const { title, author, journal, volume, issue, pages, abstract, url, doi, date } =
    publication

  const parsedDate = date ? new Date(Date.parse(date)) : null
  const month = parsedDate
    ? new Intl.DateTimeFormat('en-AU', { month: 'long' }).format(parsedDate)
    : ''
  const year = parsedDate
    ? new Intl.DateTimeFormat('en-AU', { year: 'numeric' }).format(parsedDate)
    : ''

  const citationFields = { title, author, journal, volume, issue, pages, date, doi, url }
  const apaCitation = formatApaCitation(citationFields)
  const bibtexCitation = formatBibtexCitation(citationFields, citeKey)

  return (
    <div className="inline-block w-full max-w-3xl text-sm">
      <div className="space-y-2">
        <h2 className="font-ariana text-lg md:text-xl">
          {url ? (
            <a
              href={url}
              target="_blank"
              className="flex items-start justify-between hover:underline"
            >
              {title}
              <LaunchIcon className="relative shrink-0" />
            </a>
          ) : (
            title
          )}
        </h2>
        <h3 className="font-ariana font-light md:text-base lg:text-lg">
          {author}
        </h3>
        <div className="flex flex-wrap items-center gap-4 font-ariana md:text-base lg:text-lg">
          <div>
            {journal}. {`${month} ${year}`}
          </div>
          {doi && (
            <a
              href={`https://doi.org/${doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-link hover:underline"
            >
              DOI: {doi}
            </a>
          )}
          <div>
            {/* Abstract */}
            {abstract && (
              <Toggle
                show={showAbstract}
                callback={handleShowAbstract}
                showMessage="Abstract"
                hideMessage="Abstract"
              />
            )}
            {/* Citation */}
            <Toggle
              show={showCitation}
              callback={handleShowCitation}
              showMessage="Citation"
              hideMessage="Citation"
            />
          </div>
        </div>
      </div>

      {/* CONTENT */}
      {/* Citation */}
      <ToggleContent show={showCitation}>
        <div className="m-4 space-y-2 lg:text-lg">
          <p>{apaCitation}</p>
          <div className="flex gap-4 text-sm">
            <CopyButton label="Copy APA" text={apaCitation} />
            <CopyButton label="Copy BibTeX" text={bibtexCitation} />
          </div>
        </div>
      </ToggleContent>
      {/* Abstract */}
      <ToggleContent show={showAbstract}>
        <p className="m-4 md:text-base lg:text-lg">{abstract}</p>
      </ToggleContent>
    </div>
  )
}
```

This fixes the pre-existing swapped Abstract/Citation comments in the CONTENT section (design doc §1.1) as a side effect of rewriting that block correctly — the `show={showCitation}`/`show={showAbstract}` wiring itself was already correct and is unchanged, only the comments (and now the content built from `citation.ts`) changed. The DOI link renders only when `doi` is set — on every publication today, that's none of them, so this line simply doesn't render anywhere until the backfill runs.

- [ ] **Step 3: Redesign `Publications.tsx`**

Replace the full file:

```tsx
'use client'

import { useMemo, useState } from 'react'
import type { PublicationPayload } from 'types'

import { assignBibtexCiteKeys } from './citation'
import { filterPublications, getAvailableYears } from './filterPublications'
import { groupByYear } from './groupByYear'
import Publication from './Publication'

const Publications = ({
  publications,
}: {
  publications: PublicationPayload[]
}) => {
  const [query, setQuery] = useState('')
  const [year, setYear] = useState('')

  // Computed from the full, unfiltered list -- cite keys and the year option
  // list must stay stable as the user types a search query, not shrink/change
  // out from under them.
  const years = useMemo(() => getAvailableYears(publications), [publications])
  const citeKeys = useMemo(() => assignBibtexCiteKeys(publications), [publications])

  const filtered = useMemo(
    () => filterPublications(publications, { query, year }),
    [publications, query, year]
  )
  const groups = useMemo(() => groupByYear(filtered), [filtered])

  return (
    <>
      <h1 className="mb-8 text-3xl font-black md:text-5xl">Publications</h1>

      <div className="sticky top-16 z-0 mb-8 flex flex-col gap-4 border-b border-rule bg-surface/95 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, author, journal, or abstract"
          aria-label="Search publications"
          className="w-full rounded border border-field bg-surface px-3 py-2 md:max-w-sm"
        />
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="publication-year-filter" className="text-sm text-text-muted">
            Year
          </label>
          <select
            id="publication-year-filter"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="rounded border border-field bg-surface px-2 py-1"
          >
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {years.length > 1 && (
            <nav aria-label="Jump to year" className="flex flex-wrap gap-2 text-sm">
              {years.map((y) => (
                <a key={y} href={`#year-${y}`} className="text-link hover:underline">
                  {y}
                </a>
              ))}
            </nav>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mb-16 text-text-muted">No publications match your search.</p>
      ) : (
        <div className="mb-16 space-y-10">
          {groups.map(({ year: groupYear, publications: yearPublications }) => (
            <section key={groupYear} id={`year-${groupYear}`}>
              <h2 className="mb-5 text-3xl font-bold lg:text-4xl">{groupYear}</h2>
              <ul className="ml-0 space-y-6">
                {yearPublications.map((publication) => (
                  <li key={publication._id}>
                    <Publication
                      publication={publication}
                      citeKey={citeKeys.get(publication._id) ?? 'unknown'}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  )
}

export default Publications
```

Note `top-16` on the sticky controls bar (64px) — chosen to clear `MobileNavBar.tsx`'s explicit `h-16` fixed header. Desktop's `DesktopNavBar.tsx` is `sticky top-0`, not fixed-height in the same explicit way; Step 4 verifies this doesn't overlap at both breakpoints and adjusts if it does.

- [ ] **Step 4: Rebuild and verify visually, at both breakpoints**

```bash
export NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production
rm -rf .next && npm run build && (npm run start -- -p 3210 &)
```

In a real browser at `/publications`:
- Desktop (1280px) and mobile (375px): confirm the search/filter bar does not visually overlap the site nav when scrolled — if it does, adjust `top-16` to whatever clears both (check `getComputedStyle` on the nav's rendered height at each breakpoint if the eye isn't enough).
- Type a search term (e.g. "amyloid"): confirm the list narrows and year sections with no remaining matches disappear.
- Select a year from the dropdown: confirm the list narrows to that year only.
- Click a jump-nav year link: confirm the page scrolls to that year's section.
- Open "Citation" on any publication: confirm the APA text renders as one clean paragraph (no double periods, no stray comma when volume/issue absent), and both "Copy APA"/"Copy BibTeX" buttons are present and change to "Copied!" when clicked.
- Confirm no publication shows a "DOI:" link — expected, since `doi` is unset on all 19 live publications right now. This is the unset-state check the Global Constraints require; it is not a bug.
- Type a query matching nothing (e.g. "zzzzz"): confirm "No publications match your search." renders and no year sections show.

- [ ] **Step 5: Verify and commit**

```bash
npx tsc --noEmit && npx eslint . && npm run build && npm test
```

```bash
git add components/pages/publications/CopyButton.tsx components/pages/publications/Publication.tsx components/pages/publications/Publications.tsx
git commit -m "feat: publications search, year filter, jump nav, DOI links, citation copy

Publications.tsx becomes a client component with a search input
(title/author/journal/abstract, via Task 2's filterPublications), a
year-filter select, and a sticky jump nav with per-year anchor
links. Publication.tsx gains a DOI link (rendered only when doi is
set -- currently never, since the field is unset on all 19 live
publications) and a citation block built from Task 1's
formatApaCitation/formatBibtexCitation, each with a copy-to-clipboard
button.

Fixes the pre-existing swapped Abstract/Citation comments in the
CONTENT section (design doc §1.1) as part of rewriting that block.

Verified in a real browser at both breakpoints: search/filter
narrows the list correctly, jump nav scrolls to the right section,
copy buttons show a Copied! confirmation, and the DOI link correctly
renders nowhere against the current unset-doi dataset."
```

---

## Task 5: People role grouping

**Files:**
- Create: `components/pages/people/groupByRoleGroup.ts`
- Create: `components/pages/people/groupByRoleGroup.test.ts`
- Modify: `components/pages/people/People.tsx`

**Interfaces:**
- Consumes: `profile.roleGroup` (Task 3).
- Produces: `groupByRoleGroup<T>(profiles: T[]): RoleGroupSection<T>[]` — used by `People.tsx` in this same task (kept together since the pure function has no other consumer and splitting it into its own task would leave `People.tsx` unable to type-check until a second task landed, the same trap Task 4 avoided).

- [ ] **Step 1: Write the failing tests**

Create `components/pages/people/groupByRoleGroup.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { groupByRoleGroup } from './groupByRoleGroup'

describe('groupByRoleGroup', () => {
  it('buckets every profile under "Other" when roleGroup is unset on all of them', () => {
    // The live dataset's actual current state, 2026-08-11: 0/19 profiles have
    // roleGroup set. This is the case every reader-facing feature in this
    // phase must render correctly against.
    const profiles = [
      { _id: '1', roleGroup: null },
      { _id: '2', roleGroup: null },
    ]
    const result = groupByRoleGroup(profiles)
    expect(result).toEqual([
      { value: 'other', title: 'Other', profiles: [{ _id: '1', roleGroup: null }, { _id: '2', roleGroup: null }] },
    ])
  })

  it('buckets recognised values into their named section, in the fixed order, and preserves input order within a bucket', () => {
    const profiles = [
      { _id: '1', roleGroup: 'phd-student' },
      { _id: '2', roleGroup: 'lab-head' },
      { _id: '3', roleGroup: 'phd-student' },
    ]
    const result = groupByRoleGroup(profiles)
    expect(result.map((s) => s.value)).toEqual(['lab-head', 'phd-student'])
    expect(result.find((s) => s.value === 'phd-student')?.profiles.map((p) => p._id)).toEqual([
      '1',
      '3',
    ])
  })

  it('omits empty sections entirely', () => {
    const profiles = [{ _id: '1', roleGroup: 'alumni' }]
    const result = groupByRoleGroup(profiles)
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe('alumni')
  })

  it('puts a mix of recognised and unrecognised values in their respective buckets, Other last', () => {
    const profiles = [
      { _id: '1', roleGroup: 'undergraduate' },
      { _id: '2', roleGroup: 'not-a-real-value' },
      { _id: '3', roleGroup: null },
    ]
    const result = groupByRoleGroup(profiles)
    expect(result.map((s) => s.value)).toEqual(['undergraduate', 'other'])
    expect(result.find((s) => s.value === 'other')?.profiles.map((p) => p._id)).toEqual([
      '2',
      '3',
    ])
  })

  it('returns an empty array for an empty input', () => {
    expect(groupByRoleGroup([])).toEqual([])
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npx vitest run components/pages/people/groupByRoleGroup.test.ts
```

Expected: FAIL — the module doesn't exist yet.

- [ ] **Step 3: Implement `groupByRoleGroup.ts`**

```ts
// Must match schemas/documents/profile.ts's roleGroup option list exactly
// (Phase 3B) -- provisional, per design doc §3a, until the lab confirms it.
const ROLE_GROUPS = [
  { value: 'lab-head', title: 'Lab Head' },
  { value: 'research-scientist', title: 'Research Scientist' },
  { value: 'phd-student', title: 'PhD Student' },
  { value: 'honours-student', title: 'Honours Student' },
  { value: 'research-student', title: 'Research Student' },
  { value: 'undergraduate', title: 'Undergraduate' },
  { value: 'alumni', title: 'Alumni' },
] as const

export interface RoleGroupSection<T> {
  value: string
  title: string
  profiles: T[]
}

/**
 * Groups `profiles` by `roleGroup`, in the fixed order above, with an "Other"
 * catch-all last for unset/unrecognised values. Sections with zero members
 * are omitted. As of 2026-08-11 every live profile has roleGroup unset, so
 * this currently renders a single "Other" section holding all 19 -- the
 * named buckets appear automatically once the lab confirms the taxonomy and
 * Studio values get backfilled. No task in this plan populates roleGroup on
 * any real profile.
 */
export function groupByRoleGroup<T extends { roleGroup?: string | null }>(
  profiles: T[]
): RoleGroupSection<T>[] {
  const sections: RoleGroupSection<T>[] = ROLE_GROUPS.map((group) => ({
    ...group,
    profiles: [],
  }))
  const other: RoleGroupSection<T> = { value: 'other', title: 'Other', profiles: [] }

  for (const profile of profiles) {
    const match = sections.find((section) => section.value === profile.roleGroup)
    if (match) {
      match.profiles.push(profile)
    } else {
      other.profiles.push(profile)
    }
  }

  return [...sections, other].filter((section) => section.profiles.length > 0)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run components/pages/people/groupByRoleGroup.test.ts
```

Expected: PASS, all cases.

- [ ] **Step 5: Wire it into `People.tsx`**

Replace the full file:

```tsx
import Layout from 'components/shared/Layout'
import { ProfilePayload, SettingsPayload } from 'types'

import { groupByRoleGroup } from './groupByRoleGroup'
import Profile from './Profile'

export default function People({
  settings,
  profiles,
}: {
  settings?: SettingsPayload
  profiles: ProfilePayload[]
}) {
  const sections = groupByRoleGroup(profiles)

  return (
    <Layout settings={settings}>
      <h1 className="mb-6 text-3xl font-black md:text-5xl">People</h1>
      <div className="mb-16 space-y-12">
        {sections.map((section) => (
          <section key={section.value}>
            <h2 className="mb-4 text-2xl font-bold">{section.title}</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {section.profiles.map((profile) => (
                <div key={profile._id}>
                  <Profile profile={profile} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Layout>
  )
}
```

- [ ] **Step 6: Rebuild and verify against the live dataset**

```bash
export NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production
rm -rf .next && npm run build && (npm run start -- -p 3210 &)
```

At `/people`: confirm exactly one section renders, headed "Other", containing all 19 profiles in the same grid layout as before. This is the correct, expected result against today's data — not a bug, and it's the specific case the Global Constraints require this task to handle explicitly.

- [ ] **Step 7: Verify and commit**

```bash
npx tsc --noEmit && npx eslint . && npm run build && npm test
```

```bash
git add components/pages/people/groupByRoleGroup.ts components/pages/people/groupByRoleGroup.test.ts components/pages/people/People.tsx
git commit -m "feat: group the People page by roleGroup, with an Other fallback

groupByRoleGroup buckets profiles into the seven-item order Phase 3B
shipped, with unset/unrecognised values falling into a last-placed
Other section. Verified against the live dataset: since roleGroup is
unset on all 19 profiles today, this renders a single Other section
holding everyone, in the same grid as before -- the exact
degrade-gracefully case design doc §6's risk table requires."
```

---

## Task 6: People card redesign

**Files:**
- Modify: `components/pages/people/Profile.tsx`

**Interfaces:**
- Consumes: nothing from Tasks 1-5.
- Produces: no new API — `ImageBox`'s existing `classesWrapper` prop carries the new styling, `ImageBox.tsx` itself is untouched.

**The design.** Design doc §1.2 names the problem code can't fully fix (heterogeneous source photography: different backgrounds, headshot vs. torso crops) and suggests a mitigation: "consistent treatment, a subtle frame, a duotone or grayscale hover." This task adds a frame (a token-coloured border + rounded corner, matching Phase 3A's semantic tokens) and a grayscale-by-default, colour-on-hover treatment — applied via a Tailwind arbitrary-variant descendant selector on `classesWrapper` (`[&_img]:...`) rather than by adding a new prop to the shared `ImageBox` component, so no other `ImageBox`/`ImageContainer` call site is affected.

- [ ] **Step 1: Apply the frame and hover treatment**

In `components/pages/people/Profile.tsx`, change the `<ImageBox>` call:

```tsx
        <ImageBox
          image={profile.image}
          width={800}
          height={800}
          // Measured, not the naive "1/3 of the grid" arithmetic: the People
          // grid sits inside Layout's `md:px-gutter-md lg:px-gutter-lg` side
          // padding, which that arithmetic didn't subtract out. Real card
          // width across 768-1536px viewports measures ~23-26vw of the full
          // viewport (e.g. 320px at a 1280px viewport), not 33vw. 28vw covers
          // the measured range with a small safety margin.
          size="(min-width: 768px) 28vw, 100vw"
          alt={`Profile image of ${profile.name}`}
          // A subtle frame plus a grayscale-to-colour hover, design doc
          // §1.2's suggested mitigation for the 19 profile photos'
          // inconsistent backgrounds/crops -- can't fix heterogeneous source
          // photography, but gives every card the same visual treatment.
          // Targets the descendant <img> via an arbitrary variant rather
          // than adding a new prop to the shared ImageBox component, so no
          // other call site is affected.
          classesWrapper="relative aspect-[1/1] rounded border border-rule [&_img]:grayscale [&_img]:transition-all [&_img]:duration-300 hover:[&_img]:grayscale-0"
        />
```

Only the `classesWrapper` value changes; every other prop is unchanged.

- [ ] **Step 2: Rebuild and verify visually**

```bash
export NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production
rm -rf .next && npm run build && (npm run start -- -p 3210 &)
```

At `/people` in a real browser: confirm every card's photo renders grayscale by default with a visible thin border, and turns to full colour on hover (mouse over the image). Check at both breakpoints (375px, 1280px) that the border/rounding doesn't clip or look wrong against the aspect-square crop. Take a screenshot for the PR description (before/after, if convenient — the "before" state is straightforward to reproduce by temporarily reverting `classesWrapper`, or use `git show HEAD:components/pages/people/Profile.tsx` output as the reference).

- [ ] **Step 3: Confirm no accessibility regression**

```bash
npx playwright test e2e/axe.spec.ts
```

Expected: unchanged pass — this is a pure visual/CSS change touching no text colour or interactive semantics, so `KNOWN_VIOLATIONS` should not need updating. If axe reports anything new on `/people`, investigate before proceeding — do not add an allowlist entry to make a new finding disappear.

- [ ] **Step 4: Verify and commit**

```bash
npx tsc --noEmit && npx eslint . && npm run build && npm test
```

```bash
git add components/pages/people/Profile.tsx
git commit -m "style: frame and grayscale-hover treatment for People cards

Design doc §1.2's suggested mitigation for the 19 profile photos'
inconsistent backgrounds and crops: a subtle border/rounded frame
plus a grayscale-by-default, colour-on-hover treatment, applied via
a Tailwind descendant selector on ImageBox's existing classesWrapper
prop rather than a new prop on the shared component -- no other
ImageBox/ImageContainer call site is affected.

Verified visually at both breakpoints; axe re-run clean, no
KNOWN_VIOLATIONS change needed."
```

---

## Task 7: Project `status` field

**Files:**
- Modify: `schemas/documents/project.ts`
- Modify: `lib/sanity.queries.ts`
- Modify: `sanity.types.ts` (regenerated)
- Modify: `components/pages/project/ProjectPage.tsx`

**Interfaces:**
- Consumes: nothing from Tasks 1-6 (independent of the Publications/People work).
- Produces: `project.status: 'active' | 'completed' | 'seeking-students' | null`, surfaced in `ProjectPage.tsx`'s metadata strip.

**Two things in one task, deliberately:** this is the only schema change in Phase 3C, so — unlike `doi`/`roleGroup`, which already existed from Phase 3B and only needed query wiring — `status` needs its schema field, its query field, and its render all added together; splitting the schema addition into its own task would leave the query/render task unable to type-check until it landed.

- [ ] **Step 1: Add the `status` field to the schema**

In `schemas/documents/project.ts`, add after the `category` field:

```ts
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      description: 'Shown on the project page. Optional -- leave unset if not applicable.',
      options: {
        list: [
          { title: 'Active', value: 'active' },
          { title: 'Completed', value: 'completed' },
          { title: 'Seeking Students', value: 'seeking-students' },
        ],
        layout: 'dropdown',
      },
    }),
```

Optional, no `Rule.required()` — additive, per design doc §3a.

- [ ] **Step 2: Add it to the query and regenerate TypeGen**

In `lib/sanity.queries.ts`, add `status,` to `projectBySlugQuery` (alongside the other fields, alphabetical position after `site`):

```ts
export const projectBySlugQuery = groq`
  *[_type == "project" && slug.current == $slug][0] {
    _id,
    category,
    coverImage,
    description,
    duration,
    overview,
    site,
    "slug": slug.current,
    status,
    tags,
    title,
  }
`
```

```bash
export NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production
npm run typegen
git diff sanity.types.ts
```

Expected: `ProjectBySlugQueryResult` gains `status: 'active' | 'completed' | 'seeking-students' | null`.

- [ ] **Step 3: Render `status`, and fix the pre-existing non-null-assertion bug while in this file**

Replace `components/pages/project/ProjectPage.tsx`'s destructure and duration logic:

```tsx
export function ProjectPage({ project, settings }: ProjectPageProps) {
  const {
    category,
    coverImage,
    description,
    duration,
    overview,
    site,
    status,
    tags,
    title,
  } = project || {}

  // `duration?.start!` (the non-null assertion this replaces) was load-bearing
  // on optional data: when duration/start is unset, `new Date(undefined!)` is
  // an Invalid Date whose getFullYear() is NaN, and the render below only
  // avoided showing "NaN - Now" because `{!!(startYear && endYear) && (...)}`
  // happened to short-circuit on the falsy NaN. Replacing the assertion with
  // real optional handling keeps the same behaviour (hide the block when
  // there's no start date; show "<year> - Now" for an ongoing project with a
  // start but no end date) without depending on that coincidence.
  const startYear = duration?.start ? new Date(duration.start).getFullYear() : undefined
  const endYear = duration?.end ? new Date(duration.end).getFullYear() : 'Now'

  const STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    completed: 'Completed',
    'seeking-students': 'Seeking Students',
  }
```

Then replace the duration-block render condition (`{!!(startYear && endYear) && (`) with `{startYear && (` — the block now only depends on `startYear` being present; `endYear` always has a value (`'Now'` when unset), matching the original behaviour exactly:

```tsx
              {startYear && (
                <div className="p-3 lg:p-4">
                  <div className="text-xs md:text-sm">Duration</div>
                  <div className="text-body md:text-lg">{`${startYear} -  ${endYear}`}</div>
                </div>
              )}
```

And add the Status cell after Category, before Site:

```tsx
              {category && (
                <div className="p-3 lg:p-4">
                  <div className="text-xs md:text-sm">Category</div>
                  <div className="text-body md:text-lg">{category}</div>
                </div>
              )}

              {status && (
                <div className="p-3 lg:p-4">
                  <div className="text-xs md:text-sm">Status</div>
                  <div className="text-body md:text-lg">{STATUS_LABELS[status] ?? status}</div>
                </div>
              )}

              {site && (
```

The `STATUS_LABELS[status] ?? status` fallback means an unrecognised stored value (shouldn't happen given the schema's fixed option list, but typegen's union type is honest about what GROQ could theoretically return) still renders something rather than silently disappearing.

- [ ] **Step 4: Rebuild and verify against the live dataset**

```bash
export NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production
rm -rf .next && npm run build && (npm run start -- -p 3210 &)
```

At `/projects/publication-highlights` (or any real project route): confirm the page renders exactly as before — no "Status" cell (since `status` is unset on every live project), and the Duration cell still renders correctly for projects that have a `duration.start` value. This confirms the non-null-assertion fix preserved behaviour rather than changing it.

- [ ] **Step 5: Verify and commit**

```bash
npx tsc --noEmit && npx eslint . && npm run build && npm test
```

```bash
git add schemas/documents/project.ts lib/sanity.queries.ts sanity.types.ts components/pages/project/ProjectPage.tsx
git commit -m "feat: add project status field, surfaced on the project page

Optional status enum (Active / Completed / Seeking Students), no
required-field validation -- additive, per design doc §3a. Rendered
in ProjectPage's existing metadata strip only when set; every live
project currently has it unset, verified by rebuilding against
production.

Also replaces the duration?.start! non-null assertion design doc
§1.3 flagged as load-bearing on optional data (it produced NaN,
silently masked by a falsy-AND check) with real optional handling
that preserves the exact same rendered behaviour."
```

---

## Task 8: E2E coverage and full verification sweep

**Files:**
- Create: `e2e/publications-interactive.spec.ts`
- Modify: `e2e/axe.spec.ts` (only if Step 3 finds a real, new violation — not expected)

**Interfaces:**
- Consumes: Tasks 1-7.
- Produces: the phase's exit evidence.

- [ ] **Step 1: Write Playwright coverage for the new interactive surfaces**

Create `e2e/publications-interactive.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test.describe('publications search and filter', () => {
  test('search narrows the list to matching publications', async ({ page }) => {
    await page.goto('/publications')
    const initialCount = await page.locator('h2.font-ariana').count()
    expect(initialCount).toBeGreaterThan(0)

    await page.getByLabel('Search publications').fill('amyloid')
    await expect(async () => {
      const filteredCount = await page.locator('h2.font-ariana').count()
      expect(filteredCount).toBeGreaterThan(0)
      expect(filteredCount).toBeLessThan(initialCount)
    }).toPass()
  })

  test('a query matching nothing shows the empty-state message', async ({ page }) => {
    await page.goto('/publications')
    await page.getByLabel('Search publications').fill('zzzzznomatch')
    await expect(page.getByText('No publications match your search.')).toBeVisible()
  })

  test('the year filter narrows the list to one year', async ({ page }) => {
    await page.goto('/publications')
    const select = page.getByLabel('Year')
    const options = await select.locator('option').allTextContents()
    const aYear = options.find((o) => o !== 'All years')
    expect(aYear).toBeTruthy()

    await select.selectOption({ label: aYear as string })
    await expect(page.getByRole('heading', { level: 2, name: aYear as string })).toBeVisible()
  })

  test('a jump-nav link points at the matching year section id', async ({ page }) => {
    await page.goto('/publications')
    const jumpNav = page.getByRole('navigation', { name: 'Jump to year' })
    const firstLink = jumpNav.getByRole('link').first()
    const href = await firstLink.getAttribute('href')
    expect(href).toMatch(/^#year-/)
    const targetId = (href as string).slice(1)
    await expect(page.locator(`#${targetId}`)).toBeAttached()
  })
})

test.describe('citation copy', () => {
  test('Copy APA shows a confirmation after click', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-write'])
    await page.goto('/publications')
    await page.getByRole('button', { name: 'Citation' }).first().click()
    const copyButton = page.getByRole('button', { name: 'Copy APA' }).first()
    await copyButton.click()
    await expect(copyButton).toHaveText('Copied!')
  })
})

test.describe('DOI links degrade gracefully', () => {
  test('no publication shows a DOI link against the current unset-doi dataset', async ({
    page,
  }) => {
    await page.goto('/publications')
    await expect(page.getByText(/^DOI: /)).toHaveCount(0)
  })
})

test.describe('People role grouping', () => {
  test('renders a single "Other" section holding every profile, against the current unset-roleGroup dataset', async ({
    page,
  }) => {
    await page.goto('/people')
    await expect(page.getByRole('heading', { level: 2, name: 'Other' })).toBeVisible()
    const otherHeadings = await page.getByRole('heading', { level: 2 }).count()
    expect(otherHeadings).toBe(1)
  })
})
```

Note the last two `describe` blocks assert against the *current* live-dataset state (no `doi`, no `roleGroup` populated) — they are the explicit "degrades gracefully when unset" checks the Global Constraints require, not incidental. **If the DOI backfill or a `roleGroup` value has been applied to production by the time this task runs, these two tests will legitimately fail** — that's a signal the dataset changed underneath the plan, not a bug in the test; re-verify against the live dataset (same GROQ pattern as prior phases' Appendix A) and update the assertions to match reality before treating it as a real failure.

- [ ] **Step 2: Run the new e2e suite**

```bash
export NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production
npx playwright install --with-deps chromium
npx playwright test e2e/publications-interactive.spec.ts
```

Expected: all pass.

- [ ] **Step 3: Re-run the full axe suite**

```bash
npx playwright test e2e/axe.spec.ts
```

Expected: unchanged pass, `KNOWN_VIOLATIONS` unmodified (`/publications` and `/people` should still show `[]`). The new search input, select, and jump-nav links are all natively accessible form/anchor elements with explicit labels (`aria-label="Search publications"`, a `<label htmlFor>` on the year select, `aria-label="Jump to year"` on the nav) — if axe disagrees, fix the markup rather than adding an allowlist entry.

- [ ] **Step 4: Run everything**

```bash
npx tsc --noEmit
npx eslint .
npm test
npm run typegen && git diff --exit-code sanity.types.ts
npm run build
npx playwright test
```

Expected: all green. `npm test` now includes `citation.test.ts`, `filterPublications.test.ts`, and `groupByRoleGroup.test.ts` alongside every prior suite. The `typegen` freshness check should show **no diff** — Tasks 3 and 7 already regenerated and committed `sanity.types.ts`.

- [ ] **Step 5: Confirm the DOI/roleGroup unset-state claim one more time**

```bash
curl -s -G "https://j3f9z8os.api.sanity.io/v2023-06-21/data/query/production" \
  --data-urlencode 'query={"pubsWithDoi": count(*[_type=="publication" && defined(doi)]), "profilesWithRoleGroup": count(*[_type=="profile" && defined(roleGroup)])}'
```

Expected: `{"pubsWithDoi": 0, "profilesWithRoleGroup": 0}` — matches Step 1's tests. If either is non-zero, someone ran the Phase 3B backfill or set a `roleGroup` value since this plan was written — re-verify Step 1's two dataset-dependent tests against the new reality before merging.

- [ ] **Step 6: Commit anything Steps 2-4 changed, if applicable**

```bash
git add e2e/publications-interactive.spec.ts
git commit -m "test: e2e coverage for publications search/filter/jump-nav/citation and People grouping

Covers the new interactive surfaces Playwright didn't exercise yet:
search narrowing the list, the empty-search-result state, year
filtering, jump-nav anchor correctness, citation copy confirmation,
and two explicit degrade-gracefully checks (no DOI link renders, and
People shows a single Other section) against the live dataset's
current unset doi/roleGroup state."
```

If Step 3 or 4 required a fix, commit it separately with a message describing what broke and why.

**Exit criteria for Phase 3C:** `tsc --noEmit`, `eslint .`, `npm test`, `npm run typegen` (no diff), `npm run build`, and the full Playwright suite (including `axe.spec.ts`, unchanged) all green. `/publications` has working search, year filter, jump nav, and copy-to-clipboard APA/BibTeX citations; DOI links render for records that have one and render nowhere when none do (true for all 19 today). `/people` groups by `roleGroup` with an "Other" fallback, rendering one "Other" section today; cards have the frame/hover treatment. `project` has a `status` field surfaced on the project page. `KNOWN_VIOLATIONS` unchanged.

---

## Notes for the whole-branch reviewer

1. **Re-verify the live dataset's `doi`/`roleGroup` state before judging the two dataset-dependent e2e tests.** Task 8 Step 5's query is the ground truth; if it comes back non-zero, the two "degrades gracefully" tests in `e2e/publications-interactive.spec.ts` are testing against stale assumptions, not broken code — check the actual rendered page against the actual data before flagging either as a defect.
2. **Check `Publications.tsx`'s sticky controls bar (`top-16`) at both breakpoints independently** — Task 4's own verification step asks the implementer to do this, but a fixed pixel value chosen against one nav configuration is exactly the kind of thing worth a second look, especially since `DesktopNavBar.tsx` and `MobileNavBar.tsx` position themselves differently (`sticky top-0` vs. `fixed ... h-16`).
3. **Confirm `assignBibtexCiteKeys` is called once per render of the full publication list, not per-filtered-list.** `Publications.tsx` computes `citeKeys` from the unfiltered `publications` prop specifically so a cite key doesn't change as the user types a search query — check this wasn't accidentally wired to `filtered` instead of `publications`.
4. **Confirm no task set a `roleGroup` value or ran the DOI backfill's `--commit`** on any real document — same check as Phase 3B's whole-branch review, using the same live query (Task 8 Step 5's command).
