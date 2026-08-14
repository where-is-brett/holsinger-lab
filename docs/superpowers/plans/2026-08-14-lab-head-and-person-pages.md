# Lab Head Spotlight & Person Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Dr Holsinger from a mislabelled `project` document into a `profile`, spotlighted at
the top of `/people`, with an opt-in page at `/people/<slug>` any lab member can be given, and a
Studio-controlled home-page card — all editable by a non-technical editor after handover.

**Architecture:** Three schema fields on `profile` (`fullBio`, `slug`, `hasPage`) and two on the
`settings` singleton (`labHead`, `showLabHeadOnHome`). A shared presentational layer
(`ContactLinks`, `PersonBio`, `Spotlight`) renders the same person data on `/people`'s spotlight and
on `/people/<slug>`. `ProjectListItem`'s row layout is extracted into a generic `FeatureRow` so the
home page's lab-head card and the showcase-project rows share one implementation. Every new
consumer treats `labHead` unset and `showLabHeadOnHome` unset as "no spotlight" / "on", so the whole
feature is a no-op for visitors until the content migration happens.

**Tech Stack:** Next.js 16 (App Router), React 19, Sanity 6.9.1, TypeScript, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-12-lab-head-and-person-pages-design.md`.

## Global Constraints

- **Sonnet only.** Every subagent dispatched in this repo uses `model: "sonnet"` — implementers, task
  reviewers, and the final whole-branch review alike.
- **No Sanity Studio login and no write token exist in this environment.** Do not plan or attempt any
  task that requires clicking through Studio or writing to the dataset — including §4's content
  migration, which is explicitly a by-hand Studio step and **out of scope for this plan**. The
  substitute is `npm run type-check`, `npm run typegen` (works locally, see below), direct
  verification of any touched Sanity API against `node_modules/@sanity/types/lib/index.d.ts`, and
  hand-tracing.
- **Reads against the live dataset do work** without a token: project `j3f9z8os`, dataset
  `production`, publicly readable. **This worktree's `.env.local` is gitignored and was not carried
  over from the main checkout.** Before running `npm run typegen`, `npm run build`, `npm run dev`, or
  `npm run test:e2e` for the first time in a fresh worktree, create it:
  ```
  NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os
  NEXT_PUBLIC_SANITY_DATASET=production
  ```
  Confirmed working: `npm run typegen` succeeds and produces a no-op diff against the current
  `sanity.types.ts` with only this file present (verified during this plan's research).
- **`labHead` is unset in live data until the §4 Studio edit happens**, which is not part of this
  plan. Every task that adds a spotlight, person page, or home card must render correctly — meaning
  render *nothing extra* — with `labHead` unset. e2e specs against live data can only exercise that
  graceful-degradation path; the populated path is hand-verified after the content lands. This
  mirrors the existing precedent at `e2e/routes.spec.ts`'s skipped timeline test — follow that same
  pattern (a real assertion for what's live today, plus a documented `test.skip` for the populated
  path) rather than fabricating or mocking data the live e2e suite has no way to provide.
- **`stega: false` is mandatory** on any settings/profile fetch whose result reaches `<title>`, Open
  Graph tags, or JSON-LD. Phase 2D's recorded lesson: stega characters are invisible and only appear
  in draft-mode sessions, so nothing in CI catches a mistake here.
- **The `next.config.mjs` redirect and the §4 Studio migration ship together, not in this plan.**
  The spec's §9 sequencing lists the redirect as part of the home-card stage, but shipping it ahead of
  the Studio edit would break the *currently working* `/projects/about-dr-damian-holsinger` URL: the
  redirect would send visitors to `/people/damian-holsinger`, which 404s until the profile exists.
  That contradicts the spec's own invariant that nothing regresses in the gap between deploying this
  code and doing the Studio edit (§4). This plan stops at the code that is safe to ship with
  `labHead` unset; the redirect is a one-line follow-up made at the same time as the Studio migration,
  called out again at the end of this plan.
- **Run unit tests as `npm test`** (already scoped to this repo's own suite; the `.claude/worktrees`
  exclusion in `vitest.config.ts` already ships on `main`).
- **Commit after every task. Do not batch commits.**

---

### Task 1: Schema, queries, and generated types

Schema, GROQ projections, generated types, and the `fallbackSettings`/type exports in `types/index.ts`
must move together — changing any one alone leaves `tsc` failing or the types lying about the query.
This is the foundation every later task builds on.

**Files:**
- Modify: `schemas/documents/profile.ts` (whole file)
- Modify: `schemas/singletons/settings.ts` (whole file)
- Modify: `lib/sanity.queries.ts:68-83` (`settingsQuery`), `:108-123` (`profileQuery`) — plus two new
  query exports
- Modify: `types/index.ts:1-10` (imports), `:41-43` (`ProfilePayload`/`RoleGroupPayload`), `:57-66`
  (`fallbackSettings`)
- Regenerate: `sanity.types.ts` (via `npm run typegen` — tracked in git, must be committed)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `ProfilePayload`, `ProfileBySlugPayload`, `LabHeadPayload` — all three select the identical
    person-field set (`_id, image, name, role, email, phone, bio, slug, hasPage, fullBio`);
    `ProfilePayload` additionally has `orderRank` and `roleGroup`. Tasks 5, 6, 7 and 9 rely on this
    structural compatibility to pass any of the three into the shared `PersonBio` component.
  - `SettingsPayload` gains `labHead: LabHeadPayload | null` and `showLabHeadOnHome: boolean | null`.
    Tasks 6 and 9 rely on both keys existing.
  - New GROQ exports `profileBySlugQuery` and `profilePaths`, used by Task 7.

**Verified API note:** `groups?: FieldGroupDefinition[]` on a document definition and `group?: string`
on a field are confirmed valid against the installed `sanity@6.9.1`
(`node_modules/@sanity/types/lib/index.d.ts:874`, `:1640` — this repo's Phase 4A plan verified the
same claim). The conditional slug validator below uses `Rule.custom<T>(fn: CustomValidator<T>)`
(`node_modules/@sanity/types/lib/index.d.ts:369`) and reads `context.parent`, typed `unknown` on the
base `ValidationContext` (`:513-514`) — the cast to `{ hasPage?: boolean }` is therefore required and
intentional, not a workaround for a typing gap.

- [ ] **Step 1: Rewrite `schemas/documents/profile.ts`**

```ts
import { UserIcon } from '@sanity/icons/User'
import {
  orderRankField,
  orderRankOrdering,
} from '@sanity/orderable-document-list'
import { defineArrayMember, defineField, defineType } from 'sanity'
import { slugify, validateSlugFormat } from 'schemas/lib/slug'

