# Phase 3B — Studio: DOI Field, Autofill, Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `doi` field to `publication` (with validation) and a `roleGroup` field to `profile`, ship a Studio document action that autofills a publication's metadata from Crossref given a DOI, backfill the 10 machine-recoverable DOIs into the live dataset, and add field guidance to `author`/`role`/`url` — so Phase 3C can build reader-facing DOI links and role grouping on top of real data instead of blocked-on-content-model placeholders.

**Architecture:** Two pure-logic library modules first (`lib/doi.ts`, `lib/crossref.ts`), unit-tested against the real 19 publication URLs and real Crossref API responses captured from the live dataset — not invented fixtures, per design doc §5. Then two independent schema tasks add the fields those libraries validate. Then a Studio document action wires the libraries into an editor-facing "Fetch from DOI" button. Then a one-off backfill script (built and dry-run-tested in its own task; the actual write to production happens once, manually, after whole-branch review — see Global Constraints). A final task runs the full verification sweep.

**Tech Stack:** Sanity Studio 6.9.1 (`sanity` package), `@sanity/ui` 3.5.x (already installed transitively via `sanity`; this plan promotes it to a direct dependency), `@sanity/client` 7.26.2, Crossref REST API (`https://api.crossref.org/works/{doi}`, public, no auth), Vitest, Node 22's native TypeScript execution (for the standalone backfill script — no new script-runner dependency needed).

## Global Constraints

- **Every task ends with `npx tsc --noEmit`, `npx eslint .`, `npm run build`, and `npm test` green**, run with `NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production` (public values, not secrets — see `.github/workflows/ci.yml`).
- **Schema changes must regenerate `sanity.types.ts`.** Unlike Phase 3A, this phase *does* touch `schemas/`. Run `npm run typegen` after any schema edit and commit the resulting `sanity.types.ts` diff in the same commit as the schema change. CI's "Sanity TypeGen freshness" step fails the build otherwise.
- **All three schema additions are additive-only, per design doc §3a's decision:** optional fields, no `Rule.required()`, no migration, no change to any existing GROQ query (`lib/sanity.queries.ts` is untouched by this plan — 3C wires `doi`/`roleGroup` into the reader-facing queries when it consumes them). `role`, `author`, and `url` keep their existing validation; only their `description` text changes. Do not add format-enforcing validation to free-text fields that already hold inconsistent real data — it would make existing valid documents fail validation.
- **DOI/URL parsing tests use the real 19 URL strings from the live dataset**, captured 2026-08-11 and re-verified unchanged at the start of this plan (see design doc §1.9, §5). Crossref fixtures are based on real API responses captured live from `https://api.crossref.org/works/{doi}` for two of this dataset's actual DOIs, not invented JSON.
- **`roleGroup`'s option list is provisional and this phase does not backfill it.** Design doc §3a is explicit: 3B ships the field and its tooling on the list derived from the lab's current composition (Lab Head, Research Scientist, PhD Student, Honours Student, Research Student, Undergraduate, Alumni), but setting `roleGroup` on any of the 19 existing `profile` documents requires lab confirmation first, which has not happened. **No task in this plan writes a `roleGroup` value to any document.** 3C must render correctly with `roleGroup` unset on every profile.
- **The DOI backfill is a real write to the live production Sanity dataset (project `j3f9z8os`, dataset `production`) — the same dataset every visitor to the live site reads.** Task 6 builds and dry-run-tests the backfill script (dry-run only queries, no writes). The actual `--commit` run happens exactly once, after whole-branch review, with the operator's explicit go-ahead immediately beforehand — it is not something any task's subagent runs autonomously.
- **`SANITY_API_WRITE_TOKEN` is already set in this environment's `.env.local`** (confirmed present, not printed). Task 6's script reads it from the environment; nothing in this plan hardcodes or logs it.

---

## File Structure

| File | Responsibility after this phase |
|---|---|
| `lib/doi.ts` | Pure functions: bare-DOI validation, DOI extraction from a `url` string (doi.org / Wiley path shapes), input normalisation. No dependencies. |
| `lib/crossref.ts` | Pure-ish Crossref client: `fetchCrossrefWork(doi, fetchImpl?)` plus the pure helpers it composes (author formatting, date conversion, JATS-tag stripping, numeric-field parsing). Takes an injectable `fetch` for testability. |
| `schemas/documents/publication.ts` | Gains `doi` (validated via `lib/doi.ts`); `url` and `author` descriptions updated to reflect the new field split. |
| `schemas/documents/profile.ts` | Gains `roleGroup` (fixed option list, optional); `role` description updated to point at it. |
| `plugins/doiLookupAction.tsx` | New Studio document action, registered for `publication` only: reads the document's `doi`, fetches Crossref, shows a confirm dialog, patches the sibling fields on accept. |
| `sanity.config.ts` | Registers the new plugin alongside the existing ones. |
| `scripts/backfill-publication-dois.ts` | One-off/re-runnable maintenance script: finds `publication` documents missing `doi` whose `url` is machine-recoverable, and patches `doi` onto them. Dry-run by default. |
| `tsconfig.json` | Gains `allowImportingTsExtensions: true` so the backfill script (run directly by Node, which requires explicit `.ts` extensions on relative imports) can still import `lib/doi.ts` without duplicating its logic. `noEmit` is already `true`, which this option requires. |
| `package.json` | Gains `@sanity/ui` as a direct dependency (already installed transitively at 3.5.2; this pins it explicitly since Task 5 imports from it) and a `backfill:publication-dois` script. |
| `sanity.types.ts` | Regenerated twice (Tasks 3 and 4) to reflect the new fields. |

---

## Task 1: DOI parsing and validation (`lib/doi.ts`)

**Files:**
- Create: `lib/doi.ts`
- Create: `lib/doi.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `isValidDoi(value: string): boolean`, `extractDoiFromUrl(url: string): string | null`, `normalizeDoiInput(value: string): string` — used by Task 3's schema validation, Task 5's document action, and Task 6's backfill script.

- [ ] **Step 1: Write the failing tests, against the real 19 URLs**

Create `lib/doi.test.ts`. The fixture table below is the actual `url` field of all 19 live `publication` documents, queried from the production dataset (project `j3f9z8os`) on 2026-08-11 via:

```bash
curl -s -G "https://j3f9z8os.api.sanity.io/v2023-06-21/data/query/production" \
  --data-urlencode 'query=*[_type=="publication"]|order(date desc){_id,url}'
```

```ts
import { describe, expect, it } from 'vitest'

import { extractDoiFromUrl, isValidDoi, normalizeDoiInput } from './doi'

