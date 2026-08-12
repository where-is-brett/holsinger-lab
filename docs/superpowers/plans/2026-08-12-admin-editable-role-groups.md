# Admin-Editable Role Group Taxonomy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the lab define, rename, reorder, and delete `profile.roleGroup` categories themselves in Sanity Studio, instead of a hardcoded 7-item schema enum that needs a code deploy to change.

**Architecture:** A new `roleGroup` Sanity document type (title + Studio-managed order), referenced from `profile.roleGroup` (currently a plain string with a fixed `options.list`). Reuses the exact orderable-list mechanism already shipped for People (`@sanity/orderable-document-list`). Reader-side grouping logic (`groupByRoleGroup.ts`) changes from a hardcoded array to taking the live ordered group list as a parameter. A dry-run-by-default backfill script links the 19 existing profiles once the lab has created the group documents.

**Tech Stack:** Next.js 16 (App Router), Sanity Studio 6 (`sanity.config.ts`), `@sanity/orderable-document-list`, `@sanity/client`, Vitest, Playwright + `@axe-core/playwright`, TypeScript (strict), GROQ, `sanity typegen`.

**Spec:** `docs/superpowers/specs/2026-08-12-admin-editable-role-groups-design.md`

## Global Constraints

- Every task must leave `npx tsc --noEmit` and `npx eslint .` clean before its commit.
- Sanity write scripts are dry-run-by-default; writes require an explicit `--commit` flag with no alternate trigger, and a write token is only loaded/required when `--commit` is passed (established pattern: `scripts/backfill-publication-dois.ts`).
- Sanity patches use `unset` for "no value," never `set: { field: null }`.
- Every reader-facing change must render correctly when the new/changed field is unset on all profiles — no required-field validation added anywhere in this plan.
- The `profile.roleGroup` field type change (string → reference, Task 2) is safe only because 0/19 live profiles have it set. Task 2 re-verifies this count against production immediately before editing the schema — do not trust this plan's or the spec's snapshot.
- Node 22 runs `.ts` scripts directly (no build step); relative imports between `.ts` files need explicit `.ts` extensions (already enabled via `allowImportingTsExtensions` in `tsconfig.json` — see `scripts/backfill-publication-dois.ts` for the pattern).
- Verification commands that need to reach the live dataset use `NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production` (public read access, no token needed for reads).
- Schema-only tasks (1, 2, 3, 4) have no meaningful Vitest surface — declarative field/desk-structure config isn't executable logic. Per this repo's established Phase 3B precedent, they're verified by `tsc --noEmit` against the real installed Sanity types (not stubs) plus hand-tracing, not a RED/GREEN cycle. Tasks 5 and 8 contain real pure-function logic and follow strict TDD.

---

## Task 1: `roleGroup` document schema

**Files:**
- Create: `schemas/documents/roleGroup.ts`
- Modify: `sanity.config.ts`

**Interfaces:**
- Produces: a Sanity document type named `roleGroup` with fields `_id` (implicit), `title: string`, `orderRank: string` (implicit, managed by `@sanity/orderable-document-list`). Consumed by Task 2 (`profile.roleGroup`'s reference target), Task 4 (desk structure), Task 6 (GROQ queries), Task 8 (backfill script).

- [ ] **Step 1: Create the schema file**

```ts
// schemas/documents/roleGroup.ts
import { TagIcon } from '@sanity/icons/Tag'
import {
  orderRankField,
  orderRankOrdering,
} from '@sanity/orderable-document-list'
import { defineField, defineType } from 'sanity'

export default defineType({
  type: 'document',
  name: 'roleGroup',
  title: 'Role Groups',
  icon: TagIcon,
  orderings: [orderRankOrdering],
  fields: [
    orderRankField({
      type: 'roleGroup',
    }),

    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description:
        'Shown as a section heading on the public People page, e.g. "PhD Student". Reorder the list from the "Role Groups" entry in the Studio sidebar.',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { title: 'title' },
  },
})
```

- [ ] **Step 2: Register the type in `sanity.config.ts`**

In `sanity.config.ts`, add the import alongside the other document type imports (after the `profile` import, alphabetical-ish grouping already used there):

```ts
import roleGroup from 'schemas/documents/roleGroup'
```

Add `roleGroup` to the `schema.types` array (after `profile`):

```ts
  schema: {
    types: [
      home,
      settings,
      duration,
      page,
      project,
      milestone,
      timeline,
      publication,
      profile,
      roleGroup,
    ],
  },
```

Do **not** add `roleGroup` to `PREVIEWABLE_DOCUMENT_TYPES` — it has no public route or slug, same reasoning as `publication`/`profile` staying excluded.

- [ ] **Step 3: Verify against the real installed types**

Run: `npx tsc --noEmit`
Expected: no errors. If `orderRankField`/`orderRankOrdering`/`defineType`/`defineField` shapes don't match, re-check `node_modules/@sanity/orderable-document-list/dist/index.d.ts` directly (not `sanity`'s barrel re-exports) — this plan's shapes were confirmed against that file on 2026-08-12.