export default defineType({
  type: 'document',
  name: 'profile',
  title: 'People',
  icon: UserIcon,
  orderings: [orderRankOrdering],
  preview: {
    select: { title: 'name', subtitle: 'role', media: 'image' },
  },
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
      type: 'reference',
      to: [{ type: 'roleGroup' }],
      description:
        'Groups this person on the public People page. Manage the list of groups (add, rename, reorder, delete) from the "Role Groups" entry in the Studio sidebar. Leave unset to show under "Other".',
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
      description:
        'Short blurb, one or two sentences. Shown on this person\'s card on the People page (behind the "+" button), and as the body text if they are the Lab Head\'s home-page card. For a long-form biography, use Full biography below.',
    }),
    defineField({
      name: 'fullBio',
      title: 'Full biography',
      type: 'array',
      description:
        'Long-form biography. Shown on this person\'s own page, and in the spotlight if they are set as the Lab Head in Settings.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [],
          lists: [],
          marks: {
            decorators: [
              { title: 'Italic', value: 'em' },
              { title: 'Strong', value: 'strong' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [{ name: 'href', type: 'url', title: 'Url' }],
              },
            ],
          },
        }),
      ],
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description:
        'Used in this person\'s page URL: /people/<slug>. Required once "Give this person their own page" below is turned on.',
      options: {
        source: 'name',
        maxLength: 96,
        slugify,
        isUnique: (value, context) => context.defaultIsUnique(value, context),
      },
      validation: (rule) =>
        rule.custom((slug, context) => {
          const formatResult = validateSlugFormat(slug)
          if (formatResult !== true) {
            return formatResult
          }
          const hasPage = (
            context.parent as { hasPage?: boolean } | undefined
          )?.hasPage
          if (hasPage && !slug?.current) {
            return 'A slug is required when "Give this person their own page" is enabled.'
          }
          return true
        }),
    }),
    defineField({
      name: 'hasPage',
      title: 'Give this person their own page',
      type: 'boolean',
      initialValue: false,
      description:
        'When on, this person gets their own page at /people/<slug>, using the slug above.',
    }),
  ],
})
```

- [ ] **Step 2: Rewrite `schemas/singletons/settings.ts`**

Add a `labHead` group and its two fields, placed right after the `identity` fields so the file stays
ordered by group like it already is:

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
    { name: 'labHead', title: 'Lab head' },
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
      name: 'labHead',
      title: 'Lab head',
      type: 'reference',
      to: [{ type: 'profile' }],
      group: 'labHead',
      description:
        'The lab head, shown in a spotlight at the top of the People page. Leave unset for no spotlight.',
    }),
    defineField({
      name: 'showLabHeadOnHome',
      title: 'Show lab head on the home page',
      type: 'boolean',
      group: 'labHead',
      initialValue: true,
      description:
        'Toggle to show a card about the lab head on the home page, below the research projects. Affects only the home page -- the People page spotlight and the lab head\'s own page (if enabled) are unaffected.',
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

- [ ] **Step 3: Update `lib/sanity.queries.ts`**

Replace `settingsQuery` (currently lines 68-83):

```ts
export const settingsQuery = groq`
  *[_type == "settings"][0]{
    siteName,
    shortName,
    footer,
    showPublications,
    showPeople,
    showContactForm,
    showLabHeadOnHome,
    menuItems[]->{
      _type,
      "slug": slug.current,
      title
    },
    ogImage,
    labHead->{
      _id,
      image,
      name,
      role,
      email,
      phone,
      bio,
      "slug": slug.current,
      hasPage,
      fullBio,
    },
  }
`
```

Replace `profileQuery` (currently lines 108-123):

```ts
export const profileQuery = groq`
  *[_type == "profile"] | order(orderRank) {
    _id,
    image,
    orderRank,
    name,
    role,
    roleGroup->{
      _id,
      title,
    },
    email,
    phone,
    bio,
    "slug": slug.current,
    hasPage,
    fullBio,
  }
`
```

Append two new query exports at the end of the file:

```ts
export const profileBySlugQuery = groq`
  *[_type == "profile" && slug.current == $slug && hasPage == true][0]{
    _id,
    image,
    name,
    role,
    email,
    phone,
    bio,
    "slug": slug.current,
    hasPage,
    fullBio,
  }
`

export const profilePaths = groq`
  *[_type == "profile" && hasPage == true && slug.current != null].slug.current
`
```

Filtering `hasPage == true` inside `profileBySlugQuery` itself (rather than fetching unconditionally
and checking in the route) means an unknown slug and a disabled (`hasPage: false`) profile both
resolve to `null` from the same code path — satisfying spec D5/§3.3's "unknown slug, hasPage false,
and showPeople off" 404 conditions with one `!profile` check in Task 7, exactly like the existing
`projectBySlugQuery` / `pagesBySlugQuery` pattern.

- [ ] **Step 4: Regenerate types**

Run: `npm run typegen`

Expected: succeeds (needs the two env vars from Global Constraints), and `sanity.types.ts` now has
`ProfileQueryResult`, `SettingsQueryResult`, `ProfileBySlugQueryResult`, and `ProfilePathsResult`
reflecting the new fields/queries.

- [ ] **Step 5: Update `types/index.ts`**

Add `ProfileBySlugQueryResult` to the import block (currently lines 2-10):

```ts
import type {
  HomePageQueryResult,
  PagesBySlugQueryResult,
  ProfileBySlugQueryResult,
  ProfileQueryResult,
  ProjectBySlugQueryResult,
  PublicationsQueryResult,
  RoleGroupQueryResult,
  SettingsQueryResult,
} from 'sanity.types'
```

Replace the `ProfilePayload`/`RoleGroupPayload` block (currently lines 41-43):

```ts
export type ProfilePayload = ProfileQueryResult[number]
export type ProfileBySlugPayload = NonNullable<ProfileBySlugQueryResult>
export type LabHeadPayload = NonNullable<SettingsPayload['labHead']>

export type RoleGroupPayload = RoleGroupQueryResult[number]
```

Replace `fallbackSettings` (currently lines 57-66) — add `labHead` and `showLabHeadOnHome`,
following the file's existing documented convention that the three `show*` booleans are `null`, not
`undefined`, so downstream `!== false` guards keep failing open:

```ts
export const fallbackSettings: SettingsPayload = {
  siteName: null,
  shortName: null,
  menuItems: [],
  showPublications: null,
  showPeople: null,
  showContactForm: null,
  showLabHeadOnHome: null,
  labHead: null,
  footer: [],
  ogImage: null,
}
```

- [ ] **Step 6: Verify**

Run: `npm run type-check && npm test`

Expected: both clean. No test file references the changed types yet, so this only confirms nothing
broke.

- [ ] **Step 7: Commit**

```bash
git add schemas/documents/profile.ts schemas/singletons/settings.ts lib/sanity.queries.ts types/index.ts sanity.types.ts
git commit -m "feat: add lab-head and person-page fields to profile and settings schemas"
```

---

### Task 2: `resolveHref('profile', slug)`

Small and self-contained, but three later tasks (Spotlight's "Full profile" link, the home card's
link, and the sitemap) all call it.

**Files:**
- Modify: `lib/sanity.links.ts:1-18` (`resolveHref`)
- Modify: `lib/sanity.links.test.ts` (add cases)

**Interfaces:**
- Consumes: nothing
- Produces: `resolveHref('profile', slug)` returns `/people/<slug>` or `undefined`. Used by Tasks 5,
  7, and 9.

- [ ] **Step 1: Write the failing tests**

Add to `lib/sanity.links.test.ts`, inside the existing `describe('resolveHref', ...)` block (after
the `project` cases):

```ts
  it('resolves a profile document to /people/<slug>', () => {
    expect(resolveHref('profile', 'damian-holsinger')).toBe(
      '/people/damian-holsinger'
    )
  })

  it('returns undefined for a profile document with no slug', () => {
    expect(resolveHref('profile')).toBeUndefined()
    expect(resolveHref('profile', null)).toBeUndefined()
  })
