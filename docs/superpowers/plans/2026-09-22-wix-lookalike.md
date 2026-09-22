# Wix Lookalike on Sanity: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a near 1:1 copy of Damian's Wix site, rendered from the shared Sanity dataset
and deployed as its own Vercel preview. It gets there through an additive schema PR into
`redesign/integration`, a gated and idempotent content import, and a Wix-styled page layer on
`redesign/wix`.

**Architecture:** There are three streams, each with its own PR.

1. **Schema (Part A).** Additive only. It goes into `redesign/integration` so that both sites'
   embedded Studios know every type.
2. **Import (Part B).** A committed Wix snapshot plus a pure planner and a thin CLI, dry-run by
   default. It is first run against a throwaway `wix-preview` copy of production.
3. **Site (Part C).** The page layer on this branch is replaced with Wix-styled routes, built
   against `wix-preview`.

Part D is operations, each step behind a Brett gate: the live-site impact report, the
production import, the preview deploy, and cleanup.

**Tech Stack:**

- Next.js 16 App Router, React 19, Tailwind CSS 4.3 (`@tailwindcss/postcss`)
- Sanity 6.9 (Studio embedded at `/studio`), `next-sanity` 13 (`defineLive`), `@sanity/client` 7
- `@sanity/orderable-document-list`, `@headlessui/react` 2
- Vitest, Playwright plus `@axe-core/playwright`
- Node 22 (scripts run TypeScript natively: `node scripts/x.ts`)

**Spec:** `docs/superpowers/specs/2026-09-22-wix-lookalike-design.md`. Read it before any task.
Appendix A there holds every measured Wix value this plan cites.

## Global Constraints

- **Never write to Sanity production without Brett's explicit per-write yes,** relayed by the
  command centre ("Holsinger Lab next steps").
  - Implementation subagents never hold `SANITY_API_WRITE_TOKEN`. Copy `.env.local` into the
    worktree **minus** that line.
  - The only writes this plan performs happen in Part D, run by the controller after a gate.
- **Never change `main`, and never merge a PR.** PRs are opened for review, and the command
  centre merges them.