- [ ] **Step 4: Commit**

```bash
git add schemas/documents/roleGroup.ts sanity.config.ts
git commit -m "feat: add roleGroup document type"
```

---

## Task 2: `profile.roleGroup` — string enum to reference

**Files:**
- Modify: `schemas/documents/profile.ts`

**Interfaces:**
- Consumes: Task 1's `roleGroup` document type (by name, `'roleGroup'`).
- Produces: `profile.roleGroup` is now `{ _type: 'reference', _ref: <roleGroup _id> } | undefined` at the schema level. Consumed by Task 6 (query dereference), Task 8 (backfill script's patch shape).

- [ ] **Step 1: Re-verify live data before touching the schema**

Run:

```bash
curl -s -G "https://j3f9z8os.api.sanity.io/v2023-06-21/data/query/production" \
  --data-urlencode 'query=count(*[_type=="profile" && defined(roleGroup)])'
```

Expected: `{"query":"...","result":0,...}`. **If this is not 0, stop and report back before proceeding** — this task's field-type change is only safe (no data to lose) when the count is 0. It was 0 as of 2026-08-12; the DOI backfill run that same day did not touch `profile` documents, but re-verifying live rather than trusting this plan is the point.

- [ ] **Step 2: Change the field type**

In `schemas/documents/profile.ts`, replace the existing `roleGroup` field:

```ts
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
```

with:

```ts
    defineField({
      name: 'roleGroup',
      title: 'Role Group',
      type: 'reference',
      to: [{ type: 'roleGroup' }],
      description:
        'Groups this person on the public People page. Manage the list of groups (add, rename, reorder, delete) from the "Role Groups" entry in the Studio sidebar. Leave unset to show under "Other".',
    }),
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add schemas/documents/profile.ts
git commit -m "feat: make profile.roleGroup a reference to a Studio-managed roleGroup document"
```

---

## Task 3: People list preview (bundled Studio polish)

**Files:**
- Modify: `schemas/documents/profile.ts`

**Interfaces:**
- None consumed or produced — purely additive Studio config, independent of every other task in this plan.

- [ ] **Step 1: Add the preview block**

In `schemas/documents/profile.ts`, the `defineType({...})` call currently reads (top of the file):

```ts
export default defineType({
  type: 'document',
  name: 'profile',
  title: 'People',
  icon: UserIcon,
  orderings: [orderRankOrdering],
  fields: [
```

Insert a `preview` key between the `orderings` line and the `fields` line, so it reads:

```ts
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
```

The rest of the file (the `fields` array contents, and the closing `})`) is untouched by this task.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

This cannot be visually confirmed in this sandboxed environment (no Sanity Studio login — same wall as every prior phase's Studio UI work; see the Phase 3B lesson in `docs/superpowers/plans/2026-08-11-phase-3b-studio-doi-rolegroup.md`). Flag as an outstanding manual item in the PR description, same category as the carried-forward webhook-secret/`VisualEditing` checks.

- [ ] **Step 3: Commit**

```bash
git add schemas/documents/profile.ts
git commit -m "feat: add a Studio list preview (name, role, photo) to People"
```

---

## Task 4: Studio desk structure — orderable "Role Groups" list

**Files:**
- Modify: `plugins/settings.tsx`

**Interfaces:**
- Consumes: Task 1's `roleGroup` document type (by name, `'roleGroup'`).
- Produces: a "Role Groups" entry in the Studio sidebar desk structure, editable/orderable by the lab. No code interface — nothing later depends on this programmatically.

- [ ] **Step 1: Exclude `roleGroup` from the default document list**

In `plugins/settings.tsx`, find the `defaultListItems` filter (currently excludes `profile`):

```ts
    const defaultListItems = S.documentTypeListItems().filter(
      (listItem) =>
        !typeDefArray.find(
          (singleton) => singleton.name === listItem.getId()
        ) &&
        listItem.getId() !== 'profile' && // we include an orderable list for people
        listItem.getTitle() !== 'Media Tag' // edit media tags in the media browser
    )
```

Add a second exclusion for `roleGroup`:

```ts
    const defaultListItems = S.documentTypeListItems().filter(
      (listItem) =>
        !typeDefArray.find(
          (singleton) => singleton.name === listItem.getId()
        ) &&
        listItem.getId() !== 'profile' && // we include an orderable list for people
        listItem.getId() !== 'roleGroup' && // we include an orderable list for role groups
        listItem.getTitle() !== 'Media Tag' // edit media tags in the media browser
    )
```

- [ ] **Step 2: Add the orderable desk item**

In the same file, find the `S.list().title('Content').items([...])` call, which currently ends with the People `orderableDocumentListDeskItem(...)` call. Add a second `orderableDocumentListDeskItem` call for `roleGroup`, and import `TagIcon` at the top of the file:

```ts
import { TagIcon } from '@sanity/icons/Tag'
```

```ts
    return S.list()
      .title('Content')
      .items([
        // ... all other desk items
        ...singletonItems,
        S.divider(),
        ...defaultListItems,

        orderableDocumentListDeskItem({
          type: 'profile',
          title: 'People',
          icon: UserIcon,
          S,
          context,
        }),

        orderableDocumentListDeskItem({
          type: 'roleGroup',
          title: 'Role Groups',
          icon: TagIcon,
          S,
          context,
        }),
      ])
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add plugins/settings.tsx
git commit -m "feat: add an orderable Role Groups desk entry to Studio"
```

---

## Task 5: Rewrite `groupByRoleGroup.ts` (TDD)

**Files:**
- Modify: `components/pages/people/groupByRoleGroup.ts`
- Modify: `components/pages/people/groupByRoleGroup.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface RoleGroupSection<T> {
    id: string
    title: string | null
    profiles: T[]
  }

  export function groupByRoleGroup<T extends { roleGroup?: { _id: string; title: string | null } | null }>(
    profiles: T[],
    roleGroups: { _id: string; title: string | null }[]
  ): RoleGroupSection<T>[]
  ```
  `title` is `string | null`, not `string` — Sanity TypeGen does not treat `Rule.required()` as a
  nullability guarantee (confirmed against this repo's actual generated `ProfileQueryResult`, where
  `name`/`role` are `string | null` despite both being required fields). `RoleGroupPayload` (Task 6)
  will have the same shape, so this must match exactly or Task 7's wiring won't type-check. This
  follows the same "honest nullable types, handled by the caller" convention `ProfilePayload` already
  uses — see `Profile.tsx`, which renders `profile.name`/`profile.role` directly as `string | null`
  with no extra guard, relying on React treating `null` children as empty.
  Consumed by Task 7 (`People.tsx`).

This task has real pure-function logic — follow strict TDD (write the full failing test file first, confirm it fails for the right reason, then implement).

- [ ] **Step 1: Replace the test file with tests for the new signature**

```ts
// components/pages/people/groupByRoleGroup.test.ts
import { describe, expect, it } from 'vitest'

import { groupByRoleGroup } from './groupByRoleGroup'

const PHD = { _id: 'rg-phd', title: 'PhD Student' }
const LAB_HEAD = { _id: 'rg-lab-head', title: 'Lab Head' }
const ALUMNI = { _id: 'rg-alumni', title: 'Alumni' }

describe('groupByRoleGroup', () => {
  it('buckets every profile under "Other" when roleGroup is unset on all of them', () => {
    const profiles = [
      { _id: '1', roleGroup: null },
      { _id: '2', roleGroup: null },
    ]
    const result = groupByRoleGroup(profiles, [PHD, LAB_HEAD])
    expect(result).toEqual([
      {
        id: 'other',
        title: 'Other',
        profiles: [
          { _id: '1', roleGroup: null },
          { _id: '2', roleGroup: null },
        ],
      },
    ])
  })

  it('buckets by matching roleGroup._id, in the order roleGroups was given, preserving input order within a bucket', () => {
    const profiles = [
      { _id: '1', roleGroup: PHD },
      { _id: '2', roleGroup: LAB_HEAD },
      { _id: '3', roleGroup: PHD },
    ]
    const result = groupByRoleGroup(profiles, [LAB_HEAD, PHD])
    expect(result.map((s) => s.id)).toEqual(['rg-lab-head', 'rg-phd'])
    expect(result.find((s) => s.id === 'rg-phd')?.profiles.map((p) => p._id)).toEqual(['1', '3'])
  })

  it('omits empty sections entirely', () => {
    const profiles = [{ _id: '1', roleGroup: ALUMNI }]
    const result = groupByRoleGroup(profiles, [PHD, LAB_HEAD, ALUMNI])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('rg-alumni')
  })

  it('puts unset and dangling-reference (null) roleGroup values in "Other", after named sections', () => {
    const profiles = [
      { _id: '1', roleGroup: PHD },
      { _id: '2', roleGroup: null },
      { _id: '3', roleGroup: null },
    ]
    const result = groupByRoleGroup(profiles, [PHD])
    expect(result.map((s) => s.id)).toEqual(['rg-phd', 'other'])
    expect(result.find((s) => s.id === 'other')?.profiles.map((p) => p._id)).toEqual(['2', '3'])
  })

  it('returns an empty array for empty profiles and empty roleGroups', () => {
    expect(groupByRoleGroup([], [])).toEqual([])
  })

  it('returns a single "Other" section when roleGroups is empty but profiles are not', () => {
    const profiles = [{ _id: '1', roleGroup: null }]
    const result = groupByRoleGroup(profiles, [])
    expect(result).toEqual([{ id: 'other', title: 'Other', profiles: [{ _id: '1', roleGroup: null }] }])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run components/pages/people/groupByRoleGroup.test.ts`
Expected: FAIL. Vitest transpiles via esbuild without type-checking, so this won't surface as a TS
error here (only `tsc --noEmit` would catch the old single-argument signature) — instead every
assertion on `.id` fails at runtime, because the current implementation's sections carry `.value`,
not `.id` (so `.id` reads as `undefined`), and its matching logic (`section.value ===
profile.roleGroup`) never matches since the test's `profile.roleGroup` is now an object, not one of
the old string enum values — every profile falls into "Other."

- [ ] **Step 3: Rewrite the implementation**

```ts
// components/pages/people/groupByRoleGroup.ts
export interface RoleGroupSection<T> {
  id: string
  title: string | null
  profiles: T[]
}

interface RoleGroup {
  _id: string
  title: string | null
}

/**
 * Groups `profiles` by `roleGroup`, in the order `roleGroups` is given
 * (already ordered by the caller's query), with an "Other" catch-all last
 * for unset or dangling (deleted-group) references. Sections with zero
 * members are omitted.
 */
export function groupByRoleGroup<T extends { roleGroup?: RoleGroup | null }>(
  profiles: T[],
  roleGroups: RoleGroup[]
): RoleGroupSection<T>[] {
  const sections: RoleGroupSection<T>[] = roleGroups.map((group) => ({
    id: group._id,
    title: group.title,
    profiles: [],
  }))
  const other: RoleGroupSection<T> = { id: 'other', title: 'Other', profiles: [] }

  for (const profile of profiles) {
    const match = sections.find((section) => section.id === profile.roleGroup?._id)
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

Run: `npx vitest run components/pages/people/groupByRoleGroup.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add components/pages/people/groupByRoleGroup.ts components/pages/people/groupByRoleGroup.test.ts
git commit -m "feat: group people by the live ordered roleGroup list instead of a hardcoded array"
```

---

## Task 6: Reader-side queries and types

**Files:**
- Modify: `lib/sanity.queries.ts`
- Modify: `types/index.ts`
- Regenerate: `sanity.types.ts` (via `npm run typegen`, do not hand-edit)

**Interfaces:**
- Consumes: Task 1's `roleGroup` document type, Task 2's `profile.roleGroup` reference field.
- Produces: `roleGroupQuery` (GROQ string), updated `profileQuery`, `RoleGroupPayload` type. Consumed by Task 7.

- [ ] **Step 1: Add `roleGroupQuery` and update `profileQuery`**

In `lib/sanity.queries.ts`, add a new export near `profileQuery`:

```ts
export const roleGroupQuery = groq`
  *[_type == "roleGroup"] | order(orderRank) {
    _id,
    title,
  }
`
```

Change `profileQuery`'s `roleGroup` line from a bare field to a dereference:

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
    bio
  }
`
```

- [ ] **Step 2: Regenerate types**

Run:

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run typegen
```

Expected: exits 0, `sanity.types.ts` is modified (new `RoleGroupQueryResult` export, `ProfileQueryResult`'s `roleGroup` field now typed as an object shape instead of `string | null`).

- [ ] **Step 3: Add `RoleGroupPayload` to `types/index.ts`**

In `types/index.ts`, add `RoleGroupQueryResult` to the existing `sanity.types` import block:

```ts
import type {
  HomePageQueryResult,
  PagesBySlugQueryResult,
  ProfileQueryResult,
  ProjectBySlugQueryResult,
  PublicationsQueryResult,
  RoleGroupQueryResult,
  SettingsQueryResult,
} from 'sanity.types'
```

Add the payload type near `ProfilePayload`:

```ts
export type ProfilePayload = ProfileQueryResult[number]

export type RoleGroupPayload = RoleGroupQueryResult[number]
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors. `ProfilePayload.roleGroup` should generate as `{ _id: string; title: string | null } | null` (matching Task 5's `RoleGroup` type — `_id` non-null, `title` nullable per typegen's established treatment of required-but-unenforced fields). If the generated shape differs from this, read the actual `ProfileQueryResult`/`RoleGroupQueryResult` entries in `sanity.types.ts` directly rather than assuming, and adjust Task 5's types to match reality.

- [ ] **Step 5: Commit**

```bash
git add lib/sanity.queries.ts types/index.ts sanity.types.ts
git commit -m "feat: dereference profile.roleGroup in queries and add RoleGroupPayload"
```

---

## Task 7: Wire the People page

**Files:**
- Modify: `components/pages/people/People.tsx`
- Modify: `app/people/page.tsx`

**Interfaces:**
- Consumes: Task 5's `groupByRoleGroup`/`RoleGroupSection`, Task 6's `roleGroupQuery`/`RoleGroupPayload`.

- [ ] **Step 1: Update `People.tsx` to accept and use `roleGroups`**

Full new contents of `components/pages/people/People.tsx`:

```tsx
import Layout from 'components/shared/Layout'
import { ProfilePayload, RoleGroupPayload, SettingsPayload } from 'types'

import { groupByRoleGroup } from './groupByRoleGroup'
import Profile from './Profile'

export default function People({
  settings,
  profiles,
  roleGroups,
}: {
  settings?: SettingsPayload
  profiles: ProfilePayload[]
  roleGroups: RoleGroupPayload[]
}) {
  const sections = groupByRoleGroup(profiles, roleGroups)

  return (
    <Layout settings={settings}>
      <h1 className="mb-6 text-3xl font-black md:text-5xl">People</h1>
      <div className="mb-16 space-y-12">
        {sections.map((section) => (
          <section key={section.id}>
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

(Only two changes from the current file: the new `roleGroups` prop/import, and `key={section.value}` → `key={section.id}` to match Task 5's renamed field.)

- [ ] **Step 2: Fetch `roleGroupQuery` in `app/people/page.tsx` and pass it down**

In `app/people/page.tsx`, add `roleGroupQuery` to the import from `lib/sanity.queries`:

```ts
import {
  homePageTitleQuery,
  profileQuery,
  roleGroupQuery,
  settingsQuery,
} from 'lib/sanity.queries'
```

Add `RoleGroupPayload` to the `types` import:

```ts
import type { ProfilePayload, RoleGroupPayload, SettingsPayload } from 'types'
```

Update `getData` to fetch `roleGroupQuery` in parallel and return it:

```ts
const getData = cache(async () => {
  const [
    { data: homePageTitle },
    { data: settingsData },
    { data: profilesData },
    { data: roleGroupsData },
  ] = await Promise.all([
    sanityFetch({ query: homePageTitleQuery, stega: false }),
    sanityFetch({ query: settingsQuery, stega: false }),
    sanityFetch({ query: profileQuery }),
    sanityFetch({ query: roleGroupQuery }),
  ])
  const settings = (settingsData as SettingsPayload | null) ?? fallbackSettings
  const profiles = (profilesData as ProfilePayload[] | null) ?? []
  const roleGroups = (roleGroupsData as RoleGroupPayload[] | null) ?? []
  return {
    homePageTitle: (homePageTitle as string | null) ?? undefined,
    settings,
    profiles,
    roleGroups,
  }
})
```

Update the page component to pass `roleGroups` through:

```tsx
export default async function PeoplePage() {
  const { settings, profiles, roleGroups } = await getData()

  if (settings.showPeople === false) {
    notFound()
  }

  return (
    <>
      <JsonLd data={buildPersonListJsonLd(profiles)} />
      <People settings={settings} profiles={profiles} roleGroups={roleGroups} />
    </>
  )
}
```

`generateMetadata` is unchanged — it only destructures `settings`/`homePageTitle` from `getData()`, both still present.

- [ ] **Step 3: Verify with the build and existing tests**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: succeeds.

Run:

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npx playwright test e2e/publications-interactive.spec.ts -g "People role grouping"
```

Expected: PASS — with zero `roleGroup` documents in Studio yet (this task ships before Task 8's manual seeding step), every profile still falls into a single "Other" section, same as today.

- [ ] **Step 4: Commit**

```bash
git add components/pages/people/People.tsx app/people/page.tsx
git commit -m "feat: fetch and render live roleGroup sections on the People page"
```

---

## Task 8: Backfill script (TDD)

**Files:**
- Create: `scripts/roleGroupMapping.ts`
- Create: `scripts/roleGroupMapping.test.ts`
- Create: `scripts/backfill-profile-role-groups.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 1's `roleGroup` document type (`_id`, `title`), Task 2's `profile.roleGroup` reference shape.
- Produces: `roleGroupTitleForRole(role: string): string | null`, a runnable `npm run backfill:profile-role-groups[-- --commit]` script. Nothing later in this plan depends on this task.

This task's mapping table (`roleGroupMapping.ts`) has real pure-function logic — follow strict TDD.

- [ ] **Step 1: Write the failing test for the mapping table**

```ts
// scripts/roleGroupMapping.test.ts
import { describe, expect, it } from 'vitest'

import { roleGroupTitleForRole } from './roleGroupMapping'

describe('roleGroupTitleForRole', () => {
  // Captured from the live dataset's 19 `role` strings, 2026-08-12
  // (curl -s -G https://j3f9z8os.api.sanity.io/v2023-06-21/data/query/production
  //  --data-urlencode 'query=*[_type=="profile"]{name,role}').
  it('maps every one of the 19 live role strings to the expected group title', () => {
    const cases: [role: string, expected: string][] = [
      ['Research Scientist', 'Research Scientist'],
      ['PhD Student', 'PhD Student'],
      ['Honours Student (BioMedEng)', 'Honours Student'],
      ['Honours Student (Biomedical Engineering)', 'Honours Student'],
      ['Honours student (Biomed Eng)', 'Honours Student'],
      ['Honours student (Diagnostic Radiography)', 'Honours Student'],
      ['Research Student - BSc/MD', 'Research Student'],
      ['Research Student - MD (UNSW)', 'Research Student'],
      ['Research Student - MDiagRad', 'Research Student'],
      ['BAppSci (Diagnostic Radiography)', 'Undergraduate'],
      ['BAppSci (Speech Pathology)', 'Undergraduate'],
      ['BSc (Medical Sciences)', 'Undergraduate'],
      ['Ungergraduate student - Diagnostic Radiography', 'Undergraduate'],
      ['Study Abroad Student', 'Study Abroad Student'],
    ]
    for (const [role, expected] of cases) {
      expect(roleGroupTitleForRole(role)).toBe(expected)
    }
  })

  it('returns null for a role string with no known mapping', () => {
    expect(roleGroupTitleForRole('Visiting Fellow')).toBeNull()
  })

  it('is case- and whitespace-sensitive (no normalisation) -- exact match only', () => {
    expect(roleGroupTitleForRole('phd student')).toBeNull()
    expect(roleGroupTitleForRole(' PhD Student')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run scripts/roleGroupMapping.test.ts`
Expected: FAIL with a module-not-found error (`./roleGroupMapping` doesn't exist yet).

- [ ] **Step 3: Implement the mapping table**

```ts
// scripts/roleGroupMapping.ts
// Maps a `profile.role` free-text string to the `roleGroup` document title
// it should be backfilled to. Exact-match only, deliberately -- the 19 live
// `role` strings are already inconsistent (Phase 3's foundations doc found
// four spellings of "Honours Student" alone), and normalising here would
// just move that inconsistency into this table instead of fixing it.
// New profiles get `roleGroup` set by hand in Studio via the reference
// picker; this table is a one-off backfill aid, not a live sync.
const ROLE_TO_GROUP_TITLE: Record<string, string> = {
  'Research Scientist': 'Research Scientist',
  'PhD Student': 'PhD Student',
  'Honours Student (BioMedEng)': 'Honours Student',
  'Honours Student (Biomedical Engineering)': 'Honours Student',
  'Honours student (Biomed Eng)': 'Honours Student',
  'Honours student (Diagnostic Radiography)': 'Honours Student',
  'Research Student - BSc/MD': 'Research Student',
  'Research Student - MD (UNSW)': 'Research Student',
  'Research Student - MDiagRad': 'Research Student',
  'BAppSci (Diagnostic Radiography)': 'Undergraduate',
  'BAppSci (Speech Pathology)': 'Undergraduate',
  'BSc (Medical Sciences)': 'Undergraduate',
  'Ungergraduate student - Diagnostic Radiography': 'Undergraduate',
  'Study Abroad Student': 'Study Abroad Student',
}

/**
 * Returns the `roleGroup` document title `role` should map to, or `null` if
 * there's no known mapping (the profile's `roleGroup` is then left unset,
 * which renders under "Other" -- not an error).
 */
export function roleGroupTitleForRole(role: string): string | null {
  return ROLE_TO_GROUP_TITLE[role] ?? null
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run scripts/roleGroupMapping.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Write the backfill script**

```ts
// scripts/backfill-profile-role-groups.ts
// One-off / re-runnable maintenance script: finds `profile` documents whose
// `roleGroup` reference is unset but whose `role` free-text string has a
// known mapping (scripts/roleGroupMapping.ts), and patches `roleGroup` onto
// them as a reference to the matching `roleGroup` document.
//
// Requires the roleGroup documents themselves to already exist in Studio --
// this script does not create them (see the design doc's §3.5: Studio's
// orderable-list ranking can't be safely pre-computed from a standalone
// script). Run this only after a human has created the group documents.
//
// Dry run (default, no writes):
//   node scripts/backfill-profile-role-groups.ts
//
// Apply the writes:
//   node scripts/backfill-profile-role-groups.ts --commit
//
// The dataset is publicly readable, so a dry run needs no token at all.
// SANITY_API_WRITE_TOKEN is only required when --commit is passed.

import { createClient } from '@sanity/client'

import { apiVersion, dataset, projectId } from '../lib/sanity.api.ts'
import { roleGroupTitleForRole } from './roleGroupMapping.ts'

const commit = process.argv.includes('--commit')

let writeToken: string | undefined
if (commit) {
  writeToken = process.env.SANITY_API_WRITE_TOKEN
  if (!writeToken) {
    throw new Error(
      'Set SANITY_API_WRITE_TOKEN to a token with write access (see .env.local.example).'
    )
  }
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token: commit ? writeToken : undefined,
  useCdn: false,
  perspective: 'published',
})

interface ProfileRow {
  _id: string
  role: string
}

interface RoleGroupRow {
  _id: string
  title: string
}

async function main() {
  const [profiles, roleGroups] = await Promise.all([
    client.fetch<ProfileRow[]>(
      '*[_type == "profile" && !defined(roleGroup)]{_id, role}'
    ),
    client.fetch<RoleGroupRow[]>('*[_type == "roleGroup"]{_id, title}'),
  ])

  const groupIdByTitle = new Map(roleGroups.map((g) => [g.title, g._id]))

  const matched: { profileId: string; groupId: string; groupTitle: string }[] = []
  const unmapped: string[] = []
  const missingGroup: string[] = []

  for (const profile of profiles) {
    const groupTitle = roleGroupTitleForRole(profile.role)
    if (groupTitle === null) {
      unmapped.push(profile._id)
      continue
    }
    const groupId = groupIdByTitle.get(groupTitle)
    if (groupId === undefined) {
      missingGroup.push(`${profile._id} -> "${groupTitle}"`)
      continue
    }
    matched.push({ profileId: profile._id, groupId, groupTitle })
  }

  console.log(`${profiles.length} profile(s) missing roleGroup.`)
  console.log(
    `${matched.length} mapped to an existing roleGroup, ${unmapped.length} have no known mapping.`
  )
  for (const row of matched) {
    console.log(`  ${row.profileId} -> ${row.groupTitle} (${row.groupId})`)
  }
  if (unmapped.length > 0) {
    console.log('\nUnmapped (roleGroup left unset, falls under "Other"):')
    for (const id of unmapped) console.log(`  ${id}`)
  }

  if (missingGroup.length > 0) {
    throw new Error(
      "The following profiles map to a roleGroup title that doesn't exist yet in Studio -- create it first:\n" +
        missingGroup.join('\n')
    )
  }

  if (!commit) {
    console.log('\nDry run only -- no writes made. Re-run with --commit to apply.')
    return
  }

  for (const row of matched) {
    await client
      .patch(row.profileId)
      .set({ roleGroup: { _type: 'reference', _ref: row.groupId } })
      .commit()
    console.log(`  committed ${row.profileId}`)
  }
  console.log(`\nDone -- ${matched.length} profile(s) updated.`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
```

- [ ] **Step 6: Add the npm script**

In `package.json`'s `scripts` block, add a line alongside `backfill:publication-dois`:

```json
    "backfill:profile-role-groups": "node scripts/backfill-profile-role-groups.ts",
```

- [ ] **Step 7: Verify the dry run runs cleanly against production**

Run:

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production node scripts/backfill-profile-role-groups.ts
```

Expected: no crash. Since no `roleGroup` documents exist in Studio yet at this point in the sequence (Task 4 only added the desk entry; nobody has used it), expect either `0 profile(s) missing roleGroup` matched (if `roleGroup` is still unset on all 19, all 19 are "missing," all fall into `unmapped` or `missingGroup`) — **if any land in `missingGroup`, that is the expected, documented failure mode (§3.4 of the spec: "fails loudly... since it depends on the manual seeding step"), not a bug.** Confirm the error message names the expected group titles (Research Scientist, PhD Student, Honours Student, Research Student, Undergraduate, Study Abroad Student) and exits non-zero.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add scripts/roleGroupMapping.ts scripts/roleGroupMapping.test.ts scripts/backfill-profile-role-groups.ts package.json
git commit -m "feat: add a dry-run-by-default backfill script for profile.roleGroup"
```

---

## Final verification (whole-branch, before merge)

- [ ] Run the full suite: `npm test` (Vitest), `npx tsc --noEmit`, `npx eslint .`.
- [ ] Run the full build: `NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run build`.
- [ ] Run the full e2e suite: `NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run test:e2e`.
- [ ] Re-confirm live: `count(*[_type=="profile" && defined(roleGroup)])` is still `0` and `count(*[_type=="roleGroup"])` is still `0` — this plan's code should not have written anything to production (only Task 8's dry run reads).
- [ ] PR description explicitly carries forward: (1) Task 3's People-preview render, unverifiable without Studio access; (2) the pre-existing webhook-secret and `VisualEditing` manual checks; (3) that `/people` still renders a single "Other" section post-merge until a human creates `roleGroup` documents and runs the backfill script (§4 of the spec).