```

Also update the two exhaustive checks later in the same file:

```ts
  it('does not warn for any recognized document type', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    resolveHref('home')
    resolveHref('page', 'about')
    resolveHref('project', 'my-project')
    resolveHref('profile', 'damian-holsinger')
    resolveHref('settings')
    expect(warn).not.toHaveBeenCalled()

    warn.mockRestore()
  })
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/sanity.links.test.ts`

Expected: FAIL — `profile` falls through to the `default` case and returns `undefined` with a console
warning instead of a path.

- [ ] **Step 3: Add the `profile` case**

In `lib/sanity.links.ts`, add a case between `project` and `default`:

```ts
    case 'project':
      return slug ? `/projects/${slug}` : undefined
    case 'profile':
      return slug ? `/people/${slug}` : undefined
    default:
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/sanity.links.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/sanity.links.ts lib/sanity.links.test.ts
git commit -m "feat: resolve profile documents to /people/<slug>"
```

---

### Task 3: `groupByRoleGroup` — suppress the lone "Other" heading

With zero Role Groups in live production, `/people`'s only section today is headed literally
"Other". Once the spotlight lands above it, that reads as "Dr Holsinger, and… Other" — spec §3.2/D8.

**Files:**
- Modify: `components/pages/people/groupByRoleGroup.ts:18-39`
- Modify: `components/pages/people/groupByRoleGroup.test.ts` (two existing cases change, one case
  added)

**Interfaces:**
- Consumes: nothing
- Produces: `groupByRoleGroup` now returns `title: null` for the catch-all section when it is the
  only section returned. `RoleGroupSection.title` is already typed `string | null`, so no type change
  is needed. Task 6's `People.tsx` must render the heading conditionally (`{section.title && ...}`)
  rather than unconditionally.

- [ ] **Step 1: Update the two tests whose expected behaviour changes**

In `groupByRoleGroup.test.ts`, the first test currently expects `title: 'Other'` when it is the only
section — that is exactly the case being fixed. Replace it:

```ts
  it('suppresses the "Other" heading when it is the only section', () => {
    const profiles = [
      { _id: '1', roleGroup: null },
      { _id: '2', roleGroup: null },
    ]
    const result = groupByRoleGroup(profiles, [PHD, LAB_HEAD])
    expect(result).toEqual([
      {
        id: 'other',
        title: null,
        profiles: [
          { _id: '1', roleGroup: null },
          { _id: '2', roleGroup: null },
        ],
      },
    ])
  })
```

And the last test (`'returns a single "Other" section when roleGroups is empty but profiles are
not'`) — same change, same reasoning:

```ts
  it('suppresses the "Other" heading when roleGroups is empty but profiles are not', () => {
    const profiles = [{ _id: '1', roleGroup: null }]
    const result = groupByRoleGroup(profiles, [])
    expect(result).toEqual([{ id: 'other', title: null, profiles: [{ _id: '1', roleGroup: null }] }])
  })
```