// The `url` field of all 19 live `publication` documents (project j3f9z8os,
// dataset production), queried 2026-08-11. Real data, not invented fixtures
// — design doc §1.9/§5 found the three URL shapes below only by querying the
// live dataset, and the split (10 recoverable / 9 not) is the whole reason
// this module exists.
const LIVE_PUBLICATION_URLS: { url: string; doi: string | null }[] = [
  { url: 'https://doi.org/10.1038/s41420-025-02362-7', doi: '10.1038/s41420-025-02362-7' },
  { url: 'https://doi.org/10.3390/biomedicines12020289', doi: '10.3390/biomedicines12020289' },
  { url: 'https://doi.org/10.3390/genes14101845', doi: '10.3390/genes14101845' },
  { url: 'https://www.mdpi.com/1420-3049/28/5/2306', doi: null },
  { url: 'https://www.mdpi.com/2076-3921/12/2/517', doi: null },
  { url: 'https://www.mdpi.com/1424-8247/16/2/138', doi: null },
  { url: 'https://www.mdpi.com/1422-0067/24/2/1001', doi: null },
  { url: 'https://www.mdpi.com/2073-4409/12/1/119', doi: null },
  { url: 'https://www.mdpi.com/1422-0067/23/19/11037', doi: null },
  { url: 'https://doi.org/10.1016/j.jmb.2022.167470', doi: '10.1016/j.jmb.2022.167470' },
  {
    url: 'https://www.jneuro.com/abstract/diagnostic-conundrums-in-cerebellar-cryptic-arteriovenous-malformations-37612.html',
    doi: null,
  },
  { url: 'https://onlinelibrary.wiley.com/doi/10.1002/jnr.24819', doi: '10.1002/jnr.24819' },
  { url: 'https://www.mdpi.com/1424-8247/13/11/401', doi: null },
  { url: 'https://doi.org/10.1021/acsabm.0c01111', doi: '10.1021/acsabm.0c01111' },
  { url: 'https://doi.org/10.33263/BRIAC112.86868701', doi: '10.33263/BRIAC112.86868701' },
  { url: 'https://www.mdpi.com/1424-8247/13/7/150', doi: null },
  { url: 'https://doi.org/10.1038/s41598-020-67036-z', doi: '10.1038/s41598-020-67036-z' },
  { url: 'https://doi.org/10.1016/j.biochi.2020.02.003', doi: '10.1016/j.biochi.2020.02.003' },
  { url: 'https://doi.org/10.1016/j.ygeno.2019.07.018', doi: '10.1016/j.ygeno.2019.07.018' },
]

describe('extractDoiFromUrl', () => {
  it('extracts the DOI from every one of the 19 live publication URLs correctly', () => {
    for (const { url, doi } of LIVE_PUBLICATION_URLS) {
      expect(extractDoiFromUrl(url), url).toBe(doi)
    }
  })

  it('recovers exactly 10 of the 19 (the design doc §1.9 count)', () => {
    const recoverable = LIVE_PUBLICATION_URLS.filter(({ url }) => extractDoiFromUrl(url) !== null)
    expect(recoverable).toHaveLength(10)
  })

  it('handles a dx.doi.org host the same as doi.org', () => {
    expect(extractDoiFromUrl('https://dx.doi.org/10.1038/s41420-025-02362-7')).toBe(
      '10.1038/s41420-025-02362-7'
    )
  })

  it('returns null for a non-DOI, non-Wiley URL', () => {
    expect(extractDoiFromUrl('https://example.com/not-a-doi')).toBeNull()
  })

  it('trims surrounding whitespace before matching', () => {
    expect(extractDoiFromUrl('  https://doi.org/10.1038/s41420-025-02362-7  ')).toBe(
      '10.1038/s41420-025-02362-7'
    )
  })
})

describe('isValidDoi', () => {
  it('accepts a bare DOI', () => {
    expect(isValidDoi('10.1038/s41420-025-02362-7')).toBe(true)
  })

  it('rejects a full URL', () => {
    expect(isValidDoi('https://doi.org/10.1038/s41420-025-02362-7')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isValidDoi('')).toBe(false)
  })

  it('rejects a string with no suffix after the prefix', () => {
    expect(isValidDoi('10.1038/')).toBe(false)
  })

  it('accepts every DOI recovered from the live dataset', () => {
    for (const { doi } of LIVE_PUBLICATION_URLS) {
      if (doi !== null) expect(isValidDoi(doi), doi).toBe(true)
    }
  })
})

