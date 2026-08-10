# Phase 2D — SEO (JSON-LD) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `Organization` JSON-LD site-wide via the root layout, and list-level `ItemList` structured data (`Person`-shaped entries on `/people`, `ScholarlyArticle`-shaped entries on `/publications`), using only the `ProfilePayload`/`PublicationPayload` fields that already exist post-Phase-2B — closing out the last of Phase 2's four sub-phases.

**Architecture:** One new pure-logic module (`lib/json-ld.ts`) builds plain JSON-serializable objects from data the app already fetches — no new Sanity queries, no new schema fields, no new routes. One new presentational component (`components/shared/JsonLd.tsx`) renders a builder's output as a `<script type="application/ld+json">` tag. `app/layout.tsx` renders one `Organization` script unconditionally (static data — `lib/site.ts`'s `siteName`/`siteUrl` plus the existing `public/logo.svg` asset; no Sanity fetch added to the root layout). `app/people/page.tsx` and `app/publications/page.tsx` each render one additional `ItemList` script beside the data they already fetch (`profiles`, `publications`).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5 (`strict: true`), Vitest 4 (node environment, no DOM), Playwright 1.62.1 (from Phase 2A). No new npm dependencies — JSON-LD needs nothing beyond `JSON.stringify` and a native `<script>` tag.

## Global Constraints

- Node `>=22` (per `package.json` `engines`), matches CI's `node-version: 22`.
- Every task must leave `npx tsc --noEmit`, `npm run lint`, `npm run test`, and `npm run build` green before its commit — the same gates CI runs (`.github/workflows/ci.yml`).
- No new npm dependencies. No new Sanity schema fields, no `slug` fields on `profile`/`publication`, no new `[slug]` detail routes — per this phase's design doc §3.2, ruled out as content-model scope creep disproportionate to an SEO phase.
- No GROQ query in `lib/sanity.queries.ts` changes in this phase — `profileQuery` and `publicationsQuery` already select every field this plan needs (`name`, `role`, `image` on profile; `title`, `author`, `journal`, `date`, `url` on publication). `npm run typegen` should produce no diff — CI's freshness check (`git diff --exit-code sanity.types.ts`) stays a no-op.
- The root layout (`app/layout.tsx`) gains **no new Sanity data dependency**. It renders `Organization` JSON-LD from `lib/site.ts`'s existing `siteName`/`siteUrl` constants and the existing static `public/logo.svg` asset only — a deliberate decision (see "Context for the implementer" below), not an oversight. Do not fetch `homePageQuery` or any other Sanity query in `app/layout.tsx` as part of this plan.
- Do not introduce React Testing Library or jsdom. Vitest's harness (`vitest.config.ts`) has no `environment: 'jsdom'`; this plan's Vitest tests cover only the pure builder functions in `lib/json-ld.ts`. The one piece of UI (`components/shared/JsonLd.tsx`) is a trivial presentational wrapper with no test of its own — it's exercised indirectly by this plan's Playwright assertions against real rendered output, consistent with Phase 2C's established constraint against component-level DOM tests in this codebase.
- Follow the existing code style: no semicolons, single quotes (`.prettierrc` via `package.json`), `simple-import-sort` groupings (external → `lib`/`components` absolute → relative). `simple-import-sort/imports` is a `warn`, not an `error` (`eslint.config.mjs`), so a slightly-off import order will not fail CI — but match the codebase's established ordering anyway; run `npm run lint:fix` if unsure.
- `ProfilePayload` (`types/index.ts`, derived from `ProfileQueryResult` in `sanity.types.ts`) has exactly these fields, all nullable except `_id`: `_id: string`, `image: {...} | null`, `orderRank: string | null`, `name: string | null`, `role: string | null`, `email: string | null`, `phone: string | null`, `bio: string | null`. `PublicationPayload` has: `_id: string`, `title: string | null`, `author: string | null`, `journal: string | null`, `volume: number | null`, `issue: number | null`, `pages: string | null`, `abstract: string | null`, `url: string | null`, `date: string | null`. Both were re-verified against `sanity.types.ts` during this plan's research (2026-08-10) — every field this plan reads must be treated as possibly-`null`.

---

## Context for the implementer

**Why `Organization` uses `siteName`/`logo.svg`, not the home page's fuller title/overview.** This phase's design doc (§1.5/§3.2) names `app/layout.tsx` as `Organization`'s natural home but doesn't resolve exactly which data feeds it. Two candidates exist: `lib/site.ts`'s hardcoded `siteName` ("Holsinger Lab") plus `public/logo.svg`, or the home page's own CMS-editable `title`/`overview` (fetched today only by `app/page.tsx` via `homePageQuery`, richer — "Laboratory of Molecular Neuroscience and Dementia" per live content — but never fetched anywhere else, including the root layout). This plan uses the first option, for two concrete reasons:
1. `app/layout.tsx` currently has **zero** Sanity data dependencies and wraps **every** route, including `/studio` (confirmed: `app/studio/[[...tool]]/layout.tsx` has no `<html>`/`<body>` of its own, so it renders inside the root layout, not as a second Next.js root layout). Adding a `homePageQuery` fetch there would introduce a new live-data dependency to the one layer that renders unconditionally everywhere, for a "nice to have" field (`description`) on a JSON-LD block whose only strictly load-bearing property is `name`.
2. `siteName` is already the canonical short brand name used elsewhere in this exact context — `buildMetadata` (`lib/metadata.ts`) uses it for `openGraph.siteName` and the title fallback, and `app/layout.tsx`'s own static `metadata.applicationName` already uses it. Using the same constant for `Organization.name` keeps one source of truth for "what is this site called" rather than introducing a second, CMS-editable answer to the same question that could drift from `siteName` as content changes.

