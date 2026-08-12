# Phase 4A — Identity Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the site's name CMS-editable from a single source of truth, and give the `settings`
singleton the group scaffolding the rest of Phase 4 builds on.

**Architecture:** Add `siteName`/`shortName` to the `settings` singleton, organised into Studio field
groups. Introduce two small pure modules — `lib/branding.ts` (resolve a name from settings, falling
back to a constant) and `lib/settings.ts` (fetch settings without ever throwing). Convert
`buildMetadata` and `buildOrganizationJsonLd` from importing a hardcoded constant to taking the
resolved name as a parameter, so every call site is forced by the type checker to supply it. Wire the
root layout to fetch settings once per request.

**Tech Stack:** Next.js 16 (App Router), React 19, Sanity 6.9.1, TypeScript, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-12-site-branding-customisation-design.md` (§3.1, §4, D9).

## Global Constraints

- **Sonnet only.** Every subagent dispatched in this repo uses `model: "sonnet"` — implementers,
  task reviewers, and the final whole-branch review alike. This overrides
  subagent-driven-development's default model tiering.
- **No Sanity Studio login and no write token exist in this environment** (spec §7). Do not plan or
  attempt any task that requires clicking through Studio or writing to the dataset. The substitute is
  `npm run type-check` clean against the **real installed** Sanity types, direct verification of any
  touched interface against `node_modules/@sanity/types/lib/index.d.ts`, and hand-tracing. Flag
  untested live behaviour in the PR.
- **Reads against the live dataset do work** without a token: project `j3f9z8os`, dataset
  `production`, publicly readable.
- **`stega: false` is mandatory** on any settings fetch whose result reaches `<title>`, Open Graph
  tags, or JSON-LD. This is Phase 2D's recorded lesson; stega characters are invisible and only
  appear in draft-mode sessions, so nothing in CI will catch a mistake here.
- **`settings.siteName` is optional, not required.** The live singleton has no such field today;
  making it required would put the lab's existing published document into a validation-error state.
  Every consumer falls back through `resolveBranding`.
- **Do not modify `components/global/Navbar/MobileNavBar.tsx`.** Its Headless UI Dialog arrangement
  is load-bearing and documented across ~120 lines of comments. Phase 4B touches it; 4A does not.
- **Run unit tests as `npm test`** — but only after Task 1 lands, which is what makes that command
  report this repo's own results.
- **Commit after every task.** Do not batch commits.

---

### Task 1: Stop `npm test` from running other worktrees' suites (D9)

`vitest.config.ts` excludes `'node_modules'`, which as a glob matches only a **top-level** directory
of that name. This repo's own methodology creates git worktrees under `.claude/worktrees/`, each with
its own `node_modules`. As of writing, two exist, and `npm test` reports **741 test files / 56
failed** instead of this repo's actual **15 files / 142 tests, all passing**.

This is first because an implementer who runs `npm test` and sees 56 unrelated failures cannot tell
whether their own change is sound.

**Files:**
- Modify: `vitest.config.ts:5-9`

**Interfaces:**
- Consumes: nothing
- Produces: a `npm test` command that reports only this repo's tests. Every later task depends on it.

- [ ] **Step 1: Observe the current broken behaviour**

Run: `npm test 2>&1 | tail -5`

Expected: a summary reporting far more than 15 test files, with failures. Record the exact numbers —
they are the "before" evidence. (If it already reports `15 passed (15)`, the stale worktrees have
been removed since this plan was written; still apply the config fix, since the next worktree
recreates the problem.)

- [ ] **Step 2: Fix the exclude patterns**

Replace the `test` block in `vitest.config.ts`:

```ts
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['**/*.test.ts'],
    // Bare 'node_modules' only matches a top-level directory of that name.
    // This repo creates git worktrees under .claude/worktrees/, each with its
    // own node_modules and its own copy of every test file, so an unqualified
    // pattern silently pulls another branch's suite into this one's results.
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.claude/**',
      'e2e/**',
    ],
  },
})
```

- [ ] **Step 3: Verify the suite now reports only this repo**

Run: `npm test 2>&1 | tail -5`

Expected: `Test Files  15 passed (15)` and `Tests  142 passed (142)`.

If the file count differs from 15, do **not** adjust the number to match — investigate. Either a test
file was added since this plan was written (fine, note it) or an exclude pattern is over-broad and is
hiding real tests (not fine).

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts
git commit -m "fix: stop vitest from running nested worktrees' test suites"
```

---

### Task 2: `lib/branding.ts` — resolve a site name from settings

A single pure function owning the fallback chain, so no consumer reimplements it.

**Files:**
- Create: `lib/branding.ts`
- Create: `lib/branding.test.ts`

**Interfaces:**
- Consumes: `fallbackSiteName` — but note it is still named `siteName` in `lib/site.ts` at this
  point. Import it as `import { siteName as fallbackSiteName } from 'lib/site'`. Task 7 renames the
  export and updates this import.
- Produces:
  - `interface Branding { siteName: string; shortName: string }`
  - `function resolveBranding(settings: BrandingSource | null | undefined): Branding`
  - `interface BrandingSource { siteName?: string | null; shortName?: string | null }`

  Used by Tasks 5, 6 and 7.

- [ ] **Step 1: Write the failing test**

Create `lib/branding.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { resolveBranding } from './branding'
import { siteName as fallbackSiteName } from './site'

describe('resolveBranding', () => {
  it('uses the configured site name when set', () => {
    expect(resolveBranding({ siteName: 'Holsinger Lab' }).siteName).toBe(
      'Holsinger Lab'
    )
  })

  it('falls back to the built-in name when siteName is null', () => {
    expect(resolveBranding({ siteName: null }).siteName).toBe(fallbackSiteName)
  })

  it('falls back to the built-in name when settings is null', () => {
    expect(resolveBranding(null).siteName).toBe(fallbackSiteName)
  })

  it('falls back to the built-in name when settings is undefined', () => {
    expect(resolveBranding(undefined).siteName).toBe(fallbackSiteName)
  })

  it('treats a whitespace-only site name as unset', () => {
    expect(resolveBranding({ siteName: '   ' }).siteName).toBe(fallbackSiteName)
  })

  it('trims surrounding whitespace from a real site name', () => {
    expect(resolveBranding({ siteName: '  Holsinger Lab  ' }).siteName).toBe(
      'Holsinger Lab'
    )
  })

  it('uses the configured short name when set', () => {
    const branding = resolveBranding({
      siteName: 'Laboratory of Molecular Neuroscience and Dementia',
      shortName: 'Holsinger',
    })
    expect(branding.shortName).toBe('Holsinger')
  })

  it('falls back to the resolved site name when shortName is unset', () => {
    const branding = resolveBranding({ siteName: 'Holsinger Lab' })
    expect(branding.shortName).toBe('Holsinger Lab')
  })

  it('falls back through both levels when neither name is set', () => {
    const branding = resolveBranding({})
    expect(branding.siteName).toBe(fallbackSiteName)
    expect(branding.shortName).toBe(fallbackSiteName)
  })

  it('treats a whitespace-only short name as unset', () => {
    const branding = resolveBranding({
      siteName: 'Holsinger Lab',
      shortName: '  ',
    })
    expect(branding.shortName).toBe('Holsinger Lab')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/branding.test.ts`

Expected: FAIL — cannot resolve `./branding`.

- [ ] **Step 3: Write the implementation**

Create `lib/branding.ts`:

```ts
import { siteName as fallbackSiteName } from 'lib/site'

export interface Branding {
  /** Full name: browser tab titles, Open Graph, JSON-LD, web app manifest `name`. */
  siteName: string
  /** Short form: header wordmark and manifest `short_name`. Defaults to `siteName`. */
  shortName: string
}