Add one new case confirming named + catch-all together are unaffected (this already passes today via
the existing `'puts unset and dangling-reference (null) roleGroup values in "Other", after named
sections'` test, but that test doesn't assert on `title` — add an explicit one):

```ts
  it('keeps the "Other" title when it appears alongside a named section', () => {
    const profiles = [
      { _id: '1', roleGroup: PHD },
      { _id: '2', roleGroup: null },
    ]
    const result = groupByRoleGroup(profiles, [PHD])
    expect(result.find((s) => s.id === 'other')?.title).toBe('Other')
  })
```

- [ ] **Step 2: Run to verify the two changed tests fail**

Run: `npx vitest run components/pages/people/groupByRoleGroup.test.ts`

Expected: FAIL on the two updated cases (current code still returns `title: 'Other'`); the new case
passes already since it doesn't touch the changed branch.

- [ ] **Step 3: Implement the suppression**

In `groupByRoleGroup.ts`, replace the final two lines of the function body:

```ts
  const nonEmpty = [...sections, other].filter(
    (section) => section.profiles.length > 0
  )

  // When the catch-all is the only section, a heading reading literally
  // "Other" looks like a label for the whole page rather than a real
  // category -- suppress it. Named sections are unaffected, and the moment
  // the lab creates its first Role Group, a second section returns and
  // headings come back.
  if (nonEmpty.length === 1 && nonEmpty[0].id === 'other') {
    return [{ ...nonEmpty[0], title: null }]
  }

  return nonEmpty
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/pages/people/groupByRoleGroup.test.ts`

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add components/pages/people/groupByRoleGroup.ts components/pages/people/groupByRoleGroup.test.ts
git commit -m "fix: suppress the lone \"Other\" heading on the People page"
```

---

### Task 4: `buildPersonJsonLd`

The single-person `Person` JSON-LD for `/people/<slug>`, reusing the existing (currently unexported)
`PersonJsonLd` shape from `buildPersonListJsonLd`.

**Files:**
- Modify: `lib/json-ld.ts:44-49` (export `PersonJsonLd`), add new interface + function after
  `buildPersonListJsonLd` (currently ends at line 96)
- Modify: `lib/json-ld.test.ts` (add cases)

**Interfaces:**
- Consumes: `urlForImage` (already imported in this file)
- Produces: `function buildPersonJsonLd(input: { name?: string | null; role?: string | null; image?:
  Image | null; url: string }): SinglePersonJsonLd | null`, where `SinglePersonJsonLd` extends the
  now-exported `PersonJsonLd` with `'@context'` and `url`. Used by Task 7.

- [ ] **Step 1: Write the failing tests**

Add to `lib/json-ld.test.ts`, after the `describe('buildPersonListJsonLd', ...)` block:

```ts
describe('buildPersonJsonLd', () => {
  const url = `${siteUrl}/people/ada-lovelace`

  it('builds Person JSON-LD from a name alone', () => {
    const result = buildPersonJsonLd({ name: 'Ada Lovelace', url })
    expect(result).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Ada Lovelace',
      url,
    })
  })

  it('includes jobTitle when role is given', () => {
    const result = buildPersonJsonLd({
      name: 'Ada Lovelace',
      role: 'Postdoctoral Fellow',
      url,
    })
    expect(result?.jobTitle).toBe('Postdoctoral Fellow')
  })

  it('includes an image URL when an image is given', () => {
    const result = buildPersonJsonLd({
      name: 'Ada Lovelace',
      role: 'Postdoctoral Fellow',
      image: {
        _type: 'image',
        asset: { _ref: 'image-abc', _type: 'reference' },
      },
      url,
    })
    expect(result?.image).toBe('https://cdn.sanity.io/mock-image.jpg')
  })

  it('returns null when there is no name to describe', () => {
    expect(buildPersonJsonLd({ name: null, url })).toBeNull()
    expect(buildPersonJsonLd({ name: '  ', url })).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/json-ld.test.ts`

Expected: FAIL — `buildPersonJsonLd` does not exist yet.

- [ ] **Step 3: Implement**

Change line 44 from `interface PersonJsonLd {` to `export interface PersonJsonLd {`. Then add, after
`buildPersonListJsonLd`'s closing brace (currently line 96) and before the `ScholarlyArticleJsonLd`
section:

```ts
export interface SinglePersonJsonLd extends PersonJsonLd {
  '@context': 'https://schema.org'
  url: string
}

/**
 * Person JSON-LD for a single person page. Returns null when there is no
 * name to describe -- schema.org requires it, and the caller (Task 7) only
 * reaches this from data already guarded by `!profile` in the route, so
 * this is defensive completeness rather than an expected path.
 */
export function buildPersonJsonLd({
  name,
  role,
  image,
  url,
}: {
  name?: string | null
  role?: string | null
  image?: Image | null
  url: string
}): SinglePersonJsonLd | null {
  if (!name || !name.trim()) {
    return null
  }

  const person: SinglePersonJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    url,
  }

  if (role) {
    person.jobTitle = role
  }

  const imageUrl =
    image &&
    urlForImage(image)?.width(800).height(800).fit('crop').url()
  if (imageUrl) {
    person.image = imageUrl
  }

  return person
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/json-ld.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/json-ld.ts lib/json-ld.test.ts
git commit -m "feat: add buildPersonJsonLd for single person pages"
```

---

### Task 5: `ContactLinks`, `PersonBio`, and `Spotlight`

The presentational layer shared by the `/people` spotlight and `/people/<slug>` (spec §3.2/§3.3: "the
same presentational component" in a two-column vs. single-column arrangement). `ContactLinks` is
extracted from `Profile.tsx` first so the new component doesn't duplicate its mail/phone icons and
`Profile.tsx` doesn't drift from the version this task introduces.

No component in this repo has a `.test.tsx` file — component behaviour is verified through
"contract" tests that assert on source text and through Playwright e2e, not unit tests of rendered
JSX (confirmed by surveying every existing `.test.ts` file during this plan's research). `PersonBio`
and `Spotlight` follow that precedent: no test file for either. Task 6's e2e covers what live data can
exercise; the rest is `npm run type-check` plus the manual check in Step 5 below.

**Files:**
- Create: `components/pages/people/ContactLinks.tsx`
- Modify: `components/pages/people/Profile.tsx:1-41` (remove `MailIcon`/`PhoneIcon`), `:126-144`
  (use `ContactLinks`)
- Create: `components/pages/people/PersonBio.tsx`
- Create: `components/pages/people/Spotlight.tsx`

**Interfaces:**
- Consumes: `resolveHref` (Task 2)
- Produces:
  - `ContactLinks({ email, phone }: { email?: string | null; phone?: string | null })`
  - `PersonBio({ person, layout }: { person: PersonBioPerson; layout: 'spotlight' | 'page' })`, where
    `PersonBioPerson` is declared structurally (image/name/role/email/phone/fullBio/bio), matching the
    `ProfilePayload`/`ProfileBySlugPayload`/`LabHeadPayload` field set from Task 1 without importing
    any of them — same rationale as `lib/branding.ts`'s `BrandingSource`. Used by Tasks 6 and 7.
  - `Spotlight({ labHead }: { labHead: LabHeadPayload })`. Used by Task 6.

- [ ] **Step 1: Extract `ContactLinks`**

Create `components/pages/people/ContactLinks.tsx`, moving `MailIcon`/`PhoneIcon` and the contact
block verbatim out of `Profile.tsx`:

```tsx
function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.3 0 .7-.2 1L6.6 10.8Z" />
    </svg>
  )
}

export function ContactLinks({
  email,
  phone,
}: {
  email?: string | null
  phone?: string | null
}) {
  if (!email && !phone) {
    return null
  }
  return (
    <div className="flex flex-col gap-2 text-sm">
      {email && (
        <div className="inline-flex space-x-1">
          <MailIcon />
          <a href={`mailto:${email}`} className="hover:text-link">
            {email}
          </a>
        </div>
      )}
      {phone && (
        <div className="inline-flex space-x-1">
          <PhoneIcon />
          <a href={`tel:${phone}`} className="hover:text-link">
            {phone}
          </a>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update `Profile.tsx` to use it**

Remove the `MailIcon`/`PhoneIcon` function declarations (lines 8-41) and the `ImageBox` import stays;
add `import { ContactLinks } from './ContactLinks'`. Replace the contact block (lines 126-144):

```tsx
      {/* Contact */}
      <ContactLinks email={profile.email} phone={profile.phone} />
```

- [ ] **Step 3: Create `PersonBio`**

```tsx
import { CustomPortableText } from 'components/shared/CustomPortableText'
import ImageBox from 'components/shared/ImageBox'
import type { ArbitraryTypedObject, PortableTextBlock } from '@portabletext/types'

import { ContactLinks } from './ContactLinks'

export interface PersonBioPerson {
  // Matches `ImageBox`'s own declared prop type exactly (`{ asset?: any } | null`),
  // not the stricter `Image` from 'sanity' -- this component only ever forwards
  // `image` straight through to `ImageBox`, and every generated payload's `image`
  // field (leaving crop/hotspot optional) is already assignable to that looser
  // shape without a cast. Typing this `Image` would force every call site (Tasks
  // 6 and 7) to cast, for no benefit.
  image?: { asset?: any } | null
  name?: string | null
  role?: string | null
  email?: string | null
  phone?: string | null
  fullBio?: (PortableTextBlock | ArbitraryTypedObject)[] | null
  bio?: string | null
}

export function PersonBio({
  person,
  layout,
}: {
  person: PersonBioPerson
  layout: 'spotlight' | 'page'
}) {
  const { image, name, role, email, phone, fullBio, bio } = person

  return (
    <div
      className={
        layout === 'spotlight'
          ? 'flex flex-col gap-6 md:flex-row md:items-start'
          : 'flex flex-col gap-6'
      }
    >
      <div
        className={
          layout === 'spotlight' ? 'w-full md:w-5/12 lg:w-4/12' : 'w-full md:w-1/3'
        }
      >
        <ImageBox
          image={image}
          width={800}
          height={800}
          size={
            layout === 'spotlight'
              ? '(min-width: 768px) 40vw, 100vw'
              : '(min-width: 768px) 33vw, 100vw'
          }
          alt={name ? `Profile image of ${name}` : 'Profile image'}
          classesWrapper="relative aspect-[1/1] rounded border border-rule"
        />
      </div>
      <div className="flex-1 space-y-4">
        <div>
          {name && <h2 className="text-2xl font-bold md:text-3xl">{name}</h2>}
          {role && <p className="text-text-muted">{role}</p>}
        </div>
        <ContactLinks email={email} phone={phone} />
        <div className="font-ariana text-text-muted">
          {fullBio && fullBio.length > 0 ? (
            <CustomPortableText value={fullBio} />
          ) : (
            bio && <p>{bio}</p>
          )}
        </div>
      </div>
    </div>
  )
}
```

Note: the spotlight portrait is full colour (no grayscale-hover treatment) per spec §3.2 — that
treatment is `Profile.tsx`'s own `classesWrapper`, not reused here.

- [ ] **Step 4: Create `Spotlight`**

```tsx
import { resolveHref } from 'lib/sanity.links'
import Link from 'next/link'
import type { LabHeadPayload } from 'types'

import { PersonBio } from './PersonBio'

export function Spotlight({ labHead }: { labHead: LabHeadPayload }) {
  const href = labHead.hasPage ? resolveHref('profile', labHead.slug) : undefined

  return (
    <section className="mb-12 border-b pb-12">
      <PersonBio person={labHead} layout="spotlight" />
      {href && (
        <Link href={href} className="mt-4 inline-block font-medium hover:underline">
          Full profile →
        </Link>
      )}
    </section>
  )
}
```

- [ ] **Step 5: Verify**

Run: `npm run type-check`

Expected: clean.

Optional manual check (recommended, not required — live data has no `labHead` set, so nothing here
renders yet): run `npm run dev`, temporarily hardcode a fake `labHead` object into
`app/people/page.tsx`'s `getData()` return, and visually confirm the spotlight, contact links, and
"Full profile →" link render sensibly at both mobile and `md:` widths. Revert the hardcoded value
before committing — it must not ship.

- [ ] **Step 6: Commit**

```bash
git add components/pages/people/ContactLinks.tsx components/pages/people/Profile.tsx components/pages/people/PersonBio.tsx components/pages/people/Spotlight.tsx
git commit -m "feat: add shared PersonBio/Spotlight presentational components"
```

---

### Task 6: Grid exclusion + wire the spotlight into `/people`

**Files:**
- Create: `components/pages/people/excludeLabHead.ts`
- Create: `components/pages/people/excludeLabHead.test.ts`
- Modify: `components/pages/people/People.tsx` (whole file)
- Create: `e2e/lab-head-spotlight.spec.ts`

**Interfaces:**
- Consumes: `groupByRoleGroup` (Task 3), `Spotlight` (Task 5)
- Produces: `excludeLabHead<T extends { _id: string }>(profiles: T[], labHeadId?: string | null):
  T[]`. Not consumed elsewhere in this plan, but is the pure unit the spec's "grid exclusion" test
  requirement (§5) targets.

- [ ] **Step 1: Write the failing test**

Create `components/pages/people/excludeLabHead.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { excludeLabHead } from './excludeLabHead'

describe('excludeLabHead', () => {
  const profiles = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]

  it('removes the profile matching labHeadId', () => {
    expect(excludeLabHead(profiles, 'b')).toEqual([{ _id: 'a' }, { _id: 'c' }])
  })

  it('leaves the grid untouched when labHeadId is unset', () => {
    expect(excludeLabHead(profiles, undefined)).toEqual(profiles)
    expect(excludeLabHead(profiles, null)).toEqual(profiles)
  })

  it('leaves the grid untouched when labHeadId does not match any profile (dangling reference)', () => {
    expect(excludeLabHead(profiles, 'not-in-the-list')).toEqual(profiles)
  })

  it('returns an empty array for an empty profile list', () => {
    expect(excludeLabHead([], 'a')).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/pages/people/excludeLabHead.test.ts`

Expected: FAIL — cannot resolve `./excludeLabHead`.

- [ ] **Step 3: Implement**

Create `components/pages/people/excludeLabHead.ts`:

```ts
/**
 * Removes the spotlighted lab head from the grid so they don't appear
 * twice. `labHeadId` unset, or not matching any profile in the list
 * (a dangling reference), leaves `profiles` untouched.
 */
export function excludeLabHead<T extends { _id: string }>(
  profiles: T[],
  labHeadId?: string | null
): T[] {
  if (!labHeadId) {
    return profiles
  }
  return profiles.filter((profile) => profile._id !== labHeadId)
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/pages/people/excludeLabHead.test.ts`

Expected: PASS, 4 tests.

- [ ] **Step 5: Wire the spotlight and grid exclusion into `People.tsx`**

Replace the whole file:

```tsx
import Layout from 'components/shared/Layout'
import { ProfilePayload, RoleGroupPayload, SettingsPayload } from 'types'

import { excludeLabHead } from './excludeLabHead'
import { groupByRoleGroup } from './groupByRoleGroup'
import Profile from './Profile'
import { Spotlight } from './Spotlight'

export default function People({
  settings,
  profiles,
  roleGroups,
}: {
  settings?: SettingsPayload
  profiles: ProfilePayload[]
  roleGroups: RoleGroupPayload[]
}) {
  const labHead = settings?.labHead
  const gridProfiles = excludeLabHead(profiles, labHead?._id)
  const sections = groupByRoleGroup(gridProfiles, roleGroups)

  return (
    <Layout settings={settings}>
      <h1 className="mb-6 text-3xl font-black md:text-5xl">People</h1>
      {labHead && <Spotlight labHead={labHead} />}
      <div className="mb-16 space-y-12">
        {sections.map((section) => (
          <section key={section.id}>
            {section.title && (
              <h2 className="mb-4 text-2xl font-bold">{section.title}</h2>
            )}
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

- [ ] **Step 6: Add the e2e spec**

Create `e2e/lab-head-spotlight.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('/people renders without a spotlight when no lab head is set (current live data)', async ({
  page,
}) => {
  const response = await page.goto('/people')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'People', level: 1 })).toBeVisible()
  await expect(page.getByText('Full profile →')).toHaveCount(0)
})

// `settings.labHead` is unset in live data until the spec's §4 Studio
// migration happens -- there is no write token or staging dataset in this
// environment (Global Constraints). Hand-verify the spotlight's portrait,
// bio, grid exclusion, and "Full profile" link once that content lands,
// then replace this skip with a real assertion against the lab head's
// actual name/slug. Mirrors the existing skipped-test precedent in
// e2e/routes.spec.ts.
test.skip('/people spotlights the lab head above the grid once settings.labHead is set', async ({
  page,
}) => {
  await page.goto('/people')
})
```

- [ ] **Step 7: Run to verify**

Run: `npm run type-check && npm test`

Expected: both clean.

Run: `npx playwright test e2e/lab-head-spotlight.spec.ts e2e/routes.spec.ts e2e/json-ld.spec.ts`

Expected: all pass (the two existing specs confirm `/people` still 200s and still emits its
`ItemList` JSON-LD unchanged).

- [ ] **Step 8: Commit**

```bash
git add components/pages/people/excludeLabHead.ts components/pages/people/excludeLabHead.test.ts components/pages/people/People.tsx e2e/lab-head-spotlight.spec.ts
git commit -m "feat: spotlight the lab head above the People grid"
```

---

### Task 7: Person pages route

**Files:**
- Create: `lib/text.ts`
- Create: `lib/text.test.ts`
- Create: `app/people/[slug]/page.tsx`
- Modify: `lib/paths.ts` (whole file — sitemap wiring)
- Modify: `e2e/lab-head-spotlight.spec.ts` (add cases)

**Interfaces:**
- Consumes: `PersonBio` (Task 5), `buildPersonJsonLd` (Task 4), `profileBySlugQuery`/`profilePaths`
  (Task 1)
- Produces: `truncateAtWordBoundary(text: string, maxLength: number): string`, used by this task's
  `generateMetadata` only.

- [ ] **Step 1: Write the failing test for `truncateAtWordBoundary`**

Create `lib/text.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { truncateAtWordBoundary } from './text'

describe('truncateAtWordBoundary', () => {
  it('returns the text unchanged when at or under the limit', () => {
    expect(truncateAtWordBoundary('short text', 155)).toBe('short text')
    expect(truncateAtWordBoundary('exactly ten', 11)).toBe('exactly ten')
  })

  it('cuts at the last space at or before the limit and appends an ellipsis', () => {
    const text = 'The quick brown fox jumps over the lazy dog'
    expect(truncateAtWordBoundary(text, 19)).toBe('The quick brown…')
  })

  it('hard-cuts when there is no space to break on', () => {
    expect(
      truncateAtWordBoundary('supercalifragilisticexpialidocious', 10)
    ).toBe('supercalif…')
  })

  it('trims surrounding whitespace before measuring', () => {
    expect(truncateAtWordBoundary('  short  ', 155)).toBe('short')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/text.test.ts`

Expected: FAIL — cannot resolve `./text`.

- [ ] **Step 3: Implement**

Create `lib/text.ts`:

```ts
/**
 * Truncates at the last whitespace boundary at or before `maxLength`, so a
 * meta description never ends mid-word. Falls back to a hard cut when no
 * boundary exists (a single word longer than `maxLength`).
 */
export function truncateAtWordBoundary(text: string, maxLength: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= maxLength) {
    return trimmed
  }
  const sliced = trimmed.slice(0, maxLength)
  const lastSpace = sliced.lastIndexOf(' ')
  const cut = lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced
  return `${cut.trimEnd()}…`
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/text.test.ts`

Expected: PASS, 4 tests.

- [ ] **Step 5: Wire `profilePaths` into the sitemap**

Replace `lib/paths.ts` in full:

```ts
import { getClient } from 'lib/sanity.client'
import { resolveHref } from 'lib/sanity.links'
import { pagePaths, profilePaths, projectPaths } from 'lib/sanity.queries'
import type {
  PagePathsResult,
  ProfilePathsResult,
  ProjectPathsResult,
} from 'sanity.types'

export const getAllPaths = async (
  staticPaths: string[] = ['/', '/publications', '/contact', '/people']
) => {
  const client = getClient()
  const pages = await client.fetch<PagePathsResult>(pagePaths)
  const projects = await client.fetch<ProjectPathsResult>(projectPaths)
  const profiles = await client.fetch<ProfilePathsResult>(profilePaths)
  const paths = [
    ...pages
      .filter((slug): slug is string => Boolean(slug))
      .map((slug) => resolveHref('page', slug)),
    ...projects
      .filter((slug): slug is string => Boolean(slug))
      .map((slug) => resolveHref('project', slug)),
    ...profiles
      .filter((slug): slug is string => Boolean(slug))
      .map((slug) => resolveHref('profile', slug)),
  ]
  return [...staticPaths, ...paths]
}
```

`app/sitemap.ts` consumes `getAllPaths` already and needs no change — confirmed by reading it during
this plan's research; it just maps whatever paths come back.

- [ ] **Step 6: Create the route**

Create `app/people/[slug]/page.tsx`, following `app/projects/[slug]/page.tsx`'s structure:

```tsx
import { toPlainText } from '@portabletext/react'
import { PersonBio } from 'components/pages/people/PersonBio'
import { JsonLd } from 'components/shared/JsonLd'
import Layout from 'components/shared/Layout'
import { resolveBranding } from 'lib/branding'
import { buildPersonJsonLd } from 'lib/json-ld'
import { buildMetadata } from 'lib/metadata'
import { getClient } from 'lib/sanity.client'
import { sanityFetch } from 'lib/sanity.live'
import {
  homePageTitleQuery,
  profileBySlugQuery,
  profilePaths,
  settingsQuery,
} from 'lib/sanity.queries'
import { siteUrl } from 'lib/site'
import { truncateAtWordBoundary } from 'lib/text'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import type { Image } from 'sanity'
import type { ProfilePathsResult } from 'sanity.types'
import type { ProfileBySlugPayload, SettingsPayload } from 'types'
import { fallbackSettings } from 'types'

export const revalidate = 60

// `lib/sanity.queries.ts` defines queries with the `groq` template tag, which
// (per its own .d.ts) cannot preserve literal string types — so `sanityFetch`'s
// `SanityQueries` lookup can't match and `data` resolves to `unknown`. Falling
// back to explicit casts here, per this task's documented fallback.
const getData = cache(async (slug: string) => {
  const [{ data: settingsData }, { data: profileData }, { data: homePageTitle }] =
    await Promise.all([
      sanityFetch({ query: settingsQuery, stega: false }),
      sanityFetch({
        query: profileBySlugQuery,
        params: { slug },
        stega: false,
      }),
      sanityFetch({ query: homePageTitleQuery, stega: false }),
    ])
  const settings = (settingsData as SettingsPayload | null) ?? fallbackSettings
  const profile = profileData as ProfileBySlugPayload | null
  return {
    settings,
    profile,
    homePageTitle: (homePageTitle as string | null) ?? undefined,
  }
})

export async function generateStaticParams() {
  const client = getClient()
  const slugs = await client.fetch<ProfilePathsResult>(profilePaths)
  return slugs
    .filter((slug): slug is string => Boolean(slug))
    .map((slug) => ({ slug }))
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { settings, profile, homePageTitle } = await getData(slug)
  if (!profile || settings.showPeople === false) {
    return {}
  }
  const { siteName } = resolveBranding(settings)
  const plainBio = profile.fullBio ? toPlainText(profile.fullBio) : ''
  return buildMetadata({
    path: `/people/${slug}`,
    siteName,
    baseTitle: homePageTitle,
    title: profile.name ?? undefined,
    description: plainBio
      ? truncateAtWordBoundary(plainBio, 155)
      : (profile.role ?? undefined),
    // See app/page.tsx for why this cast exists: the generated image shape leaves crop/hotspot
    // bounds optional, while `Image` from 'sanity' assumes them fully populated.
    image: (profile.image ?? undefined) as Image | undefined,
  })
}

export default async function PersonSlugPage({ params }: Props) {
  const { slug } = await params
  const { settings, profile } = await getData(slug)

  if (!profile || settings.showPeople === false) {
    notFound()
  }

  const personJsonLd = buildPersonJsonLd({
    name: profile.name,
    role: profile.role,
    image: (profile.image ?? undefined) as Image | undefined,
    url: `${siteUrl}/people/${slug}`,
  })

  return (
    <Layout settings={settings}>
      {personJsonLd && <JsonLd data={personJsonLd} />}
      <PersonBio person={profile} layout="page" />
    </Layout>
  )
}
```

`showPeople === false` turning off person pages too (spec D5) is the same fail-open comparison used
by `app/people/page.tsx` and the rest of the codebase — `null`/`undefined` are not `=== false`, so an
unset toggle still shows the page.

- [ ] **Step 7: Add e2e cases**

Append to `e2e/lab-head-spotlight.spec.ts`:

```ts
test('an unknown person slug 404s', async ({ page }) => {
  const response = await page.goto('/people/not-a-real-person')
  expect(response?.status()).toBe(404)
})

// No profile with hasPage=true exists in live data yet (same limitation as
// above). Hand-verify a 200 render, its title/description/JSON-LD, and the
// hasPage=false / showPeople=false 404 paths once one does.
test.skip('a person page renders for a profile with hasPage enabled', async ({
  page,
}) => {
  await page.goto('/people/damian-holsinger')
})
```

- [ ] **Step 8: Verify**

Run: `npm run type-check && npm test`

Expected: both clean.

Run: `npm run build`

Expected: succeeds — `generateStaticParams` runs against the live (public, tokenless) dataset, which
currently has zero `hasPage=true` profiles, so it should produce zero static `/people/[slug]` pages
without erroring.

Run: `npx playwright test e2e/lab-head-spotlight.spec.ts`

Expected: the two non-skipped tests pass; the two skipped tests report skipped, not failed.

- [ ] **Step 9: Commit**

```bash
git add lib/text.ts lib/text.test.ts lib/paths.ts app/people/[slug]/page.tsx e2e/lab-head-spotlight.spec.ts
git commit -m "feat: add opt-in person pages at /people/<slug>"
```

---

### Task 8: Extract `FeatureRow` from `ProjectListItem`

Spec §3.6: the home card and project rows must stay visually identical, so both need to share one
implementation rather than risk drifting apart. The image side (`classesWrapper`, `size`, and their
comments) must carry over **verbatim** — this is the exact geometry PR #13 fixed and
`project-card-contract.test.ts`/`e2e/image-geometry.spec.ts` guard.

**Deviation from the spec's literal `(image, alt, sizes, side, title, children)` signature:** the
current `TextBox` pins the tag row to the bottom of the card via `flex flex-col justify-between`.
Live data confirms tags are actually populated today (checked directly against the running dev
server: `#gut #brain #microbiome` etc. on the home page during this plan's research). Collapsing tags
into `children` would lose that bottom-pinning for any card whose overview is short. `FeatureRow`
therefore gets one extra optional prop, `footer`, occupying the same bottom slot `justify-between`
already created — the lab-head card (Task 9) simply doesn't pass it. This keeps "visually identical"
true rather than sacrificing it to match the spec's shorthand prop list exactly.

**Files:**
- Create: `components/pages/home/FeatureRow.tsx`
- Modify: `components/pages/home/ProjectListItem.tsx` (whole file — becomes a thin wrapper)
- Rename via `git mv`: `components/pages/home/project-card-contract.test.ts` →
  `components/pages/home/feature-row-contract.test.ts`, retargeted at the new file

**Interfaces:**
- Consumes: `ImageBox` (existing)
- Produces: `FeatureRow({ image, alt, side, title, children, footer? })`. Used by Task 9.

- [ ] **Step 1: Create `FeatureRow.tsx`**

```tsx
import ImageBox from 'components/shared/ImageBox'
import type { ReactNode } from 'react'

export interface FeatureRowProps {
  // Matches `ImageBox`'s own declared prop type (`{ asset?: any } | null`), not
  // the stricter `Image` from 'sanity' -- this component only forwards `image`
  // straight through to `ImageBox`, exactly like the original `ProjectListItem`
  // did (no cast). Typing this `Image` would force every call site (this task's
  // `ProjectListItem` and Task 9's `HomePage`) to cast, for no benefit.
  image?: { asset?: any } | null
  alt: string
  side: 'left' | 'right'
  title: string
  children: ReactNode
  footer?: ReactNode
}

export function FeatureRow({
  image,
  alt,
  side,
  title,
  children,
  footer,
}: FeatureRowProps) {
  const odd = side === 'right'
  return (
    <div
      className={`flex flex-col transition hover:bg-surface-raised/0 md:flex-row ${
        odd && 'border-y md:flex-row-reverse'
      }`}
    >
      <div
        className={`w-full md:w-7/12 lg:w-8/12 ${
          odd ? 'md:border-l' : 'md:border-r'
        }`}
      >
        <ImageBox
          image={image}
          alt={alt}
          // Measured, not the naive Tailwind fraction: `md:w-7/12`/`lg:w-8/12`
          // apply against the content box inside Layout's
          // `md:px-gutter-md lg:px-gutter-lg` side padding, so as a fraction
          // of the full viewport the card is smaller than 58%/67%. Measured
          // across 900-1536px viewports: ~49vw in the md range, ~49-55vw in
          // the lg range. 50vw/58vw cover the measured range with a small
          // safety margin.
          size="(min-width: 1024px) 58vw, (min-width: 768px) 50vw, 100vw"
          // Both `aspect-[16/9]` and `h-full` are load-bearing, at
          // different breakpoints. Below `md:` the card is `flex-col`, the
          // column has no definite height, and `aspect-[16/9]` gives the
          // box its shape. At `md:`+ the card is `flex-row`, the row
          // stretches this column to the *text* column's height, `h-full`
          // makes that height definite, and a box with definite width and
          // height ignores `aspect-ratio` entirely -- so the card stays
          // visually filled. That is intended; `ImageBox`'s `object-cover`
          // is what keeps the bitmap undistorted in the `md:`+ case.
          classesWrapper="aspect-[16/9] h-full"
        />
      </div>
      <div
        className={`flex border-t md:w-5/12 md:border-t-0 md:px-3 lg:w-4/12`}
      >
        <div className="relative mt-2 flex w-full flex-col justify-between p-3">
          <div>
            <h3 className="mb-2 text-xl font-extrabold tracking-tight md:text-2xl">
              {title}
            </h3>
            <div className="font-ariana text-text-muted">{children}</div>
          </div>
          {footer}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Reduce `ProjectListItem` to a thin wrapper**

Replace the whole file:

```tsx
import { CustomPortableText } from 'components/shared/CustomPortableText'
import type { ShowcaseProject } from 'types'

import { FeatureRow } from './FeatureRow'

interface ProjectProps {
  project: ShowcaseProject
  odd: number
}

export function ProjectListItem({ project, odd }: ProjectProps) {
  return (
    <FeatureRow
      image={project.coverImage}
      alt={`Cover image from ${project.title}`}
      side={odd ? 'right' : 'left'}
      title={project.title ?? ''}
      footer={
        <div className="flex flex-row gap-x-2 md:mt-4">
          {project.tags?.map((tag, key) => (
            <div className="text-sm font-medium lowercase md:text-lg" key={key}>
              #{tag}
            </div>
          ))}
        </div>
      }
    >
      <CustomPortableText value={project.overview!} />
    </FeatureRow>
  )
}
```

`odd` stays a `number` (`0`/`1`, matching `HomePage.tsx`'s existing `key % 2` call site unchanged) and
is converted to `side` right at the boundary — `odd ? 'right' : 'left'` reproduces the original
`odd && 'border-y md:flex-row-reverse'` truthiness exactly (`0` → `'left'`, `1` → `'right'`).

- [ ] **Step 3: Relocate the regression-guard test**

```bash
git mv components/pages/home/project-card-contract.test.ts components/pages/home/feature-row-contract.test.ts
```

Replace its contents — same assertions, retargeted at the file that now actually contains the
guarded markup (it would otherwise silently regex-match nothing and fail with a confusing "expected
length 1, got 0" instead of testing anything real):

```ts
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('FeatureRow image wrapper', () => {
  const source = readFileSync('components/pages/home/FeatureRow.tsx', 'utf8')

  it('does not repeat h-full', () => {
    const wrapper = source.match(/classesWrapper="([^"]*)"/)?.[1] ?? ''
    const occurrences = wrapper.split(/\s+/).filter((c) => c === 'h-full')
    expect(occurrences).toHaveLength(1)
  })

  it('keeps aspect-[16/9], which is load-bearing below the md breakpoint', () => {
    const wrapper = source.match(/classesWrapper="([^"]*)"/)?.[1] ?? ''
    expect(wrapper).toContain('aspect-[16/9]')
  })
})
```

- [ ] **Step 4: Verify**

Run: `npm run type-check && npm test`

Expected: both clean, including the relocated contract test.

Run: `npx playwright test e2e/image-geometry.spec.ts`

Expected: passes unchanged — it measures rendered DOM geometry, not source text, so it's a genuine
regression check on the refactor's actual output, not just the guard-test relocation.

Optional manual check (recommended): `npm run dev`, open `/`, and confirm project cards with tags
still show them positioned sensibly relative to the overview text.

- [ ] **Step 5: Commit**

```bash
git add components/pages/home/FeatureRow.tsx components/pages/home/ProjectListItem.tsx components/pages/home/project-card-contract.test.ts components/pages/home/feature-row-contract.test.ts
git commit -m "refactor: extract FeatureRow from ProjectListItem for reuse by the home lab-head card"
```

---

### Task 9: Home page lab-head card

**Files:**
- Create: `components/pages/home/shouldShowLabHeadCard.ts`
- Create: `components/pages/home/shouldShowLabHeadCard.test.ts`
- Create: `components/pages/home/resolveLabHeadHref.ts`
- Create: `components/pages/home/resolveLabHeadHref.test.ts`
- Modify: `components/pages/home/HomePage.tsx` (whole file)
- Modify: `e2e/lab-head-spotlight.spec.ts` (add cases)

**Interfaces:**
- Consumes: `FeatureRow` (Task 8), `resolveHref` (Task 2)
- Produces: nothing consumed elsewhere in this plan — this is the last integration point.

- [ ] **Step 1: Write the failing tests**

Create `components/pages/home/shouldShowLabHeadCard.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { shouldShowLabHeadCard } from './shouldShowLabHeadCard'

describe('shouldShowLabHeadCard', () => {
  it('is false when labHead is unset', () => {
    expect(
      shouldShowLabHeadCard({ labHead: null, showLabHeadOnHome: true })
    ).toBe(false)
  })

  it('is true when labHead is set and showLabHeadOnHome is unset', () => {
    expect(shouldShowLabHeadCard({ labHead: { _id: 'p1' } })).toBe(true)
    expect(
      shouldShowLabHeadCard({ labHead: { _id: 'p1' }, showLabHeadOnHome: null })
    ).toBe(true)
  })

  it('is false when showLabHeadOnHome is explicitly false, even with labHead set', () => {
    expect(
      shouldShowLabHeadCard({ labHead: { _id: 'p1' }, showLabHeadOnHome: false })
    ).toBe(false)
  })
})
```

Create `components/pages/home/resolveLabHeadHref.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { resolveLabHeadHref } from './resolveLabHeadHref'

describe('resolveLabHeadHref', () => {
  it("links to the person's own page when hasPage is true and a slug exists", () => {
    expect(
      resolveLabHeadHref({ hasPage: true, slug: 'damian-holsinger' })
    ).toBe('/people/damian-holsinger')
  })

  it('falls back to /people when hasPage is false', () => {
    expect(
      resolveLabHeadHref({ hasPage: false, slug: 'damian-holsinger' })
    ).toBe('/people')
  })

  it('falls back to /people when hasPage is true but slug is missing', () => {
    expect(resolveLabHeadHref({ hasPage: true, slug: null })).toBe('/people')
  })

  it('falls back to /people when both are unset', () => {
    expect(resolveLabHeadHref({})).toBe('/people')
  })
})
```

- [ ] **Step 2: Run to verify both fail**

Run: `npx vitest run components/pages/home/shouldShowLabHeadCard.test.ts components/pages/home/resolveLabHeadHref.test.ts`

Expected: FAIL — neither module exists yet.

- [ ] **Step 3: Implement both**

Create `components/pages/home/shouldShowLabHeadCard.ts`:

```ts
/**
 * `showLabHeadOnHome` unset (null/undefined) means on -- the live
 * `settings` singleton predates this field, so every already-published
 * document has no key for it, and `!== false` is what keeps that document
 * showing the card rather than silently hiding it after deploy.
 */
export function shouldShowLabHeadCard(settings: {
  labHead?: { _id: string } | null
  showLabHeadOnHome?: boolean | null
}): boolean {
  return Boolean(settings.labHead) && settings.showLabHeadOnHome !== false
}
```

Create `components/pages/home/resolveLabHeadHref.ts`:

```ts
import { resolveHref } from 'lib/sanity.links'

/** Home-card link resolution: the lab head's own page when enabled, /people otherwise. */
export function resolveLabHeadHref(person: {
  hasPage?: boolean | null
  slug?: string | null
}): string {
  if (person.hasPage) {
    const href = resolveHref('profile', person.slug)
    if (href) {
      return href
    }
  }
  return '/people'
}
```

- [ ] **Step 4: Run to verify both pass**

Run: `npx vitest run components/pages/home/shouldShowLabHeadCard.test.ts components/pages/home/resolveLabHeadHref.test.ts`

Expected: PASS, 3 + 4 tests.

- [ ] **Step 5: Wire the card into `HomePage.tsx`**

Replace the whole file:

```tsx
import { FeatureRow } from 'components/pages/home/FeatureRow'
import { ProjectListItem } from 'components/pages/home/ProjectListItem'
import { resolveLabHeadHref } from 'components/pages/home/resolveLabHeadHref'
import { shouldShowLabHeadCard } from 'components/pages/home/shouldShowLabHeadCard'
import { Header } from 'components/shared/Header'
import Layout from 'components/shared/Layout'
import { resolveHref } from 'lib/sanity.links'
import Link from 'next/link'
import type { HomePagePayload, SettingsPayload } from 'types'

export interface HomePageProps {
  settings: SettingsPayload
  page: HomePagePayload
}

export function HomePage({ page, settings }: HomePageProps) {
  const { overview, showcaseProjects, title = 'Personal website' } = page ?? {}
  const labHead = settings.labHead
  const showLabHeadCard = shouldShowLabHeadCard(settings) && Boolean(labHead)

  return (
    <Layout settings={settings} childrenStyles={`px-0`}>
      <div className="mb-16 space-y-8">
        {/* Header */}
        {title && <Header centered title={title} description={overview} />}

        {/* Showcase projects */}
        <h2 className="text-center text-xl font-[600] md:text-left md:text-2xl">
          Our Research Projects
        </h2>

        {showcaseProjects && showcaseProjects.length > 0 && (
          <div className="mx-auto max-w-[100rem] border-y md:border">
            {showcaseProjects.map((project, key) => {
              const href = resolveHref(project._type, project.slug)
              if (!href) {
                return null
              }
              return (
                <Link key={key} href={href}>
                  <ProjectListItem project={project} odd={key % 2} />
                </Link>
              )
            })}
          </div>
        )}

        {/* Lab head */}
        {showLabHeadCard && labHead && (
          <>
            <h2 className="text-center text-xl font-[600] md:text-left md:text-2xl">
              About {labHead.name}
            </h2>
            <div className="mx-auto max-w-[100rem] border-y md:border">
              <Link href={resolveLabHeadHref(labHead)}>
                <FeatureRow
                  image={labHead.image}
                  alt={
                    labHead.name
                      ? `Portrait of ${labHead.name}`
                      : 'Lab head portrait'
                  }
                  side="right"
                  title={labHead.role ?? ''}
                >
                  {labHead.bio && <p>{labHead.bio}</p>}
                </FeatureRow>
              </Link>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
```

`side="right"` mirrors the design doc's requirement that the image sits on the right, matching his
current position as the showcase list's 4th (odd-indexed) entry (spec §3.4).

- [ ] **Step 6: Add e2e cases**

Append to `e2e/lab-head-spotlight.spec.ts`:

```ts
test('the home page renders without a lab-head card when no lab head is set (current live data)', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /^About / })).toHaveCount(0)
})

// Same live-data limitation as the rest of this file. Hand-verify the card's
// presence, its "About <name>" heading, and its link once settings.labHead
// and showLabHeadOnHome are set in Studio -- and separately verify it
// disappears again when showLabHeadOnHome is turned off.
test.skip('the home page shows the lab-head card when showLabHeadOnHome is on', async ({
  page,
}) => {
  await page.goto('/')
})
```

- [ ] **Step 7: Verify**

Run: `npm run type-check && npm test`

Expected: both clean.

Run: `npm run build`

Expected: succeeds.

Run: `npx playwright test e2e/lab-head-spotlight.spec.ts e2e/routes.spec.ts e2e/json-ld.spec.ts e2e/image-geometry.spec.ts`

Expected: all non-skipped tests pass.

- [ ] **Step 8: Commit**

```bash
git add components/pages/home/shouldShowLabHeadCard.ts components/pages/home/shouldShowLabHeadCard.test.ts components/pages/home/resolveLabHeadHref.ts components/pages/home/resolveLabHeadHref.test.ts components/pages/home/HomePage.tsx e2e/lab-head-spotlight.spec.ts
git commit -m "feat: add the lab-head card to the home page"
```

---

## After this plan

Two things from the spec are deliberately **not** in this plan:

1. **The `next.config.mjs` redirect** (`/projects/about-dr-damian-holsinger` →
   `/people/damian-holsinger`) — add and deploy it together with the Studio migration below, not
   before (see Global Constraints for why shipping it early would break a currently-working URL).
2. **§4's content migration** — done by hand in Studio once there's a login and write access: create
   Dr Holsinger's `profile` (migrating `overview`→`fullBio`, `coverImage`→`image`, writing a short
   `bio`, setting `slug: damian-holsinger` and `hasPage: true`), set `settings.labHead` to it, remove
   the old project from `home.showcaseProjects`, delete the project document, and add the redirect
   from point 1 in the same deploy. After that, replace every `test.skip` this plan added in
   `e2e/lab-head-spotlight.spec.ts` with a real assertion against the live content.