Concretely: `Organization.name = siteName`, `Organization.url = siteUrl`, `Organization.logo = \`${siteUrl}/logo.svg\``, and **no `description` field** — schema.org's `Organization` type has no required properties beyond a meaningful `name`, so omitting an optional field is valid, not incomplete. If a future phase wants the fuller descriptive name or a CMS-sourced description, that's a new decision (whether to give the root layout a Sanity dependency at all), not a gap this plan leaves half-done.

**Why `ScholarlyArticle.author` is `{ '@type': 'Person', name: publication.author }`, not a raw string.** Per this phase's design doc §1.5, `PublicationPayload.author` is one free-text string (e.g., a full byline, possibly multiple names) — there is no structured per-author list, and parsing the prose to produce individual `Person` entries is explicitly out of scope (would require guessing a delimiter convention no schema enforces). schema.org's `CreativeWork.author` expects a `Person` or `Organization`, not plain text. Wrapping the whole byline string as a single `Person`'s `name` keeps the emitted JSON-LD type-valid without inventing per-author parsing — a deliberate, documented choice, not an oversight.

**Why profiles/publications with no `name`/`title` are dropped entirely, not emitted with an empty string.** Both fields are nullable in live data. A `Person` with `name: ""` or a `ScholarlyArticle` with `headline: ""` is syntactically valid JSON but semantically useless (and arguably bad-quality structured data to hand a crawler). Both builder functions filter these out before building `itemListElement`, and `position` is assigned **after** filtering (1-indexed, contiguous) — so a filtered-out entry never leaves a gap in the position sequence.

**Why there's no `@id`/detail-page URL on any list item.** Per §3.2, this phase does not add `slug` fields or `[slug]` routes for `profile`/`publication` — that's a content-model decision explicitly deferred. `ItemList` is valid schema.org structured data without addressable per-item URLs; this is the documented, intentional scope boundary, not a partial implementation.