/**
 * The subset of `SettingsPayload` this function reads. Declared structurally
 * rather than importing `SettingsPayload` so the function stays trivially
 * testable with object literals and has no dependency on generated types.
 */
export interface BrandingSource {
  siteName?: string | null
  shortName?: string | null
}

/**
 * Resolves the site's display names from CMS settings, falling back to the
 * built-in constant. Single owner of that fallback chain — no caller should
 * reimplement it, because a caller that forgets would silently reintroduce the
 * hardcoded name this phase exists to remove.
 *
 * Whitespace-only values are treated as unset: Studio string fields readily
 * collect a stray space, and a header wordmark rendering " " is worse than one
 * rendering the default.
 */
export function resolveBranding(
  settings: BrandingSource | null | undefined
): Branding {
  const siteName = settings?.siteName?.trim() || fallbackSiteName
  const shortName = settings?.shortName?.trim() || siteName
  return { siteName, shortName }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/branding.test.ts`

Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/branding.ts lib/branding.test.ts
git commit -m "feat: resolve site branding names from settings with a fallback"
```

---

### Task 3: `lib/settings.ts` — a settings fetch that cannot throw

The root layout wraps **every** route, including `/studio`. If a Sanity outage made that fetch throw,
every route would 500 — including the Studio the lab would need in order to fix anything. In a repo
nobody can deploy a hotfix to, that is the difference between a degraded site and a dead one.

Taking the fetcher as a parameter is what makes this property unit-testable rather than merely
asserted.

**Files:**
- Create: `lib/settings.ts`
- Create: `lib/settings.test.ts`

**Interfaces:**
- Consumes: `fallbackSettings`, `SettingsPayload` from `types`
- Produces: `function fetchSettingsSafely(fetcher: SettingsFetcher): Promise<SettingsPayload>` where
  `type SettingsFetcher = () => Promise<{ data: unknown }>`. Used by Task 7.

- [ ] **Step 1: Write the failing test**

Create `lib/settings.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { fetchSettingsSafely } from './settings'
import { fallbackSettings } from '../types'

describe('fetchSettingsSafely', () => {
  it('returns the fetched settings when the fetch succeeds', async () => {
    const payload = { ...fallbackSettings, siteName: 'Holsinger Lab' }
    const result = await fetchSettingsSafely(async () => ({ data: payload }))
    expect(result).toEqual(payload)
  })

  it('returns the fallback when the query resolves to null', async () => {
    const result = await fetchSettingsSafely(async () => ({ data: null }))
    expect(result).toEqual(fallbackSettings)
  })

  it('returns the fallback when the fetch rejects', async () => {
    const result = await fetchSettingsSafely(async () => {
      throw new Error('Sanity is unreachable')
    })
    expect(result).toEqual(fallbackSettings)
  })

  it('returns the fallback when the fetcher throws synchronously', async () => {
    const result = await fetchSettingsSafely(() => {
      throw new Error('boom')
    })
    expect(result).toEqual(fallbackSettings)
  })

  it('never rejects, whatever the fetcher does', async () => {
    await expect(
      fetchSettingsSafely(async () => {
        throw new Error('Sanity is unreachable')
      })
    ).resolves.toBeDefined()
  })
})
```

Note the fourth test: a fetcher that throws *before* returning a promise would escape a bare
`await`-in-`try` only if the call were outside the `try`. Keep the call inside.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/settings.test.ts`

Expected: FAIL — cannot resolve `./settings`.

- [ ] **Step 3: Write the implementation**

Create `lib/settings.ts`:

```ts
import type { SettingsPayload } from 'types'
import { fallbackSettings } from 'types'

/**
 * Shape of `sanityFetch`'s return value, narrowed to what this module reads.
 * Injected rather than imported so the failure path is testable without env
 * vars or a live Sanity connection.
 */
export type SettingsFetcher = () => Promise<{ data: unknown }>

/**
 * Fetches the settings singleton, returning `fallbackSettings` on any failure
 * instead of propagating.
 *
 * The root layout wraps every route including /studio, so an unguarded throw
 * here would take down the site AND the CMS the lab would use to fix it. This
 * repo is being handed over to a team with no developer, so "a developer can
 * roll it back" is not an available mitigation. The swallow is deliberate.
 */
export async function fetchSettingsSafely(
  fetcher: SettingsFetcher
): Promise<SettingsPayload> {
  try {
    const { data } = await fetcher()
    return (data as SettingsPayload | null) ?? fallbackSettings
  } catch {
    return fallbackSettings
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/settings.test.ts`

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/settings.ts lib/settings.test.ts
git commit -m "feat: add a settings fetch that falls back instead of throwing"
```

---

### Task 4: Settings schema groups, Identity fields, query, and types

Schema, GROQ projection, generated types and the fallback object must move together — changing any
one alone leaves `tsc` failing or the types lying about the query. One task.

**Files:**
- Modify: `schemas/singletons/settings.ts` (whole file)
- Modify: `lib/sanity.queries.ts:68-82` (`settingsQuery`)
- Modify: `types/index.ts:57-64` (`fallbackSettings`)
- Regenerate: `sanity.types.ts` (via `npm run typegen` — tracked in git, must be committed)

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: `SettingsPayload` gains `siteName: string | null` and `shortName: string | null`. Tasks 5,
  6 and 7 rely on both keys existing.

**Verified API note:** `groups?: FieldGroupDefinition[]` is valid on a document definition, where
`FieldGroupDefinition = { name: string; title?: string; hidden?; icon?; default?: boolean; i18n? }`,
and fields accept `group?: string | string[]`. Confirmed directly in
`node_modules/@sanity/types/lib/index.d.ts:874` and `:1640` against the installed `sanity@6.9.1`.

- [ ] **Step 1: Rewrite the settings schema with groups**

Replace `schemas/singletons/settings.ts` entirely:

```ts
import { CogIcon } from '@sanity/icons/Cog'
import { defineArrayMember, defineField, defineType } from 'sanity'

export default defineType({
  name: 'settings',
  title: 'Settings',
  type: 'document',
  icon: CogIcon,
  // Groups render as tabs in Studio. This document is the lab's single
  // site-wide control panel and Phase 4 adds more fields to it, so an
  // ungrouped list would become an unusable wall for a non-technical editor.
  groups: [
    { name: 'identity', title: 'Identity', default: true },
    { name: 'navigation', title: 'Navigation' },
    { name: 'footer', title: 'Footer' },
  ],
  fields: [
    defineField({
      name: 'siteName',
      title: 'Site name',
      type: 'string',
      group: 'identity',
      description:
        "The full name of the lab, shown in browser tabs, social media share cards and search results. Leave this empty to keep the site's built-in default.",
    }),
    defineField({
      name: 'shortName',
      title: 'Short name',
      type: 'string',
      group: 'identity',
      description:
        'A short version of the name, used where there is little room — the site header and the icon label on a phone home screen. Defaults to the full site name if left empty.',
      validation: (rule) =>
        rule
          .max(20)
          .warning(
            'Longer than 20 characters may not fit in the site header on a phone.'
          ),
    }),
    defineField({
      name: 'ogImage',
      title: 'Open Graph Image',
      type: 'image',
      group: 'identity',
      description: 'Displayed on social cards and search engine results.',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'menuItems',
      title: 'Menu Item list',
      description: 'Links displayed on the header of your site.',
      type: 'array',
      group: 'navigation',
      of: [
        {
          title: 'Reference',
          type: 'reference',
          to: [
            {
              type: 'home',
            },
            {
              type: 'page',
            },
            {
              type: 'project',
            },
          ],
        },
      ],
    }),
    defineField({
      name: 'showPublications',
      title: 'Enable Publications page',
      type: 'boolean',
      group: 'navigation',
      description:
        'Toggle to enable the Publications page in your site. Turning this OFF makes /publications return a 404 — the page disappears from the site entirely, it does not just hide from navigation.',
      initialValue: true,
    }),
    defineField({
      name: 'showPeople',
      title: 'Enable Team page',
      type: 'boolean',
      group: 'navigation',
      description:
        'Toggle to enable the Team page in your site. Turning this OFF makes /people return a 404 — the page disappears from the site entirely, it does not just hide from navigation.',
      initialValue: true,
    }),
    defineField({
      name: 'showContactForm',
      title: 'Enable Contact Us page',
      type: 'boolean',
      group: 'navigation',
      description:
        'Toggle to enable the Contact Us page in your site. Turning this OFF makes /contact return a 404 — the page disappears from the site entirely, it does not just hide from navigation.',
      initialValue: true,
    }),
    defineField({
      name: 'footer',
      description:
        'This is a block of text that will be displayed at the bottom of the page.',
      title: 'Footer Info',
      type: 'array',
      group: 'footer',
      of: [
        defineArrayMember({
          type: 'block',
          marks: {
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  {
                    name: 'href',
                    type: 'url',
                    title: 'Url',
                  },
                ],
              },
            ],
          },
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      // Was 'Menu Items', which stopped describing this document once it
      // became the site-wide settings singleton.
      return {
        title: 'Settings',
      }
    },
  },
})
```

- [ ] **Step 2: Add the new fields to the GROQ projection**

In `lib/sanity.queries.ts`, replace the `settingsQuery` definition:

```ts
export const settingsQuery = groq`
  *[_type == "settings"][0]{
    siteName,
    shortName,
    footer,
    showPublications,
    showPeople,
    showContactForm,
    menuItems[]->{
      _type,
      "slug": slug.current,
      title
    },
    ogImage,
  }
`
```

- [ ] **Step 3: Regenerate types**

Run: `npm run typegen`

Expected: `✔ Successfully generated types` reporting 10 queries and 29 schema types.

Verify the new fields landed:

Run: `grep -A3 "export type SettingsQueryResult" sanity.types.ts`

Expected: the type now includes `siteName: string | null` and `shortName: string | null`.

- [ ] **Step 4: Add the new keys to `fallbackSettings`**

`SettingsPayload` requires every key to be present (nullable values are fine). In `types/index.ts`,
add the two new keys to the existing object, keeping the explanatory comment above it intact:

```ts
export const fallbackSettings: SettingsPayload = {
  siteName: null,
  shortName: null,
  menuItems: [],
  showPublications: null,
  showPeople: null,
  showContactForm: null,
  footer: [],
  ogImage: null,
}
```

`null` is correct here for the same reason the comment already gives for the `show*` flags:
`resolveBranding` treats null as unset and falls back, so a missing settings singleton produces the
built-in name rather than an empty string.

- [ ] **Step 5: Verify types and tests**

Run: `npm run type-check`

Expected: clean, no output.

Run: `npm test`

Expected: **17 files, 157 tests** — the pre-Phase-4 baseline is 15 files / 142 tests, and Tasks 2 and
3 added `lib/branding.test.ts` (10 tests) and `lib/settings.test.ts` (5 tests).

- [ ] **Step 6: Commit**

```bash
git add schemas/singletons/settings.ts lib/sanity.queries.ts types/index.ts sanity.types.ts
git commit -m "feat: add siteName and shortName to settings, grouped into Studio tabs"
```

---

### Task 5: `buildMetadata` takes the site name as a parameter

Making it a **required** parameter is the point: the type checker then names every call site that
must be updated, so none can silently keep using a hardcoded value.

**Files:**
- Modify: `lib/metadata.ts:1-53`
- Modify: `lib/metadata.test.ts` (every `buildMetadata` call)
- Modify: `app/page.tsx:34-45`
- Modify: `app/[slug]/page.tsx` (`generateMetadata`)
- Modify: `app/contact/page.tsx` (`generateMetadata`)
- Modify: `app/people/page.tsx:51-62`
- Modify: `app/publications/page.tsx` (`generateMetadata`)
- Modify: `app/projects/[slug]/page.tsx` (`generateMetadata`)
- Modify: `app/not-found.tsx:25-35`

**Interfaces:**
- Consumes: `resolveBranding` from Task 2; `SettingsPayload.siteName` from Task 4
- Produces: `buildMetadata` gains a required `siteName: string` parameter and no longer imports from
  `lib/site` except `isNoindexPath` and `siteUrl`.

- [ ] **Step 1: Update the tests to the new signature**

In `lib/metadata.test.ts`, add `siteName` to every `buildMetadata` call and add one test proving the
parameter actually flows through. Replace the `describe` block body:

```ts
describe('buildMetadata', () => {
  it('joins title and baseTitle with a pipe', () => {
    const metadata = buildMetadata({
      path: '/',
      siteName: 'Holsinger Lab',
      title: 'Home',
      baseTitle: 'Holsinger Lab',
    })
    expect(metadata.title).toBe('Home | Holsinger Lab')
  })

  it('falls back to baseTitle alone when title is omitted', () => {
    const metadata = buildMetadata({
      path: '/',
      siteName: 'Holsinger Lab',
      baseTitle: 'Holsinger Lab',
    })
    expect(metadata.title).toBe('Holsinger Lab')
  })

  it('falls back to the site name when neither title nor baseTitle is given', () => {
    const metadata = buildMetadata({ path: '/', siteName: 'Holsinger Lab' })
    expect(metadata.title).toBe('Holsinger Lab')
  })

  it('uses the supplied site name rather than any built-in constant', () => {
    const metadata = buildMetadata({ path: '/', siteName: 'A Different Lab' })
    expect(metadata.title).toBe('A Different Lab')
    expect(metadata.openGraph?.siteName).toBe('A Different Lab')
  })

  it('builds an absolute canonical URL from siteUrl + path', () => {
    const metadata = buildMetadata({ path: '/about', siteName: 'Holsinger Lab' })
    expect(metadata.alternates?.canonical).toBe(
      'https://holsingerlab.vercel.app/about'
    )
  })

  it('sets robots.index=false for a path in the noindex list', () => {
    const metadata = buildMetadata({
      path: '/tutorial',
      siteName: 'Holsinger Lab',
    })
    expect(metadata.robots).toEqual({ index: false })
  })

  it('sets robots.index=false when noindex is explicitly true, even off the noindex list', () => {
    const metadata = buildMetadata({
      path: '/',
      siteName: 'Holsinger Lab',
      noindex: true,
    })
    expect(metadata.robots).toEqual({ index: false })
  })

  it('leaves robots undefined for an indexable path', () => {
    const metadata = buildMetadata({ path: '/', siteName: 'Holsinger Lab' })
    expect(metadata.robots).toBeUndefined()
  })

  it('carries description through to openGraph and twitter', () => {
    const metadata = buildMetadata({
      path: '/about',
      siteName: 'Holsinger Lab',
      description: 'A description',
    })
    expect(metadata.openGraph?.description).toBe('A description')
    expect(metadata.twitter?.description).toBe('A description')
  })

  it('omits images and uses the summary Twitter card when no image is given', () => {
    const metadata = buildMetadata({ path: '/', siteName: 'Holsinger Lab' })
    expect(metadata.openGraph?.images).toBeUndefined()
    expect((metadata.twitter as { card?: string })?.card).toBe('summary')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/metadata.test.ts`

Expected: FAIL — `'A Different Lab'` assertions fail because `buildMetadata` still uses the imported
constant. (The other tests may pass, since they pass the same name the constant holds. That is
exactly why the "uses the supplied site name" test exists.)

- [ ] **Step 3: Change the signature**

In `lib/metadata.ts`, change the import on line 2 and add the parameter:

```ts
import { urlForImage } from 'lib/sanity.image'
import { isNoindexPath, siteUrl } from 'lib/site'
import type { Metadata } from 'next'
import type { Image } from 'sanity'

export function buildMetadata({
  path,
  siteName,
  baseTitle,
  title,
  description,
  image,
  noindex = false,
}: {
  path: string
  /**
   * Resolved via `resolveBranding` (lib/branding.ts). Required rather than
   * defaulted so the type checker names any call site that forgets it — a
   * silent default would reintroduce the hardcoded name this phase removes.
   */
  siteName: string
  baseTitle?: string
  title?: string
  description?: string
  image?: Image
  noindex?: boolean
}): Metadata {
```

The body is unchanged — `resolvedTitle` and `openGraph.siteName` already reference the identifier
`siteName`, which now resolves to the parameter instead of the import.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/metadata.test.ts`

Expected: PASS, 10 tests.

- [ ] **Step 5: Find every call site**

Run: `npm run type-check`

Expected: FAIL, with one error per `buildMetadata` call missing `siteName`. There should be **seven**
files listed. Use this output as the checklist for Step 6 rather than trusting the list in this plan.

- [ ] **Step 6: Update all seven call sites**

Add this import to each of the seven files:

```ts
import { resolveBranding } from 'lib/branding'
```

Then apply the per-file changes below. **Five of the seven already destructure `settings`; two do
not** — `app/projects/[slug]/page.tsx` and `app/not-found.tsx` destructure without it and need it
added, which is easy to miss because the resulting error points at the `buildMetadata` call rather
than the destructure.

**`app/page.tsx`** — add one line and one argument:

```ts
export async function generateMetadata(): Promise<Metadata> {
  const { settings, page } = await getData()
  const { siteName } = resolveBranding(settings)
  return buildMetadata({
    path: '/',
    siteName,
    title: page.title ?? undefined,
    description: page.overview ? toPlainText(page.overview) : '',
    image: (settings.ogImage ?? undefined) as Image | undefined,
  })
}
```

Keep the existing multi-line comment above `image:` exactly as it is — it is elided here for brevity
but must not be deleted. The same applies to every file below.

**`app/people/page.tsx`**, **`app/contact/page.tsx`**, **`app/publications/page.tsx`** — all three
share the same shape. Add `const { siteName } = resolveBranding(settings)` after the `getData()` call
and `siteName,` as the second property of the `buildMetadata` argument. For example, contact:

```ts
export async function generateMetadata(): Promise<Metadata> {
  const { settings, homePageTitle } = await getData()
  const { siteName } = resolveBranding(settings)
  return buildMetadata({
    path: '/contact',
    siteName,
    baseTitle: homePageTitle,
    title: 'Contact',
    description,
    image: (settings.ogImage ?? undefined) as Image | undefined,
  })
}
```

People uses `path: '/people'` / `title: 'People'`; publications uses `path: '/publications'` /
`title: 'Publications'`. Nothing else differs.

**`app/[slug]/page.tsx`** — already destructures `settings`. Note the two early `return {}` branches
above; leave them alone, they never reach `buildMetadata`:

```ts
  const { settings, page, homePageTitle } = await getData(slug)
  if (!page) {
    return {}
  }
  const { siteName } = resolveBranding(settings)
  return buildMetadata({
    path: `/${slug}`,
    siteName,
    baseTitle: homePageTitle,
    title: page.title ?? undefined,
    description: page.overview ? toPlainText(page.overview) : '',
    image: (settings.ogImage ?? undefined) as Image | undefined,
  })
```

**`app/projects/[slug]/page.tsx`** — currently destructures `{ project, homePageTitle }` with **no
`settings`**. `getData` already returns it, so add it to the destructure:

```ts
  const { settings, project, homePageTitle } = await getData(slug)
  if (!project) {
    return {}
  }
  const { siteName } = resolveBranding(settings)
  return buildMetadata({
    path: `/projects/${slug}`,
    siteName,
    baseTitle: homePageTitle,
    title: project.title ?? undefined,
    description: project.overview ? toPlainText(project.overview) : '',
    image: (project.coverImage ?? undefined) as Image | undefined,
  })
```

Note this route's `image` comes from `project.coverImage`, not `settings.ogImage` — do not
"harmonise" it with the others.

**`app/not-found.tsx`** — also destructures without `settings`; add it:

```ts
export async function generateMetadata(): Promise<Metadata> {
  const { settings, homePageTitle } = await getData()
  const { siteName } = resolveBranding(settings)
  return buildMetadata({
    path: '/404',
    siteName,
    baseTitle: homePageTitle,
    title: 'Page Not Found',
    description:
      'The page you are looking for cannot be found. It may have been moved, deleted, or the URL might be misspelled. Please check the URL or return to our homepage to explore more of our content and services.',
    noindex: true,
  })
}
```

- [ ] **Step 7: Verify**

Run: `npm run type-check`

Expected: clean.

Run: `npm test`

Expected: 17 files, **158 tests** — the 157 from Task 4 plus the one new metadata test.

- [ ] **Step 8: Commit**

```bash
git add lib/metadata.ts lib/metadata.test.ts app/
git commit -m "refactor: pass the resolved site name into buildMetadata"
```

---

### Task 6: `buildOrganizationJsonLd` takes name, url and logo

**Files:**
- Modify: `lib/json-ld.ts:1-26`
- Modify: `lib/json-ld.test.ts:49-62`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: `buildOrganizationJsonLd({ name, url, logo? }): OrganizationJsonLd`, with `logo` optional
  on both the argument and the returned object. Task 7 calls it.

**Scope note:** the logo *value* stays `${siteUrl}/logo.svg` in 4A — the caller supplies it. Phase 4D
replaces it with a Sanity CDN URL and deletes `public/logo.svg`. Making `logo` optional now is what
lets 4D drop it without another signature change.

- [ ] **Step 1: Update the tests**

In `lib/json-ld.test.ts`, replace the `describe('buildOrganizationJsonLd', …)` block:

```ts
describe('buildOrganizationJsonLd', () => {
  it('returns a valid schema.org Organization from the supplied values', () => {
    const org = buildOrganizationJsonLd({
      name: 'Holsinger Lab',
      url: siteUrl,
      logo: `${siteUrl}/logo.svg`,
    })
    expect(org['@context']).toBe('https://schema.org')
    expect(org['@type']).toBe('Organization')
    expect(org.name).toBe('Holsinger Lab')
    expect(org.url).toBe(siteUrl)
    expect(org.logo).toBe(`${siteUrl}/logo.svg`)
  })

  it('uses the supplied name rather than any built-in constant', () => {
    const org = buildOrganizationJsonLd({
      name: 'A Different Lab',
      url: siteUrl,
    })
    expect(org.name).toBe('A Different Lab')
  })

  it('omits logo entirely when none is supplied', () => {
    const org = buildOrganizationJsonLd({ name: 'Holsinger Lab', url: siteUrl })
    expect('logo' in org).toBe(false)
  })

  it('serializes to valid JSON with no undefined fields', () => {
    const org = buildOrganizationJsonLd({
      name: 'Holsinger Lab',
      url: siteUrl,
      logo: `${siteUrl}/logo.svg`,
    })
    expect(JSON.parse(JSON.stringify(org))).toEqual(org)
  })
})
```

The "omits logo entirely" test asserts key **absence**, not `undefined`. A key set to `undefined`
would vanish through `JSON.stringify` anyway, but leaving it present makes `Object.keys` and any
future consumer see a field that is not there — assert the stricter property.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/json-ld.test.ts`

Expected: FAIL — `buildOrganizationJsonLd` currently takes no arguments.

- [ ] **Step 3: Change the signature**

In `lib/json-ld.ts`, delete the `lib/site` import on line 2 entirely (nothing else in the file uses
it after this change — verify with a grep before deleting), and replace the interface and builder:

```ts
export interface OrganizationJsonLd {
  '@context': 'https://schema.org'
  '@type': 'Organization'
  name: string
  url: string
  logo?: string
}

export function buildOrganizationJsonLd({
  name,
  url,
  logo,
}: {
  name: string
  url: string
  /**
   * Optional: schema.org treats Organization.logo as recommended, not
   * required. Phase 4D supplies a Sanity CDN URL when the lab has uploaded a
   * logo and omits it otherwise, rather than pointing structured data at a
   * placeholder.
   */
  logo?: string
}): OrganizationJsonLd {
  const organization: OrganizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
  }
  if (logo) {
    organization.logo = logo
  }
  return organization
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/json-ld.test.ts`

Expected: PASS.

- [ ] **Step 5: Update the one call site to keep the build green**

`app/layout.tsx` is the only caller. At this point it still imports `{ siteName, siteUrl } from
'lib/site'`, so pass those through unchanged — this task is a signature change only, with **no
behavioural difference**. Task 7 replaces `siteName` with the resolved value.

In the `RootLayout` body, replace the `<JsonLd …>` line:

```tsx
        <JsonLd
          data={buildOrganizationJsonLd({
            name: siteName,
            url: siteUrl,
            logo: `${siteUrl}/logo.svg`,
          })}
        />
```

- [ ] **Step 6: Verify types and the full suite**

Run: `npm run type-check`

Expected: clean.

Run: `npm test`

Expected: 17 files, **160 tests** — Task 5 added one metadata test and this task added two json-ld
tests on top of the 157 from Task 4.

- [ ] **Step 7: Commit**

```bash
git add lib/json-ld.ts lib/json-ld.test.ts app/layout.tsx
git commit -m "refactor: pass name, url and logo into buildOrganizationJsonLd"
```

---

### Task 7: Wire the root layout, and rename the fallback constant

Completes Task 6's staged change. This is the task that overturns Phase 2D's decision to keep Sanity
data out of `app/layout.tsx` — see the spec §3.1 for the reasoning and the required guard.

**Files:**
- Modify: `app/layout.tsx:1-120`
- Modify: `lib/site.ts:5`
- Modify: `lib/branding.ts` (import name only)

**Interfaces:**
- Consumes: `resolveBranding` (Task 2), `fetchSettingsSafely` (Task 3), `settingsQuery` (Task 4),
  `buildOrganizationJsonLd` (Task 6)
- Produces: `lib/site.ts` exports `fallbackSiteName` instead of `siteName`.

- [ ] **Step 1: Rename the constant now that it has one consumer**

In `lib/site.ts`, replace line 5:

```ts
/**
 * Fallback name, used only when `settings.siteName` is unset or the settings
 * singleton is unreachable. `resolveBranding` (lib/branding.ts) is the sole
 * consumer — every other module takes a resolved name as a parameter.
 */
export const fallbackSiteName = 'Holsinger Lab'
```

In `lib/branding.ts`, simplify the now-aliased import:

```ts
import { fallbackSiteName } from 'lib/site'
```

In `lib/branding.test.ts`, update the import:

```ts
import { fallbackSiteName } from './site'
```

and replace the three `fallbackSiteName` references — they already use that identifier, so only the
import line changes.

- [ ] **Step 2: Rewrite the root layout's data and metadata**

In `app/layout.tsx`, replace the import block's `lib/site` line and add the new imports:

```ts
import { resolveBranding } from 'lib/branding'
import { buildOrganizationJsonLd } from 'lib/json-ld'
import { sanityFetch } from 'lib/sanity.live'
import { settingsQuery } from 'lib/sanity.queries'
import { fetchSettingsSafely } from 'lib/settings'
import { siteUrl } from 'lib/site'
import { cache } from 'react'
```

Replace the static `metadata` export (lines 79-95) with a cached fetch and `generateMetadata`:

```ts
export const revalidate = 60

/**
 * Cached per request, so `generateMetadata` and the component below share one
 * fetch. `stega: false` is required, not cosmetic: siteName reaches <title>,
 * Open Graph tags and JSON-LD, and stega encodes invisible characters into
 * strings during draft-mode sessions (Phase 2D's recorded lesson).
 */
const getSettings = cache(() =>
  fetchSettingsSafely(() => sanityFetch({ query: settingsQuery, stega: false }))
)

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = resolveBranding(await getSettings())

  return {
    metadataBase: new URL(siteUrl),
    applicationName: siteName,
    icons: {
      icon: [
        { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      ],
      shortcut: '/favicon/favicon.ico',
      apple: { url: '/favicon/apple-touch-icon.png', sizes: '180x180' },
    },
    manifest: '/favicon/site.webmanifest',
    other: {
      'msapplication-TileColor': '#000000',
      'msapplication-config': '/favicon/browserconfig.xml',
    },
  }
}
```

Leave `export const viewport: Viewport = { themeColor: '#F8F8F8' }` exactly as it is. Phase 4D
converts it to `generateViewport` once the palette makes the colour dynamic; 4A has no reason to.

The `icons`/`manifest`/`other` values are copied verbatim from the current static object — 4A does not
change them. Phase 4D replaces them.

- [ ] **Step 3: Switch the JSON-LD's name from the constant to the resolved value**

Task 6 already gave the `<JsonLd>` call its final shape; this step only changes where `siteName`
comes from — the `lib/site` constant is replaced by the resolved value, and the `lib/site` import
narrows to `siteUrl` alone. The full component body afterwards:

```ts
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isEnabled: isDraftMode } = await draftMode()
  const { siteName } = resolveBranding(await getSettings())

  return (
    <html
      lang="en"
      className={`${mono.variable} ${antarcticanMono.variable} ${serif.variable} ${arianaPro.variable}`}
    >
      <body className="bg-surface text-text">
        <JsonLd
          data={buildOrganizationJsonLd({
            name: siteName,
            url: siteUrl,
            logo: `${siteUrl}/logo.svg`,
          })}
        />
        {isDraftMode && <PreviewBanner />}
        {children}
        <SanityLive />
        {isDraftMode && <VisualEditing />}
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Verify types and the full unit suite**

Run: `npm run type-check`

Expected: clean.

Run: `npm test`

Expected: 17 files, **160 tests**, all passing. No new tests are added by this task — the renamed
import must not change any count.

- [ ] **Step 5: Confirm no hardcoded name survives outside the fallback**

Run: `grep -rn "Holsinger Lab" --include="*.ts" --include="*.tsx" app/ lib/ components/ | grep -v ".test.ts"`

Expected: exactly one hit — the `fallbackSiteName` constant in `lib/site.ts`. Any other hit in
non-test source is a missed call site.

- [ ] **Step 6: Commit**

```bash
git add lib/site.ts lib/branding.ts lib/branding.test.ts app/layout.tsx
git commit -m "feat: source the site name from settings in the root layout"
```

---

### Task 8: Full verification and handover notes

**Files:**
- Create: `docs/branding.md`

**Interfaces:**
- Consumes: everything above
- Produces: nothing consumed by later tasks. 4B/4C/4D read `docs/branding.md` for context.

- [ ] **Step 1: Build**

Run: `npm run build`

Expected: success. This is the first time the root layout's Sanity fetch runs under a real build —
watch for any error mentioning `settingsQuery` or dynamic rendering.

If the build reports that the root layout opted every route into dynamic rendering, that is expected
and acceptable: the site already sets `revalidate = 60` on every content route and uses
`sanityFetch`. Record the observed behaviour in the PR rather than "fixing" it silently.

- [ ] **Step 2: Run the e2e suite**

Run: `npm run test:e2e`

Expected: all passing. Two specs touch this work's output and should be watched specifically:
- `e2e/json-ld.spec.ts` asserts `typeof organization.name === 'string'` and `length > 0` on six
  routes. With `settings.siteName` unset in production, `resolveBranding` returns the fallback, so
  the assertions hold and the rendered name is unchanged from today.
- `e2e/routes.spec.ts` exercises every route, which is what would catch a root-layout fetch failure.

- [ ] **Step 3: Verify the live dataset still lacks the new fields**

Run:

```bash
curl -s 'https://j3f9z8os.api.sanity.io/v2023-10-01/data/query/production?query=*%5B_type%3D%3D%22settings%22%5D%5B0%5D%7BsiteName%2C%20shortName%7D'
```

Expected: `{"result":{}}` or both fields null. This confirms the fallback path is the one actually
exercised in production, which is what makes Step 2's e2e expectations correct.

- [ ] **Step 4: Write the developer-facing branding doc**

Create `docs/branding.md`:

```markdown
# Branding

Site-wide branding is edited in Sanity Studio under **Settings → Identity**, not in code.

## Resolution order

`resolveBranding` (`lib/branding.ts`) owns the fallback chain and is the only place that knows it:

1. `settings.siteName` — set by the lab in Studio
2. `fallbackSiteName` in `lib/site.ts` — used when the field is empty, whitespace-only, or the
   settings document cannot be fetched

`shortName` falls back to the resolved `siteName`.

Nothing else may import `fallbackSiteName`. Consumers take a resolved `siteName` as a required
parameter — `buildMetadata` and `buildOrganizationJsonLd` both do — so a call site that forgets is a
type error rather than a silently hardcoded name.

## Why the root layout's fetch cannot throw

`app/layout.tsx` wraps every route, including `/studio`. `fetchSettingsSafely` (`lib/settings.ts`)
swallows fetch failures and returns `fallbackSettings`, because an unguarded throw would take down
both the site and the CMS needed to fix it. This repo has no maintaining developer, so that failure
mode has no recovery path.

## `stega: false`

Any settings fetch whose result reaches `<title>`, Open Graph tags or JSON-LD must pass
`stega: false`. Sanity's stega encoding hides invisible characters inside strings for Visual Editing;
they are harmless in visible UI and corrupting in machine-readable output. Production is unaffected
(`lib/sanity.live.ts` uses `perspective: 'published'`), so nothing in CI will catch a mistake here.

## Still hardcoded, deliberately

- **Fonts** — four families, two licensed local `.woff2`. See the design doc §8.
- **Studio title** (`sanity.config.ts`) — Sanity config loads before any data fetch. Set via
  `NEXT_PUBLIC_SANITY_PROJECT_TITLE`.
- **`siteUrl`** — deployment configuration, set via `NEXT_PUBLIC_SITE_URL`.
```

- [ ] **Step 5: Commit**

```bash
git add docs/branding.md
git commit -m "docs: how site branding resolves and why the root fetch cannot throw"
```

---

## Post-merge manual steps

Neither is a code task; both need access this environment lacks (spec §7).

1. **Set `settings.siteName` in Studio.** Until it is set, the site behaves exactly as it does today
   — the fallback `'Holsinger Lab'` is used, and the existing mismatch with `home.title`
   ("Laboratory of Molecular Neuroscience and Dementia", which drives `<title>`) persists. **4A makes
   the conflict fixable; it does not fix it.** Someone has to decide which name is the site's name and
   type it in. No backfill script is warranted for one field on one document that Studio edits in
   seconds.

2. **Optionally set `settings.shortName`.** Not used by anything until Phase 4B renders the header
   wordmark, so there is no rush — but the ≤20-character guidance exists because 4B renders it into a
   64px-tall mobile header.

## Verification summary

| Check | Command | Expected |
|---|---|---|
| Unit tests | `npm test` | 17 files, 160 tests passing |
| Types | `npm run type-check` | clean |
| Lint | `npm run lint` | clean |
| Build | `npm run build` | success |
| E2E | `npm run test:e2e` | all passing |
| No stray hardcoded name | `grep -rn "Holsinger Lab" --include="*.ts" --include="*.tsx" app/ lib/ components/ \| grep -v ".test.ts"` | exactly one hit, in `lib/site.ts` |

## Out of scope for 4A

- `logo`, `logoDark` schema fields and the `Logo` component — Phase 4B
- `theme`, `brandColor`, presets, `@sanity/color-input` — Phase 4C
- `icon`, `app/manifest.ts`, `app/robots.ts`, `generateViewport`, deleting `public/logo.svg` and
  `browserconfig.xml`, JSON-LD logo URL — Phase 4D
- Any change to `components/global/Navbar/MobileNavBar.tsx` or `DesktopNavBar.tsx`
- Editing `/tutorial` page content — no write access