- **Implementation subagents use Sonnet** (Brett's standing rule). Review and verification
  subagents may use other tiers.
- **Every schema change is additive.** No field is renamed, retyped or removed. No
  `required()` goes on any existing field.
- **The import never deletes, and never sets a field to `null` or unset.** It creates, or it
  sets a non-empty value.
- **Wix-wins scope:**
  - Profiles: `name`, `role`, `roleDetail`, `roleGroup`, `orderRank`.
  - Projects: `title`, `description`, `coverImage`, `researchOrder`.
  - Publications: creates plus a `doi` fill only. Every other publication difference is
    reported, not written.
- **Role groups are looked up by exact title** and never created. The six titles are
  `Research Scientist`, `PhD Candidate`, `Honours Student`, `Research Student`,
  `International Interns`, `Lab Alumni`.
- **Tailwind 4 rules** (`docs/redesign-experiment/phase-1-decisions.md`):
  - Use `x-(--var)` when a custom property is the whole value, and `x-[var(--a)_1fr]` inside
    composites. Never `x-[--var]`.
  - Two utilities that set the same property never merge. This repo has no `cn()`.
  - **Every component task builds and greps the emitted CSS** for its utilities
    (`grep -o '<escaped-class>' .next/static/css/*.css`).
- **Stega:** any CMS string that reaches `alt`, `href`, `<title>`, metadata or JSON-LD goes
  through `stegaClean` (from `next-sanity`).
- **Wix copy is verbatim,** including Wix's own spelling ("homestatic"), except for the two
  corrected defects: the duplicate Rene Buxton, and "More" in the nav.
- **Fixed chrome is hardcoded:** nav labels, page headings, "©2026 by Damian Holsinger".
  Everything else comes from Sanity.
- **Fonts:**
  - Playfair Display (400, 700, normal and italic)
  - Lato (300, 700, normal and italic)
  - Raleway (400)
  - Bodoni Moda (400 italic) stands in for Didot W01 Italic
  - Montserrat (400) stands in for Proxima Nova
  - All loaded via `next/font/google`.
- **Breakpoint `md` is 768px.** Below it the Wix mobile design applies, and from it up the
  desktop design. There is no horizontal scroll at any width of 320px or more.
- Light mode only (`color-scheme: light`). Wix chrome (banner, Let's Chat, scroll-to-top) is
  never reproduced.

## Review Focus

1. **The lab head appearing on Team.** Wix's Team page does not show Damian, but his profile
   (created by the migrations session) will exist. `groupTeam` must exclude
   `settings.labHead`. Owned by Task C2.
2. **Profiles with no roleGroup, or a group outside the six** (for example Fritz Graham, the
   "Study Abroad Student"). They must render as current members, not vanish and not crash.
   Owned by Task C2.
3. **A second import run after Damian edits a field in Studio.** The edit must survive, and the
   dry run must report it as skipped. Owned by Task B2.
4. **Empty optional content.** Examples: a news item with no `summary`, a project with no
   `coverImage`, a publication with no volume/issue/pages or no DOI, a media item with neither
   `url` nor video, and a missing `siteCopy` document. Each must render without the orphaned
   punctuation or empty wrappers Wix wouldn't show, and without a thrown error. Owned by
   Tasks C2, C4, C6 and C8.
5. **Stega characters leaking into hrefs and alt text in draft mode.** `mailto:`, `tel:`, DOI
   links, media URLs and image `alt` must all be `stegaClean`ed. Owned by Tasks C4, C6 and C8.
   Tested via the pure `hrefs` helpers in C2.

---

## Branches, PRs and gates

```
origin/redesign/integration
 ├─ redesign/wix-schema ──PR A──▶ redesign/integration        (Part A; command centre merges)
 └─ redesign/wix  (spec + plan commits; rebased onto integration after PR A merges; pushed)
     ├─ redesign/wix-import ──PR B──▶ redesign/wix             (Part B)
     └─ redesign/wix-site   ──PR C──▶ redesign/wix             (Part C; branched after PR B merges)
```

- If PR #24 (role-group mapping) lands in `redesign/integration` first, rebase
  `redesign/wix-schema` onto it before opening PR A.
- PR A touches only `schemas/**`, `sanity.config.ts`, `plugins/settings.tsx`, `schema.json`,
  `sanity.types.ts` and tests. The Phase 3 layout session (on `redesign/phase-3-layout`) edits
  none of these except possibly `sanity.types.ts`. If typegen conflicts, re-run
  `npm run typegen` after the rebase. Never hand-merge generated files.

| Gate | Before | Who says yes |
|---|---|---|
| G0 | Executing this plan at all | Command centre |
| G1 | Creating dataset `wix-preview` and running the import into it | Brett, via command centre |
| G2 | Production import (the live-impact report is the evidence) | Brett, via command centre |
| G3 | Showing Damian: the side-by-side comparison artifact | Brett |
| G4 | Deleting dataset `wix-preview` | Brett |

## File structure

**Part A (on `redesign/wix-schema`)**

| File | Responsibility |
|---|---|
| `schemas/lib/inlineBlock.ts` (create) | The shared portable-text block definition (italic, strong, link), no styles or lists |
| `schemas/documents/newsItem.ts` (create) | The `newsItem` type |
| `schemas/documents/mediaAppearance.ts` (create) | The `mediaAppearance` type |
| `schemas/singletons/siteCopy.ts` (create) | The `siteCopy` singleton |
| `schemas/singletons/settings.ts` (modify) | Adds the `contact` object and a `contact` group |
| `schemas/documents/profile.ts` (modify) | Adds `roleDetail` |
| `schemas/documents/project.ts` (modify) | Adds `researchOrder` |
| `sanity.config.ts` (modify) | Registers the types and the singleton |
| `plugins/settings.tsx` (modify) | Orderable desk lists for news and media |
| `schemas/wix-additions.test.ts` (create) | Contract tests for the field names that queries and the importer rely on |

**Part B (on `redesign/wix-import`)**

| File | Responsibility |
|---|---|
| `data/wix/snapshot.json` (create) | The captured Wix content, the reviewable source of truth for the import |
| `scripts/wix/snapshot.ts` (create) | Snapshot types plus `validateSnapshot` |
| `scripts/wix/blocks.ts` (create) | `toBlocks`: paragraph strings to deterministic portable text |
| `scripts/wix/rank.ts` (create) | `rankAt`: deterministic LexoRank-compatible `orderRank` strings |
| `scripts/wix/plan.ts` (create) | `planImport`: a pure function from snapshot, current state and ledger to ops, skips, reports and the next ledger |
| `scripts/wix/*.test.ts` (create) | Unit tests |
| `scripts/import-wix.ts` (create) | The CLI: fetch, assets, plan, print, commit |
| `package.json` (modify) | The `import:wix` script |

**Part C (on `redesign/wix-site`)**

| File | Responsibility |
|---|---|
| `styles/wix.css` (create) | Tailwind entry plus Wix tokens |
| `app/layout.tsx` (replace) | html and body, fonts, metadata (noindex), draft mode, `SanityLive` |
| `app/(site)/layout.tsx` (create) | Wraps pages in `SiteHeader` and `SiteFooter` |
| `app/(site)/page.tsx`, `research/`, `news/`, `publications/`, `team/`, `media/`, `contact/` (create) | One route file each |
| `lib/wix/queries.ts`, `lib/wix/types.ts` (create) | GROQ queries plus result types |
| `lib/wix/format.ts` (+ test) (create) | `formatCitationLine`, `doiHref`, `mailtoHref`, `telHref`, `formatMediaDate` |
| `lib/wix/team.ts` (+ test) (create) | `groupTeam` |
| `components/wix/*.tsx` (create) | One component per visual block |
| `app/robots.ts`, `app/sitemap.ts`, `lib/paths.ts`, `app/api/revalidate/route.ts`, `next.config.mjs` (modify) | Noindex, the new paths, redirects |
| Removed | `app/page.tsx`, `app/[slug]`, `app/people`, `app/projects`, `app/publications`, `app/contact`, `app/preview`, `app/not-found.tsx`'s old chrome import, and every file in `e2e/` |
| `e2e/wix-*.spec.ts` (create) | Routes, styles, menu, axe, overflow |

---

# Part A: Schema PR (into `redesign/integration`)

Setup, done by the controller once:

```bash
git fetch origin
git worktree add ../wix-schema -b redesign/wix-schema origin/redesign/integration
cd ../wix-schema
grep -v '^SANITY_API_WRITE_TOKEN' ../../../.env.local > .env.local
npm ci
npm test   # record the baseline pass count
```

### Task A1: `newsItem` and `mediaAppearance` types

**Files:**
- Create: `schemas/lib/inlineBlock.ts`, `schemas/documents/newsItem.ts`, `schemas/documents/mediaAppearance.ts`, `schemas/wix-additions.test.ts`
- Modify: `sanity.config.ts` (imports plus `schema.types`), `plugins/settings.tsx` (desk lists)

**Interfaces:**
- Produces: document types `newsItem` with fields `orderRank`, `title`, `body`, `summary`,
  `date`, `showOnHome`, `showOnNewsPage`, and `mediaAppearance` with fields `orderRank`,
  `title`, `outlet`, `date`, `url`, `video`, `poster`.
- Produces: `inlineBlock`, a `defineArrayMember` result reused by `siteCopy.about.body` in A2.

- [ ] **Step 1: Write the failing contract test**

```ts
// schemas/wix-additions.test.ts
// Contract tests: the Wix site's GROQ queries (lib/wix/queries.ts) and the
// importer (scripts/wix/plan.ts) address these field names as string
// literals. A rename here would break both silently -- GROQ returns null for
// an unknown field rather than erroring.
import { describe, expect, it } from 'vitest'

import mediaAppearance from './documents/mediaAppearance'
import newsItem from './documents/newsItem'

const names = (t: { fields: { name: string }[] }) => t.fields.map((f) => f.name)

describe('newsItem', () => {
  it('has the fields the Wix site and importer rely on', () => {
    expect(names(newsItem)).toEqual([
      'orderRank',
      'title',
      'body',
      'summary',
      'date',
      'showOnHome',
      'showOnNewsPage',
    ])
  })
  it('defaults both placements to shown', () => {
    const f = (n: string) => newsItem.fields.find((x) => x.name === n) as { initialValue?: unknown }
    expect(f('showOnHome').initialValue).toBe(true)
    expect(f('showOnNewsPage').initialValue).toBe(true)
  })
})

describe('mediaAppearance', () => {
  it('has the fields the Wix site and importer rely on', () => {
    expect(names(mediaAppearance)).toEqual([
      'orderRank',
      'title',
      'outlet',
      'date',
      'url',
      'video',
      'poster',
    ])
  })
  it('accepts only mp4 video', () => {
    const video = mediaAppearance.fields.find((x) => x.name === 'video') as {
      options?: { accept?: string }
    }
    expect(video.options?.accept).toBe('video/mp4')
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run schemas/wix-additions.test.ts`
Expected: FAIL, because `./documents/newsItem` cannot be resolved.

- [ ] **Step 3: Write `schemas/lib/inlineBlock.ts`**

```ts
import { defineArrayMember } from 'sanity'

// One paragraph style, no lists: the Wix site renders these as plain
// paragraphs of body copy, so headings or lists here would have nowhere
// faithful to go.
export const inlineBlock = defineArrayMember({
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
})
```

- [ ] **Step 4: Write `schemas/documents/newsItem.ts`**

```ts
import { DocumentIcon } from '@sanity/icons/Document'
import {
  orderRankField,
  orderRankOrdering,
} from '@sanity/orderable-document-list'
import { defineField, defineType } from 'sanity'
import { inlineBlock } from 'schemas/lib/inlineBlock'

// A news item appears in up to two places, with different text in each --
// on the Wix site the Home "News & Highlights" block shows a headline plus
// body, while the News page shows a single sentence. Order is curated by
// drag-and-drop (orderRank), because Wix shows no dates and the import must
// not invent them.
export default defineType({
  type: 'document',
  name: 'newsItem',
  title: 'News',
  icon: DocumentIcon,
  orderings: [orderRankOrdering],
  preview: { select: { title: 'title', subtitle: 'summary' } },
  fields: [
    orderRankField({ type: 'newsItem' }),
    defineField({
      name: 'title',
      title: 'Headline',
      type: 'string',
      description: 'Shown in bold on the Home page, e.g. "Honours Thesis Submitted".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Home page text',
      type: 'array',
      description: 'The text under the headline on the Home page.',
      of: [inlineBlock],
    }),
    defineField({
      name: 'summary',
      title: 'News page sentence',
      type: 'string',
      description:
        'The one-line version shown on the News page. Leave empty to show the headline instead.',
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      description: 'For your records. Not shown on the site; drag items in the list to reorder them.',
    }),
    defineField({
      name: 'showOnHome',
      title: 'Show on the Home page',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'showOnNewsPage',
      title: 'Show on the News page',
      type: 'boolean',
      initialValue: true,
    }),
  ],
})
```

- [ ] **Step 5: Write `schemas/documents/mediaAppearance.ts`**

```ts
import { PlayIcon } from '@sanity/icons/Play'
import {
  orderRankField,
  orderRankOrdering,
} from '@sanity/orderable-document-list'
import { defineField, defineType } from 'sanity'

export default defineType({
  type: 'document',
  name: 'mediaAppearance',
  title: 'Media',
  icon: PlayIcon,
  orderings: [orderRankOrdering],
  preview: { select: { title: 'title', subtitle: 'outlet' } },
  fields: [
    orderRankField({ type: 'mediaAppearance' }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The headline of the article or segment.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'outlet',
      title: 'Outlet',
      type: 'string',
      description: 'Who published it, e.g. "ABC News". Shown in italics.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'date', title: 'Date', type: 'date' }),
    defineField({
      name: 'url',
      title: 'Link',
      type: 'url',
      description: 'The article online. Leave empty if you upload the video below instead.',
    }),
    defineField({
      name: 'video',
      title: 'Video',
      type: 'file',
      options: { accept: 'video/mp4' },
      description: 'An mp4 to play on the page. Optional.',
    }),
    defineField({
      name: 'poster',
      title: 'Video still',
      type: 'image',
      description: 'The picture shown before the video plays.',
      options: { hotspot: true },
    }),
  ],
})
```

- [ ] **Step 6: Register the types in `sanity.config.ts`**

Add these imports next to the existing document imports (alphabetical, as in the file):

```ts
import mediaAppearance from 'schemas/documents/mediaAppearance'
import newsItem from 'schemas/documents/newsItem'
```

Append `newsItem, mediaAppearance,` to `schema.types` after `resource,`.

- [ ] **Step 7: Add orderable desk lists in `plugins/settings.tsx`**

In `defaultListItems`' filter, next to the existing `'profile'` and `'roleGroup'` exclusions:

```ts
        listItem.getId() !== 'newsItem' && // orderable list below
        listItem.getId() !== 'mediaAppearance' && // orderable list below
```

After the `roleGroup` `orderableDocumentListDeskItem({...})` entry, add the new lists. Import
the icons at the top: `import { DocumentIcon } from '@sanity/icons/Document'` and
`import { PlayIcon } from '@sanity/icons/Play'`.

```tsx
        orderableDocumentListDeskItem({
          type: 'newsItem',
          title: 'News',
          icon: DocumentIcon,
          S,
          context,
        }),

        orderableDocumentListDeskItem({
          type: 'mediaAppearance',
          title: 'Media',
          icon: PlayIcon,
          S,
          context,
        }),
```

- [ ] **Step 8: Run the tests and confirm they pass**

Run: `npx vitest run schemas/wix-additions.test.ts`, then `npm test`.
Expected: PASS. The total is the baseline plus 4.

- [ ] **Step 9: Commit**

```bash
git add schemas/lib/inlineBlock.ts schemas/documents/newsItem.ts schemas/documents/mediaAppearance.ts schemas/wix-additions.test.ts sanity.config.ts plugins/settings.tsx
git commit -m "feat(schema): add newsItem and mediaAppearance types"
```

### Task A2: `siteCopy` singleton, `settings.contact`, `profile.roleDetail`, `project.researchOrder`, typegen

**Files:**
- Create: `schemas/singletons/siteCopy.ts`
- Modify: `schemas/singletons/settings.ts`, `schemas/documents/profile.ts`, `schemas/documents/project.ts`, `sanity.config.ts`, `schemas/wix-additions.test.ts`, `schema.json`, `sanity.types.ts` (generated)

**Interfaces:**
- Consumes: `inlineBlock` from A1.
- Produces:
  - Singleton `siteCopy` (document `_id` is `"siteCopy"`, because
    `pageStructure`/`singletonPlugin` use the type name as the id). Fields: `hero{image, heading,
    subheading}`, `about{heading, body, themesIntro, themes[]{title, summary}}`, `teamIntro`,
    `alumniSubtitle`, `contactIntro`.
  - `settings.contact{address, email, phone}`.
  - `profile.roleDetail` (string).
  - `project.researchOrder` (number).

- [ ] **Step 1: Extend the contract test (failing)**

Append this to `schemas/wix-additions.test.ts` and add the imports at the top:

```ts
import project from './documents/project'
import profile from './documents/profile'
import settings from './singletons/settings'
import siteCopy from './singletons/siteCopy'

type Field = { name: string; fields?: Field[]; of?: { fields?: Field[] }[] }
const sub = (t: { fields: Field[] }, n: string) =>
  (t.fields.find((f) => f.name === n) as Field).fields!.map((f) => f.name)

describe('siteCopy', () => {
  it('has the fields the Wix site and importer rely on', () => {
    expect(names(siteCopy)).toEqual([
      'hero',
      'about',
      'teamIntro',
      'alumniSubtitle',
      'contactIntro',
    ])
    expect(sub(siteCopy, 'hero')).toEqual(['image', 'heading', 'subheading'])
    expect(sub(siteCopy, 'about')).toEqual(['heading', 'body', 'themesIntro', 'themes'])
    const themes = (siteCopy.fields.find((f) => f.name === 'about') as Field).fields!.find(
      (f) => f.name === 'themes'
    )!
    expect(themes.of![0].fields!.map((f) => f.name)).toEqual(['title', 'summary'])
  })
})

describe('additive fields on existing types', () => {
  it('settings.contact', () => {
    expect(sub(settings, 'contact')).toEqual(['address', 'email', 'phone'])
  })
  it('profile.roleDetail follows role', () => {
    const n = names(profile)
    expect(n.indexOf('roleDetail')).toBe(n.indexOf('role') + 1)
  })
  it('project.researchOrder', () => {
    expect(names(project)).toContain('researchOrder')
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run schemas/wix-additions.test.ts`
Expected: FAIL, because `./singletons/siteCopy` cannot be resolved.

- [ ] **Step 3: Write `schemas/singletons/siteCopy.ts`**

```ts
import { EditIcon } from '@sanity/icons/Edit'
import { defineArrayMember, defineField, defineType } from 'sanity'
import { inlineBlock } from 'schemas/lib/inlineBlock'

// Editorial copy used by the Wix-style layout (redesign/wix). Kept off `home`
// deliberately: the Modern Instrument redesign's Home has no editorial fields
// (agreed-ia.md section 2), and putting Wix-only copy there would make it look
// as if the redesign ignored content it was meant to show.
export default defineType({
  name: 'siteCopy',
  title: 'Site copy',
  type: 'document',
  icon: EditIcon,
  fields: [
    defineField({
      name: 'hero',
      title: 'Home page banner',
      type: 'object',
      fields: [
        defineField({
          name: 'image',
          title: 'Image',
          type: 'image',
          options: { hotspot: true },
          fields: [defineField({ name: 'alt', title: 'Description', type: 'string' })],
        }),
        defineField({ name: 'heading', title: 'Heading', type: 'string' }),
        defineField({ name: 'subheading', title: 'Subheading', type: 'string' }),
      ],
    }),
    defineField({
      name: 'about',
      title: 'About the laboratory',
      type: 'object',
      fields: [
        defineField({ name: 'heading', title: 'Heading', type: 'string' }),
        defineField({ name: 'body', title: 'Text', type: 'array', of: [inlineBlock] }),
        defineField({
          name: 'themesIntro',
          title: 'Research themes introduction',
          type: 'string',
        }),
        defineField({
          name: 'themes',
          title: 'Research themes',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'theme',
              fields: [
                defineField({ name: 'title', title: 'Theme', type: 'string' }),
                defineField({ name: 'summary', title: 'One-line summary', type: 'string' }),
              ],
              preview: { select: { title: 'title', subtitle: 'summary' } },
            }),
          ],
        }),
      ],
    }),
    defineField({ name: 'teamIntro', title: 'Team page introduction', type: 'text', rows: 3 }),
    defineField({
      name: 'alumniSubtitle',
      title: 'Lab alumni subtitle',
      type: 'string',
      description: 'Shown under "Lab Alumni", e.g. "2020 - present".',
    }),
    defineField({
      name: 'contactIntro',
      title: 'Contact page introduction',
      type: 'string',
      description: 'The line above "CONTACT US" on the Contact page.',
    }),
  ],
  preview: { prepare: () => ({ title: 'Site copy' }) },
})
```

- [ ] **Step 4: Add `contact` to `schemas/singletons/settings.ts`**

Add `{ name: 'contact', title: 'Contact' },` to `groups` after `footer`. Append this field to
`fields`:

```ts
    defineField({
      name: 'contact',
      title: 'Contact details',
      type: 'object',
      group: 'contact',
      description: 'Shown in the contact block on the Home and Contact pages.',
      fields: [
        defineField({ name: 'address', title: 'Address', type: 'text', rows: 2 }),
        defineField({ name: 'email', title: 'Email', type: 'email' }),
        defineField({ name: 'phone', title: 'Phone', type: 'string' }),
      ],
    }),
```

- [ ] **Step 5: Add `roleDetail` to `schemas/documents/profile.ts`**, immediately after the `role` field:

```ts
    defineField({
      name: 'roleDetail',
      title: 'Role detail',
      type: 'string',
      description:
        'Optional second line under the role, e.g. "(Diagnostic Radiography)" or "Honours Class I".',
    }),
```

- [ ] **Step 6: Add `researchOrder` to `schemas/documents/project.ts`**, as the last field:

```ts
    defineField({
      name: 'researchOrder',
      title: 'Position on the Research page',
      type: 'number',
      description:
        'Set a number to list this project on the Research page (1 = first). Leave empty to leave it off.',
      validation: (Rule) => Rule.integer().min(1),
    }),
```

- [ ] **Step 7: Register the singleton in `sanity.config.ts`**

- Add `import siteCopy from 'schemas/singletons/siteCopy'`.
- Add `siteCopy` to `schema.types` after `settings`.
- Change `pageStructure([home, settings])` to `pageStructure([home, settings, siteCopy])`.
- Change `singletonPlugin([home.name, settings.name])` to
  `singletonPlugin([home.name, settings.name, siteCopy.name])`.

- [ ] **Step 8: Run the tests**

Run: `npx vitest run schemas/wix-additions.test.ts`, then `npm test`.
Expected: all pass.

- [ ] **Step 9: Regenerate types, then verify the whole branch**

```bash
npm run typegen
npm run type-check
npm run lint
npm run build
```

Expected:
- `typegen` reports 4 more schema types than before.
- `type-check` is clean.
- `lint` shows no new warnings; the four pre-existing warnings remain.
- `build` succeeds.

- [ ] **Step 10: Open the Studio and check for warnings**

Run `npm run dev` and open `http://localhost:3000/studio`. Confirm that:
- the sidebar lists "Site copy", "News" and "Media";
- Settings has a "Contact" tab;
- opening any existing profile or project shows **no** "unknown field" warning.

Take screenshots with the browser pane and attach them to the PR.

- [ ] **Step 11: Commit, push, and open PR A**

```bash
git add schemas sanity.config.ts schema.json sanity.types.ts
git commit -m "feat(schema): siteCopy singleton, settings.contact, profile.roleDetail, project.researchOrder"
git push -u origin redesign/wix-schema
gh pr create --base redesign/integration --title "Schema additions for the Wix-lookalike site (additive only)" --body "<summary; list every new type and field; note no field removed/retyped; Studio screenshots; spec link>"
```

**Stop.** Send the PR URL to the command centre. Part B starts only after PR A is merged.

---

# Part B: Import (PR B into `redesign/wix`)

Setup, done by the controller after PR A merges:

```bash
git switch redesign/wix
git rebase origin/redesign/integration
git push -u origin redesign/wix
git switch -c redesign/wix-import
```

### Task B1: Capture the Wix snapshot (controller only; it needs the browser)

This task is done by the controller, not a subagent. It needs the browser pane, and it is
reviewed as data.

**Files:**
- Create: `scripts/wix/snapshot.ts`, `scripts/wix/snapshot.test.ts`, `data/wix/snapshot.json`

**Interfaces:**
- Produces: `WixSnapshot`, `ROLE_GROUP_TITLES`, `validateSnapshot(s: unknown): string[]`
  (an empty array means valid).

- [ ] **Step 1: Write the failing test** (`scripts/wix/snapshot.test.ts`)

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { validateSnapshot, type WixSnapshot } from './snapshot.ts'

const load = (): WixSnapshot =>
  JSON.parse(readFileSync(new URL('../../data/wix/snapshot.json', import.meta.url), 'utf8'))

describe('data/wix/snapshot.json', () => {
  it('is valid', () => {
    expect(validateSnapshot(load())).toEqual([])
  })
  it('holds the counts captured on 2026-09-22', () => {
    const s = load()
    expect(s.news).toHaveLength(4)
    expect(s.news.filter((n) => n.showOnNewsPage)).toHaveLength(3)
    expect(s.media).toHaveLength(3)
    expect(s.projects).toHaveLength(4)
    expect(s.publications).toHaveLength(17)
    expect(s.people.filter((p) => p.group === 'International Interns')).toHaveLength(6)
    const alumni = s.people.filter((p) => p.group === 'Lab Alumni')
    expect(alumni.filter((p) => p.imageUrl !== null || p.sanityId !== null)).toHaveLength(6) // photo cards
    expect(alumni.filter((p) => p.imageUrl === null && p.sanityId === null)).toHaveLength(15) // name rows
    expect(s.people.filter((p) => p.sanityId === null)).toHaveLength(22) // new profiles
    // Rene Buxton appears twice on Wix; the snapshot corrects it to once.
    expect(s.people.filter((p) => p.name === 'Rene Buxton')).toHaveLength(1)
  })
})

describe('validateSnapshot', () => {
  const minimal = (): WixSnapshot => ({
    capturedAt: '2026-09-22',
    siteCopy: {
      hero: { imageUrl: null, imageAlt: '', heading: 'h', subheading: 's' },
      about: { heading: 'a', paragraphs: ['p'], themesIntro: 't', themes: [] },
      teamIntro: 'i',
      alumniSubtitle: '2020 - present',
      contactIntro: 'c',
    },
    contact: { address: 'a', email: 'e@x.org', phone: '1' },
    news: [],
    media: [],
    projects: [],
    people: [],
    publications: [],
  })

  it('rejects duplicate keys within a collection', () => {
    const s = minimal()
    s.news = [
      { key: 'a', title: 't', paragraphs: [], summary: null, showOnHome: true, showOnNewsPage: true },
      { key: 'a', title: 't', paragraphs: [], summary: null, showOnHome: true, showOnNewsPage: true },
    ]
    expect(validateSnapshot(s)).toContain('news: duplicate key "a"')
  })
  it('rejects an unknown role group', () => {
    const s = minimal()
    s.people = [
      { key: 'x', sanityId: null, name: 'X', role: 'r', roleDetail: null, group: 'Alumni' as never, imageUrl: null },
    ]
    expect(validateSnapshot(s)).toContain('people.x: unknown group "Alumni"')
  })
  it('rejects asset URLs that are not Wix originals', () => {
    const s = minimal()
    s.siteCopy.hero.imageUrl = 'https://example.com/a.png'
    expect(validateSnapshot(s)).toContain('siteCopy.hero.imageUrl: not a wixstatic original')
  })
  it('requires date and journal on publications that are new', () => {
    const s = minimal()
    s.publications = [
      { key: 'p', sanityId: null, title: 't', authors: 'a', journal: null, date: null, volume: null, issue: null, pages: null, doi: null },
    ]
    expect(validateSnapshot(s)).toEqual(
      expect.arrayContaining(['publications.p: new publication needs date', 'publications.p: new publication needs journal'])
    )
  })
})
```

- [ ] **Step 2: Write `scripts/wix/snapshot.ts`**

```ts
// The Wix site's content, captured once in a browser (Wix renders client-side,
// so it cannot be scraped headlessly with confidence) and committed as a
// reviewable diff. scripts/import-wix.ts turns this into Sanity mutations.
//
// Paragraph strings use one inline markup: *text* is italic. Nothing else.

export const ROLE_GROUP_TITLES = [
  'Research Scientist',
  'PhD Candidate',
  'Honours Student',
  'Research Student',
  'International Interns',
  'Lab Alumni',
] as const
export type RoleGroupTitle = (typeof ROLE_GROUP_TITLES)[number]

export interface WixSnapshot {
  capturedAt: string
  siteCopy: {
    hero: { imageUrl: string | null; imageAlt: string; heading: string; subheading: string }
    about: {
      heading: string
      paragraphs: string[]
      themesIntro: string
      themes: { key: string; title: string; summary: string }[]
    }
    teamIntro: string
    alumniSubtitle: string
    contactIntro: string
  }
  contact: { address: string; email: string; phone: string }
  news: {
    key: string
    title: string
    paragraphs: string[]
    summary: string | null
    showOnHome: boolean
    showOnNewsPage: boolean
  }[]
  media: {
    key: string
    title: string
    outlet: string
    date: string | null // YYYY-MM-DD
    url: string | null
    videoUrl: string | null
    posterUrl: string | null
  }[]
  projects: {
    key: string
    sanityId: string | null // existing project _id, or null to create
    researchOrder: number
    title: string
    paragraphs: string[]
    imageUrl: string | null
    imageAlt: string
  }[]
  people: {
    key: string
    sanityId: string | null // existing profile _id, or null to create
    name: string
    role: string
    roleDetail: string | null
    group: RoleGroupTitle
    imageUrl: string | null
  }[] // in Wix page order: current grid, alumni cards, alumni rows, interns
  publications: {
    key: string
    sanityId: string | null
    title: string
    authors: string
    journal: string | null
    date: string | null // YYYY-MM-DD
    volume: number | null
    issue: number | null
    pages: string | null
    doi: string | null
  }[]
}

const WIX_ASSET = /^https:\/\/(static|video)\.wixstatic\.com\/(media|video)\/[^/]+(\/[^/]+\/mp4\/file\.mp4)?$/

export function validateSnapshot(input: unknown): string[] {
  const s = input as WixSnapshot
  const errors: string[] = []
  const asset = (path: string, url: string | null) => {
    if (url !== null && !WIX_ASSET.test(url)) errors.push(`${path}: not a wixstatic original`)
  }
  const unique = (name: string, keys: string[]) => {
    const seen = new Set<string>()
    for (const k of keys) {
      if (seen.has(k)) errors.push(`${name}: duplicate key "${k}"`)
      seen.add(k)
    }
  }

  asset('siteCopy.hero.imageUrl', s.siteCopy.hero.imageUrl)
  unique('themes', s.siteCopy.about.themes.map((t) => t.key))
  unique('news', s.news.map((n) => n.key))
  unique('media', s.media.map((m) => m.key))
  unique('projects', s.projects.map((p) => p.key))
  unique('people', s.people.map((p) => p.key))
  unique('publications', s.publications.map((p) => p.key))
  unique(
    'sanityId',
    [...s.projects, ...s.people, ...s.publications].flatMap((x) => (x.sanityId ? [x.sanityId] : []))
  )
  unique('people names', s.people.map((p) => p.name))

  for (const m of s.media) {
    asset(`media.${m.key}.videoUrl`, m.videoUrl)
    asset(`media.${m.key}.posterUrl`, m.posterUrl)
    if (!m.url && !m.videoUrl) errors.push(`media.${m.key}: needs url or videoUrl`)
  }
  for (const p of s.projects) asset(`projects.${p.key}.imageUrl`, p.imageUrl)
  for (const p of s.people) {
    asset(`people.${p.key}.imageUrl`, p.imageUrl)
    if (!(ROLE_GROUP_TITLES as readonly string[]).includes(p.group))
      errors.push(`people.${p.key}: unknown group "${p.group}"`)
  }
  for (const p of s.publications) {
    if (p.sanityId === null) {
      if (!p.date) errors.push(`publications.${p.key}: new publication needs date`)
      if (!p.journal) errors.push(`publications.${p.key}: new publication needs journal`)
    }
  }
  return errors
}
```

- [ ] **Step 3: Capture `data/wix/snapshot.json`**

The controller does this in the browser pane, one Wix page at a time, using `get_page_text`
plus the image `src` values with `/v1/...` stripped.

- **Rules:**
  - Copy verbatim.
  - Keys are kebab-case slugs of the title or name.
  - Set `sanityId` from the production query below, matching **by hand**. The known non-exact
    matches are:
    - "Dr Johnny Chan" to the profile "Dr Johnny Chan (DDS)"
    - "Elizabeth (Lizzie) Michel" to "Elizabeth Michel"
    - "Sreevadana (Sree) Venkitachalam" to "Sreevadana Venkitachalam"
    - Wix "Glial activity as a marker of disease" to the project with slug
      `glial-activity-as-a-marker-of-disease`
    - Wix "Fecal microbiota transplantation as a treatment for Alzheimer's disease" to slug
      `involvement-of-gut-microbiota-in-ad`
  - For existing publications, `sanityId` plus `doi` is enough; leave the other fields as Wix
    shows them, for reporting.
  - The two new publications (the 2026 bioRxiv Bdnf mRNA paper and "Roles of Non-Coding RNA in
    Alzheimer's Disease Pathophysiology") need full structured fields read off the Wix entry.
    Take `date` from the DOI or journal landing page, via the browser; do not guess it.
  - `showOnNewsPage` is false only for "Highly Cited Article".
  - News `summary` is the News page sentence that matches each Home item. Match
    "Congratulations to our recent Biomedical Engineering graduates…" to the graduates item,
    and so on.
  - The media dates are "14 Jul 2024" → `2024-07-14` and "22 Aug 2021" → `2021-08-22`. Channel 7
    has no date. The Channel 7 `videoUrl` is
    `https://video.wixstatic.com/video/48c693_cfa2ab93ee034322b36c84361d9711fc/480p/mp4/file.mp4`.
    Check for a 1080p rendition first (swap in `1080p`), and use the highest one that returns
    200.

```bash
# The production ids to match against (read-only; the dataset is public):
curl -s "https://j3f9z8os.apicdn.sanity.io/v2024-01-01/data/query/production" --get \
  --data-urlencode 'query={"profiles":*[_type=="profile"]{_id,name},"projects":*[_type=="project"]{_id,"slug":slug.current},"pubs":*[_type=="publication"]{_id,title,doi}}'
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run scripts/wix/snapshot.test.ts`
Expected: PASS. If the count test fails, re-check the capture rather than editing the counts:
the counts are from the spec's capture.

- [ ] **Step 5: Commit**

```bash
git add scripts/wix/snapshot.ts scripts/wix/snapshot.test.ts data/wix/snapshot.json
git commit -m "feat(import): committed Wix content snapshot with validation"
```

### Task B2: Pure import planner

**Files:**
- Create: `scripts/wix/blocks.ts`, `scripts/wix/rank.ts`, `scripts/wix/plan.ts`, `scripts/wix/plan.test.ts`

**Interfaces:**
- Consumes: `WixSnapshot` and `RoleGroupTitle` from B1.
- Produces:

```ts
export const LEDGER_ID = 'wix-import.ledger'
export type Ledger = Record<string, string> // `${docId}#${field}` -> hash of last value imported
export interface CurrentDoc { _id: string; _type: string; [field: string]: unknown }
export interface PlanInput {
  snapshot: WixSnapshot
  existing: Record<string, CurrentDoc>             // by _id; includes 'siteCopy' and the settings doc when present
  settingsId: string                               // _id of the settings singleton
  roleGroupIds: Record<RoleGroupTitle, string>
  assetIds: Record<string, string>                 // wix URL -> Sanity asset _id
  ledger: Ledger
}
export type Op =
  | { kind: 'create'; doc: CurrentDoc }
  | { kind: 'patch'; id: string; set: Record<string, unknown> }
export interface Skip { id: string; field: string; reason: 'edited-since-import' }
export interface Plan { ops: Op[]; skipped: Skip[]; reports: string[]; ledger: Ledger }
export function planImport(input: PlanInput): Plan
export function stableHash(value: unknown): string
export function toBlocks(paragraphs: string[], keySeed: string): Block[]  // blocks.ts
export function rankAt(index: number): string                              // rank.ts
```

**The field rule** (spec §8). For each desired field value `v` on a document `id`:

| Current state | Action |
|---|---|
| Document missing | Create it with every desired field |
| `current` deep-equals `v` | No op; ledger entry becomes `hash(v)` |
| `current` is null or undefined | Set |
| No ledger entry (first import) | Set, because Wix wins |
| `ledger[id#field] === hash(current)` (unchanged since our last import) | Set |
| Otherwise | Skip, `edited-since-import`, and keep the old ledger entry |

The ledger entry is written only for fields that end up equal to `v`.

- [ ] **Step 1: Write the failing tests** (`scripts/wix/plan.test.ts`)

```ts
import { describe, expect, it } from 'vitest'

import { toBlocks } from './blocks.ts'
import { type CurrentDoc, planImport, type PlanInput, stableHash } from './plan.ts'
import { rankAt } from './rank.ts'
import type { WixSnapshot } from './snapshot.ts'

const GROUPS = {
  'Research Scientist': 'rg-rs',
  'PhD Candidate': 'rg-phd',
  'Honours Student': 'rg-hons',
  'Research Student': 'rg-res',
  'International Interns': 'rg-intl',
  'Lab Alumni': 'rg-alum',
} as const

function snapshot(): WixSnapshot {
  return {
    capturedAt: '2026-09-22',
    siteCopy: {
      hero: { imageUrl: null, imageAlt: '', heading: 'H', subheading: 'S' },
      about: { heading: 'About', paragraphs: ['One *two*'], themesIntro: 'T', themes: [] },
      teamIntro: 'Team',
      alumniSubtitle: '2020 - present',
      contactIntro: 'Support',
    },
    contact: { address: 'Addr', email: 'a@b.org', phone: '1' },
    news: [{ key: 'n1', title: 'News 1', paragraphs: ['Body'], summary: null, showOnHome: true, showOnNewsPage: true }],
    media: [],
    projects: [],
    people: [
      { key: 'jc', sanityId: 'p-jc', name: 'Dr Johnny Chan', role: 'Research Scientist', roleDetail: null, group: 'Research Scientist', imageUrl: null },
      { key: 'mh', sanityId: null, name: 'Mia Helveston', role: 'USA', roleDetail: null, group: 'International Interns', imageUrl: null },
    ],
    publications: [
      { key: 'old', sanityId: 'pub-old', title: 'Old', authors: 'A', journal: 'J', date: '2020-01-01', volume: 1, issue: 2, pages: '3', doi: '10.1/x' },
      { key: 'new', sanityId: null, title: 'New', authors: 'B', journal: 'bioRxiv', date: '2026-04-19', volume: null, issue: null, pages: '04.19.719519', doi: '10.64898/2026.04.19.719519' },
    ],
  }
}

function input(over: Partial<PlanInput> = {}): PlanInput {
  const existing: Record<string, CurrentDoc> = {
    'p-jc': { _id: 'p-jc', _type: 'profile', name: 'Dr Johnny Chan (DDS)', role: 'Research Scientist', orderRank: '0|100014:' },
    'pub-old': { _id: 'pub-old', _type: 'publication', title: 'Old (Sanity wording)', doi: null },
    settings: { _id: 'settings', _type: 'settings' },
  }
  return { snapshot: snapshot(), existing, settingsId: 'settings', roleGroupIds: { ...GROUPS }, assetIds: {}, ledger: {}, ...over }
}

const patchFor = (plan: ReturnType<typeof planImport>, id: string) =>
  plan.ops.find((o) => o.kind === 'patch' && o.id === id) as { set: Record<string, unknown> } | undefined
const createFor = (plan: ReturnType<typeof planImport>, id: string) =>
  plan.ops.find((o) => o.kind === 'create' && o.doc._id === id) as { doc: CurrentDoc } | undefined

describe('planImport: first run', () => {
  const plan = planImport(input())

  it('Wix wins on a matched profile', () => {
    expect(patchFor(plan, 'p-jc')?.set).toMatchObject({
      name: 'Dr Johnny Chan',
      roleGroup: { _type: 'reference', _ref: 'rg-rs' },
      orderRank: rankAt(0),
    })
  })
  it('creates unmatched people with deterministic ids', () => {
    expect(createFor(plan, 'wix-profile-mh')?.doc).toMatchObject({
      _type: 'profile', name: 'Mia Helveston', role: 'USA',
      roleGroup: { _type: 'reference', _ref: 'rg-intl' }, orderRank: rankAt(1), hasPage: false,
    })
  })
  it('creates the siteCopy singleton at _id "siteCopy"', () => {
    expect(createFor(plan, 'siteCopy')?.doc).toMatchObject({ _type: 'siteCopy', teamIntro: 'Team' })
  })
  it('patches settings.contact', () => {
    expect(patchFor(plan, 'settings')?.set).toEqual({ contact: { address: 'Addr', email: 'a@b.org', phone: '1' } })
  })
  it('fills a missing DOI but never overwrites other publication fields', () => {
    expect(patchFor(plan, 'pub-old')?.set).toEqual({ doi: '10.1/x' })
    expect(plan.reports).toContain('publication pub-old: title differs (Sanity "Old (Sanity wording)" vs Wix "Old") — not written')
  })
  it('creates new publications', () => {
    expect(createFor(plan, 'wix-publication-new')?.doc).toMatchObject({
      _type: 'publication', title: 'New', author: 'B', journal: 'bioRxiv', date: '2026-04-19', pages: '04.19.719519',
    })
  })
  it('never deletes and never blanks a field', () => {
    for (const op of plan.ops) {
      expect(['create', 'patch']).toContain(op.kind)
      const fields = op.kind === 'patch' ? op.set : op.doc
      for (const v of Object.values(fields)) expect(v === null || v === undefined).toBe(false)
    }
  })
  it('records a ledger entry for every field it set', () => {
    expect(plan.ledger['p-jc#name']).toBe(stableHash('Dr Johnny Chan'))
  })
})

describe('planImport: re-runs', () => {
  it('is a no-op when nothing changed since the last run', () => {
    const first = planImport(input())
    const after: Record<string, CurrentDoc> = { ...input().existing }
    for (const op of first.ops) {
      if (op.kind === 'create') after[op.doc._id] = op.doc
      else after[op.id] = { ...after[op.id], ...op.set }
    }
    const second = planImport(input({ existing: after, ledger: first.ledger }))
    expect(second.ops).toEqual([])
    expect(second.skipped).toEqual([])
  })
  it('skips a field Damian edited after the last import (Review Focus 3)', () => {
    const first = planImport(input())
    const after: Record<string, CurrentDoc> = { ...input().existing }
    for (const op of first.ops) {
      if (op.kind === 'create') after[op.doc._id] = op.doc
      else after[op.id] = { ...after[op.id], ...op.set }
    }
    after['p-jc'] = { ...after['p-jc'], name: 'Dr Johnny Chan DDS' } // edited in Studio
    const second = planImport(input({ existing: after, ledger: first.ledger }))
    expect(patchFor(second, 'p-jc')?.set?.name).toBeUndefined()
    expect(second.skipped).toContainEqual({ id: 'p-jc', field: 'name', reason: 'edited-since-import' })
    expect(second.ledger['p-jc#name']).toBe(first.ledger['p-jc#name'])
  })
})

describe('toBlocks', () => {
  it('turns *x* into an em span with deterministic keys', () => {
    const a = toBlocks(['One *two* three'], 'seed')
    expect(a).toEqual(toBlocks(['One *two* three'], 'seed'))
    expect(a[0].children.map((c) => [c.text, c.marks])).toEqual([
      ['One ', []], ['two', ['em']], [' three', []],
    ])
  })
})

describe('rankAt', () => {
  it('sorts lexicographically in index order', () => {
    const ranks = Array.from({ length: 60 }, (_, i) => rankAt(i))
    expect([...ranks].sort()).toEqual(ranks)
    expect(ranks[0]).toMatch(/^0\|[0-9a-z]{6}:$/)
    // Below every existing production rank ("0|100008:" is the lowest today).
    expect(ranks[59] < '0|100000:').toBe(true)
  })
})
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run scripts/wix/plan.test.ts`
Expected: FAIL, because the modules cannot be resolved.

- [ ] **Step 3: Write `scripts/wix/rank.ts`**

```ts
// orderRank values for imported documents. @sanity/orderable-document-list
// stores LexoRank strings ("0|100008:") and orders lexicographically; any
// well-formed rank is valid and the Studio re-ranks on drag. These start at
// "0|0a0000:" -- *below* the existing "0|1xxxxx:" ranks, so Wix-ordered
// profiles come first and Sanity-only profiles (untouched by the import)
// follow them -- and step by "1000" (base 36) so there is room to drag
// between them. 60 steps stay below "0|100000:".
const BASE = parseInt('0a0000', 36)
const STEP = parseInt('1000', 36)

export function rankAt(index: number): string {
  return `0|${(BASE + index * STEP).toString(36).padStart(6, '0')}:`
}
```

- [ ] **Step 4: Write `scripts/wix/blocks.ts`**

```ts
import { createHash } from 'node:crypto'

export interface Span { _type: 'span'; _key: string; text: string; marks: string[] }
export interface Block {
  _type: 'block'; _key: string; style: 'normal'; markDefs: never[]; children: Span[]
}

const key = (seed: string) => createHash('sha1').update(seed).digest('hex').slice(0, 12)

/** Paragraph strings -> portable text. `*x*` is italic; nothing else is markup. Keys are
 *  derived from content so a re-import produces deep-equal blocks. */
export function toBlocks(paragraphs: string[], keySeed: string): Block[] {
  return paragraphs.map((p, i) => {
    const parts = p.split(/(\*[^*]+\*)/).filter((s) => s !== '')
    return {
      _type: 'block',
      _key: key(`${keySeed}:${i}`),
      style: 'normal',
      markDefs: [],
      children: parts.map((part, j) => {
        const em = part.startsWith('*') && part.endsWith('*')
        return {
          _type: 'span',
          _key: key(`${keySeed}:${i}:${j}`),
          text: em ? part.slice(1, -1) : part,
          marks: em ? ['em'] : [],
        }
      }),
    }
  })
}
```

- [ ] **Step 5: Write `scripts/wix/plan.ts`**

```ts
import { createHash } from 'node:crypto'

import { toBlocks } from './blocks.ts'
import { rankAt } from './rank.ts'
import type { RoleGroupTitle, WixSnapshot } from './snapshot.ts'

export const LEDGER_ID = 'wix-import.ledger'
export type Ledger = Record<string, string>
export interface CurrentDoc { _id: string; _type: string; [field: string]: unknown }
export interface PlanInput {
  snapshot: WixSnapshot
  existing: Record<string, CurrentDoc>
  settingsId: string
  roleGroupIds: Record<RoleGroupTitle, string>
  assetIds: Record<string, string>
  ledger: Ledger
}
export type Op =
  | { kind: 'create'; doc: CurrentDoc }
  | { kind: 'patch'; id: string; set: Record<string, unknown> }
export interface Skip { id: string; field: string; reason: 'edited-since-import' }
export interface Plan { ops: Op[]; skipped: Skip[]; reports: string[]; ledger: Ledger }

/** Key-order-independent JSON, so {a,b} and {b,a} hash the same. */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`
  if (v && typeof v === 'object')
    return `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(',')}}`
  return JSON.stringify(v ?? null)
}
export const stableHash = (v: unknown) => createHash('sha256').update(canonical(v)).digest('hex')
const equal = (a: unknown, b: unknown) => canonical(a) === canonical(b)

/** Drops null/undefined so an op can never blank a field. */
function present(fields: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null && v !== undefined))
}
const ref = (id: string) => ({ _type: 'reference', _ref: id })