describe('normalizeDoiInput', () => {
  it('passes a bare DOI through unchanged', () => {
    expect(normalizeDoiInput('10.1038/s41420-025-02362-7')).toBe('10.1038/s41420-025-02362-7')
  })

  it('strips a pasted doi.org URL down to the bare DOI', () => {
    expect(normalizeDoiInput('https://doi.org/10.1038/s41420-025-02362-7')).toBe(
      '10.1038/s41420-025-02362-7'
    )
  })

  it('trims whitespace', () => {
    expect(normalizeDoiInput('  10.1038/s41420-025-02362-7  ')).toBe('10.1038/s41420-025-02362-7')
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npx vitest run lib/doi.test.ts
```

Expected: FAIL — `lib/doi.ts` does not exist yet.

- [ ] **Step 3: Implement `lib/doi.ts`**

```ts
// Bare DOI, per the Crossref/DOI Handbook syntax: prefix "10." + 4-9 digits,
// "/", then any non-whitespace suffix. Deliberately permissive on the
// suffix -- DOI suffixes have no fixed shape across publishers.
const BARE_DOI_PATTERN = /^10\.\d{4,9}\/\S+$/

// The two URL shapes design doc §1.9 found to be machine-recoverable in the
// live dataset. Anything else (MDPI's /{issn}/{vol}/{iss}/{page} path,
// jneuro's /abstract/{slug}.html) does not encode a DOI in the URL at all.
const DOI_ORG_PATTERN = /^https?:\/\/(?:dx\.)?doi\.org\/(10\.\d{4,9}\/\S+)$/i
const WILEY_DOI_PATH_PATTERN = /^https?:\/\/onlinelibrary\.wiley\.com\/doi\/(10\.\d{4,9}\/\S+)$/i

/** True if `value` is a bare DOI (no scheme, no host) -- what the `doi` field stores. */
export function isValidDoi(value: string): boolean {
  return BARE_DOI_PATTERN.test(value.trim())
}

/**
 * Extracts a bare DOI from a `url`-shaped string, or returns null if the URL
 * doesn't encode one. Only handles the two recoverable shapes found in the
 * live dataset (doi.org and Wiley's /doi/ path) -- publisher URLs that don't
 * carry a DOI (MDPI, jneuro) correctly return null rather than guessing.
 */
export function extractDoiFromUrl(url: string): string | null {
  const trimmed = url.trim()
  return (
    trimmed.match(DOI_ORG_PATTERN)?.[1] ?? trimmed.match(WILEY_DOI_PATH_PATTERN)?.[1] ?? null
  )
}

/**
 * Normalises whatever an editor pastes into the `doi` field: a bare DOI
 * passes through unchanged, a full doi.org/Wiley URL is reduced to its bare
 * DOI. Used before validating or looking up a DOI, so editors don't have to
 * remember to strip the URL prefix themselves.
 */
export function normalizeDoiInput(value: string): string {
  const trimmed = value.trim()
  return extractDoiFromUrl(trimmed) ?? trimmed
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run lib/doi.test.ts
```

Expected: PASS, all cases.

- [ ] **Step 5: Verify and commit**

```bash
npx tsc --noEmit && npx eslint . && npm test
```

```bash
git add lib/doi.ts lib/doi.test.ts
git commit -m "feat: add DOI parsing/validation helpers

Bare-DOI validation, DOI extraction from a url string (doi.org and
Wiley /doi/ path shapes), and input normalisation. Tested against
the real url field of all 19 live publication documents -- 10
recoverable, 9 not, per design doc §1.9's live-dataset analysis.

Used by the doi schema field's validation (Task 3), the DOI-lookup
document action (Task 5), and the backfill script (Task 6)."
```

---

## Task 2: Crossref metadata client (`lib/crossref.ts`)

**Files:**
- Create: `lib/crossref.ts`
- Create: `lib/crossref.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 directly (takes an already-validated bare DOI as input; validation is the caller's job).
- Produces: `fetchCrossrefWork(doi: string, fetchImpl?: typeof fetch): Promise<CrossrefWorkFields>` and the `CrossrefWorkFields` interface (`title`, `author`, `journal`, `volume`, `issue`, `pages`, `date`, `abstract`) — used by Task 5's document action.

**Real fixtures.** The two fixtures below are trimmed real responses from `https://api.crossref.org/works/{doi}` for two of this dataset's actual DOIs, captured live while writing this plan (2026-08-11, corrected during Task 2's review — see the note above `CROSSREF_FIXTURE_CBX7` in Step 1) — not invented. They exercise different shapes deliberately: the first has a multi-part given name, a null `page` with a populated `article-number`, and a `<jats:title>`-wrapped abstract; the second has a genuinely absent `abstract` field, a normal `page` range, and a 7-author list exercising hyphenated and multi-part given names.

- [ ] **Step 1: Write the failing tests**

Create `lib/crossref.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  crossrefDateToIsoDate,
  fetchCrossrefWork,
  formatCrossrefAuthors,
  stripJatsTags,
} from './crossref'

describe('formatCrossrefAuthors', () => {
  it('formats "Family Initials." per author, joined by ", "', () => {
    expect(
      formatCrossrefAuthors([
        { given: 'Kaixiang', family: 'Ni' },
        { given: 'Yuankun', family: 'Liu' },
        { given: 'R. M. Damian', family: 'Holsinger' },
      ])
    ).toBe('Ni K., Liu Y., Holsinger R.M.D.')
  })

  it('drops empty/whitespace-only name parts', () => {
    expect(formatCrossrefAuthors([{ given: '  ', family: 'Ni' }])).toBe('Ni')
  })

  it('returns an empty string for no authors', () => {
    expect(formatCrossrefAuthors([])).toBe('')
  })
})

describe('crossrefDateToIsoDate', () => {
  it('formats a full year/month/day', () => {
    expect(crossrefDateToIsoDate([2025, 2, 23])).toBe('2025-02-23')
  })

  it('defaults missing month/day to 01', () => {
    expect(crossrefDateToIsoDate([2025])).toBe('2025-01-01')
  })
})

describe('stripJatsTags', () => {
  it('drops a <jats:title>Abstract</jats:title> boilerplate block entirely', () => {
    const input = '<jats:title>Abstract</jats:title>\n<jats:p>Real content here.</jats:p>'
    expect(stripJatsTags(input)).toBe('Real content here.')
  })

  it('collapses internal whitespace/newlines to single spaces', () => {
    expect(stripJatsTags('<jats:p>Line one.\n   Line two.</jats:p>')).toBe('Line one. Line two.')
  })
})

// Real Crossref API responses (trimmed to the fields this module reads),
// captured live from https://api.crossref.org/works/{doi} on 2026-08-11 for
// two of the live dataset's actual DOIs -- design doc §5's "real data, not
// invented fixtures" standard, extended from the 19 URLs (Task 1) to Crossref
// itself.
//
// Plan correction, recorded during Task 2's review. This section originally
// paired CBX7 with a second fixture for 10.1002/jnr.24819 (the wiley/GDM
// paper), claiming a "Paul J. Paasila" author and no abstract field. Neither
// was true of the live record -- the real first author is "Patrick Jarmo
// Paasila" among 12 authors, and the record does carry a JATS-wrapped
// abstract. That fixture was fabricated at plan-writing time, not captured,
// which the task's own re-review (dispatched against the live implementation)
// caught by re-fetching the DOI. It has been replaced below with a DOI that
// is genuinely abstract-less in the live Crossref data
// (10.1021/acsabm.0c01111, the piezoelectric thin-films paper -- also in
// the 19-publication dataset), keeping the "no abstract" code path tested
// against a real response rather than an invented one.
const CROSSREF_FIXTURE_CBX7 = {
  message: {
    title: [
      'Chromobox protein homolog 7 suppresses the stem-like phenotype of glioblastoma cells by regulating the myosin heavy chain 9-NF-κB signaling pathway',
    ],
    author: [
      { given: 'Kaixiang', family: 'Ni' },
      { given: 'Yuankun', family: 'Liu' },
      { given: 'Pinggang', family: 'DI' },
      { given: 'Lu', family: 'Wang' },
      { given: 'Hui', family: 'Huang' },
      { given: 'R. M. Damian', family: 'Holsinger' },
      { given: 'Karrie Mei-Yee', family: 'Kiang' },
      { given: 'Jiantong', family: 'Jiao' },
    ],
    'container-title': ['Cell Death Discovery'],
    volume: '11',
    issue: '1',
    page: undefined,
    'article-number': '74',
    published: { 'date-parts': [[2025, 2, 23]] },
    abstract:
      '<jats:title>Abstract</jats:title>\n          <jats:p>Cancer stem cells (CSCs) are significant factors in the treatment resistance and recurrence of glioblastoma.</jats:p>',
  },
}

const CROSSREF_FIXTURE_THIN_FILMS = {
  message: {
    title: [
      '<i>In Vitro</i> Biocompatibility of Piezoelectric K<sub>0.5</sub>Na<sub>0.5</sub>NbO<sub>3</sub> Thin Films on Platinized Silicon Substrates',
    ],
    author: [
      { given: 'Nikolai Helth', family: 'Gaukås' },
      { given: 'Quy-Susan', family: 'Huynh' },
      { given: 'Anishchal A.', family: 'Pratap' },
      { given: 'Mari-Ann', family: 'Einarsrud' },
      { given: 'Tor', family: 'Grande' },
      { given: 'R. M. Damian', family: 'Holsinger' },
      { given: 'Julia', family: 'Glaum' },
    ],
    'container-title': ['ACS Applied Bio Materials'],
    volume: '3',
    issue: '12',
    page: '8714-8721',
    published: { 'date-parts': [[2020, 11, 6]] },
    // No `abstract` field at all -- Crossref omits it for some records.
    // Confirmed absent on the live record, not merely undefined here.
  },
}

function fakeFetch(body: unknown, ok = true, status = 200): typeof fetch {
  return (async () =>
    ({
      ok,
      status,
      json: async () => body,
    }) as Response) as typeof fetch
}

describe('fetchCrossrefWork', () => {
  it('parses a full record, preferring article-number when page is absent', async () => {
    const result = await fetchCrossrefWork('10.1038/s41420-025-02362-7', fakeFetch(CROSSREF_FIXTURE_CBX7))
    expect(result).toEqual({
      title:
        'Chromobox protein homolog 7 suppresses the stem-like phenotype of glioblastoma cells by regulating the myosin heavy chain 9-NF-κB signaling pathway',
      author: 'Ni K., Liu Y., DI P., Wang L., Huang H., Holsinger R.M.D., Kiang K.M.Y., Jiao J.',
      journal: 'Cell Death Discovery',
      volume: 11,
      issue: 1,
      pages: '74',
      date: '2025-02-23',
      abstract: 'Cancer stem cells (CSCs) are significant factors in the treatment resistance and recurrence of glioblastoma.',
    })
  })

  it('parses a real record with no abstract field and a 7-author list', async () => {
    const result = await fetchCrossrefWork('10.1021/acsabm.0c01111', fakeFetch(CROSSREF_FIXTURE_THIN_FILMS))
    expect(result).toEqual({
      title:
        '<i>In Vitro</i> Biocompatibility of Piezoelectric K<sub>0.5</sub>Na<sub>0.5</sub>NbO<sub>3</sub> Thin Films on Platinized Silicon Substrates',
      author: 'Gaukås N.H., Huynh Q.S., Pratap A.A., Einarsrud M.A., Grande T., Holsinger R.M.D., Glaum J.',
      journal: 'ACS Applied Bio Materials',
      volume: 3,
      issue: 12,
      pages: '8714-8721',
      date: '2020-11-06',
      abstract: null,
    })
  })

  it('throws with a clear message on a 404', async () => {
    await expect(fetchCrossrefWork('10.9999/does-not-exist', fakeFetch(null, false, 404))).rejects.toThrow(
      /no crossref record found/i
    )
  })

  it('throws with a clear message on a non-404 error status', async () => {
    await expect(fetchCrossrefWork('10.1038/x', fakeFetch(null, false, 503))).rejects.toThrow(
      /crossref lookup failed \(503\)/i
    )
  })

  it('throws if the record is missing a title, journal, or date', async () => {
    await expect(
      fetchCrossrefWork('10.1038/x', fakeFetch({ message: { author: [] } }))
    ).rejects.toThrow(/missing/i)
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npx vitest run lib/crossref.test.ts
```

Expected: FAIL — `lib/crossref.ts` does not exist yet.

- [ ] **Step 3: Implement `lib/crossref.ts`**

```ts
export interface CrossrefWorkFields {
  title: string
  author: string
  journal: string
  volume: number | null
  issue: number | null
  pages: string | null
  date: string
  abstract: string | null
}

interface CrossrefAuthor {
  given?: string
  family?: string
}

interface CrossrefMessage {
  title?: string[]
  author?: CrossrefAuthor[]
  'container-title'?: string[]
  volume?: string
  issue?: string
  page?: string
  'article-number'?: string
  published?: { 'date-parts'?: number[][] }
  abstract?: string
}

/**
 * Formats a Crossref author list as "Family Initials." per author, joined by
 * ", " -- e.g. "Holsinger R.M.D.". Deliberately consistent (one separator,
 * always initials-with-dots) so DOI-sourced `author` strings stop adding to
 * the five-spellings problem design doc §1.1 found in the hand-entered data.
 */
export function formatCrossrefAuthors(authors: CrossrefAuthor[]): string {
  return authors
    .map(({ given, family }) => {
      const familyName = (family ?? '').trim()
      const initials = (given ?? '')
        .split(/[\s-]+/)
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase())
        .join('.')
      if (!familyName) return ''
      return initials ? `${familyName} ${initials}.` : familyName
    })
    .filter(Boolean)
    .join(', ')
}

/** Converts Crossref's `[year, month?, day?]` into an ISO `YYYY-MM-DD` string, defaulting a missing month/day to 01. */
export function crossrefDateToIsoDate(dateParts: number[]): string {
  const [year, month = 1, day = 1] = dateParts
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Strips Crossref's JATS XML markup out of an `abstract` string. Removes any
 * `<jats:title>` block outright (Crossref's abstracts are conventionally
 * wrapped in a redundant "Abstract" title element), strips the remaining
 * tags, and collapses whitespace.
 */
export function stripJatsTags(input: string): string {
  return input
    .replace(/<jats:title>[\s\S]*?<\/jats:title>/gi, '')
    .replace(/<\/?jats:[a-z]+[^>]*>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseNumericField(value: string | undefined): number | null {
  if (value === undefined) return null
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : null
}

/**
 * Fetches and normalises a Crossref work record for `doi` (a bare DOI, e.g.
 * `10.1038/s41420-025-02362-7`). `fetchImpl` defaults to the global `fetch`
 * and is overridable for testing.
 */
export async function fetchCrossrefWork(
  doi: string,
  fetchImpl: typeof fetch = fetch
): Promise<CrossrefWorkFields> {
  const response = await fetchImpl(`https://api.crossref.org/works/${encodeURIComponent(doi)}`)

  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? `No Crossref record found for DOI ${doi}`
        : `Crossref lookup failed (${response.status})`
    )
  }

  const body = (await response.json()) as { message: CrossrefMessage }
  const message = body.message

  const title = message.title?.[0]?.trim()
  const journal = message['container-title']?.[0]?.trim()
  const dateParts = message.published?.['date-parts']?.[0]

  if (!title || !journal || !dateParts) {
    throw new Error(`Crossref record for ${doi} is missing a title, journal, or publication date`)
  }

  return {
    title,
    author: formatCrossrefAuthors(message.author ?? []),
    journal,
    volume: parseNumericField(message.volume),
    issue: parseNumericField(message.issue),
    pages: message.page ?? message['article-number'] ?? null,
    date: crossrefDateToIsoDate(dateParts),
    abstract: message.abstract ? stripJatsTags(message.abstract) : null,
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run lib/crossref.test.ts
```

Expected: PASS, all cases.

- [ ] **Step 5: Verify and commit**

```bash
npx tsc --noEmit && npx eslint . && npm test
```

```bash
git add lib/crossref.ts lib/crossref.test.ts
git commit -m "feat: add a Crossref metadata client for DOI autofill

fetchCrossrefWork(doi) queries api.crossref.org and returns
title/author/journal/volume/issue/pages/date/abstract in the shapes
the publication schema expects: a consistently-formatted author
string (Family Initials., comma-joined), an ISO date, page falling
back to article-number when Crossref omits it, and JATS XML stripped
from the abstract.

Tested against two real Crossref responses for actual DOIs in the
live dataset, captured 2026-08-11 -- one exercises the
article-number fallback and a multi-part given name, the other a
record with no abstract field at all.

Used by the DOI-lookup document action (Task 5)."
```

---

## Task 3: `doi` field on `publication`, plus `url`/`author` guidance

**Files:**
- Modify: `schemas/documents/publication.ts`
- Modify: `sanity.types.ts` (regenerated, not hand-edited)

**Interfaces:**
- Consumes: `isValidDoi` from `lib/doi.ts` (Task 1).
- Produces: the `doi` field on `publication` documents, which Task 5's document action and Task 6's backfill script write to.

- [ ] **Step 1: Add the `doi` field and update `url`/`author` descriptions**

In `schemas/documents/publication.ts`, add the import and the new field, and update the two existing descriptions. The full field list, in order (new/changed pieces marked):

```ts
import { BookIcon } from '@sanity/icons/Book'
import { isValidDoi } from 'lib/doi'
import { defineField, defineType } from 'sanity'

export default defineType({
  type: 'document',
  name: 'publication',
  title: 'Publication',
  icon: BookIcon,
  orderings: [
    {
      title: 'Date Published',
      name: 'publicationDateDesc',
      by: [{ field: 'date', direction: 'desc' }],
    },
  ],
  fields: [
    defineField({
      name: 'author',
      title: 'Author',
      type: 'string',
      description:
        'Format: "Family Initials." per author, separated by commas -- e.g. "Holsinger R.M.D., Smith J.A." The "Fetch from DOI" action (see the DOI field below) writes this format automatically from Crossref\'s structured author data; existing records were entered by hand and are not all consistent.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Enter the full title of the Article',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'volume',
      title: 'Volume',
      type: 'number',
      description: 'Enter the Volume',
      validation: (Rule) =>
        Rule.custom((num: number | undefined) => {
          if (num !== undefined && num <= 0) {
            return 'Volume number must be a positive integer'
          }
          return true
        }),
    }),
    defineField({
      name: 'issue',
      title: 'Issue',
      type: 'number',
      description: 'Enter Issue Number',
      validation: (Rule) =>
        Rule.custom((num: number | undefined) => {
          if (num !== undefined && num <= 0) {
            return 'Issue number must be a positive integer'
          }
          return true
        }),
    }),
    defineField({
      name: 'pages',
      title: 'Pages',
      type: 'string',
      description: 'Enter pages of the chapter you wish to refer to.',
    }),
    defineField({
      name: 'journal',
      title: 'Journal',
      type: 'string',
      description: 'Enter the full title of the Journal',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'doi',
      title: 'DOI',
      type: 'string',
      description:
        'Bare DOI only, e.g. "10.1038/s41420-025-02362-7" -- no "https://doi.org/" prefix. Powers the "Fetch from DOI" action in the document menu, which autofills Title, Author, Journal, Volume, Issue, Pages, Date, and Abstract from Crossref. Leave blank if this publication has no DOI.',
      validation: (Rule) =>
        Rule.custom((value: string | undefined) => {
          if (value === undefined || value === '') return true
          return isValidDoi(value) || 'Must be a bare DOI, e.g. 10.1038/s41420-025-02362-7 (no URL prefix)'
        }),
    }),
    defineField({
      name: 'url',
      title: 'URL',
      description:
        "The publisher's article page (e.g. the journal's own URL for this article). If this publication has a DOI, enter it in the DOI field above instead -- this field no longer doubles as the DOI source.",
      type: 'url',
    }),
    defineField({
      name: 'abstract',
      title: 'Abstract',
      type: 'text',
      description: 'Brief summary or abstract of the bibliography entry.',
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      options: {
        dateFormat: 'YYYY-MM-DD',
      },
      validation: (Rule) => Rule.required(),
    }),
  ],
})
```

Note the `doi` field is placed after `journal` and before `url` — next to the field it disambiguates, matching where an editor's eye lands after reading design doc §1.9's "the two are one workstream." The `date` field's commented-out `initialValue` block (present in the current file) is left exactly as-is — out of scope for this task.

- [ ] **Step 2: Regenerate TypeGen**

```bash
export NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production
npm run typegen
git diff sanity.types.ts
```

Expected: a diff adding `doi?: string` (or similar) to the generated `Publication` document type. If nothing changes, the field didn't register — check the field was added inside the `fields` array, not outside it.

- [ ] **Step 3: Verify in Studio**

```bash
npm run dev
```

Visit `http://localhost:3000/studio/structure/publication`, open any publication, and confirm:
- A "DOI" field appears between Journal and URL, with the description text above.
- Typing `https://doi.org/10.1038/x` into it shows a validation error ("Must be a bare DOI...").
- Typing `10.1038/x` shows no error.
- Leaving it blank shows no error (optional field).
- The Author field's description now shows the new format guidance.
- The URL field's description now mentions the DOI field.

- [ ] **Step 4: Verify and commit**

```bash
npx tsc --noEmit && npx eslint . && npm test && npm run build
```

```bash
git add schemas/documents/publication.ts sanity.types.ts
git commit -m "feat: add doi field to publication, clarify url/author guidance

Additive-only (design doc §3a): optional, no required-field
validation, no existing content affected. Rule.custom rejects a
non-empty value that isn't a bare DOI (catches a pasted
https://doi.org/... URL) but accepts blank.

url's description now says it's the publisher link, not a DOI
source, now that DOI has its own field. author's description adds
the format the Crossref autofill (Task 5) will write consistently,
without imposing that format on the 19 existing hand-entered
records."
```

---

## Task 4: `roleGroup` field on `profile`, plus `role` guidance

**Files:**
- Modify: `schemas/documents/profile.ts`
- Modify: `sanity.types.ts` (regenerated, not hand-edited)

**Interfaces:**
- Consumes: nothing from prior tasks (independent of the publication/DOI work).
- Produces: the `roleGroup` field on `profile` documents, which Phase 3C's People-page grouping reads. **Not populated on any document by this plan** (Global Constraints).

- [ ] **Step 1: Add the `roleGroup` field and update `role`'s description**

In `schemas/documents/profile.ts`:

```ts
import { UserIcon } from '@sanity/icons/User'
import {
  orderRankField,
  orderRankOrdering,
} from '@sanity/orderable-document-list'
import { defineField, defineType } from 'sanity'

export default defineType({
  type: 'document',
  name: 'profile',
  title: 'People',
  icon: UserIcon,
  orderings: [orderRankOrdering],
  fields: [
    orderRankField({
      type: 'profile',
    }),

    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      description: 'Upload a profile picture',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'Enter the full name',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      description:
        'Short free-text description shown on this person\'s card, e.g. "Honours Student (BioMedEng)". Does not affect grouping on the People page -- set Role Group below for that.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'roleGroup',
      title: 'Role Group',
      type: 'string',
      description:
        'Groups this person on the public People page. Provisional list, derived from the lab\'s current composition (2026-08-11) -- confirm with the lab before relying on it for every profile. Leave unset to show under "Other".',
      options: {
        list: [
          { title: 'Lab Head', value: 'lab-head' },
          { title: 'Research Scientist', value: 'research-scientist' },
          { title: 'PhD Student', value: 'phd-student' },
          { title: 'Honours Student', value: 'honours-student' },
          { title: 'Research Student', value: 'research-student' },
          { title: 'Undergraduate', value: 'undergraduate' },
          { title: 'Alumni', value: 'alumni' },
        ],
        layout: 'dropdown',
      },
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'email',
      description: 'Optional: enter an email address',
    }),
    defineField({
      name: 'phone',
      title: 'Contact Number',
      type: 'string',
      description: 'Optional: enter a contact number',
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'text',
    }),
  ],
})
```

`roleGroup` is placed immediately after `role`, before `email`/`phone` — deliberately not required, no default value, matching design doc §3a's "ship the field and its tooling on the provisional list" without pre-populating it.

- [ ] **Step 2: Regenerate TypeGen**

```bash
export NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production
npm run typegen
git diff sanity.types.ts
```

Expected: a diff adding a `roleGroup` union/string field to the generated `Profile` document type.

- [ ] **Step 3: Verify in Studio**

```bash
npm run dev
```

Visit `http://localhost:3000/studio/structure/profile`, open any profile, and confirm:
- A "Role Group" dropdown appears after Role, with the seven options listed above.
- It can be left unset without a validation error.
- The Role field's description now mentions Role Group.

**Do not set a Role Group value on any of the 19 existing profiles** while doing this manual check — leave every profile exactly as it was (Global Constraints). If you selected one to test the dropdown, clear it back to unset before moving on.

- [ ] **Step 4: Verify and commit**

```bash
npx tsc --noEmit && npx eslint . && npm test && npm run build
```

```bash
git add schemas/documents/profile.ts sanity.types.ts
git commit -m "feat: add roleGroup field to profile, clarify role guidance

Additive-only, optional, no required-field validation. Option list
(Lab Head, Research Scientist, PhD Student, Honours Student,
Research Student, Undergraduate, Alumni) is derived from the lab's
actual composition per design doc §3a -- provisional until confirmed
with the lab, which is why this task ships the field without setting
it on any of the 19 existing profiles.

role's description now points editors at roleGroup for public-page
grouping, since role itself stays free text and does not group."
```

---

## Task 5: DOI-lookup Studio document action

**Files:**
- Create: `plugins/doiLookupAction.tsx`
- Modify: `sanity.config.ts`
- Modify: `package.json` (add `@sanity/ui` as a direct dependency)

**Interfaces:**
- Consumes: `isValidDoi`, `normalizeDoiInput` (Task 1); `fetchCrossrefWork` (Task 2); the `doi` field (Task 3).
- Produces: a "Fetch from DOI" action in the document action menu for `publication` documents.

**A note on the underlying Sanity API, verified against this repo's exact installed version (`sanity` 6.9.1) before writing this task:** `useDocumentOperation`, `DocumentActionComponent`, `DocumentActionProps`, and `DocumentActionsResolver` are all confirmed exports of the `sanity` package at this version (checked via `node_modules/sanity/lib/index.d.ts`'s re-export list). `@sanity/ui` (`useToast`) is already installed transitively at 3.5.2 via `sanity` itself — this task promotes it to a direct dependency since the code now imports from it explicitly. If `tsc` reports a shape mismatch against `DocumentActionProps`/`DocumentActionDescription` that this task's code doesn't anticipate, inspect the real interface directly rather than guessing:

```bash
grep -o "[A-Za-z_$]* as DocumentActionProps\|[A-Za-z_$]* as DocumentActionDescription" node_modules/sanity/lib/index.d.ts
# then grep for that local alias (e.g. "interface Wy" or "type Wy") in the same file
```

- [ ] **Step 1: Add `@sanity/ui` as a direct dependency**

```bash
npm install @sanity/ui@^3.5.0
```

Expected: `package.json`'s `dependencies` gains `"@sanity/ui": "^3.5.0"` (or whatever the installed range resolves to), and `package-lock.json` updates. Since 3.5.2 is already present transitively (installed via `sanity`), this should not change the resolved version — confirm with:

```bash
git diff package.json
npm ls @sanity/ui
```

Expected: `npm ls` shows a single deduplicated `@sanity/ui@3.5.2` (or current transitive version), not a second copy.

- [ ] **Step 2: Write the document action**

Create `plugins/doiLookupAction.tsx`:

```tsx
import { SearchIcon } from '@sanity/icons/Search'
import { useToast } from '@sanity/ui'
import { fetchCrossrefWork } from 'lib/crossref'
import { isValidDoi, normalizeDoiInput } from 'lib/doi'
import { useCallback, useState } from 'react'
import {
  type DocumentActionComponent,
  type DocumentActionProps,
  type DocumentActionsResolver,
  useDocumentOperation,
} from 'sanity'

interface PublicationPatch {
  title: string
  author: string
  journal: string
  volume: number | null
  issue: number | null
  pages: string | null
  date: string
  abstract: string | null
}

const DoiLookupAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const { id, type, draft, published, onComplete } = props
  const { patch } = useDocumentOperation(id, type)
  const toast = useToast()

  const [loading, setLoading] = useState(false)
  const [pendingPatch, setPendingPatch] = useState<PublicationPatch | null>(null)

  const doc = draft ?? published
  const doiValue = typeof doc?.doi === 'string' ? doc.doi : undefined
  const normalizedDoi = doiValue ? normalizeDoiInput(doiValue) : undefined
  const isLookupable = Boolean(normalizedDoi && isValidDoi(normalizedDoi))

  const runLookup = useCallback(async () => {
    if (!normalizedDoi) return
    setLoading(true)
    try {
      const work = await fetchCrossrefWork(normalizedDoi)
      setPendingPatch(work)
    } catch (err) {
      toast.push({
        status: 'error',
        title: 'Crossref lookup failed',
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setLoading(false)
    }
  }, [normalizedDoi, toast])

  const applyPatch = useCallback(() => {
    if (!pendingPatch) return

    // Sanity patches don't take `null` for "no value" -- unset those fields
    // instead of setting them to null (e.g. Crossref returning no abstract).
    const setFields: Record<string, string | number> = {}
    const unsetFields: string[] = []
    for (const [key, value] of Object.entries(pendingPatch)) {
      if (value === null) {
        unsetFields.push(key)
      } else {
        setFields[key] = value
      }
    }

    const patches = []
    if (Object.keys(setFields).length > 0) patches.push({ set: setFields })
    if (unsetFields.length > 0) patches.push({ unset: unsetFields })
    patch.execute(patches)

    setPendingPatch(null)
    toast.push({ status: 'success', title: 'Publication fields updated from Crossref' })
    onComplete()
  }, [pendingPatch, patch, onComplete, toast])

  const cancelPatch = useCallback(() => {
    setPendingPatch(null)
  }, [])

  return {
    label: loading ? 'Fetching from Crossref…' : 'Fetch from DOI',
    icon: SearchIcon,
    disabled: !isLookupable || loading,
    title: isLookupable ? undefined : 'Set a valid DOI above first, e.g. 10.1038/s41420-025-02362-7',
    onHandle: runLookup,
    dialog: pendingPatch && {
      type: 'confirm',
      message: `Overwrite Title, Author, Journal, Volume, Issue, Pages, Date, and Abstract with Crossref data for ${normalizedDoi}?\n\nTitle: ${pendingPatch.title}\nAuthor: ${pendingPatch.author}`,
      onConfirm: applyPatch,
      onCancel: cancelPatch,
    },
  }
}

export const doiLookupPlugin = () => ({
  name: 'doiLookupPlugin',
  document: {
    actions: ((prev, { schemaType }) => {
      if (schemaType !== 'publication') return prev
      return [...prev, DoiLookupAction]
    }) satisfies DocumentActionsResolver,
  },
})
```

- [ ] **Step 3: Register the plugin**

In `sanity.config.ts`, add the import and register it in the `plugins` array, after `singletonPlugin`:

```ts
import { apiVersion, dataset, previewSecretId, projectId } from 'lib/sanity.api'
import { doiLookupPlugin } from 'plugins/doiLookupAction'
import { previewDocumentNode } from 'plugins/previewPane'
import { productionUrl } from 'plugins/productionUrl'
import { pageStructure, singletonPlugin } from 'plugins/settings'
```

```ts
  plugins: [
    structureTool({
      structure: pageStructure([home, settings]),
      defaultDocumentNode: previewDocumentNode({ apiVersion, previewSecretId }),
    }),
    media(),
    singletonPlugin([home.name, settings.name]),
    doiLookupPlugin(),
    productionUrl({
      apiVersion,
      previewSecretId,
      types: PREVIEWABLE_DOCUMENT_TYPES,
    }),
    unsplashImageAsset(),
  ],
```

- [ ] **Step 4: Verify tsc catches any real API mismatch**

```bash
npx tsc --noEmit
```

If this reports an error inside `plugins/doiLookupAction.tsx`, use the grep technique in this task's header note to find the real shape (`DocumentActionProps`/`DocumentActionDescription`'s actual field names) in `node_modules/sanity/lib/index.d.ts`, and adjust the code to match — do not silence the error with `any`.

- [ ] **Step 5: Verify in Studio, against a real DOI**

```bash
export NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production
npm run dev
```

In `http://localhost:3000/studio/structure/publication`:
1. Open the publication titled "Chromobox protein homolog 7 suppresses..." (already has `url: https://doi.org/10.1038/s41420-025-02362-7`, but no `doi` field value yet at this point in the plan).
2. Type `10.1038/s41420-025-02362-7` into the DOI field.
3. Open the document actions menu (the "⋮" or the action button row). Confirm "Fetch from DOI" is present and **enabled**.
4. Click it. Expected: label briefly reads "Fetching from Crossref…", then a confirm dialog appears showing the real title and author string.
5. Click confirm. Expected: a success toast, and Title/Author/Journal/Volume/Issue/Pages/Date/Abstract are all populated in the form with real Crossref data (do not publish this test edit — discard the draft via Studio's "Discard changes" so the live document is untouched; this is a manual verification step, not the backfill).
6. Clear the DOI field. Confirm "Fetch from DOI" becomes **disabled**, with a tooltip explaining why.
7. Type an invalid value (`not-a-doi`) into the DOI field. Confirm the field shows a validation error and the action stays disabled.

- [ ] **Step 6: Verify and commit**

```bash
npx tsc --noEmit && npx eslint . && npm test && npm run build
```

```bash
git add plugins/doiLookupAction.tsx sanity.config.ts package.json package-lock.json
git commit -m "feat: add a Fetch from DOI Studio action for publications

Registered only for the publication document type. Reads the doi
field, queries Crossref (lib/crossref.ts), and shows a confirm
dialog with the fetched title/author before patching
Title/Author/Journal/Volume/Issue/Pages/Date/Abstract onto the
document -- disabled with an explanatory tooltip when doi is unset
or invalid.

Promotes @sanity/ui to a direct dependency (was already installed
transitively via sanity; this task's useToast import makes that
explicit). Verified manually against a real DOI in the live dataset."
```

---

## Task 6: Backfill script for the 10 recoverable DOIs

**Files:**
- Create: `scripts/backfill-publication-dois.ts`
- Modify: `tsconfig.json` (add `allowImportingTsExtensions: true`)
- Modify: `package.json` (add `backfill:publication-dois` script)

**Interfaces:**
- Consumes: `extractDoiFromUrl` (Task 1); the `doi` field (Task 3).
- Produces: nothing further downstream in this plan — this task's own dry run is its test, and its `--commit` run (done once, manually, outside any task) is the actual backfill design doc §7 requires as a Phase 3 exit criterion.

**Why `tsconfig.json` changes here.** This script runs directly under `node` (Node 22 executes plain TypeScript natively — verified in this environment), which, per Node's ESM resolution rules, requires an explicit `.ts` extension on relative imports (`import ... from '../lib/doi.ts'`). TypeScript's `moduleResolution: "bundler"` (already set, used by the rest of this Next.js app) rejects a `.ts` import specifier by default with `TS5097`, unless `allowImportingTsExtensions` is enabled — which itself requires `noEmit` (already `true` here, since `tsc` in this repo only type-checks; Next's own build never runs `tsc` to emit). This was verified empirically before writing this task: `TS5097` reproduces without the flag, and disappears with it, with no other errors introduced. The alternative — hand-duplicating `extractDoiFromUrl`'s regex logic inside the script — was rejected because it would let the backfill run on unreviewed logic that Task 1's tests never actually exercise.

- [ ] **Step 1: Enable `allowImportingTsExtensions`**

In `tsconfig.json`, add the option to `compilerOptions` (after `moduleResolution`):

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "incremental": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: Write the script**

Create `scripts/backfill-publication-dois.ts`:

```ts
// One-off / re-runnable maintenance script: finds `publication` documents
// whose `doi` field is unset but whose `url` field encodes a
// machine-recoverable DOI (see lib/doi.ts), and patches `doi` onto them.
//
// Dry run (default, no writes):
//   node scripts/backfill-publication-dois.ts
//
// Apply the writes:
//   node scripts/backfill-publication-dois.ts --commit
//
// Requires SANITY_API_WRITE_TOKEN in the environment (see .env.local.example).
// Uses @sanity/client directly rather than this repo's next-sanity wrapper
// (lib/sanity.client.ts), since this script runs under plain Node, outside
// Next's runtime.

import { createClient } from '@sanity/client'

import { extractDoiFromUrl } from '../lib/doi.ts'
import { apiVersion, dataset, projectId } from '../lib/sanity.api.ts'

const token = process.env.SANITY_API_WRITE_TOKEN
if (!token) {
  throw new Error(
    'Set SANITY_API_WRITE_TOKEN to a token with write access (see .env.local.example).'
  )
}

const commit = process.argv.includes('--commit')

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
  perspective: 'published',
})

interface PublicationRow {
  _id: string
  url: string | null
}

async function main() {
  const rows = await client.fetch<PublicationRow[]>(
    '*[_type == "publication" && !defined(doi)]{_id, url}'
  )

  const recoverable = rows
    .map((row) => ({ id: row._id, doi: row.url ? extractDoiFromUrl(row.url) : null }))
    .filter((row): row is { id: string; doi: string } => row.doi !== null)

  console.log(`${rows.length} publication(s) missing doi.`)
  console.log(`${recoverable.length} recoverable from url, ${rows.length - recoverable.length} not.`)
  for (const row of recoverable) {
    console.log(`  ${row.id} -> ${row.doi}`)
  }

  if (!commit) {
    console.log('\nDry run only -- no writes made. Re-run with --commit to apply.')
    return
  }

  for (const row of recoverable) {
    await client.patch(row.id).set({ doi: row.doi }).commit()
    console.log(`  committed ${row.id}`)
  }
  console.log(`\nDone -- ${recoverable.length} publication(s) updated.`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
```

- [ ] **Step 3: Add the npm script**

In `package.json`'s `scripts` block, add (alphabetically, before `"build"`):

```json
"backfill:publication-dois": "node scripts/backfill-publication-dois.ts",
```

- [ ] **Step 4: Dry-run against the live dataset — this is the task's test**

```bash
export SANITY_API_WRITE_TOKEN=$(grep '^SANITY_API_WRITE_TOKEN=' .env.local | cut -d= -f2-)
export NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production
npm run backfill:publication-dois
```

**Do not pass `--commit`.** This is a read-only dry run (the script only queries; it does not write unless `--commit` is present — confirm this by reading Step 2's code before running).

Expected output: `19 publication(s) missing doi.` (since Task 3 added the field but nothing has set it yet, all 19 live publications lack it), `10 recoverable from url, 9 not.` (per Task 1's fixtures, 10 of the 19 have a machine-recoverable DOI in their `url`), and exactly these 10 id → DOI lines (order may vary; match as a set):

> **Plan correction, recorded during Task 6's execution.** This step originally read the headline count as `10 publication(s) missing doi.`, inconsistent with its own parenthetical (which correctly derived 19). Task 6's implementer caught this by running the real dry run, matched the actual output against the parenthetical rather than the wrong headline number, and reported the discrepancy rather than silently editing the plan text to fit. Corrected here.

```
06604d2e-fc21-47d5-9f4c-a95f9e50e22a -> 10.1038/s41420-025-02362-7
5b8e7a98-7f12-4057-9b5a-314c084bb063 -> 10.3390/biomedicines12020289
3c638bbb-7650-4435-8698-090317170579 -> 10.3390/genes14101845
92b268e5-5659-4b99-8bc0-95583a08707c -> 10.1016/j.jmb.2022.167470
60132cd6-f48e-4c28-84e2-f03f2ad5242b -> 10.1002/jnr.24819
7d765cee-2f0d-4ef9-98b9-3b2a205eff21 -> 10.1021/acsabm.0c01111
c67dc80d-2571-4f7c-a554-503385cf0350 -> 10.33263/BRIAC112.86868701
e7ba22f9-4b37-43ed-a1d1-691852fcc82e -> 10.1038/s41598-020-67036-z
ede38019-c883-4d40-9403-94a20dc1885b -> 10.1016/j.biochi.2020.02.003
8b176be1-ec71-4ceb-9aef-6d4c52833d11 -> 10.1016/j.ygeno.2019.07.018
```

If the counts or ids differ from this list, stop and investigate before proceeding — either the live dataset changed since this plan was written (re-run this plan's live-dataset re-verification), or the script has a bug. Do not adjust the expected list to match unexplained output.

- [ ] **Step 5: Verify and commit — without running `--commit`**

```bash
npx tsc --noEmit && npx eslint . && npm test && npm run build
```

```bash
git add scripts/backfill-publication-dois.ts tsconfig.json package.json
git commit -m "feat: add a dry-run-by-default DOI backfill script

Finds publication documents missing doi whose url encodes a
recoverable DOI (lib/doi.ts's extractDoiFromUrl) and patches doi
onto them. Defaults to a read-only dry run; --commit is required to
write. Dry-run verified against the live dataset: identifies exactly
the 10 publications design doc §1.9 found recoverable.

Runs under plain Node (not Next's bundler), reusing lib/doi.ts and
lib/sanity.api.ts directly via extension-qualified relative imports
-- tsconfig.json gains allowImportingTsExtensions (safe alongside
noEmit, which was already set) so tsc accepts them without forcing a
duplicate, untested copy of the DOI-extraction logic into the
script.

The actual --commit run against the production dataset is a separate,
manual, explicitly-confirmed step -- not part of this commit or any
automated task."
```

**Do not run `npm run backfill:publication-dois -- --commit` as part of this task.** That write happens once, after whole-branch review, as a distinct, explicitly-confirmed operator action (see Global Constraints and Task 7).

---

## Task 7: Full verification sweep and PR prep

**Files:**
- None (verification only), unless Step 1 finds a regression to fix.

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces: the phase's exit evidence and the PR description content.

- [ ] **Step 1: Run everything**

```bash
export NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production
npx tsc --noEmit
npx eslint .
npm test
npm run typegen && git diff --exit-code sanity.types.ts
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

Expected: all green. `npm test` includes the new `lib/doi.test.ts` and `lib/crossref.test.ts` alongside every existing suite (`groupByYear`, `json-ld`, `metadata`, `site`, `sanity.links`, `revalidate`, `tokens`, contract tests). The `typegen` freshness check should report **no diff** — Tasks 3 and 4 already regenerated and committed `sanity.types.ts`, so a clean re-run here confirms nothing drifted. `npm run test:e2e` should be unaffected — this plan touches no reader-facing route, component, or GROQ query.

- [ ] **Step 2: Confirm the reader-facing site is untouched**

This phase is Studio-only by design (design doc §4.1: 3B precedes 3C precisely so 3C can consume what 3B ships). Confirm no reader route changed:

```bash
git diff --stat main -- app components lib/sanity.queries.ts
```

Expected: no output. If anything appears here, it wasn't part of this plan's scope — investigate before merging.

- [ ] **Step 3: Studio smoke test, once more, end-to-end**

```bash
npm run dev
```

In `http://localhost:3000/studio`:
- `/structure/publication`: confirm every one of the 19 publications still opens and displays its existing data unchanged (spot-check 3), the DOI field is present and empty on all of them (the backfill hasn't run yet), and "Fetch from DOI" is disabled on each until a DOI is typed in.
- `/structure/profile`: confirm every one of the 19 profiles still opens with `role` unchanged, and "Role Group" is present and unset on all of them.

- [ ] **Step 4: Write the PR description's carried-forward and follow-up notes**

Include, verbatim or near it:
- The two live-deploy-dependent manual items, carried forward again (webhook secret, `VisualEditing` overlays) — unchanged since Phase 1C, per every prior phase's PR.
- **The DOI backfill has not been applied to production yet.** State the plan: run `SANITY_API_WRITE_TOKEN=... npm run backfill:publication-dois -- --commit` once, after this PR merges (or before, at the operator's discretion, since the script only touches `doi`, an additive field no reader-facing code reads yet) — done manually, not as part of CI.
- **`roleGroup` has not been set on any profile.** It requires lab confirmation of the option list (design doc §3a) before backfilling — flag this explicitly as a follow-up, not an oversight.
- Phase 3C is next: reader-facing DOI links, publications search/year-filter/jump-nav/citation copy, People role grouping + card redesign, project `status` — per design doc §4.1.

- [ ] **Step 5: Commit anything Step 1 changed (if applicable)**

If Step 1 required a fix, commit it now with a message describing what broke and why. If nothing changed, there is nothing to commit — say so rather than creating an empty commit.

**Exit criteria for Phase 3B:** `tsc --noEmit`, `eslint .`, `npm test`, `npm run typegen` (no diff), `npm run build`, and `npm run test:e2e` all green. `publication` has a validated `doi` field; `profile` has a `roleGroup` field with the seven-item provisional list. "Fetch from DOI" works end-to-end against a real DOI, verified manually in Studio. The backfill script correctly dry-run-identifies the 10 recoverable publications. No reader-facing file changed. `roleGroup` is unset on all 19 profiles; `doi` is unset on all 19 publications until the post-merge `--commit` run.

---

## Notes for the whole-branch reviewer

1. **Confirm the additive-only claim end-to-end, not just per-schema-file.** Design doc §3a's mandate is that all three schema changes (`doi`, `roleGroup`, and — not part of this phase — `status`) ship with zero required-field validation and zero migration. Check `schemas/documents/publication.ts` and `schemas/documents/profile.ts` directly rather than trusting the task commit messages.
2. **Check the `null`-vs-`unset` handling in `plugins/doiLookupAction.tsx`'s `applyPatch`.** This is the one place in the plan doing something non-obvious with the Sanity patch API — a Crossref record missing `volume`/`issue`/`pages`/`abstract` must `unset` those fields, not `set` them to `null`. Verify by testing the action against a DOI whose Crossref record is missing at least one of those (the plan's own Step 5 verification in Task 5 happens to use exactly such a record — CBX7's `page` is null, backed by `article-number` instead, so that specific gap is masked; if time permits, test against a DOI where `abstract` is genuinely absent, e.g. `10.1021/acsabm.0c01111` — confirmed live during Task 2's review; do **not** use `10.1002/jnr.24819` for this, despite an earlier version of this plan claiming it was abstract-less — Task 2's review found that record does carry an abstract, see the correction note above `CROSSREF_FIXTURE_CBX7` in Task 2 Step 1).
3. **Confirm no task ran the backfill's `--commit` mode or set a `roleGroup` value on a real profile.** Both are called out explicitly in Global Constraints and in Tasks 4/6's steps, but this is exactly the kind of instruction a fast implementer subagent could read past. Check the live dataset directly:
   ```bash
   curl -s -G "https://j3f9z8os.api.sanity.io/v2023-06-21/data/query/production" \
     --data-urlencode 'query={"dois": count(*[_type=="publication" && defined(doi)]), "groups": count(*[_type=="profile" && defined(roleGroup)])}'
   ```
   Expected: `{"dois": 0, "groups": 0}`. Any non-zero value means a task wrote to production outside this plan's intended sequencing — flag it as a Critical finding regardless of whether the written values happen to be correct.
4. **`tsconfig.json`'s `allowImportingTsExtensions` is a repo-wide change for a single script's benefit.** Confirm it didn't loosen anything unintentionally elsewhere — `npx tsc --noEmit`'s full-repo run in every task's verification step is the check, but it's worth independently confirming no other file in the diff started using extension-qualified imports as a side effect of the option being available.