**Why `JsonLd.tsx` escapes `<` in its output.** `dangerouslySetInnerHTML` does not escape the string it's given. If any CMS-authored text field (a profile bio, a publication title) ever contained the literal characters `</script>`, an unescaped `JSON.stringify` output could prematurely close the script tag and let following HTML be parsed as markup. `lib/json-ld.ts`'s `serializeJsonLd` replaces every `<` with `<` (a standard, minimal defense — JSON's `\uXXXX` escape is valid inside a string literal and round-trips through `JSON.parse` unchanged) before the string ever reaches `dangerouslySetInnerHTML`. Cheap, and worth doing even though today's content is CMS-authored rather than public-user-generated.

**Why `/people`'s script sits outside `Layout` while `/publications`'s sits inside it.** `People` (`components/pages/people/People.tsx`) wraps itself in `<Layout>` internally; `Publications` (`components/pages/publications/Publications.tsx`) does not — `app/publications/page.tsx` wraps it in `<Layout>` explicitly instead. This is a pre-existing asymmetry in the codebase, out of scope to fix here. It has no effect on this plan: a `<script type="application/ld+json">` is valid anywhere in the document body, not just inside or outside a particular wrapper, so each page's JSON-LD script is simply placed as a sibling of that page's main content component, wherever that naturally falls.

---

### Task 1: JSON-LD builder library + shared rendering component

**Files:**
- Create: `lib/json-ld.ts`
- Create: `lib/json-ld.test.ts`
- Create: `components/shared/JsonLd.tsx`

**Interfaces:**
- Consumes: `ProfilePayload`, `PublicationPayload` (`types/index.ts`); `siteName`, `siteUrl` (`lib/site.ts`); `urlForImage` (`lib/sanity.image.ts`); `Image` type (`sanity`).
- Produces (for Tasks 2 and 3): `serializeJsonLd(data: unknown): string`; `buildOrganizationJsonLd(): OrganizationJsonLd`; `buildPersonListJsonLd(profiles: ProfilePayload[]): PersonListJsonLd`; `buildScholarlyArticleListJsonLd(publications: PublicationPayload[]): ScholarlyArticleListJsonLd`; the `<JsonLd data={...} />` component (`components/shared/JsonLd.tsx`), taking any of the three builder return types via `data: object`.

**Context:** This task has no route-level effect — it's pure logic plus one presentational wiring component, TDD'd against Vitest, with zero behavioral change to any page yet. Task 2 and Task 3 each depend on this task's exports.

`lib/sanity.image.ts` imports `lib/sanity.api.ts`, whose module-scope `assertValue()` throws if `NEXT_PUBLIC_SANITY_DATASET`/`NEXT_PUBLIC_SANITY_PROJECT_ID` are unset — a real constraint in this sandboxed test environment. `lib/metadata.test.ts` already established the workaround this codebase uses: `vi.mock('lib/sanity.image', ...)`. This task's test file does the same, with a fixed chainable fake (`buildPersonListJsonLd` only calls `urlForImage` when a profile actually has an image, so the mock never needs to distinguish call arguments).

- [ ] **Step 1: Write the failing test file**

  Create `lib/json-ld.test.ts`:

  ```ts
  import { describe, expect, it, vi } from 'vitest'

  // lib/sanity.image transitively imports lib/sanity.api, whose module-scope
  // assertValue() throws if NEXT_PUBLIC_SANITY_* env vars are unset — same
  // workaround lib/metadata.test.ts already uses (vi.mock, then a static
  // import — Vitest hoists vi.mock calls above imports automatically, so
  // this order is safe and matches established precedent in this codebase).
  // buildPersonListJsonLd only calls urlForImage when profile.image is
  // truthy, so a single fixed fake chain covers every test case that needs it.
  vi.mock('lib/sanity.image', () => ({
    urlForImage: () => ({
      width: () => ({
        height: () => ({
          fit: () => ({ url: () => 'https://cdn.sanity.io/mock-image.jpg' }),
        }),
      }),
    }),
  }))

  import type { ProfilePayload, PublicationPayload } from 'types'

  import {
    buildOrganizationJsonLd,
    buildPersonListJsonLd,
    buildScholarlyArticleListJsonLd,
    serializeJsonLd,
  } from './json-ld'
  import { siteUrl } from './site'

  describe('serializeJsonLd', () => {
    it('escapes "<" so an authored "</script>" cannot close the script tag early', () => {
      const serialized = serializeJsonLd({
        name: '</script><script>alert(1)</script>',
      })
      expect(serialized).not.toContain('</script>')
      expect(JSON.parse(serialized.replace(/\\u003c/g, '<'))).toEqual({
        name: '</script><script>alert(1)</script>',
      })
    })

    it('produces valid, parseable JSON for normal input', () => {
      expect(JSON.parse(serializeJsonLd({ a: 1, b: 'two' }))).toEqual({
        a: 1,
        b: 'two',
      })
    })
  })

  describe('buildOrganizationJsonLd', () => {
    it('returns a valid schema.org Organization with name, url, and logo', () => {
      const org = buildOrganizationJsonLd()
      expect(org['@context']).toBe('https://schema.org')
      expect(org['@type']).toBe('Organization')
      expect(org.name.length).toBeGreaterThan(0)
      expect(org.url).toBe(siteUrl)
      expect(org.logo).toBe(`${siteUrl}/logo.svg`)
    })

    it('serializes to valid JSON with no undefined fields', () => {
      const org = buildOrganizationJsonLd()
      expect(JSON.parse(JSON.stringify(org))).toEqual(org)
    })
  })

  function makeProfile(
    overrides: Partial<ProfilePayload> = {}
  ): ProfilePayload {
    return {
      _id: 'profile-1',
      image: null,
      orderRank: null,
      name: 'Ada Lovelace',
      role: 'Postdoctoral Fellow',
      email: null,
      phone: null,
      bio: null,
      ...overrides,
    }
  }

  describe('buildPersonListJsonLd', () => {
    it('builds one ListItem per named profile, 1-indexed', () => {
      const result = buildPersonListJsonLd([
        makeProfile({ _id: 'a', name: 'Ada Lovelace' }),
        makeProfile({ _id: 'b', name: 'Grace Hopper' }),
      ])
      expect(result['@context']).toBe('https://schema.org')
      expect(result['@type']).toBe('ItemList')
      expect(result.itemListElement).toHaveLength(2)
      expect(result.itemListElement[0]).toEqual({
        '@type': 'ListItem',
        position: 1,
        item: {
          '@type': 'Person',
          name: 'Ada Lovelace',
          jobTitle: 'Postdoctoral Fellow',
        },
      })
      expect(result.itemListElement[1].position).toBe(2)
    })

    it('omits profiles with no name, and does not leave a gap in position numbering', () => {
      const result = buildPersonListJsonLd([
        makeProfile({ _id: 'a', name: null }),
        makeProfile({ _id: 'b', name: 'Grace Hopper' }),
      ])
      expect(result.itemListElement).toHaveLength(1)
      expect(result.itemListElement[0].position).toBe(1)
      expect(result.itemListElement[0].item.name).toBe('Grace Hopper')
    })

    it('omits jobTitle when role is null', () => {
      const result = buildPersonListJsonLd([makeProfile({ role: null })])
      expect(result.itemListElement[0].item).not.toHaveProperty('jobTitle')
    })

    it('includes an image URL when the profile has an image', () => {
      const result = buildPersonListJsonLd([
        makeProfile({
          image: {
            _type: 'image',
            asset: { _ref: 'image-abc', _type: 'reference' },
          },
        }),
      ])
      expect(result.itemListElement[0].item.image).toBe(
        'https://cdn.sanity.io/mock-image.jpg'
      )
    })

    it('omits image when the profile has no image', () => {
      const result = buildPersonListJsonLd([makeProfile({ image: null })])
      expect(result.itemListElement[0].item).not.toHaveProperty('image')
    })

    it('returns an empty list for no profiles', () => {
      expect(buildPersonListJsonLd([]).itemListElement).toEqual([])
    })
  })

  function makePublication(
    overrides: Partial<PublicationPayload> = {}
  ): PublicationPayload {
    return {
      _id: 'pub-1',
      title: 'A Study of Molecular Neuroscience',
      author: 'Holsinger K, Smith J',
      journal: 'Journal of Neuroscience',
      volume: null,
      issue: null,
      pages: null,
      abstract: null,
      url: 'https://doi.org/10.1000/example',
      date: '2024-05-01',
      ...overrides,
    }
  }

  describe('buildScholarlyArticleListJsonLd', () => {
    it('builds one ListItem per titled publication, 1-indexed', () => {
      const result = buildScholarlyArticleListJsonLd([makePublication()])
      expect(result['@context']).toBe('https://schema.org')
      expect(result['@type']).toBe('ItemList')
      expect(result.itemListElement[0]).toEqual({
        '@type': 'ListItem',
        position: 1,
        item: {
          '@type': 'ScholarlyArticle',
          headline: 'A Study of Molecular Neuroscience',
          author: { '@type': 'Person', name: 'Holsinger K, Smith J' },
          isPartOf: { '@type': 'Periodical', name: 'Journal of Neuroscience' },
          datePublished: '2024-05-01',
          url: 'https://doi.org/10.1000/example',
        },
      })
    })

    it('omits publications with no title, and does not leave a gap in position numbering', () => {
      const result = buildScholarlyArticleListJsonLd([
        makePublication({ title: null }),
        makePublication({ _id: 'pub-2', title: 'Real Title' }),
      ])
      expect(result.itemListElement).toHaveLength(1)
      expect(result.itemListElement[0].position).toBe(1)
      expect(result.itemListElement[0].item.headline).toBe('Real Title')
    })

    it('omits optional fields that are null', () => {
      const result = buildScholarlyArticleListJsonLd([
        makePublication({ author: null, journal: null, date: null, url: null }),
      ])
      const item = result.itemListElement[0].item
      expect(item).not.toHaveProperty('author')
      expect(item).not.toHaveProperty('isPartOf')
      expect(item).not.toHaveProperty('datePublished')
      expect(item).not.toHaveProperty('url')
      expect(item.headline).toBe('A Study of Molecular Neuroscience')
    })

    it('returns an empty list for no publications', () => {
      expect(buildScholarlyArticleListJsonLd([]).itemListElement).toEqual([])
    })
  })
  ```

- [ ] **Step 2: Run it, confirm it fails**

  Run: `npx vitest run lib/json-ld.test.ts`

  Expected: FAIL at collection time — Vitest reports it cannot resolve the import `./json-ld`, since the file doesn't exist yet.

- [ ] **Step 3: Implement `lib/json-ld.ts`**

  Create `lib/json-ld.ts`:

  ```ts
  import { urlForImage } from 'lib/sanity.image'
  import { siteName, siteUrl } from 'lib/site'
  import type { Image } from 'sanity'
  import type { ProfilePayload, PublicationPayload } from 'types'

  export function serializeJsonLd(data: unknown): string {
    return JSON.stringify(data).replace(/</g, '\\u003c')
  }

  export interface OrganizationJsonLd {
    '@context': 'https://schema.org'
    '@type': 'Organization'
    name: string
    url: string
    logo: string
  }

  export function buildOrganizationJsonLd(): OrganizationJsonLd {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: siteName,
      url: siteUrl,
      logo: `${siteUrl}/logo.svg`,
    }
  }

  interface PersonJsonLd {
    '@type': 'Person'
    name: string
    jobTitle?: string
    image?: string
  }

  export interface PersonListJsonLd {
    '@context': 'https://schema.org'
    '@type': 'ItemList'
    itemListElement: Array<{
      '@type': 'ListItem'
      position: number
      item: PersonJsonLd
    }>
  }

  export function buildPersonListJsonLd(
    profiles: ProfilePayload[]
  ): PersonListJsonLd {
    const named = profiles.filter(
      (profile): profile is ProfilePayload & { name: string } =>
        typeof profile.name === 'string' && profile.name.trim().length > 0
    )

    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: named.map((profile, index) => {
        const item: PersonJsonLd = { '@type': 'Person', name: profile.name }

        if (profile.role) {
          item.jobTitle = profile.role
        }

        // See app/page.tsx for why this cast exists: the generated image
        // shape leaves crop/hotspot bounds optional, while `Image` from
        // 'sanity' assumes them fully populated.
        const imageUrl =
          profile.image &&
          urlForImage(profile.image as Image)
            ?.width(800)
            .height(800)
            .fit('crop')
            .url()
        if (imageUrl) {
          item.image = imageUrl
        }

        return { '@type': 'ListItem' as const, position: index + 1, item }
      }),
    }
  }

  interface ScholarlyArticleJsonLd {
    '@type': 'ScholarlyArticle'
    headline: string
    author?: { '@type': 'Person'; name: string }
    isPartOf?: { '@type': 'Periodical'; name: string }
    datePublished?: string
    url?: string
  }

  export interface ScholarlyArticleListJsonLd {
    '@context': 'https://schema.org'
    '@type': 'ItemList'
    itemListElement: Array<{
      '@type': 'ListItem'
      position: number
      item: ScholarlyArticleJsonLd
    }>
  }

  export function buildScholarlyArticleListJsonLd(
    publications: PublicationPayload[]
  ): ScholarlyArticleListJsonLd {
    const titled = publications.filter(
      (publication): publication is PublicationPayload & { title: string } =>
        typeof publication.title === 'string' &&
        publication.title.trim().length > 0
    )

    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: titled.map((publication, index) => {
        const item: ScholarlyArticleJsonLd = {
          '@type': 'ScholarlyArticle',
          headline: publication.title,
        }

        if (publication.author) {
          item.author = { '@type': 'Person', name: publication.author }
        }
        if (publication.journal) {
          item.isPartOf = { '@type': 'Periodical', name: publication.journal }
        }
        if (publication.date) {
          item.datePublished = publication.date
        }
        if (publication.url) {
          item.url = publication.url
        }

        return { '@type': 'ListItem' as const, position: index + 1, item }
      }),
    }
  }
  ```

- [ ] **Step 4: Run the test again, confirm it passes**

  Run: `npx vitest run lib/json-ld.test.ts`

  Expected: PASS — all 12 tests green.

- [ ] **Step 5: Create the shared rendering component**

  Create `components/shared/JsonLd.tsx`:

  ```tsx
  import { serializeJsonLd } from 'lib/json-ld'

  export function JsonLd({ data }: { data: object }) {
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
      />
    )
  }
  ```

- [ ] **Step 6: Run the full verification suite**

  Run: `npx tsc --noEmit && npm run lint && npm run test && npm run build`

  Expected: all green.

- [ ] **Step 7: Commit**

  ```bash
  git add lib/json-ld.ts lib/json-ld.test.ts components/shared/JsonLd.tsx
  git commit -m "feat: add JSON-LD builder functions and rendering component"
  ```

---

### Task 2: `Organization` JSON-LD site-wide via the root layout

**Files:**
- Modify: `app/layout.tsx`
- Create: `e2e/json-ld.spec.ts`

**Interfaces:**
- Consumes: `buildOrganizationJsonLd` and `JsonLd` from Task 1.
- Produces: nothing new-exported. `e2e/json-ld.spec.ts`'s local `CONTENT_ROUTES` array and `readJsonLdPayloads` helper are extended (not replaced) by Task 3.

**Context:** `app/layout.tsx` is already an async component (it calls `draftMode()`). `buildOrganizationJsonLd()` is synchronous and needs no new data fetch — call it directly in the render body per the "Context for the implementer" section above. Every one of the 6 content routes in `e2e/routes.spec.ts`'s `CONTENT_ROUTES` list shares this one root layout, so a single change here covers all of them; this task's Playwright test re-uses that same route list (defined locally, matching this codebase's existing per-file convention of not sharing route arrays across `e2e/*.spec.ts` files — see `e2e/axe.spec.ts`'s own `KNOWN_VIOLATIONS` map for precedent).

- [ ] **Step 1: Write the failing Playwright test**

  Create `e2e/json-ld.spec.ts`:

  ```ts
  import { expect, test, type Page } from '@playwright/test'

  // Mirrors e2e/routes.spec.ts's CONTENT_ROUTES — Organization JSON-LD ships
  // from the root layout, so it must be present on every one of them, not
  // just a subset. Kept as a separate local list per this codebase's
  // established e2e convention of not sharing route arrays across spec files.
  const CONTENT_ROUTES = [
    '/',
    '/contact',
    '/people',
    '/publications',
    '/tutorial',
    '/projects/publication-highlights',
  ]

  async function readJsonLdPayloads(page: Page) {
    const raw = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents()
    return raw.map((text) => JSON.parse(text))
  }

  for (const path of CONTENT_ROUTES) {
    test(`${path} emits valid Organization JSON-LD`, async ({ page }) => {
      await page.goto(path)
      const payloads = await readJsonLdPayloads(page)
      const organization = payloads.find((p) => p['@type'] === 'Organization')

      expect(organization).toBeTruthy()
      expect(organization['@context']).toBe('https://schema.org')
      expect(typeof organization.name).toBe('string')
      expect(organization.name.length).toBeGreaterThan(0)
      expect(organization.url).toMatch(/^https?:\/\//)
      expect(organization.logo).toContain('/logo.svg')
    })
  }
  ```

- [ ] **Step 2: Run it, confirm it fails**

  Run: `npx playwright test e2e/json-ld.spec.ts`

  Expected: FAIL on all 6 routes — no `<script type="application/ld+json">` exists anywhere yet, so `organization` is `undefined` and `expect(organization).toBeTruthy()` fails.

- [ ] **Step 3: Wire `Organization` JSON-LD into the root layout**

  In `app/layout.tsx`, change the import block from:

  ```tsx
  import 'styles/index.css'

  import { PreviewBanner } from 'components/preview/PreviewBanner'
  import { SanityLive } from 'lib/sanity.live'
  import { siteName, siteUrl } from 'lib/site'
  import type { Metadata, Viewport } from 'next'
  import { IBM_Plex_Mono, PT_Serif } from 'next/font/google'
  import localFont from 'next/font/local'
  import { draftMode } from 'next/headers'
  import { VisualEditing } from 'next-sanity/visual-editing'
  ```

  to:

  ```tsx
  import 'styles/index.css'

  import { PreviewBanner } from 'components/preview/PreviewBanner'
  import { JsonLd } from 'components/shared/JsonLd'
  import { buildOrganizationJsonLd } from 'lib/json-ld'
  import { SanityLive } from 'lib/sanity.live'
  import { siteName, siteUrl } from 'lib/site'
  import type { Metadata, Viewport } from 'next'
  import { IBM_Plex_Mono, PT_Serif } from 'next/font/google'
  import localFont from 'next/font/local'
  import { draftMode } from 'next/headers'
  import { VisualEditing } from 'next-sanity/visual-editing'
  ```

  Then change the `<body>` block from:

  ```tsx
      <body className="bg-background text-black dark:bg-black dark:text-white">
        {isDraftMode && <PreviewBanner />}
        {children}
        <SanityLive />
        {isDraftMode && <VisualEditing />}
      </body>
  ```

  to:

  ```tsx
      <body className="bg-background text-black dark:bg-black dark:text-white">
        <JsonLd data={buildOrganizationJsonLd()} />
        {isDraftMode && <PreviewBanner />}
        {children}
        <SanityLive />
        {isDraftMode && <VisualEditing />}
      </body>
  ```

- [ ] **Step 4: Run the Playwright test again, confirm it passes**

  Run: `npx playwright test e2e/json-ld.spec.ts`

  Expected: PASS — 6 tests green (this triggers `playwright.config.ts`'s `webServer` command, `npm run build && npm run start`, automatically).

- [ ] **Step 5: Run the full verification suite**

  Run: `npx tsc --noEmit && npm run lint && npm run test && npm run build`

  Expected: all green.

- [ ] **Step 6: Commit**

  ```bash
  git add app/layout.tsx e2e/json-ld.spec.ts
  git commit -m "feat: ship Organization JSON-LD site-wide via the root layout"
  ```

---

### Task 3: List-level `Person`/`ScholarlyArticle` JSON-LD on `/people` and `/publications`

**Files:**
- Modify: `app/people/page.tsx`
- Modify: `app/publications/page.tsx`
- Modify: `e2e/json-ld.spec.ts`

**Interfaces:**
- Consumes: `buildPersonListJsonLd`, `buildScholarlyArticleListJsonLd`, and `JsonLd` from Task 1; `readJsonLdPayloads` from Task 2 (same file, extended here).
- Produces: nothing new-exported.

**Context:** Both route files already fetch exactly the data these builders need (`profiles`/`publications`), inside a `getData()` wrapped in React's `cache()`. Neither builder call needs a new fetch — just pass the already-fetched array through. `app/publications/page.tsx`'s `if (!publications || settings.showPublications === false) notFound()` guard means `publications` is narrowed to non-null (`PublicationPayload[]`, not `PublicationPayload[] | null`) by the time the return statement runs (`notFound()`'s return type is `never`), so `buildScholarlyArticleListJsonLd(publications)` type-checks without an extra cast. `app/people/page.tsx`'s `profiles` is already `ProfilePayload[]` (never null — `getData()` falls back to `[]`), so no guard is needed there either.

- [ ] **Step 1: Extend the failing Playwright test**

  Append to `e2e/json-ld.spec.ts` (after the existing `for (const path of CONTENT_ROUTES) { ... }` block):

  ```ts
  test('/people additionally emits a Person ItemList', async ({ page }) => {
    await page.goto('/people')
    const payloads = await readJsonLdPayloads(page)
    const itemList = payloads.find((p) => p['@type'] === 'ItemList')

    expect(itemList).toBeTruthy()
    expect(itemList['@context']).toBe('https://schema.org')
    expect(itemList.itemListElement.length).toBeGreaterThan(0)

    for (const [index, entry] of itemList.itemListElement.entries()) {
      expect(entry['@type']).toBe('ListItem')
      expect(entry.position).toBe(index + 1)
      expect(entry.item['@type']).toBe('Person')
      expect(typeof entry.item.name).toBe('string')
      expect(entry.item.name.length).toBeGreaterThan(0)
    }
  })

  test('/publications additionally emits a ScholarlyArticle ItemList', async ({
    page,
  }) => {
    await page.goto('/publications')
    const payloads = await readJsonLdPayloads(page)
    const itemList = payloads.find((p) => p['@type'] === 'ItemList')

    expect(itemList).toBeTruthy()
    expect(itemList['@context']).toBe('https://schema.org')
    expect(itemList.itemListElement.length).toBeGreaterThan(0)

    for (const [index, entry] of itemList.itemListElement.entries()) {
      expect(entry['@type']).toBe('ListItem')
      expect(entry.position).toBe(index + 1)
      expect(entry.item['@type']).toBe('ScholarlyArticle')
      expect(typeof entry.item.headline).toBe('string')
      expect(entry.item.headline.length).toBeGreaterThan(0)
    }
  })
  ```

- [ ] **Step 2: Run it, confirm it fails**

  Run: `npx playwright test e2e/json-ld.spec.ts`

  Expected: the 2 new tests FAIL (no `ItemList` script exists on either route yet); the 6 `Organization` tests from Task 2 still PASS.

- [ ] **Step 3: Wire the `Person` `ItemList` into `/people`**

  In `app/people/page.tsx`, change the import block from:

  ```tsx
  import People from 'components/pages/people/People'
  import { buildMetadata } from 'lib/metadata'
  import { sanityFetch } from 'lib/sanity.live'
  import {
    homePageTitleQuery,
    profileQuery,
    settingsQuery,
  } from 'lib/sanity.queries'
  import type { Metadata } from 'next'
  import { notFound } from 'next/navigation'
  import { cache } from 'react'
  import type { Image } from 'sanity'
  import type { ProfilePayload, SettingsPayload } from 'types'
  import { fallbackSettings } from 'types'
  ```

  to:

  ```tsx
  import People from 'components/pages/people/People'
  import { JsonLd } from 'components/shared/JsonLd'
  import { buildPersonListJsonLd } from 'lib/json-ld'
  import { buildMetadata } from 'lib/metadata'
  import { sanityFetch } from 'lib/sanity.live'
  import {
    homePageTitleQuery,
    profileQuery,
    settingsQuery,
  } from 'lib/sanity.queries'
  import type { Metadata } from 'next'
  import { notFound } from 'next/navigation'
  import { cache } from 'react'
  import type { Image } from 'sanity'
  import type { ProfilePayload, SettingsPayload } from 'types'
  import { fallbackSettings } from 'types'
  ```

  Then change the default export from:

  ```tsx
  export default async function PeoplePage() {
    const { settings, profiles } = await getData()

    if (settings.showPeople === false) {
      notFound()
    }

    return <People settings={settings} profiles={profiles} />
  }
  ```

  to:

  ```tsx
  export default async function PeoplePage() {
    const { settings, profiles } = await getData()

    if (settings.showPeople === false) {
      notFound()
    }

    return (
      <>
        <JsonLd data={buildPersonListJsonLd(profiles)} />
        <People settings={settings} profiles={profiles} />
      </>
    )
  }
  ```

- [ ] **Step 4: Wire the `ScholarlyArticle` `ItemList` into `/publications`**

  In `app/publications/page.tsx`, change the import block from:

  ```tsx
  import Publications from 'components/pages/publications/Publications'
  import Layout from 'components/shared/Layout'
  import { buildMetadata } from 'lib/metadata'
  import { sanityFetch } from 'lib/sanity.live'
  import {
    homePageTitleQuery,
    publicationsQuery,
    settingsQuery,
  } from 'lib/sanity.queries'
  import type { Metadata } from 'next'
  import { notFound } from 'next/navigation'
  import { cache } from 'react'
  import type { Image } from 'sanity'
  import type { PublicationPayload, SettingsPayload } from 'types'
  import { fallbackSettings } from 'types'
  ```

  to:

  ```tsx
  import Publications from 'components/pages/publications/Publications'
  import { JsonLd } from 'components/shared/JsonLd'
  import Layout from 'components/shared/Layout'
  import { buildScholarlyArticleListJsonLd } from 'lib/json-ld'
  import { buildMetadata } from 'lib/metadata'
  import { sanityFetch } from 'lib/sanity.live'
  import {
    homePageTitleQuery,
    publicationsQuery,
    settingsQuery,
  } from 'lib/sanity.queries'
  import type { Metadata } from 'next'
  import { notFound } from 'next/navigation'
  import { cache } from 'react'
  import type { Image } from 'sanity'
  import type { PublicationPayload, SettingsPayload } from 'types'
  import { fallbackSettings } from 'types'
  ```

  Then change the default export from:

  ```tsx
  export default async function PublicationsPage() {
    const { settings, publications } = await getData()

    if (!publications || settings.showPublications === false) {
      notFound()
    }

    return (
      <Layout settings={settings}>
        <Publications publications={publications} />
      </Layout>
    )
  }
  ```

  to:

  ```tsx
  export default async function PublicationsPage() {
    const { settings, publications } = await getData()

    if (!publications || settings.showPublications === false) {
      notFound()
    }

    return (
      <Layout settings={settings}>
        <JsonLd data={buildScholarlyArticleListJsonLd(publications)} />
        <Publications publications={publications} />
      </Layout>
    )
  }
  ```

- [ ] **Step 5: Run the Playwright test again, confirm it passes**

  Run: `npx playwright test e2e/json-ld.spec.ts`

  Expected: PASS — all 8 tests green (6 `Organization` + 2 new `ItemList` tests).

- [ ] **Step 6: Run the full verification suite**

  Run: `npx tsc --noEmit && npm run lint && npm run test && npm run build`

  Expected: all green.

- [ ] **Step 7: Commit**

  ```bash
  git add app/people/page.tsx app/publications/page.tsx e2e/json-ld.spec.ts
  git commit -m "feat: emit list-level Person/ScholarlyArticle JSON-LD on /people and /publications"
  ```

---

## Phase-level verification (after all three tasks, before whole-branch review)

- [ ] Run the full gate once more from a clean state: `npx tsc --noEmit && npm run lint && npm run test && npm run build`
- [ ] Run `npx playwright install --with-deps chromium && npm run test:e2e` — confirms every e2e spec (`routes.spec.ts`, `axe.spec.ts`, `interactive-controls.spec.ts`, `server-rendered-nav.spec.ts`, `mobile-menu.spec.ts`, `json-ld.spec.ts`) passes together against the fully built app.
- [ ] Confirm `git diff --exit-code sanity.types.ts` after `npm run typegen` is clean — this phase touches no GROQ queries, so this should be a no-op.
- [ ] Manually view source (or use browser devtools) on `/`, `/people`, and `/publications` against a real `npm run build && npm run start`, and confirm the `<script type="application/ld+json">` content is well-formed and matches what's expected — a final eyeball check alongside the automated Playwright coverage, cheap to do and catches anything the JSON-shape assertions might not (e.g., obviously wrong values that still happen to be non-empty strings).
- [ ] Confirm this closes Phase 2's exit criteria (design doc §7): "`Organization` JSON-LD ships site-wide; `/people` and `/publications` emit list-level `Person`/`ScholarlyArticle` structured data."
- [ ] Re-read this plan's "Context for the implementer" section once more against the merged code — confirm the `Organization` data-source decision, the `author`-as-`Person` wrapping, and the empty-field-filtering behavior all landed as designed, not as an ad hoc implementation-time judgment call that drifted from what's documented here.

---

## Risks

| Risk | Mitigation |
|---|---|
| `Organization.name` uses the short `siteName` ("Holsinger Lab") rather than the home page's fuller descriptive title, which is arguably more informative to a search engine | Deliberate, documented tradeoff (see "Context for the implementer") — avoids giving the root layout a new Sanity data dependency for every route including `/studio`; if the lab wants the fuller name in `Organization` JSON-LD later, that's a distinct decision about whether the root layout should fetch live data at all, not a gap this plan silently leaves |
| `ScholarlyArticle.author` wraps the entire free-text byline string as one `Person.name`, not individually structured per-author `Person` entries | This phase's design doc §1.5 already identifies `PublicationPayload.author` as unstructured prose with no parseable delimiter convention; the wrapping keeps the JSON-LD type-valid (schema.org expects `Person`/`Organization`, not `Text`, for `author`) without inventing prose-parsing logic, which is out of scope |
| No per-entity `@id`/detail-page URL exists on any `Person`/`ScholarlyArticle` list item, since `profile`/`publication` have no `slug` field or `[slug]` route | Explicitly ruled out by this phase's design doc §3.2 as content-model scope creep; flagged here as a candidate follow-up if the lab later wants dedicated `/people/[slug]` or `/publications/[slug]` pages, not something this plan should reach for |
| External validation (Google's Rich Results Test) needs a live deployment and is out of reach in this sandboxed environment | Noted as a third manual post-deploy check, alongside the two already carried forward through every prior Phase 2 sub-phase: (1) confirming the Sanity webhook hits `/api/revalidate` with `SANITY_WEBHOOK_SECRET` set in the real deployed environment, and (2) confirming `VisualEditing` overlays render against a real draft-mode session with a real Sanity token. All three should be checked together once, post-deploy, since this phase closes out Phase 2 as a whole |
| `Organization` JSON-LD also renders on `/studio` (no separate root layout there to opt out) | Harmless — structured data on an unindexed admin route has no negative effect, and scoping the root layout's `<JsonLd>` to exclude specific routes would add complexity for no real benefit; accepted as-is |