export function planImport(input: PlanInput): Plan {
  const { snapshot: s, existing, roleGroupIds, assetIds } = input
  const ops: Op[] = []
  const skipped: Skip[] = []
  const reports: string[] = []
  const ledger: Ledger = { ...input.ledger }

  const image = (url: string | null, alt?: string) =>
    url && assetIds[url] ? present({ _type: 'image', asset: ref(assetIds[url]), alt: alt || undefined }) : undefined
  const file = (url: string | null) =>
    url && assetIds[url] ? { _type: 'file', asset: ref(assetIds[url]) } : undefined

  /** Applies the field rule to one document. */
  function upsert(id: string, type: string, desiredRaw: Record<string, unknown>) {
    const desired = present(desiredRaw)
    const current = existing[id]
    if (!current) {
      ops.push({ kind: 'create', doc: { _id: id, _type: type, ...desired } })
      for (const [f, v] of Object.entries(desired)) ledger[`${id}#${f}`] = stableHash(v)
      return
    }
    const set: Record<string, unknown> = {}
    for (const [f, v] of Object.entries(desired)) {
      const cur = current[f]
      const lk = `${id}#${f}`
      if (equal(cur, v)) { ledger[lk] = stableHash(v); continue }
      const untouched = cur === null || cur === undefined || !(lk in input.ledger) || input.ledger[lk] === stableHash(cur)
      if (untouched) { set[f] = v; ledger[lk] = stableHash(v) }
      else skipped.push({ id, field: f, reason: 'edited-since-import' })
    }
    if (Object.keys(set).length) ops.push({ kind: 'patch', id, set })
  }

  // siteCopy singleton
  const sc = s.siteCopy
  upsert('siteCopy', 'siteCopy', {
    hero: present({ image: image(sc.hero.imageUrl, sc.hero.imageAlt), heading: sc.hero.heading, subheading: sc.hero.subheading }),
    about: {
      heading: sc.about.heading,
      body: toBlocks(sc.about.paragraphs, 'siteCopy.about'),
      themesIntro: sc.about.themesIntro,
      themes: sc.about.themes.map((t) => ({ _type: 'theme', _key: t.key, title: t.title, summary: t.summary })),
    },
    teamIntro: sc.teamIntro,
    alumniSubtitle: sc.alumniSubtitle,
    contactIntro: sc.contactIntro,
  })

  // settings.contact
  upsert(input.settingsId, 'settings', { contact: { ...s.contact } })

  s.news.forEach((n, i) =>
    upsert(`wix-news-${n.key}`, 'newsItem', {
      orderRank: rankAt(i), title: n.title, body: toBlocks(n.paragraphs, `news.${n.key}`),
      summary: n.summary, showOnHome: n.showOnHome, showOnNewsPage: n.showOnNewsPage,
    })
  )

  s.media.forEach((m, i) =>
    upsert(`wix-media-${m.key}`, 'mediaAppearance', {
      orderRank: rankAt(i), title: m.title, outlet: m.outlet, date: m.date, url: m.url,
      video: file(m.videoUrl), poster: image(m.posterUrl),
    })
  )

  for (const p of s.projects) {
    upsert(p.sanityId ?? `wix-project-${p.key}`, 'project', {
      title: p.title, researchOrder: p.researchOrder,
      description: toBlocks(p.paragraphs, `project.${p.key}`),
      coverImage: image(p.imageUrl, p.imageAlt),
      ...(p.sanityId ? {} : { slug: { _type: 'slug', current: p.key } }),
    })
  }

  s.people.forEach((p, i) =>
    upsert(p.sanityId ?? `wix-profile-${p.key}`, 'profile', {
      name: p.name, role: p.role, roleDetail: p.roleDetail,
      roleGroup: ref(roleGroupIds[p.group]), orderRank: rankAt(i),
      image: image(p.imageUrl, p.name),
      ...(p.sanityId ? {} : { hasPage: false }),
    })
  )

  // Publications: create new ones; for matched ones only fill a missing DOI.
  for (const p of s.publications) {
    if (p.sanityId === null) {
      upsert(`wix-publication-${p.key}`, 'publication', {
        title: p.title, author: p.authors, journal: p.journal, date: p.date,
        volume: p.volume, issue: p.issue, pages: p.pages, doi: p.doi,
      })
      continue
    }
    const cur = existing[p.sanityId]
    if (!cur) { reports.push(`publication ${p.sanityId}: matched id not found — skipped`); continue }
    if (p.doi && !cur.doi) upsert(p.sanityId, 'publication', { doi: p.doi })
    if (typeof cur.title === 'string' && cur.title.trim() !== p.title.trim())
      reports.push(`publication ${p.sanityId}: title differs (Sanity "${cur.title}" vs Wix "${p.title}") — not written`)
  }

  return { ops, skipped, reports, ledger }
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run scripts/wix/plan.test.ts`
Expected: PASS. Then `npm test` passes in full.

- [ ] **Step 7: Commit**

```bash
git add scripts/wix/blocks.ts scripts/wix/rank.ts scripts/wix/plan.ts scripts/wix/plan.test.ts
git commit -m "feat(import): pure Wix import planner with never-delete and skip-if-edited rules"
```

### Task B3: Import CLI

**Files:**
- Create: `scripts/import-wix.ts`
- Modify: `package.json` (add `"import:wix": "node scripts/import-wix.ts"` after `create:pi-profile`)

**Interfaces:**
- Consumes: `planImport`, `LEDGER_ID`, `validateSnapshot`, and the `Ledger`/`CurrentDoc` types.
- Produces: the CLI:

  ```
  npm run import:wix -- [--dataset <name>] [--commit] [--backup <path>] [--confirm-production]
  ```

  - With no flags it runs a dry run against `NEXT_PUBLIC_SANITY_DATASET`.
  - `--commit` requires `SANITY_API_WRITE_TOKEN`.
  - Committing to `production` additionally requires `--confirm-production` and a
    `--backup` path that exists.

- [ ] **Step 1: Write `scripts/import-wix.ts`**

`package.json` has no `"type": "module"`, so match `scripts/create-pi-profile.ts`: wrap
everything after the constants below in `async function main() { ... }` and end the file with
`main().catch((e) => { console.error(e); process.exit(1) })`. The code is shown flat for
readability. The dry run **requires** `SANITY_API_READ_TOKEN`: the ledger's dotted id is not
publicly readable, and without it the dry run would misreport skip-if-edited fields as sets.

```ts
// Imports the committed Wix snapshot (data/wix/snapshot.json) into Sanity.
// Spec: docs/superpowers/specs/2026-09-22-wix-lookalike-design.md section 8.
//
// Dry run (default; no writes, no uploads -- image/video fields show as pending):
//   npm run import:wix -- --dataset wix-preview
// Apply:
//   npm run import:wix -- --dataset wix-preview --commit
// Production additionally requires a dataset export taken first, and an explicit flag:
//   npm run import:wix -- --dataset production --commit --backup ./backups/production-<date>.tar.gz --confirm-production
//
// Never deletes. Never blanks a field. Fields edited in Studio since the last
// import are reported and left alone (see scripts/wix/plan.ts).

import { existsSync, readFileSync } from 'node:fs'

import { createClient } from '@sanity/client'

import { apiVersion, projectId } from '../lib/sanity.api.ts'
import { type CurrentDoc, type Ledger, LEDGER_ID, planImport } from './wix/plan.ts'
import { ROLE_GROUP_TITLES, type RoleGroupTitle, validateSnapshot, type WixSnapshot } from './wix/snapshot.ts'

const args = process.argv.slice(2)
const flag = (n: string) => args.includes(n)
const opt = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined }

const dataset = opt('--dataset') ?? process.env.NEXT_PUBLIC_SANITY_DATASET
const commit = flag('--commit')
if (!dataset) throw new Error('Pass --dataset <name> or set NEXT_PUBLIC_SANITY_DATASET.')
if (commit && dataset === 'production') {
  if (!flag('--confirm-production')) throw new Error('Production commit needs --confirm-production (Brett-approved runs only).')
  const backup = opt('--backup')
  if (!backup || !existsSync(backup)) throw new Error('Production commit needs --backup <path to an existing dataset export>.')
}
const token = commit ? process.env.SANITY_API_WRITE_TOKEN : process.env.SANITY_API_READ_TOKEN
if (!token) throw new Error(commit ? 'Set SANITY_API_WRITE_TOKEN to commit.' : 'Set SANITY_API_READ_TOKEN (the ledger is not publicly readable).')

const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false, perspective: 'raw' })

const snapshot = JSON.parse(readFileSync(new URL('../data/wix/snapshot.json', import.meta.url), 'utf8')) as WixSnapshot
const problems = validateSnapshot(snapshot)
if (problems.length) throw new Error(`Snapshot invalid:\n${problems.join('\n')}`)

// Role groups are owned by the migrations session; never created here.
const groups = await client.fetch<{ _id: string; title: string }[]>(`*[_type == "roleGroup" && !(_id in path("drafts.**"))]{_id, title}`)
const roleGroupIds = {} as Record<RoleGroupTitle, string>
for (const t of ROLE_GROUP_TITLES) {
  const g = groups.find((x) => x.title === t)
  if (!g) throw new Error(`Role group "${t}" does not exist in ${dataset}. The migrations must run first.`)
  roleGroupIds[t] = g._id
}

const settingsId = await client.fetch<string | null>(`*[_type == "settings" && !(_id in path("drafts.**"))][0]._id`)
if (!settingsId) throw new Error('No settings document.')

const ids = [
  'siteCopy', settingsId,
  ...snapshot.news.map((n) => `wix-news-${n.key}`),
  ...snapshot.media.map((m) => `wix-media-${m.key}`),
  ...snapshot.projects.map((p) => p.sanityId ?? `wix-project-${p.key}`),
  ...snapshot.people.map((p) => p.sanityId ?? `wix-profile-${p.key}`),
  ...snapshot.publications.map((p) => p.sanityId ?? `wix-publication-${p.key}`),
]
const docs = await client.fetch<CurrentDoc[]>(`*[_id in $ids]`, { ids })
const existing = Object.fromEntries(docs.map((d) => [d._id, d]))
const drafts = await client.fetch<string[]>(`*[_id in $ids]._id`, { ids: ids.map((i) => `drafts.${i}`) })
const ledgerDoc = await client.fetch<{ entries?: Ledger } | null>(`*[_id == $id][0]`, { id: LEDGER_ID })

// Assets: uploaded only on --commit. Sanity dedupes by content hash, so re-runs add nothing.
const urls = [
  snapshot.siteCopy.hero.imageUrl,
  ...snapshot.media.flatMap((m) => [m.videoUrl, m.posterUrl]),
  ...snapshot.projects.map((p) => p.imageUrl),
  ...snapshot.people.map((p) => p.imageUrl),
].filter((u): u is string => Boolean(u))
const assetIds: Record<string, string> = {}
for (const url of urls) {
  if (!commit) { assetIds[url] = `pending:${url.split('/').pop()}`; continue }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`)
  const kind = url.endsWith('.mp4') ? 'file' : 'image'
  const asset = await client.assets.upload(kind, Buffer.from(await res.arrayBuffer()), { filename: url.split('/').pop() })
  assetIds[url] = asset._id
}

const plan = planImport({ snapshot, existing, settingsId, roleGroupIds, assetIds, ledger: ledgerDoc?.entries ?? {} })

console.log(`\nDataset: ${dataset}   Mode: ${commit ? 'COMMIT' : 'dry run'}\n`)
for (const op of plan.ops) {
  if (op.kind === 'create') console.log(`CREATE ${op.doc._type} ${op.doc._id}  ${String(op.doc.title ?? op.doc.name ?? '')}`)
  else console.log(`PATCH  ${op.id}  ${Object.entries(op.set).map(([k, v]) => `${k}=${JSON.stringify(v).slice(0, 80)}`).join('  ')}`)
}
for (const s of plan.skipped) console.log(`SKIP   ${s.id}.${s.field}  (${s.reason})`)
for (const r of plan.reports) console.log(`NOTE   ${r}`)
for (const d of drafts) console.log(`WARN   unpublished draft exists for ${d} — the published document is patched; the draft is left as is`)
const sanityOnly = await client.fetch<{ _type: string; title: string }[]>(
  `*[_type in ["publication","profile"] && !(_id in $ids) && !(_id in path("drafts.**"))]{_type, "title": coalesce(title, name)}`, { ids })
for (const r of sanityOnly) console.log(`KEEP   ${r._type} "${r.title}" is not on Wix — left untouched (spec §9)`)
console.log(`\n${plan.ops.length} ops, ${plan.skipped.length} skipped, ${urls.length} assets`)

if (!commit) { console.log('\nDry run only. Re-run with --commit to apply.'); process.exit(0) }

const tx = client.transaction()
for (const op of plan.ops) {
  if (op.kind === 'create') tx.createIfNotExists(op.doc)
  else tx.patch(op.id, (p) => p.set(op.set))
}
tx.createOrReplace({ _id: LEDGER_ID, _type: 'wixImportLedger', entries: plan.ledger, updatedAt: new Date().toISOString() })
const result = await tx.commit()
console.log(`Committed transaction ${result.transactionId}`)
```

- [ ] **Step 2: Dry-run against production (read-only; no token is needed for reads)**

```bash
npm run import:wix -- --dataset production
```

Expected: it throws `Role group "Research Scientist" does not exist in production. The
migrations must run first.` That is correct while the migrations are still blocked. Record the
output in the PR description.

- [ ] **Step 3: Type-check, lint, test**

Run: `npm run type-check && npm run lint && npm test`
Expected: all clean.

- [ ] **Step 4: Commit and open PR B**

```bash
git add scripts/import-wix.ts package.json
git commit -m "feat(import): Wix import CLI (dry-run default, production guard rails)"
git push -u origin redesign/wix-import
gh pr create --base redesign/wix --title "Wix content import: snapshot, planner, CLI (no data written)" --body "<summary; the four safety rails; dry-run output; spec link>"
```

**Stop.** Send the PR to the command centre. Gate **G1** follows the merge.

### Gate G1: `wix-preview` dataset (controller; Brett's yes required)

Ask, through the command centre: "OK to (1) create dataset `wix-preview` as a copy of
`production`, and (2) run the Wix import against it? This writes nothing to production. The
dataset is deleted at the end (G4)."

On a yes:
- Brett runs `npx sanity dataset copy production wix-preview`, or runs it via his logged-in CLI.
  Copying needs project-admin auth that implementation sessions don't hold.
- Once the migrations have landed in production, `wix-preview` must be **re-copied**, because
  the importer needs the role groups.
- Then run:

```bash
SANITY_API_WRITE_TOKEN=<Brett-provided, session-only> npm run import:wix -- --dataset wix-preview --commit
npm run import:wix -- --dataset wix-preview        # re-run: expect "0 ops, 0 skipped"
```

A zero-op re-run proves idempotence against the real API. Record both outputs.

---

# Part C: Site (PR C into `redesign/wix`)

Setup, done by the controller after PR B merges:

```bash
git switch redesign/wix && git pull
git switch -c redesign/wix-site
```

In `.env.local`, set `NEXT_PUBLIC_SANITY_DATASET=wix-preview`, and keep
`SANITY_API_READ_TOKEN`. If Brett made `wix-preview` private, the read token is what makes it
readable.

### Task C1: Foundation (stylesheet, fonts, layouts, route pruning, noindex, redirects)

**Files:**
- Create: `styles/wix.css`, `app/(site)/layout.tsx` (placeholder chrome, finished in C3), `e2e/wix-routes.spec.ts`
- Replace: `app/layout.tsx`
- Delete: `app/page.tsx`, `app/[slug]/`, `app/people/`, `app/projects/`, `app/publications/`, `app/contact/`, `app/preview/`, `e2e/*.spec.ts` (the redesign's specs target removed routes)
- Modify: `app/robots.ts`, `app/sitemap.ts`, `lib/paths.ts`, `app/api/revalidate/route.ts`, `next.config.mjs`, `app/not-found.tsx`

**Interfaces:**
- Produces:
  - Tailwind utilities `font-playfair`, `font-lato`, `font-raleway`, `font-didot`, `font-menu`,
    `bg-strip`, `bg-menu`, `border-rule`, `text-nav-active`, `bg-hero-panel`.
  - The `.wix-col` class (a 980px column with 16px gutters below 1012px).
  - `app/(site)/layout.tsx`, which renders `{children}` inside `<main id="main">`.

- [ ] **Step 1: Write the failing e2e spec** (`e2e/wix-routes.spec.ts`)

```ts
import { expect, test } from '@playwright/test'

const ROUTES = ['/', '/research', '/news', '/publications', '/team', '/media', '/contact']

for (const path of ROUTES) {
  test(`${path} renders`, async ({ page }) => {
    const res = await page.goto(path)
    expect(res?.status()).toBe(200)
    await expect(page.locator('main#main')).toBeVisible()
  })
}

test('old Wix paths redirect permanently', async ({ request }) => {
  for (const [from, to] of [['/blank-5', '/team'], ['/blank-4', '/contact']]) {
    const res = await request.get(from, { maxRedirects: 0 })
    expect(res.status()).toBe(308)
    expect(res.headers()['location']).toBe(to)
  }
})

test('preview deploy is not indexable', async ({ page, request }) => {
  await page.goto('/')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /')
})

test('redesign routes are gone', async ({ request }) => {
  for (const path of ['/people', '/preview/components']) {
    expect((await request.get(path)).status()).toBe(404)
  }
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx playwright test e2e/wix-routes.spec.ts`
Expected: FAIL, because `/research`, `/news`, `/team` and `/media` return 404 and the
redirects are absent.

- [ ] **Step 3: Write `styles/wix.css`**

```css
@import 'tailwindcss';
/* Tailwind scans markdown in docs/ for class-like strings and emits invalid
   utilities from them (phase-1-decisions.md, final review). */
@source not "../docs";

/* Literal tokens: plain @theme both declares the custom property on :root and
   registers the utility -- the "both halves" rule is satisfied in one place. */
@theme {
  --color-strip: #f7f7f7;
  --color-menu: #bfbfbf;
  --color-rule: rgb(0 0 0 / 0.85);
  --color-nav-active: #191919;
  --color-hero-panel: rgb(0 0 0 / 0.3);
}

/* Fonts reference next/font's runtime variables, so they must be inline. */
@theme inline {
  --font-playfair: var(--wf-playfair), 'Times New Roman', serif;
  --font-lato: var(--wf-lato), Helvetica, Arial, sans-serif;
  --font-raleway: var(--wf-raleway), Helvetica, Arial, sans-serif;
  --font-didot: var(--wf-bodoni), 'Times New Roman', serif;
  --font-menu: var(--wf-montserrat), Helvetica, Arial, sans-serif;
}

:root {
  color-scheme: light;
}

/* Wix's desktop grid is a fixed 980px column. Below 1012px it would scroll
   horizontally; we let it shrink with a 16px gutter instead. */
.wix-col {
  width: 100%;
  max-width: calc(980px + 32px);
  margin-inline: auto;
  padding-inline: 16px;
}
```

- [ ] **Step 4: Replace `app/layout.tsx`**

```tsx
import 'styles/wix.css'

import { PreviewBanner } from 'components/preview/PreviewBanner'
import { sanityFetch, SanityLive } from 'lib/sanity.live'
import { siteNameQuery } from 'lib/wix/queries'
import type { Metadata } from 'next'
import { Bodoni_Moda, Lato, Montserrat, Playfair_Display, Raleway } from 'next/font/google'
import { draftMode } from 'next/headers'
import { stegaClean } from 'next-sanity'
import { VisualEditing } from 'next-sanity/visual-editing'

const playfair = Playfair_Display({ variable: '--wf-playfair', subsets: ['latin'], weight: ['400', '700'], style: ['normal', 'italic'] })
const lato = Lato({ variable: '--wf-lato', subsets: ['latin'], weight: ['300', '700'], style: ['normal', 'italic'] })
const raleway = Raleway({ variable: '--wf-raleway', subsets: ['latin'], weight: ['400'] })
const bodoni = Bodoni_Moda({ variable: '--wf-bodoni', subsets: ['latin'], weight: ['400'], style: ['italic'] })
const montserrat = Montserrat({ variable: '--wf-montserrat', subsets: ['latin'], weight: ['400'] })

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const { data } = await sanityFetch({ query: siteNameQuery, stega: false })
  const siteName = stegaClean((data as string | null) ?? 'Holsinger Lab')
  return {
    title: { default: siteName, template: `%s | ${siteName}` },
    // Preview deploy of a candidate design -- never index it.
    robots: { index: false, follow: false },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled: isDraftMode } = await draftMode()
  return (
    <html lang="en" className={`${playfair.variable} ${lato.variable} ${raleway.variable} ${bodoni.variable} ${montserrat.variable}`}>
      <body className="bg-white text-black">
        {isDraftMode && <PreviewBanner />}
        {children}
        <SanityLive />
        {isDraftMode && <VisualEditing />}
      </body>
    </html>
  )
}
```

`siteNameQuery` is created in C2. For this task, create `lib/wix/queries.ts` containing only:

```ts
import { groq } from 'next-sanity'

export const siteNameQuery = groq`coalesce(*[_type == "settings"][0].siteName, *[_type == "home"][0].title)`
```

- [ ] **Step 5: Create `app/(site)/layout.tsx`** (chrome is added in C3)

```tsx
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <main id="main">{children}</main>
}
```

Also create the seven route files as stubs, each rendering its Wix page heading, so the routes
exist. For example, `app/(site)/research/page.tsx`:

```tsx
export default function Page() {
  return <h1 className="sr-only">Research</h1>
}
```

Create the same stub (with the matching label) for `app/(site)/page.tsx` (Home), `news`,
`publications`, `team`, `media` and `contact`. Each is replaced in C4 to C8.

- [ ] **Step 6: Delete the redesign routes and specs**

```bash
git rm -r app/page.tsx 'app/[slug]' app/people app/projects app/publications app/contact app/preview e2e/*.spec.ts
```

Then open `app/not-found.tsx`. If it imports redesign chrome (`components/shared/Layout` or
navbars), replace its body with:

```tsx
export default function NotFound() {
  return (
    <main id="main" className="wix-col py-[80px] text-center">
      <h1 className="font-playfair text-[40px]/[54px]">Page not found</h1>
    </main>
  )
}
```

- [ ] **Step 7: Robots, redirects, paths, sitemap and revalidate**

`app/robots.ts`:

```ts
import type { MetadataRoute } from 'next'

// Preview deploy of a candidate design: disallow everything.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } }
}
```

`next.config.mjs`: add this to `config`:

```js
  async redirects() {
    // The Wix site's own paths for Team and Contact.
    return [
      { source: '/blank-5', destination: '/team', permanent: true },
      { source: '/blank-4', destination: '/contact', permanent: true },
    ]
  },
```

`lib/paths.ts`: replace the body with the fixed route list, because this site has no CMS
routes:

```ts
export const WIX_ROUTES = ['/', '/research', '/news', '/publications', '/team', '/media', '/contact'] as const

export const getAllPaths = async (): Promise<string[]> => [...WIX_ROUTES]
```

`app/sitemap.ts`: make it return `WIX_ROUTES.map((p) => ({ url: `${siteUrl}${p}` }))` (import
`siteUrl` from `lib/site`).

`app/api/revalidate/route.ts`: replace the `switch` with a single path that revalidates every
Wix route. Every content type feeds at least one page, and there are only seven:

```ts
    const paths = await getAllPaths()
    paths.forEach((path) => revalidatePath(path))
    return NextResponse.json({ success: true, message: `Revalidated ${paths.length} pages (type "${type}").` })
```

Keep the signature check exactly as it is. Delete the now-unused `slug` destructuring.

`app/api/revalidate/route.test.ts` asserts the old per-type messages. Update its expectations
to the new message, keeping the invalid-signature test unchanged.

- [ ] **Step 8: Build, prove the CSS, run e2e**

```bash
npm run type-check && npm run lint && npm test
npm run build
grep -c 'font-playfair\|bg-strip\|--color-rule' .next/static/css/*.css   # expect > 0 once used; now only tokens
npx playwright test e2e/wix-routes.spec.ts
```

Expected: everything is green.
- `type-check` may surface files under `components/pages/**` or `components/global/**` that
  import deleted modules. Delete any component that is now unreferenced (confirm with
  `grep -r "<name>" app components lib`), and its unit tests with it.
- The redesign's shared unit tests in `lib/**` stay.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(wix): foundation — Wix stylesheet and fonts, route pruning, noindex, redirects"
```

### Task C2: Queries, types, and pure helpers

**Files:**
- Modify: `lib/wix/queries.ts`
- Create: `lib/wix/types.ts`, `lib/wix/format.ts`, `lib/wix/format.test.ts`, `lib/wix/team.ts`, `lib/wix/team.test.ts`

**Interfaces:**
- Produces:
  - `format.ts`:
    - `formatCitationLine(p: CitationSource): string`
    - `doiHref(doi: string | null | undefined): string | null`
    - `mailtoHref(email)`, `telHref(phone)`, both `string | null`
    - `formatMediaDate(date: string | null | undefined): string | null`
  - `team.ts`: `groupTeam(profiles: TeamProfile[], labHeadId: string | null): TeamGroups`,
    where `TeamGroups = { current, alumniCards, alumniRows, interns }` and each is a
    `TeamProfile[]`.
  - `queries.ts`: `siteNameQuery`, `homeQuery`, `researchQuery`, `newsQuery`,
    `publicationsQuery`, `teamQuery`, `mediaQuery`, `contactQuery`.
  - `types.ts`: the matching result interfaces below.

- [ ] **Step 1: Write the failing tests**

`lib/wix/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { doiHref, formatCitationLine, formatMediaDate, mailtoHref, telHref } from './format'

describe('formatCitationLine (Wix: "Journal Year; vol(issue):pages.")', () => {
  it('full record', () => {
    expect(formatCitationLine({ journal: 'Biomedicines', date: '2024-01-26', volume: 12, issue: 2, pages: '289' }))
      .toBe('Biomedicines 2024; 12(2):289.')
  })
  it('pages only (preprint)', () => {
    expect(formatCitationLine({ journal: 'bioRxiv', date: '2026-04-19', volume: null, issue: null, pages: '04.19.719519' }))
      .toBe('bioRxiv 2026; 04.19.719519.')
  })
  it('no volume/issue/pages leaves no orphan semicolon (Review Focus 4)', () => {
    expect(formatCitationLine({ journal: 'Cells', date: '2022-12-28', volume: null, issue: null, pages: null })).toBe('Cells 2022.')
  })
  it('strips a trailing full stop from the journal', () => {
    expect(formatCitationLine({ journal: 'Int J Mol Sci.', date: '2023-01-05', volume: 24, issue: 2, pages: '1001' }))
      .toBe('Int J Mol Sci 2023; 24(2):1001.')
  })
  it('nothing at all', () => {
    expect(formatCitationLine({ journal: null, date: null, volume: null, issue: null, pages: null })).toBe('')
  })
})

describe('hrefs are stega-clean and null-safe (Review Focus 5)', () => {
  const stega = '​‌‍⁠' // zero-width chars as stega encodes
  it('doiHref', () => {
    expect(doiHref(`10.3390/x${stega}`)).toBe('https://doi.org/10.3390/x')
    expect(doiHref('https://doi.org/10.1/y')).toBe('https://doi.org/10.1/y')
    expect(doiHref(null)).toBeNull()
  })
  it('mailtoHref / telHref', () => {
    expect(mailtoHref(`a@b.org${stega}`)).toBe('mailto:a@b.org')
    expect(telHref('+612 9351 0876')).toBe('tel:+61293510876')
    expect(mailtoHref('')).toBeNull()
    expect(telHref(undefined)).toBeNull()
  })
})

describe('formatMediaDate', () => {
  it('Wix style "14 Jul 2024"', () => expect(formatMediaDate('2024-07-14')).toBe('14 Jul 2024'))
  it('null', () => expect(formatMediaDate(null)).toBeNull())
})
```

`lib/wix/team.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { groupTeam } from './team'
import type { TeamProfile } from './types'

const p = (id: string, group: string | null, image = true): TeamProfile => ({
  _id: id, name: id, role: 'r', roleDetail: null, group, image: image ? ({ asset: { _ref: 'image-x' } } as never) : null,
})

describe('groupTeam', () => {
  const profiles = [
    p('haochen', 'PhD Candidate'),
    p('pi', 'Research Scientist'),
    p('johnny', 'Research Scientist'),
    p('fritz', 'Study Abroad Student'),
    p('jiyoo', null, false),
    p('quy', 'Lab Alumni'),
    p('aria', 'Lab Alumni', false),
    p('mia', 'International Interns', false),
  ]
  const g = groupTeam(profiles, 'pi')

  it('keeps orderRank order within each group', () => {
    expect(g.current.map((x) => x._id)).toEqual(['haochen', 'johnny', 'fritz', 'jiyoo'])
  })
  it('excludes the lab head (Review Focus 1)', () => {
    expect([...g.current, ...g.alumniCards, ...g.alumniRows, ...g.interns].map((x) => x._id)).not.toContain('pi')
  })
  it('puts unknown or missing groups with current members (Review Focus 2)', () => {
    expect(g.current.map((x) => x._id)).toEqual(expect.arrayContaining(['fritz', 'jiyoo']))
  })
  it('splits alumni by photo', () => {
    expect(g.alumniCards.map((x) => x._id)).toEqual(['quy'])
    expect(g.alumniRows.map((x) => x._id)).toEqual(['aria'])
  })
  it('interns are rows', () => expect(g.interns.map((x) => x._id)).toEqual(['mia']))
  it('no lab head set', () => expect(groupTeam(profiles, null).current[1]._id).toBe('pi'))
})
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run lib/wix`
Expected: FAIL, because the modules are missing.

- [ ] **Step 3: Write `lib/wix/types.ts`**

```ts
import type { PortableTextBlock } from '@portabletext/react'
import type { Image } from 'sanity'

export type AltImage = Image & { alt?: string | null }

export interface ContactDetails { address?: string | null; email?: string | null; phone?: string | null }

export interface HomeData {
  copy: {
    hero?: { image?: AltImage | null; heading?: string | null; subheading?: string | null } | null
    about?: {
      heading?: string | null
      body?: PortableTextBlock[] | null
      themesIntro?: string | null
      themes?: { _key: string; title?: string | null; summary?: string | null }[] | null
    } | null
  } | null
  news: { _id: string; title: string; body?: PortableTextBlock[] | null }[]
  contact: ContactDetails | null
}

export interface ResearchProject { _id: string; title: string; description?: PortableTextBlock[] | null; coverImage?: AltImage | null }

export interface NewsLine { _id: string; title: string; summary?: string | null }

export interface CitationSource {
  journal?: string | null; date?: string | null; volume?: number | null; issue?: number | null; pages?: string | null
}
export interface PublicationEntry extends CitationSource { _id: string; title: string; author?: string | null; doi?: string | null; url?: string | null }

export interface TeamProfile {
  _id: string; name: string; role?: string | null; roleDetail?: string | null; group: string | null; image?: AltImage | null
}
export interface TeamData { intro: string | null; alumniSubtitle: string | null; labHeadId: string | null; profiles: TeamProfile[] }

export interface MediaItem {
  _id: string; title: string; outlet: string; date?: string | null; url?: string | null; videoUrl?: string | null; poster?: AltImage | null
}

export interface ContactData { intro: string | null; contact: ContactDetails | null }
```

- [ ] **Step 4: Write `lib/wix/format.ts`**

```ts
import { stegaClean } from 'next-sanity'

import type { CitationSource } from './types'

const clean = (v: string | null | undefined) => (v ? stegaClean(v).trim() : '')

export function formatCitationLine(p: CitationSource): string {
  const journal = clean(p.journal).replace(/\.$/, '')
  const year = p.date ? p.date.slice(0, 4) : ''
  const head = [journal, year].filter(Boolean).join(' ')
  let tail = p.volume != null ? String(p.volume) : ''
  if (p.issue != null) tail += `(${p.issue})`
  const pages = clean(p.pages)
  if (pages) tail += tail ? `:${pages}` : pages
  if (!head && !tail) return ''
  return tail ? `${head}; ${tail}.` : `${head}.`
}

export function doiHref(doi: string | null | undefined): string | null {
  const d = clean(doi).replace(/[​-‍⁠﻿]/g, '')
  if (!d) return null
  return /^https?:\/\//.test(d) ? d : `https://doi.org/${d}`
}

export function mailtoHref(email: string | null | undefined): string | null {
  const e = clean(email).replace(/[​-‍⁠﻿]/g, '')
  return e ? `mailto:${e}` : null
}

export function telHref(phone: string | null | undefined): string | null {
  const t = clean(phone).replace(/[^\d+]/g, '')
  return t ? `tel:${t}` : null
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function formatMediaDate(date: string | null | undefined): string | null {
  if (!date) return null
  const [y, m, d] = date.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}
```

(`stegaClean` removes stega's encoded payload. The explicit zero-width strip is a
belt-and-braces measure for hrefs, and the test pins it.)

- [ ] **Step 5: Write `lib/wix/team.ts`**

```ts
import type { TeamProfile } from './types'

export interface TeamGroups { current: TeamProfile[]; alumniCards: TeamProfile[]; alumniRows: TeamProfile[]; interns: TeamProfile[] }

/** Wix's Team page: one grid of current members (any group but the two below,
 *  including none), then Lab Alumni split into photo cards and name rows, then
 *  International Interns as rows. Input is already in orderRank order. The lab
 *  head is not on Wix's Team page. */
export function groupTeam(profiles: TeamProfile[], labHeadId: string | null): TeamGroups {
  const out: TeamGroups = { current: [], alumniCards: [], alumniRows: [], interns: [] }
  for (const p of profiles) {
    if (labHeadId && p._id === labHeadId) continue
    if (p.group === 'Lab Alumni') (p.image?.asset ? out.alumniCards : out.alumniRows).push(p)
    else if (p.group === 'International Interns') out.interns.push(p)
    else out.current.push(p)
  }
  return out
}
```

- [ ] **Step 6: Write the full `lib/wix/queries.ts`**

```ts
import { groq } from 'next-sanity'

export const siteNameQuery = groq`coalesce(*[_type == "settings"][0].siteName, *[_type == "home"][0].title)`

export const homeQuery = groq`{
  "copy": *[_type == "siteCopy"][0]{ hero, about },
  "news": *[_type == "newsItem" && showOnHome != false] | order(orderRank) { _id, title, body },
  "contact": *[_type == "settings"][0].contact
}`

export const researchQuery = groq`*[_type == "project" && defined(researchOrder)] | order(researchOrder asc) {
  _id, title, description, coverImage
}`

export const newsQuery = groq`*[_type == "newsItem" && showOnNewsPage != false] | order(orderRank) { _id, title, summary }`

export const publicationsQuery = groq`*[_type == "publication"] | order(date desc) {
  _id, title, author, journal, volume, issue, pages, date, doi, url
}`

export const teamQuery = groq`{
  "intro": *[_type == "siteCopy"][0].teamIntro,
  "alumniSubtitle": *[_type == "siteCopy"][0].alumniSubtitle,
  "labHeadId": *[_type == "settings"][0].labHead._ref,
  "profiles": *[_type == "profile"] | order(orderRank) { _id, name, role, roleDetail, image, "group": roleGroup->title }
}`

export const mediaQuery = groq`*[_type == "mediaAppearance"] | order(orderRank) {
  _id, title, outlet, date, url, "videoUrl": video.asset->url, poster
}`

export const contactQuery = groq`{
  "intro": *[_type == "siteCopy"][0].contactIntro,
  "contact": *[_type == "settings"][0].contact
}`
```

- [ ] **Step 7: Run the tests, then commit**

Run: `npx vitest run lib/wix && npm run type-check`
Expected: PASS.

```bash
git add lib/wix
git commit -m "feat(wix): queries, result types, citation/href/team helpers"
```

### Task C3: Site chrome (`SiteHeader`, `MobileMenu`, `SiteFooter`)

**Files:**
- Create: `components/wix/nav.ts`, `components/wix/SiteHeader.tsx`, `components/wix/NavLinks.tsx` (client), `components/wix/MobileMenu.tsx` (client), `components/wix/SiteFooter.tsx`, `e2e/wix-chrome.spec.ts`
- Modify: `app/(site)/layout.tsx`

**Interfaces:**
- Consumes: `siteNameQuery`, `sanityFetch`.
- Produces: `NAV: readonly { label: string; href: string }[]`, plus `<SiteHeader />` and
  `<SiteFooter />`, both async server components with no props.

Appendix A values, desktop:
- The title is Playfair 32/43.2, centred, about 40px from the top.
- The rule is 1px `rgba(0,0,0,.85)`, 940px wide, 27px below the title's line box.
- The nav is Raleway 14/25.06, centred, with about 16px horizontal padding per item. It sits
  6px under the rule, and the header ends 15px below it.

Mobile values:
- The title is Playfair 19/25.65, left-aligned, 20px inset, with the hamburger on the right.
- The menu is full-screen `#bfbfbf`, with a close × at top right.
- Items are Montserrat 16/22.4 with about 0.1em tracking, 42px rows, and dividers about 180px
  wide.

- [ ] **Step 1: Write the failing e2e spec** (`e2e/wix-chrome.spec.ts`)

```ts
import { expect, test } from '@playwright/test'

const css = (page: import('@playwright/test').Page, sel: string, prop: string) =>
  page.locator(sel).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)

test.describe('desktop 1280', () => {
  test.use({ viewport: { width: 1280, height: 900 } })
  test('header matches Wix tokens', async ({ page }) => {
    await page.goto('/')
    expect(await css(page, '[data-wix="site-title"]', 'font-family')).toContain('Playfair')
    expect(await css(page, '[data-wix="site-title"]', 'font-size')).toBe('32px')
    expect(await css(page, '[data-wix="nav"] a', 'font-family')).toContain('Raleway')
    expect(await css(page, '[data-wix="nav"] a', 'font-size')).toBe('14px')
    expect(await css(page, '[data-wix="rule"]', 'border-top-color')).toBe('rgba(0, 0, 0, 0.85)')
    await expect(page.locator('[data-wix="nav"] a')).toHaveText(['Home', 'Research', 'News', 'Publications', 'Team', 'Media', 'Contact'])
    await expect(page.locator('[data-wix="nav"] a[aria-current="page"]')).toHaveText('Home')
  })
  test('footer', async ({ page }) => {
    await page.goto('/news')
    await expect(page.locator('footer')).toHaveText('©2026 by Damian Holsinger')
    expect(await css(page, 'footer p', 'font-size')).toBe('14px')
  })
})

test.describe('mobile 390', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('menu opens, is modal, navigates, closes', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-wix="nav"]')).toBeHidden()
    expect(await css(page, '[data-wix="site-title-mobile"]', 'font-size')).toBe('19px')
    await page.getByRole('button', { name: 'Open menu' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    expect(await dialog.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(191, 191, 191)')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await page.getByRole('button', { name: 'Open menu' }).click()
    await dialog.getByRole('link', { name: 'Team' }).click()
    await expect(page).toHaveURL(/\/team$/)
    await expect(dialog).toBeHidden()
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx playwright test e2e/wix-chrome.spec.ts`
Expected: FAIL, because `[data-wix="site-title"]` is not found.

- [ ] **Step 3: Write the components**

`components/wix/nav.ts`:

```ts
export const NAV = [
  { label: 'Home', href: '/' },
  { label: 'Research', href: '/research' },
  { label: 'News', href: '/news' },
  { label: 'Publications', href: '/publications' },
  { label: 'Team', href: '/team' },
  { label: 'Media', href: '/media' },
  { label: 'Contact', href: '/contact' },
] as const
```

`components/wix/NavLinks.tsx`:

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { NAV } from './nav'

export function NavLinks() {
  const pathname = usePathname()
  return (
    <nav data-wix="nav" aria-label="Main" className="mt-[6px] flex justify-center">
      {NAV.map(({ label, href }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`px-[16px] font-raleway text-[14px]/[25.06px] ${active ? 'text-nav-active' : 'text-black'} hover:opacity-70`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
```

`components/wix/MobileMenu.tsx` uses Headless UI `Dialog`, following the pattern in
`components/global/Navbar/MobileNavBar.tsx`: a focus trap, Escape to close, closing on
navigation, and closing on resize to `md` or wider. Read that file's comments on the Phase 2C
tap-overlay before changing this pattern.

```tsx
'use client'
import { Dialog, DialogPanel } from '@headlessui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { NAV } from './nav'

export function MobileMenu() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    const onResize = () => window.innerWidth >= 768 && setOpen(false)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="flex size-[44px] flex-col items-center justify-center gap-[5px]"
      >
        <span className="h-[3px] w-[26px] bg-black" />
        <span className="h-[3px] w-[26px] bg-black" />
        <span className="h-[3px] w-[26px] bg-black" />
      </button>
      <Dialog open={open} onClose={setOpen} className="relative z-50 md:hidden">
        <DialogPanel className="fixed inset-0 overflow-y-auto bg-menu">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute right-[20px] top-[40px] flex size-[44px] items-center justify-center text-[28px] leading-none"
          >
            ×
          </button>
          <ul className="mx-auto mt-[110px] w-[180px]">
            {NAV.map(({ label, href }, i) => (
              <li key={href} className={i < NAV.length - 1 ? 'border-b border-black/60' : ''}>
                <Link
                  href={href}
                  aria-current={pathname === href ? 'page' : undefined}
                  className={`flex h-[42px] items-center justify-center font-menu text-[16px]/[22.4px] tracking-[0.1em] ${pathname === href ? 'text-black/60' : 'text-black'}`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </DialogPanel>
      </Dialog>
    </>
  )
}
```

`components/wix/SiteHeader.tsx`:

```tsx
import { sanityFetch } from 'lib/sanity.live'
import { siteNameQuery } from 'lib/wix/queries'
import Link from 'next/link'

import { MobileMenu } from './MobileMenu'
import { NavLinks } from './NavLinks'

export async function SiteHeader() {
  const { data } = await sanityFetch({ query: siteNameQuery })
  const siteName = (data as string | null) ?? ''
  return (
    <header>
      <div className="hidden md:block">
        <div className="wix-col pt-[40px] pb-[15px]">
          <p data-wix="site-title" className="text-center font-playfair text-[32px]/[43.2px]">
            <Link href="/">{siteName}</Link>
          </p>
          <hr data-wix="rule" className="mx-auto mt-[27px] max-w-[940px] border-0 border-t border-rule" />
          <NavLinks />
        </div>
      </div>
      <div className="flex items-start justify-between px-[20px] pt-[40px] pb-[24px] md:hidden">
        <p data-wix="site-title-mobile" className="max-w-[260px] font-playfair text-[19px]/[25.65px]">
          <Link href="/">{siteName}</Link>
        </p>
        <MobileMenu />
      </div>
    </header>
  )
}
```

`components/wix/SiteFooter.tsx`:

```tsx
export function SiteFooter() {
  return (
    <footer className="py-[10px] text-center">
      <p className="font-raleway text-[12px]/[21.48px] md:text-[14px]/[25.06px]">©2026 by Damian Holsinger</p>
    </footer>
  )
}
```

`app/(site)/layout.tsx`:

```tsx
import { SiteFooter } from 'components/wix/SiteFooter'
import { SiteHeader } from 'components/wix/SiteHeader'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  )
}
```

- [ ] **Step 4: Build, prove the CSS, run e2e**

```bash
npm run build
for c in 'font-playfair' 'font-raleway' 'font-menu' 'bg-menu' 'border-rule' 'text-nav-active' 'tracking-\\[0\\.1em\\]' 'text-\\[32px\\]'; do printf '%s: ' "$c"; cat .next/static/css/*.css | grep -c "$c"; done
npx playwright test e2e/wix-chrome.spec.ts e2e/wix-routes.spec.ts
```

Expected: every grep count is at least 1, and every spec passes.

- [ ] **Step 5: Commit**

```bash
git add components/wix app/'(site)'/layout.tsx e2e/wix-chrome.spec.ts
git commit -m "feat(wix): site header, mobile menu and footer"
```

### Task C4: Home

**Files:**
- Create: `components/wix/Hero.tsx`, `components/wix/AboutThemes.tsx`, `components/wix/NewsHighlights.tsx`, `components/wix/ContactBlock.tsx`, `components/wix/InlineText.tsx`, `e2e/wix-home.spec.ts`
- Replace: `app/(site)/page.tsx`

**Interfaces:**
- Consumes: `homeQuery`, `HomeData`, `mailtoHref`, `telHref`, `urlForImage`.
- Produces:
  - `<InlineText value={PortableTextBlock[]} className? />`: portable text rendered as `<p>`s,
    with em, strong and links. Reused in C5.
  - `<ContactBlock contact={ContactDetails | null} />`: reused in C8.

Appendix A values:
- The hero is full-bleed, 429px tall on desktop and 410px on mobile, with an `object-cover`
  image. The caption panel starts at the column's left edge minus 7px and 221px from the
  hero's top, runs to the viewport's right edge, and is 180px tall.
- The heading is Playfair 700 36/63 (23/40.25 on mobile) in white. The subheading is Playfair
  italic 32/56 (22/38.5 on mobile).
- On mobile there is no panel; the text sits over the image, 10px inset.
- The About section starts 99px below the hero. Its heading is Playfair 30/48 (21/33.6 on
  mobile), and its body Lato 300 20/32 (15/24 on mobile).
- Themes: the title is Playfair 700 20/32 (15/24 on mobile), and the summary is Lato 300 and
  starts with "- ", which is stored in the copy.
- News & Highlights: the heading is Playfair 30/40.5 (31/41.85 on mobile), about 100px below
  the themes. Each headline is Playfair 700 22/31.5 (18 on mobile), and each body Lato 300
  20/28.2 (17/24 on mobile), with about 45px between items.
- CONTACT US is Playfair 40/54 (28/37.8 on mobile), centred, and the lines are Raleway 15/28.1,
  centred.

- [ ] **Step 1: Write the failing e2e spec** (`e2e/wix-home.spec.ts`)

```ts
import { expect, test } from '@playwright/test'

const css = (page: import('@playwright/test').Page, sel: string, prop: string) =>
  page.locator(sel).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)

for (const [w, h1, body] of [[1280, '36px', '20px'], [390, '23px', '15px']] as const) {
  test.describe(`home at ${w}`, () => {
    test.use({ viewport: { width: w, height: 900 } })
    test('blocks, order and tokens', async ({ page }) => {
      await page.goto('/')
      const order = await page.locator('[data-wix-block]').evaluateAll((els) => els.map((e) => e.getAttribute('data-wix-block')))
      expect(order).toEqual(['hero', 'about', 'news', 'contact'])
      expect(await css(page, '[data-wix="hero-heading"]', 'font-size')).toBe(h1)
      expect(await css(page, '[data-wix="hero-heading"]', 'color')).toBe('rgb(255, 255, 255)')
      expect(await css(page, '[data-wix="about-body"] p', 'font-size')).toBe(body)
      expect(await css(page, '[data-wix="about-body"] p', 'font-weight')).toBe('300')
      await expect(page.locator('[data-wix="news-item"]')).toHaveCount(4)
      await expect(page.getByRole('heading', { name: 'CONTACT US' })).toBeVisible()
      const mail = page.locator('[data-wix-block="contact"] a[href^="mailto:"]')
      await expect(mail).toHaveAttribute('href', 'mailto:damian.holsinger@sydney.edu.au')
    })
  })
}
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx playwright test e2e/wix-home.spec.ts`
Expected: FAIL (the blocks are missing).

- [ ] **Step 3: Write the components**

`components/wix/InlineText.tsx`:

```tsx
import { PortableText, type PortableTextBlock, type PortableTextComponents } from '@portabletext/react'
import { stegaClean } from 'next-sanity'

const components: PortableTextComponents = {
  block: { normal: ({ children }) => <p>{children}</p> },
  marks: {
    link: ({ children, value }) => (
      <a href={stegaClean(value?.href) ?? '#'} className="underline" target="_blank" rel="noreferrer">{children}</a>
    ),
  },
}

export function InlineText({ value, className, ...rest }: { value?: PortableTextBlock[] | null; className?: string; 'data-wix'?: string }) {
  if (!value?.length) return null
  return <div className={className} {...rest}><PortableText value={value} components={components} /></div>
}
```

`components/wix/Hero.tsx`:

```tsx
import { urlForImage } from 'lib/sanity.image'
import type { HomeData } from 'lib/wix/types'
import { stegaClean } from 'next-sanity'
import Image from 'next/image'

export function Hero({ hero }: { hero: NonNullable<HomeData['copy']>['hero'] }) {
  const src = hero?.image ? urlForImage(hero.image)?.width(2560).url() : undefined
  return (
    <section data-wix-block="hero" className="relative h-[410px] overflow-hidden bg-black md:h-[429px]">
      {src ? (
        <Image src={src} alt={stegaClean(hero?.image?.alt) ?? ''} fill priority sizes="100vw" className="object-cover" />
      ) : null}
      <div className="absolute inset-x-0 top-[10px] px-[10px] md:top-[221px] md:left-[max(0px,calc(50%_-_497px))] md:right-0 md:h-[180px] md:rounded-[5px] md:bg-hero-panel md:px-[7px] md:shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
        {hero?.heading ? (
          <h1 data-wix="hero-heading" className="font-playfair text-[23px]/[40.25px] font-bold text-white md:text-[36px]/[63px]">{hero.heading}</h1>
        ) : null}
        {hero?.subheading ? (
          <p className="font-playfair text-[22px]/[38.5px] italic text-white md:text-[32px]/[56px]">{hero.subheading}</p>
        ) : null}
      </div>
    </section>
  )
}
```

`components/wix/AboutThemes.tsx`:

```tsx
import type { HomeData } from 'lib/wix/types'

import { InlineText } from './InlineText'

export function AboutThemes({ about }: { about: NonNullable<HomeData['copy']>['about'] }) {
  if (!about) return null
  return (
    <section data-wix-block="about" className="wix-col pt-[40px] md:pt-[99px]">
      {about.heading ? <h2 className="font-playfair text-[21px]/[33.6px] md:text-[30px]/[48px]">{about.heading}</h2> : null}
      <InlineText data-wix="about-body" value={about.body} className="font-lato text-[15px]/[24px] font-light md:text-[20px]/[32px]" />
      {about.themesIntro ? <p className="mt-[16px] font-lato text-[15px]/[24px] font-light md:text-[20px]/[32px]">{about.themesIntro}</p> : null}
      {about.themes?.length ? (
        <ul className="mt-[30px] space-y-[36px] md:mt-[31px]">
          {about.themes.map((t) => (
            <li key={t._key}>
              <h3 className="font-playfair text-[15px]/[24px] font-bold md:text-[20px]/[32px]">{t.title}</h3>
              <p className="font-lato text-[15px]/[24px] font-light md:text-[20px]/[32px]">{t.summary}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
```

`components/wix/NewsHighlights.tsx`:

```tsx
import type { HomeData } from 'lib/wix/types'

import { InlineText } from './InlineText'

export function NewsHighlights({ news }: { news: HomeData['news'] }) {
  if (!news.length) return null
  return (
    <section data-wix-block="news" className="wix-col pt-[60px] md:pt-[100px]">
      <h2 className="font-playfair text-[31px]/[41.85px] md:text-[30px]/[40.5px]">News &amp; Highlights</h2>
      <ul className="mt-[20px] space-y-[40px] md:space-y-[45px]">
        {news.map((n) => (
          <li key={n._id} data-wix="news-item">
            <h3 className="font-playfair text-[18px]/[26.25px] font-bold md:text-[22px]/[31.5px]">{n.title}</h3>
            <InlineText value={n.body} className="mt-[16px] font-lato text-[17px]/[24px] font-light md:text-[20px]/[28.2px]" />
          </li>
        ))}
      </ul>
    </section>
  )
}
```

`components/wix/ContactBlock.tsx`:

```tsx
import { mailtoHref, telHref } from 'lib/wix/format'
import type { ContactDetails } from 'lib/wix/types'

export function ContactBlock({ contact }: { contact: ContactDetails | null }) {
  const mail = mailtoHref(contact?.email)
  const tel = telHref(contact?.phone)
  return (
    <section data-wix-block="contact" className="wix-col pt-[60px] pb-[40px] text-center md:pt-[65px]">
      <h2 className="font-playfair text-[28px]/[37.8px] md:text-[40px]/[54px]">CONTACT US</h2>
      <div className="mt-[20px] space-y-[20px] font-raleway text-[15px]/[28.1px]">
        {contact?.address ? <p>{contact.address}</p> : null}
        {mail ? <p><a href={mail}>{contact?.email}</a></p> : null}
        {tel ? <p><a href={tel}>{contact?.phone}</a></p> : null}
      </div>
    </section>
  )
}
```

`app/(site)/page.tsx`:

```tsx
import { AboutThemes } from 'components/wix/AboutThemes'
import { ContactBlock } from 'components/wix/ContactBlock'
import { Hero } from 'components/wix/Hero'
import { NewsHighlights } from 'components/wix/NewsHighlights'
import { sanityFetch } from 'lib/sanity.live'
import { homeQuery } from 'lib/wix/queries'
import type { HomeData } from 'lib/wix/types'

export const revalidate = 60

export default async function Home() {
  const { data } = await sanityFetch({ query: homeQuery })
  const home = (data as HomeData | null) ?? { copy: null, news: [], contact: null }
  return (
    <>
      <Hero hero={home.copy?.hero ?? null} />
      <AboutThemes about={home.copy?.about ?? null} />
      <NewsHighlights news={home.news ?? []} />
      <ContactBlock contact={home.contact} />
    </>
  )
}
```

- [ ] **Step 4: Build, prove the CSS, run e2e, compare visually**

```bash
npm run build
for c in 'bg-hero-panel' 'font-lato' 'text-\\[36px\\]' 'md\\:text-\\[20px\\]'; do printf '%s: ' "$c"; cat .next/static/css/*.css | grep -c "$c"; done
npx playwright test e2e/wix-home.spec.ts
```

Then run `npm run start`. Screenshot `/` at 1280 and 390 in the browser pane, next to the Wix
Home page at the same widths. Fix any block whose position is off by more than about 10px from
Appendix A.

- [ ] **Step 5: Commit**

```bash
git add components/wix app/'(site)'/page.tsx e2e/wix-home.spec.ts
git commit -m "feat(wix): home page"
```

### Task C5: Research and News

**Files:**
- Create: `components/wix/PageStrip.tsx`, `components/wix/ResearchProject.tsx`, `e2e/wix-research-news.spec.ts`
- Replace: `app/(site)/research/page.tsx`, `app/(site)/news/page.tsx`

**Interfaces:**
- Consumes: `researchQuery`, `newsQuery`, `InlineText`, `urlForImage`.
- Produces: `<PageStrip heading={string} headingClass?={string}>{children}</PageStrip>`, a
  `#f7f7f7` strip with a 980px column and a page heading. It is reused by Publications and
  Contact (C6 and C8).

Appendix A values:
- The strip starts 20px under the header, and its heading sits 102px down the strip.
  RESEARCH PROJECTS and Latest news are Playfair 35/47.25.
- A project title is Lato 700 22/31 and its body Lato 300 20/31, starting 34px under the
  title. The figure is centred at its natural width, capped at 708px, with about 40px above
  and below.
- News lines are Lato 300 22/31, with about 96px between the starts of consecutive lines.
- Mobile values are about 70% of desktop: the heading is 26px, titles 18px, body 15/24.

- [ ] **Step 1: Write the failing spec** (`e2e/wix-research-news.spec.ts`)

```ts
import { expect, test } from '@playwright/test'

const css = (page: import('@playwright/test').Page, sel: string, prop: string) =>
  page.locator(sel).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)

test.use({ viewport: { width: 1280, height: 900 } })

test('research', async ({ page }) => {
  await page.goto('/research')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('RESEARCH PROJECTS')
  expect(await css(page, '[data-wix="strip"]', 'background-color')).toBe('rgb(247, 247, 247)')
  const titles = page.locator('[data-wix="project-title"]')
  await expect(titles).toHaveCount(4)
  await expect(titles.first()).toHaveText("Fecal microbiota transplantation as a treatment for Alzheimer's disease")
  expect(await css(page, '[data-wix="project-title"]', 'font-weight')).toBe('700')
  expect(await css(page, '[data-wix="project-title"]', 'font-size')).toBe('22px')
})

test('research project without an image renders without an empty figure (Review Focus 4)', async ({ page }) => {
  await page.goto('/research')
  const n = await page.locator('[data-wix="project"]').evaluateAll((els) =>
    els.filter((e) => e.querySelector('figure') && !e.querySelector('figure img')).length)
  expect(n).toBe(0)
})

test('news', async ({ page }) => {
  await page.goto('/news')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Latest news')
  await expect(page.locator('[data-wix="news-line"]')).toHaveCount(3)
  expect(await css(page, '[data-wix="news-line"]', 'font-size')).toBe('22px')
})
```

- [ ] **Step 2: Run it and confirm it fails.** Run: `npx playwright test e2e/wix-research-news.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Write the components and pages**

`components/wix/PageStrip.tsx`:

```tsx
export function PageStrip({ heading, headingClass = 'text-[26px]/[35px] md:text-[35px]/[47.25px]', children }: {
  heading: string; headingClass?: string; children: React.ReactNode
}) {
  return (
    <section data-wix="strip" className="mt-[20px] bg-strip pb-[80px]">
      <div className="wix-col pt-[50px] md:pt-[102px]">
        <h1 className={`font-playfair ${headingClass}`}>{heading}</h1>
        {children}
      </div>
    </section>
  )
}
```

`components/wix/ResearchProject.tsx`:

```tsx
import { urlForImage } from 'lib/sanity.image'
import type { ResearchProject as P } from 'lib/wix/types'
import { stegaClean } from 'next-sanity'
import Image from 'next/image'

import { InlineText } from './InlineText'

export function ResearchProject({ project }: { project: P }) {
  const img = project.coverImage
  const src = img ? urlForImage(img)?.width(1416).url() : undefined
  const dims = img?.asset?._ref?.match(/-(\d+)x(\d+)-/)
  return (
    <article data-wix="project" className="mt-[50px] md:mt-[66px]">
      <h2 data-wix="project-title" className="font-lato text-[18px]/[26px] font-bold md:text-[22px]/[31px]">{project.title}</h2>
      <InlineText value={project.description} className="mt-[8px] font-lato text-[15px]/[24px] font-light md:mt-[3px] md:text-[20px]/[31px]" />
      {src && dims ? (
        <figure className="mx-auto mt-[40px] w-fit max-w-full">
          <Image
            src={src}
            alt={stegaClean(img?.alt) ?? ''}
            width={Number(dims[1])}
            height={Number(dims[2])}
            sizes="(min-width: 768px) 708px, 100vw"
            className="h-auto max-w-full md:max-w-[708px]"
          />
        </figure>
      ) : null}
    </article>
  )
}
```

(Width and height come from the asset id `image-<hash>-<w>x<h>-<ext>`, so the image keeps its
real aspect ratio. This follows the repo's recorded aspect-ratio lesson.)

`app/(site)/research/page.tsx`:

```tsx
import { PageStrip } from 'components/wix/PageStrip'
import { ResearchProject } from 'components/wix/ResearchProject'
import { sanityFetch } from 'lib/sanity.live'
import { researchQuery } from 'lib/wix/queries'
import type { ResearchProject as P } from 'lib/wix/types'

export const revalidate = 60
export const metadata = { title: 'Research' }

export default async function Research() {
  const { data } = await sanityFetch({ query: researchQuery })
  const projects = (data as P[] | null) ?? []
  return (
    <PageStrip heading="RESEARCH PROJECTS">
      {projects.map((p) => <ResearchProject key={p._id} project={p} />)}
    </PageStrip>
  )
}
```

`app/(site)/news/page.tsx`:

```tsx
import { PageStrip } from 'components/wix/PageStrip'
import { sanityFetch } from 'lib/sanity.live'
import { newsQuery } from 'lib/wix/queries'
import type { NewsLine } from 'lib/wix/types'

export const revalidate = 60
export const metadata = { title: 'News' }

export default async function News() {
  const { data } = await sanityFetch({ query: newsQuery })
  const items = (data as NewsLine[] | null) ?? []
  return (
    <PageStrip heading="Latest news">
      <ul className="mt-[40px] space-y-[40px] md:mt-[80px] md:space-y-[65px]">
        {items.map((n) => (
          <li key={n._id} data-wix="news-line" className="font-lato text-[17px]/[24px] font-light md:text-[22px]/[31px]">
            {n.summary || n.title}
          </li>
        ))}
      </ul>
    </PageStrip>
  )
}
```

- [ ] **Step 4: Build, prove the CSS, run e2e, and compare against Wix** at 1280 and 390, as in C4 Step 4.

- [ ] **Step 5: Commit**

```bash
git add components/wix app/'(site)'/research app/'(site)'/news e2e/wix-research-news.spec.ts
git commit -m "feat(wix): research and news pages"
```

### Task C6: Publications

**Files:**
- Create: `components/wix/PublicationEntry.tsx`, `e2e/wix-publications.spec.ts`
- Replace: `app/(site)/publications/page.tsx`

**Interfaces:**
- Consumes: `publicationsQuery`, `PublicationEntry` (type), `formatCitationLine`, `doiHref`,
  `PageStrip`.

Appendix A values:
- PUBLICATIONS is Playfair 40/54.
- Entry title: Playfair 20/31.
- Authors: Playfair 16/31.
- Citation line: Bodoni italic 16/28.
- DOI line: "doi: " followed by a black link with no underline, Bodoni italic 16/28.
- Entries are about 160px apart, with the first entry 130px below the heading.
- With no DOI, fall back to `url` with the link text "link". With neither, render no DOI line.

- [ ] **Step 1: Write the failing spec** (`e2e/wix-publications.spec.ts`)

```ts
import { expect, test } from '@playwright/test'

const css = (page: import('@playwright/test').Page, sel: string, prop: string) =>
  page.locator(sel).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)

test.use({ viewport: { width: 1280, height: 900 } })

test('publications list', async ({ page }) => {
  await page.goto('/publications')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('PUBLICATIONS')
  const entries = page.locator('[data-wix="publication"]')
  expect(await entries.count()).toBeGreaterThanOrEqual(21) // 19 existing + 2 imported
  await expect(entries.first().locator('[data-wix="pub-title"]')).toContainText('Bdnf mRNA')
  expect(await css(page, '[data-wix="pub-citation"]', 'font-style')).toBe('italic')
  expect(await css(page, '[data-wix="pub-citation"]', 'font-family')).toContain('Bodoni')
  const doi = entries.first().locator('a[href^="https://doi.org/"]')
  await expect(doi).toHaveAttribute('href', 'https://doi.org/10.64898/2026.04.19.719519')
  expect(await doi.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('none')
})

test('no orphan punctuation in citation lines (Review Focus 4)', async ({ page }) => {
  await page.goto('/publications')
  const lines = await page.locator('[data-wix="pub-citation"]').allTextContents()
  for (const l of lines) expect(l).not.toMatch(/;\s*\.|^\s*[;.]|\(\)/)
})
```

- [ ] **Step 2: Run it and confirm it fails.** Expected: FAIL.

- [ ] **Step 3: Write the component and the page**

`components/wix/PublicationEntry.tsx`:

```tsx
import { doiHref, formatCitationLine } from 'lib/wix/format'
import type { PublicationEntry as P } from 'lib/wix/types'
import { stegaClean } from 'next-sanity'

export function PublicationEntry({ pub }: { pub: P }) {
  const citation = formatCitationLine(pub)
  const doi = doiHref(pub.doi)
  const url = !doi && pub.url ? stegaClean(pub.url) : null
  return (
    <li data-wix="publication" className="mt-[50px] first:mt-[60px] md:first:mt-[130px]">
      <h2 data-wix="pub-title" className="font-playfair text-[17px]/[26px] md:text-[20px]/[31px]">{pub.title.trim()}</h2>
      {pub.author ? <p className="mt-[5px] font-playfair text-[14px]/[24px] md:text-[16px]/[31px]">{pub.author}</p> : null}
      {citation ? <p data-wix="pub-citation" className="font-didot text-[14px]/[24px] italic md:text-[16px]/[28px]">{citation}</p> : null}
      {doi ? (
        <p className="font-didot text-[14px]/[24px] italic md:text-[16px]/[28px]">
          doi: <a href={doi} className="no-underline">{stegaClean(pub.doi)?.replace(/^https?:\/\/doi\.org\//, '')}</a>
        </p>
      ) : url ? (
        <p className="font-didot text-[14px]/[24px] italic md:text-[16px]/[28px]"><a href={url} className="no-underline">link</a></p>
      ) : null}
    </li>
  )
}
```

`app/(site)/publications/page.tsx`:

```tsx
import { PageStrip } from 'components/wix/PageStrip'
import { PublicationEntry } from 'components/wix/PublicationEntry'
import { sanityFetch } from 'lib/sanity.live'
import { publicationsQuery } from 'lib/wix/queries'
import type { PublicationEntry as P } from 'lib/wix/types'

export const revalidate = 60
export const metadata = { title: 'Publications' }

export default async function Publications() {
  const { data } = await sanityFetch({ query: publicationsQuery })
  const pubs = (data as P[] | null) ?? []
  return (
    <PageStrip heading="PUBLICATIONS" headingClass="text-[28px]/[37.8px] md:text-[40px]/[54px]">
      <ul>{pubs.map((p) => <PublicationEntry key={p._id} pub={p} />)}</ul>
    </PageStrip>
  )
}
```

- [ ] **Step 4: Build, prove the CSS (`font-didot`, `no-underline`), run e2e, compare visually.**

- [ ] **Step 5: Commit**

```bash
git add components/wix app/'(site)'/publications e2e/wix-publications.spec.ts
git commit -m "feat(wix): publications page"
```

### Task C7: Team

**Files:**
- Create: `components/wix/PersonCard.tsx`, `components/wix/NameRow.tsx`, `e2e/wix-team.spec.ts`
- Replace: `app/(site)/team/page.tsx`

**Interfaces:**
- Consumes: `teamQuery`, `TeamData`, `groupTeam`, `urlForImage`.

Appendix A values:
- The page is white, not a strip, and the grid is wide: 5 columns in about 1220px, each column
  196px, with the gap chosen so 5 columns span 1220px (`gap-x-[60px]`, centred).
- "Our Team" is Playfair 56, centred, 84px below the header. The intro is Raleway 15/28.1,
  centred, at most 930px wide.
- Card: the photo is 196px wide with its natural height, and the name sits 24px under it in
  Playfair 20/27.5. The role and `roleDetail` are Bodoni italic 16/28, centred.
- Rows are 60px apart, and the grid wraps centred (flex-wrap, justify-center).
- "Lab Alumni" is Playfair 40/54, left-aligned in a 907px column, and the subtitle Bodoni
  italic 20/33.4.
- Name row: the name is Playfair 22/31, then a space, then the qualifier in Playfair italic
  16, inline and centred.
- "International Interns" is Playfair 22/31, left-aligned.
- Mobile: one column, photo 140px wide, cards centred.

- [ ] **Step 1: Write the failing spec** (`e2e/wix-team.spec.ts`)

```ts
import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 900 } })

test('team structure', async ({ page }) => {
  await page.goto('/team')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Our Team')
  const current = page.locator('[data-wix="current"] [data-wix="person"]')
  expect(await current.count()).toBeGreaterThanOrEqual(12)
  await expect(current.first().locator('h3')).toHaveText('Haochen Wu')
  await expect(page.locator('[data-wix="current"]')).not.toContainText('Damian Holsinger') // Review Focus 1
  await expect(page.getByRole('heading', { name: 'Lab Alumni' })).toBeVisible()
  await expect(page.locator('[data-wix="alumni-cards"] [data-wix="person"]')).toHaveCount(6)
  await expect(page.locator('[data-wix="alumni-rows"] li')).toHaveCount(15) // 16 on Wix incl. the duplicate Rene Buxton
  await expect(page.locator('[data-wix="interns"] li')).toHaveCount(6)
  await expect(page.locator('[data-wix="interns"] li').first()).toHaveText('Mia Helveston USA')
})

test('portraits are rectangular and fixed-width', async ({ page }) => {
  await page.goto('/team')
  const img = page.locator('[data-wix="person"] img').first()
  const { w, radius } = await img.evaluate((el) => ({ w: el.getBoundingClientRect().width, radius: getComputedStyle(el).borderRadius }))
  expect(Math.round(w)).toBe(196)
  expect(radius).toBe('0px')
})

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('single column', async ({ page }) => {
    await page.goto('/team')
    const xs = await page.locator('[data-wix="current"] [data-wix="person"]').evaluateAll((els) => els.slice(0, 3).map((e) => Math.round(e.getBoundingClientRect().x)))
    expect(new Set(xs).size).toBe(1)
  })
})
```

- [ ] **Step 2: Run it and confirm it fails.** Expected: FAIL.

- [ ] **Step 3: Write the components and the page**

`components/wix/PersonCard.tsx`:

```tsx
import { urlForImage } from 'lib/sanity.image'
import type { TeamProfile } from 'lib/wix/types'
import { stegaClean } from 'next-sanity'
import Image from 'next/image'

export function PersonCard({ person }: { person: TeamProfile }) {
  const img = person.image
  const src = img ? urlForImage(img)?.width(392).url() : undefined
  const dims = img?.asset?._ref?.match(/-(\d+)x(\d+)-/)
  const h = dims ? Math.round((196 * Number(dims[2])) / Number(dims[1])) : 235
  return (
    <li data-wix="person" className="flex w-[140px] flex-col items-center text-center md:w-[196px]">
      {src ? (
        <Image src={src} alt={stegaClean(person.name)} width={196} height={h} sizes="(min-width: 768px) 196px, 140px" className="h-auto w-[140px] md:w-[196px]" />
      ) : null}
      <h3 className="mt-[24px] font-playfair text-[20px]/[27.5px]">{person.name}</h3>
      {person.role ? <p className="mt-[12px] font-didot text-[16px]/[28px] italic">{person.role}</p> : null}
      {person.roleDetail ? <p className="font-didot text-[16px]/[28px] italic">{person.roleDetail}</p> : null}
    </li>
  )
}
```

`components/wix/NameRow.tsx`:

```tsx
import type { TeamProfile } from 'lib/wix/types'

export function NameRow({ person }: { person: TeamProfile }) {
  return (
    <li className="text-center font-playfair text-[18px]/[28px] md:text-[22px]/[31px]">
      {person.name}
      {person.role ? <> <span className="text-[14px] italic md:text-[16px]">{person.role}</span></> : null}
    </li>
  )
}
```

`app/(site)/team/page.tsx`:

```tsx
import { NameRow } from 'components/wix/NameRow'
import { PersonCard } from 'components/wix/PersonCard'
import { sanityFetch } from 'lib/sanity.live'
import { teamQuery } from 'lib/wix/queries'
import { groupTeam } from 'lib/wix/team'
import type { TeamData } from 'lib/wix/types'

export const revalidate = 60
export const metadata = { title: 'Team' }

const GRID = 'flex flex-col items-center gap-y-[60px] md:flex-row md:flex-wrap md:justify-center md:gap-x-[60px]'

export default async function Team() {
  const { data } = await sanityFetch({ query: teamQuery })
  const team = (data as TeamData | null) ?? { intro: null, alumniSubtitle: null, labHeadId: null, profiles: [] }
  const g = groupTeam(team.profiles ?? [], team.labHeadId)
  return (
    <div className="mx-auto max-w-[1252px] px-[16px] pb-[80px]">
      <h1 className="pt-[40px] text-center font-playfair text-[40px] md:pt-[84px] md:text-[56px]">Our Team</h1>
      {team.intro ? <p className="mx-auto mt-[40px] max-w-[930px] text-center font-raleway text-[15px]/[28.1px]">{team.intro}</p> : null}
      <ul data-wix="current" className={`mt-[80px] ${GRID}`}>{g.current.map((p) => <PersonCard key={p._id} person={p} />)}</ul>

      {g.alumniCards.length + g.alumniRows.length > 0 ? (
        <section className="mx-auto mt-[100px] max-w-[907px]">
          <h2 className="font-playfair text-[32px]/[44px] md:text-[40px]/[54px]">Lab Alumni</h2>
          {team.alumniSubtitle ? <p className="font-didot text-[18px]/[30px] italic md:text-[20px]/[33.4px]">{team.alumniSubtitle}</p> : null}
        </section>
      ) : null}
      {g.alumniCards.length ? <ul data-wix="alumni-cards" className={`mt-[60px] ${GRID}`}>{g.alumniCards.map((p) => <PersonCard key={p._id} person={p} />)}</ul> : null}
      {g.alumniRows.length ? <ul data-wix="alumni-rows" className="mx-auto mt-[60px] max-w-[940px] space-y-[6px]">{g.alumniRows.map((p) => <NameRow key={p._id} person={p} />)}</ul> : null}

      {g.interns.length ? (
        <section className="mx-auto mt-[12px] max-w-[940px]">
          <h2 className="font-playfair text-[18px]/[28px] md:text-[22px]/[31px]">International Interns</h2>
          <ul data-wix="interns" className="mt-[12px] space-y-[6px]">{g.interns.map((p) => <NameRow key={p._id} person={p} />)}</ul>
        </section>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 4: Build, prove the CSS, run e2e, and compare against Wix** at 1280 and 390.

- [ ] **Step 5: Commit**

```bash
git add components/wix app/'(site)'/team e2e/wix-team.spec.ts
git commit -m "feat(wix): team page"
```

### Task C8: Media and Contact

**Files:**
- Create: `components/wix/MediaRow.tsx`, `e2e/wix-media-contact.spec.ts`
- Replace: `app/(site)/media/page.tsx`, `app/(site)/contact/page.tsx`

**Interfaces:**
- Consumes: `mediaQuery`, `contactQuery`, `MediaItem`, `ContactData`, `formatMediaDate`,
  `ContactBlock`, `PageStrip`.

Appendix A values:
- Media is a white page: no strip and no page heading, matching Wix.
- A video item's title and outlet are Playfair 30, with the outlet italic. The video sits
  centred, 640×365 on desktop and full-width on mobile, with `controls` and
  `preload="metadata"`.
- A link item is Playfair 22 with the outlet in italic, formatted as
  "<title> - <outlet>" and linked, and the date sits on the next line in Playfair 22.
- Contact is a `#f7f7f7` strip whose intro is Raleway 25/47, centred, followed by
  `ContactBlock`.

- [ ] **Step 1: Write the failing spec** (`e2e/wix-media-contact.spec.ts`)

```ts
import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 900 } })

test('media', async ({ page }) => {
  await page.goto('/media')
  await expect(page.locator('[data-wix="media"]')).toHaveCount(3)
  const video = page.locator('video')
  await expect(video).toHaveAttribute('controls', '')
  expect(await video.getAttribute('src')).toMatch(/^https:\/\/cdn\.sanity\.io\/files\//)
  await expect(page.getByRole('link', { name: /Slip-ups like Joe Biden/ })).toHaveAttribute('href', /abc\.net\.au/)
  await expect(page.getByText('14 Jul 2024')).toBeVisible()
})

test('contact', async ({ page }) => {
  await page.goto('/contact')
  await expect(page.getByText('If you wish to support our research efforts')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'CONTACT US' })).toBeVisible()
  await expect(page.locator('a[href^="tel:"]')).toHaveAttribute('href', /^tel:\+61/)
})
```

- [ ] **Step 2: Run it and confirm it fails.** Expected: FAIL.

- [ ] **Step 3: Write the component and the pages**

`components/wix/MediaRow.tsx`:

```tsx
import { urlForImage } from 'lib/sanity.image'
import { formatMediaDate } from 'lib/wix/format'
import type { MediaItem } from 'lib/wix/types'
import { stegaClean } from 'next-sanity'

export function MediaRow({ item }: { item: MediaItem }) {
  const date = formatMediaDate(item.date)
  const poster = item.poster ? urlForImage(item.poster)?.width(1280).url() : undefined
  if (item.videoUrl) {
    return (
      <li data-wix="media" className="mt-[40px]">
        <h2 className="font-playfair text-[22px] md:text-[30px]">{item.title} - <em>{item.outlet}</em></h2>
        <video src={stegaClean(item.videoUrl)} poster={poster} controls preload="metadata" className="mx-auto mt-[20px] aspect-[640/365] w-full md:w-[640px]" />
        {date ? <p className="font-playfair text-[18px] md:text-[22px]">{date}</p> : null}
      </li>
    )
  }
  const href = item.url ? stegaClean(item.url) : null
  const label = <>{item.title} - <em>{item.outlet}</em></>
  return (
    <li data-wix="media" className="mt-[40px] font-playfair text-[18px] md:text-[22px]">
      {href ? <a href={href} target="_blank" rel="noreferrer" className="underline">{label}</a> : <span>{label}</span>}
      {date ? <p>{date}</p> : null}
    </li>
  )
}
```

(Wix underlines the link text; check this against the Wix page in Step 4 and match what it
shows.)

`app/(site)/media/page.tsx`:

```tsx
import { MediaRow } from 'components/wix/MediaRow'
import { sanityFetch } from 'lib/sanity.live'
import { mediaQuery } from 'lib/wix/queries'
import type { MediaItem } from 'lib/wix/types'

export const revalidate = 60
export const metadata = { title: 'Media' }

export default async function Media() {
  const { data } = await sanityFetch({ query: mediaQuery })
  const items = (data as MediaItem[] | null) ?? []
  return (
    <div className="wix-col pb-[80px]">
      <h1 className="sr-only">Media</h1>
      <ul>{items.map((m) => <MediaRow key={m._id} item={m} />)}</ul>
    </div>
  )
}
```

`app/(site)/contact/page.tsx`:

```tsx
import { ContactBlock } from 'components/wix/ContactBlock'
import { sanityFetch } from 'lib/sanity.live'
import { contactQuery } from 'lib/wix/queries'
import type { ContactData } from 'lib/wix/types'

export const revalidate = 60
export const metadata = { title: 'Contact' }

export default async function Contact() {
  const { data } = await sanityFetch({ query: contactQuery })
  const c = (data as ContactData | null) ?? { intro: null, contact: null }
  return (
    <section data-wix="strip" className="mt-[20px] bg-strip pt-[45px]">
      <h1 className="sr-only">Contact</h1>
      {c.intro ? <p className="wix-col text-center font-raleway text-[20px]/[36px] md:text-[25px]/[47px]">{c.intro}</p> : null}
      <ContactBlock contact={c.contact} />
    </section>
  )
}
```

- [ ] **Step 4: Build, prove the CSS, run e2e, and compare with Wix.** Also confirm the
  video plays in the browser pane.

- [ ] **Step 5: Commit**

```bash
git add components/wix app/'(site)'/media app/'(site)'/contact e2e/wix-media-contact.spec.ts
git commit -m "feat(wix): media and contact pages"
```

### Task C9: Cross-cutting checks (axe, overflow, draft-mode stega) and PR C

**Files:**
- Create: `e2e/wix-a11y.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const ROUTES = ['/', '/research', '/news', '/publications', '/team', '/media', '/contact']

for (const path of ROUTES) {
  test(`${path}: axe clean`, async ({ page }) => {
    await page.goto(path)
    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([])
  })
  for (const width of [320, 390, 800, 1012]) {
    test(`${path}: no horizontal scroll at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(path)
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(over).toBeLessThanOrEqual(0)
    })
  }
}
```

- [ ] **Step 2: Run the full suite**

```bash
npm run type-check && npm run lint && npm test
npx playwright test
```

Expected: everything is green. For axe `color-contrast` on the hero, the caption panel is 30%
black over a photo, so contrast depends on the image. Axe reports "incomplete" for text over
images rather than a violation. If it does report a violation, record it in the PR along with
the Wix original's identical behaviour. Do not darken the panel, because that would break
fidelity. Brett decides.

- [ ] **Step 3: Check stega manually (Review Focus 5)**

With draft mode enabled (`/api/draft?...`, per `app/api/draft/route.ts`), open `/` and
`/publications`. In the browser pane, run:

```js
[...document.querySelectorAll('a[href],img[alt]')].filter(e => /[​-‍⁠﻿]/.test(e.getAttribute('href') ?? e.getAttribute('alt'))).length
```

Expected: `0`.

- [ ] **Step 4: Run a whole-branch review** (fresh reviewer, most capable model) against the
  spec and this plan, before opening the PR. Fix the findings, and re-run Step 2.

- [ ] **Step 5: Commit, push, and open PR C**

```bash
git add e2e/wix-a11y.spec.ts
git commit -m "test(wix): axe and overflow checks across all routes"
git push -u origin redesign/wix-site
gh pr create --base redesign/wix --title "Wix-lookalike site (built against wix-preview)" --body "<summary; paired screenshots per route at 1280/390 vs Wix; test results; axe notes; spec link>"
```

**Stop.** Send the PR to the command centre.

---

# Part D: Operations (controller only, each step gated)

### Task D1: Live-site impact report (produces the evidence for G2)

The live site builds from `main` and reads `production`. This task shows exactly what it would
look like after the import. It changes nothing on `main`.

- [ ] **Step 1: Make sure `wix-preview` is fresh.** It must be a copy of production taken
  **after** the migrations landed (G1 re-copy note), with the import applied and a zero-op
  re-run recorded.

- [ ] **Step 2: Build `main` twice, once per dataset.** Use a temporary worktree that is never
  committed to:

```bash
git worktree add ../main-impact origin/main
cd ../main-impact && grep -v '^SANITY_API_WRITE_TOKEN' ../../../.env.local > .env.local && npm ci
NEXT_PUBLIC_SANITY_DATASET=production npm run build && PORT=3100 npm run start &   # "before"
# after screenshots are taken, stop it, then:
NEXT_PUBLIC_SANITY_DATASET=wix-preview npm run build && PORT=3100 npm run start &  # "after"
```

- [ ] **Step 3: Capture before and after.** In the browser pane, take full-page screenshots at
  1280 and 390 of:
  - `/`
  - `/people`
  - every `/projects/<slug>` whose document the import touched: the two matched projects,
    plus the two new `wix-project-*` documents, if `main` exposes them in its nav or home
    showcase
  - `/publications`

- [ ] **Step 4: Write the change list** from the import's dry-run output against production,
  grouped by live page:
  - `/people`: N new profiles in Lab Alumni and International Interns (M without photos),
    renamed people, changed roles, and order changes.
  - `/projects/...`: the retitled gut-microbiota project, new description text, and whether the
    new projects are reachable.
  - `/publications`: 2 new papers, and the DOIs filled.
  - `/`: any showcase changes.

- [ ] **Step 5: Publish it** as a private Artifact (paired screenshots plus the change list).
  Send the link to the command centre for **G2**. If Brett wants a filter on the `main` side,
  that is his decision and a separate change; this track doesn't make it.

- [ ] **Step 6: Clean up the worktree.** `git worktree remove ../main-impact`.

### Task D2: Production import (only after G2's yes)

- [ ] **Step 1: Back up the dataset.** Brett runs this, or it runs with his token:
  `npx sanity dataset export production backups/production-$(date +%F).tar.gz`. Keep the file
  out of git; `backups/` goes in `.gitignore` if it is not already there.
- [ ] **Step 2: Dry run.** Run `npm run import:wix -- --dataset production` and diff its output
  against the D1 change list. If anything differs (for example Damian edited something in the
  meantime), stop and report back to the command centre.
- [ ] **Step 3: Commit, only with Brett's per-write yes relayed in this conversation:**
  `npm run import:wix -- --dataset production --commit --backup backups/production-<date>.tar.gz --confirm-production`
- [ ] **Step 4: Re-run the dry run.** Expect `0 ops, 0 skipped`. Spot-check the live site's
  `/people` against the D1 "after" screenshots.

### Task D3: Vercel preview and side-by-side comparison (G3)

- [ ] **Step 1: Deploy the preview.** Merge-ready PR C is merged into `redesign/wix` by the
  command centre. Confirm Vercel builds a preview for `redesign/wix` with
  `NEXT_PUBLIC_SANITY_DATASET=production`. Setting the branch's env vars in Vercel is Brett's
  action.
- [ ] **Step 2: Build the comparison.** Capture Wix and the preview at 1280 and 390 for all
  seven routes, and publish a comparison artifact with the pairs side by side. List every
  known difference: the font substitutes, the corrected Wix defects, and the Sanity-only
  records from spec §9.
- [ ] **Step 3: Hand over.** Send it to the command centre for Brett's sign-off (**G3**)
  before anything reaches Damian.

### Task D4: Cleanup (G4)

- [ ] Ask Brett to confirm deleting `wix-preview`. Once he says yes, he runs
  `npx sanity dataset delete wix-preview`.
- [ ] Update the memory file `holsinger_lab_command_centre.md`, or a new
  `holsinger_lab_wix_lookalike.md` pointer, with the final state.
