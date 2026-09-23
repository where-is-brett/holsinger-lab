# Redesign revision PR 2 — Home — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Home so a first-time visitor understands what the lab is and does. The new order is:

- a hero, with the lab name, a two-sentence statement that mentions Alzheimer's, and a lab-head card;
- recent papers, with a larger lead row;
- research as cards;
- a people strip;
- the resource;
- MAESTRO as a normal card.

The PI is named once.

**Architecture:** All data shaping lives in pure, unit-tested functions in `components/redesign/homeModel.ts`. `components/redesign/screens/Home.tsx` composes them into `Section` blocks. `app/page.tsx` gains two fetches: `siteCopy`, and the `researchOrder` projects, which reuses `researchProjectsQuery`. States the live data can't reach are exercised on `/preview/components` gallery fixtures.

**Tech Stack:** Next.js 16 (app router, RSC), Sanity (GROQ, TypeGen), Tailwind 4, Vitest, Playwright, axe.

**Spec:** `docs/superpowers/specs/2026-09-23-redesign-revision-design.md`, §"PR 2 — Home", the rulings table and "Data issues". PR 1's shipped decisions are in `docs/redesign-experiment/phase-3-decisions.md`, §"Revision PR 1 — Foundations".

Base: branch `redesign/revision-home`, off `redesign/integration` at `e82937e` (PR 1 merged).

## Global Constraints

- **Git and data:**
  - Never write to any Sanity dataset.
  - Never use bare `git stash`. If you must stash, tag it and drop it by SHA.
  - Never run `npm audit fix --force`.
  - Don't touch `main`, don't push, don't merge.
- **Schema:** don't retire `menuItems`, the `show*` flags or the `project` type. No schema changes in this PR: `siteCopy` already has every field used here.
- **Tailwind 4:**
  - Two utilities that set the same property at the same breakpoint never merge. Use one class string per shape.
  - Use `h-(--x)` when a custom property is the whole value, and `var()` inside composites.
  - Base CSS rules are unlayered, so overriding them may need `!`.
  - Prove every new utility with `npm run css:proof -- --grep '<class selector>'`. It exits 0 on a match. Grep by selector (e.g. `.md\:grid-cols-2`), not by value.
- **Grid overflow:** a text grid item needs an explicit track below its column breakpoint (`grid-cols-1` = `minmax(0,1fr)`). Unbreakable CMS tokens need `break-words`, or `break-all` for identifiers and emails.
- **e2e must hold for any valid dataset.** Derive expectations from `e2e/support/sanity.ts`'s read-only `e2eClient`. States the live data can't reach go on gallery fixtures (`app/preview/components/Gallery.tsx`, `components/redesign/fixtures.ts`).
- **Keep these green:**
  - `e2e/typography.spec.ts` (the word-fit budget: display "Neuroscience", title "Pathophysiology", heading "Neurodegenerative" at 320px);
  - `e2e/label-budget.spec.ts` (≤ 6 shouted labels per page at 1440 and 375, counted from text nodes);
  - `e2e/section-label.spec.ts`;
  - `e2e/preview-scrollbar.spec.ts`;
  - the per-row ledger overflow checks;
  - axe in light and dark, including fixture-level axe.
- **Overflow:** no horizontal scroll from 320 to 1440px, measured as `document.documentElement.scrollWidth <= clientWidth`.
- **CMS text** prints verbatim. Mark CMS or identifier text elements with `data-cms-verbatim`, and identifiers with `data-identifier`, as PR 1 does.
- **Casing and fonts:** sentence case everywhere. No uppercase micro-labels outside `[data-testid="ledger-head"]`. Archivo for reading text; Plex Mono only for data (DOIs, journal refs, emails as identifiers).
- **Local e2e:**
  - Before the run: `rm -rf .next/cache/fetch-cache`, and wait until :3000 is free.
  - After the run: `git checkout origin/redesign/integration -- next-env.d.ts` if the build changed it, and leave nothing listening on :3000.
- **Gates for every task:**
  - `npm run type-check`;
  - `npm run lint` (baseline 0 errors, 4 warnings; add none);
  - `npx vitest run`;
  - `npm run build`;
  - full `npx playwright test`.
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Comments** state the current reason only: no review or fix-round history, which belongs in `phase-3-decisions.md`.

## Review Focus

1. **Production has an empty `siteCopy`.** When the document is missing, or `about.body` and `hero.subheading` are empty or whitespace, the statement must fall back to `home.overview`, then to the IA tagline. It must never render an empty `<p>`. Covered by `homeStatement` unit tests (Task 1) and the gallery "no siteCopy" instance (Task 2).
2. **A lead paper with no slug** (wix-preview until the importer's fix, and any future import) renders its title unlinked, with no crash and no `href="null"`. Covered by a `splitLead` unit test and gallery fixture `gallery-home-unslugged` (Task 3).
3. **A lab head with only some fields set** (no photo, no role, no email, or only a name) renders only the parts that exist: no empty label, no initials-only box without a name, no "mailto:undefined". Covered by gallery instances b and c plus an e2e (Task 2).
4. **Fewer than 6 current members with photos, or none.** The strip shows however many there are, up to 8. With zero, the portraits row is omitted, but "Meet the lab — N people" still renders when N > 0. The whole block is omitted when N is 0 and there's no support page. Covered by `peopleStrip` unit tests (Task 1) and an e2e against live data (Task 5).
5. **The PI named more than once.** The lab head's name must appear exactly once in Home's `<main>` whenever the hero card shows. The people strip must exclude them even if they're in a current role group. Covered by an e2e derived from `e2eClient` (Task 5).

---

## File map

| File | Responsibility |
|---|---|
| `lib/sanity.queries.ts` | + `homeSiteCopyQuery` |
| `sanity.types.ts` (TypeGen output) and `types/index.ts` | + `SiteCopyPayload` |
| `app/api/revalidate/route.ts` (+ test) | + a `siteCopy` case that revalidates `/` |
| `components/redesign/homeModel.ts` (+ test) | pure functions: `homeStatement`, `splitLead`, `firstSentence`, `researchCards`, `peopleStrip`, `maestroOverview`; `plainTagline` is kept |
| `components/redesign/researchModel.ts` (+ test) | `ResearchProjectView` gains `slug` |
| `components/redesign/screens/Research.tsx` | each project `Section` gets `id={slug}`, so `/research#<slug>` scrolls to it |
| `components/redesign/LeadPublication.tsx` (new) | the lead row |
| `components/redesign/screens/Home.tsx` | composition |
| `app/page.tsx` | fetch `siteCopy` and the research projects, and pass them |
| `components/redesign/fixtures.ts`, `app/preview/components/Gallery.tsx` | fixtures and gallery instances |
| `e2e/home.spec.ts` (+ touched specs) | behaviour |
| `docs/redesign-experiment/phase-3-decisions.md`, the spec | decisions |

---

### Task 1: Data seams (query, types, revalidation, pure model)

**Files:**
- Modify: `lib/sanity.queries.ts`, `types/index.ts`, `sanity.types.ts` (via `npm run typegen`), `app/api/revalidate/route.ts`, `app/api/revalidate/route.test.ts`, `components/redesign/homeModel.ts`, `components/redesign/homeModel.test.ts`, `components/redesign/researchModel.ts`, `components/redesign/researchModel.test.ts`, `components/redesign/screens/Research.tsx`
- Test: `components/redesign/homeModel.test.ts`, `components/redesign/researchModel.test.ts`, `app/api/revalidate/route.test.ts`

**Interfaces:**
- Consumes: `researchProjectsQuery`, `toResearchView` (`researchModel.ts`), `isAlumniGroup`, `initialsOf` (`peopleModel.ts`), `Publication` (`publicationModel.ts`), `toPlainText` (`@portabletext/react`).
- Produces (exact signatures; later tasks rely on them):
  ```ts
  // homeModel.ts
  export const IA_TAGLINE: string // moved here from Home.tsx, same text
  export function homeStatement(
    siteCopy: { about?: { body?: unknown } | null; hero?: { subheading?: string | null } | null } | null,
    homeOverview: unknown
  ): string
  export function splitLead<T>(publications: T[]): { lead: T | null; rest: T[] }
  export function firstSentence(text: string, max?: number): string
  export interface ResearchCard { key: string; title: string; excerpt: string; href: string | null; cover: ResearchProjectCover | null }
  export function researchCards(
    projects: ResearchProjectView[],
    themes: { title?: string | null; summary?: string | null }[] | null | undefined
  ): ResearchCard[]
  export interface StripPerson { id: string; name: string; image: unknown }
  export function peopleStrip(
    profiles: { _id: string; name?: string | null; image?: unknown; roleGroup?: { _id: string; title: string | null } | null }[],
    roleGroups: { _id: string; title: string | null }[],
    labHeadId: string | null | undefined,
    max?: number
  ): StripPerson[]
  export function maestroOverview<B>(blocks: B[] | null | undefined, site: string | null | undefined): B[]
  // researchModel.ts: ResearchProjectView gains `slug: string | null`
  // types/index.ts
  export type SiteCopyPayload = NonNullable<HomeSiteCopyQueryResult>
  ```

- [ ] **Step 1: Write the failing unit tests.** Add to `components/redesign/homeModel.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { firstSentence, homeStatement, IA_TAGLINE, maestroOverview, peopleStrip, researchCards, splitLead } from './homeModel'

const block = (text: string) => ({ _type: 'block', _key: text.slice(0, 8), children: [{ _type: 'span', _key: 's', text, marks: [] }], markDefs: [], style: 'normal' })

describe('homeStatement', () => {
  it('prefers siteCopy.about.body as plain text', () => {
    expect(homeStatement({ about: { body: [block('We study Alzheimer’s disease.'), block('Second sentence.')] } }, null))
      .toBe('We study Alzheimer’s disease. Second sentence.')
  })
  it('falls back to hero.subheading when about.body is empty or whitespace', () => {
    expect(homeStatement({ about: { body: [block('   ')] }, hero: { subheading: 'Sub' } }, null)).toBe('Sub')
  })
  it('falls back to home.overview, then the IA tagline', () => {
    expect(homeStatement(null, [block('Overview text')])).toBe('Overview text')
    expect(homeStatement({ hero: { subheading: '  ' } }, [])).toBe(IA_TAGLINE)
    expect(homeStatement(null, null)).toBe(IA_TAGLINE)
  })
})

describe('splitLead', () => {
  it('returns the first item as lead and the rest in order', () => {
    expect(splitLead([1, 2, 3])).toEqual({ lead: 1, rest: [2, 3] })
  })
  it('handles an empty list', () => {
    expect(splitLead([])).toEqual({ lead: null, rest: [] })
  })
  it('keeps a lead with no href (unslugged paper) as-is', () => {
    const lead = { id: 'a', href: null }
    expect(splitLead([lead]).lead).toBe(lead)
  })
})

describe('firstSentence', () => {
  it('returns the first sentence', () => {
    expect(firstSentence('One thing. Two things.')).toBe('One thing.')
  })
  it('does not split on "e.g." style abbreviations followed by lowercase', () => {
    expect(firstSentence('Uses e.g. mice and rats. Next.')).toBe('Uses e.g. mice and rats.')
  })
  it('truncates at a word boundary with an ellipsis past max', () => {
    const out = firstSentence('word '.repeat(80).trim(), 60)
    expect(out.length).toBeLessThanOrEqual(61)
    expect(out.endsWith('…')).toBe(true)
    expect(out).not.toMatch(/\s…$/)
  })
  it('returns "" for blank input', () => {
    expect(firstSentence('   ')).toBe('')
  })
})

describe('researchCards', () => {
  const view = (id: string, slug: string | null, text: string) => ({
    id, slug, title: `T ${id}`, label: 'Project', kicker: '', tagLine: '',
    body: [block(text)], cover: null,
  })
  it('builds one card per project, linking to /research#slug', () => {
    const cards = researchCards([view('p1', 'alpha', 'First. Second.')] as never, null)
    expect(cards).toEqual([{ key: 'p1', title: 'T p1', excerpt: 'First.', href: '/research#alpha', cover: null }])
  })
  it('links to /research when a project has no slug', () => {
    expect(researchCards([view('p1', null, 'X.')] as never, null)[0].href).toBe('/research')
  })
  it('falls back to siteCopy themes, stripping a leading "- ", unlinked', () => {
    expect(researchCards([], [{ title: 'Theme', summary: '- Does things' }])).toEqual([
      { key: 'theme-0', title: 'Theme', excerpt: 'Does things', href: null, cover: null },
    ])
  })
  it('drops themes with no title, and returns [] when neither source exists', () => {
    expect(researchCards([], [{ title: '  ', summary: 'x' }])).toEqual([])
    expect(researchCards([], null)).toEqual([])
  })
})

describe('peopleStrip', () => {
  const groups = [{ _id: 'g1', title: 'PhD students' }, { _id: 'g2', title: 'Lab alumni' }]
  const p = (id: string, group: string | null, image: unknown = { asset: { _ref: id } }) => ({
    _id: id, name: `N ${id}`, image, roleGroup: group ? { _id: group, title: null } : null,
  })
  it('keeps current members with photos, in input order, excluding alumni and the lab head', () => {
    const out = peopleStrip([p('head', 'g1'), p('a', 'g1'), p('b', 'g2'), p('c', null), p('d', 'g1', null)], groups, 'head')
    expect(out.map((x) => x.id)).toEqual(['a', 'c'])
  })
  it('caps at max (default 8)', () => {
    const many = Array.from({ length: 12 }, (_, i) => p(`m${i}`, 'g1'))
    expect(peopleStrip(many, groups, null)).toHaveLength(8)
    expect(peopleStrip(many, groups, null, 6)).toHaveLength(6)
  })
  it('skips profiles with a blank name', () => {
    expect(peopleStrip([{ ...p('x', 'g1'), name: '  ' }], groups, null)).toEqual([])
  })
})

describe('maestroOverview', () => {
  it('drops blocks whose whole text is the register URL (with or without scheme)', () => {
    const blocks = [block('Join us.'), block('https://tinyurl.com/maestrotalks'), block('tinyurl.com/maestrotalks ')]
    expect(maestroOverview(blocks, 'https://tinyurl.com/maestrotalks')).toEqual([blocks[0]])
  })
  it('keeps everything when site is unset', () => {
    const blocks = [block('https://x.org')]
    expect(maestroOverview(blocks, null)).toEqual(blocks)
  })
  it('returns [] for null blocks', () => {
    expect(maestroOverview(null, 'https://x.org')).toEqual([])
  })
})
```

  Also add to `researchModel.test.ts`: `toResearchView` returns `slug` from the payload (`'alpha'`), and `null` when it's unset.

  Add to `app/api/revalidate/route.test.ts`, mirroring the existing `page` case test: a `siteCopy` webhook revalidates `/`.

- [ ] **Step 2: Run the tests and confirm they fail.** Run `npx vitest run components/redesign/homeModel.test.ts components/redesign/researchModel.test.ts app/api/revalidate/route.test.ts`. They should fail with missing exports, the missing `slug`, and the missing case.

- [ ] **Step 3: Implement.**

  `lib/sanity.queries.ts`, after `supportPageQuery`:

```ts
// Home's hero statement and its research-themes fallback (revision spec,
// PR 2). The shared `siteCopy` singleton is empty in production today, so
// every field is optional and the caller falls back.
export const homeSiteCopyQuery = groq`
  *[_type == "siteCopy"][0]{
    hero{ subheading },
    about{ body, themes[]{ title, summary } },
  }
`
```

  Then add `"slug": slug.current` (it is already there) and confirm `researchProjectsQuery` projects `slug`.

  Run `npm run typegen`, then add `export type SiteCopyPayload = NonNullable<HomeSiteCopyQueryResult>` to `types/index.ts` next to `MaestroProjectPayload`.

  `researchModel.ts`: add `slug: string | null` to `ResearchProjectView`, and `slug: p.slug ?? null` in `toResearchView`.

  `Research.tsx`: pass `id={project.slug ?? undefined}` on each project `Section`. `Section` already accepts `id`; confirm that in `components/redesign/Section.tsx`.

  `homeModel.ts`: move `IA_TAGLINE` here from `Home.tsx` and export it. Then add:

```ts
function plainText(blocks: unknown): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return ''
  return toPlainText(blocks as Parameters<typeof toPlainText>[0]).replace(/\s+/g, ' ').trim()
}

/** Hero statement: siteCopy.about.body → hero.subheading → home.overview → IA tagline. */
export function homeStatement(
  siteCopy: { about?: { body?: unknown } | null; hero?: { subheading?: string | null } | null } | null,
  homeOverview: unknown
): string {
  return (
    plainText(siteCopy?.about?.body) ||
    siteCopy?.hero?.subheading?.trim() ||
    plainText(homeOverview) ||
    IA_TAGLINE
  )
}

export function splitLead<T>(publications: T[]): { lead: T | null; rest: T[] } {
  const [lead = null, ...rest] = publications
  return { lead, rest }
}

/** The first sentence, cut at a word boundary with "…" when longer than `max`. */
export function firstSentence(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return ''
  const match = clean.match(/^.+?[.!?](?=\s+[A-Z0-9“"'(]|$)/)
  const sentence = match ? match[0] : clean
  if (sentence.length <= max) return sentence
  const cut = sentence.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:]+$/, '')}…`
}

export interface ResearchCard {
  key: string
  title: string
  excerpt: string
  href: string | null
  cover: ResearchProjectCover | null
}

/** researchOrder projects first; siteCopy.about.themes only when there are none. */
export function researchCards(
  projects: ResearchProjectView[],
  themes: { title?: string | null; summary?: string | null }[] | null | undefined
): ResearchCard[] {
  if (projects.length > 0) {
    return projects.map((p) => ({
      key: p.id,
      title: p.title,
      excerpt: firstSentence(plainText(p.body)),
      href: p.slug ? `/research#${p.slug}` : '/research',
      cover: p.cover,
    }))
  }
  return (themes ?? []).flatMap((t, i) => {
    const title = t.title?.trim()
    if (!title) return []
    return [{ key: `theme-${i}`, title, excerpt: firstSentence((t.summary ?? '').replace(/^\s*-\s+/, '')), href: null, cover: null }]
  })
}

export interface StripPerson {
  id: string
  name: string
  image: unknown
}

/** Current members with a photo, in the given (orderRank) order, never the lab head or alumni. */
export function peopleStrip(
  profiles: { _id: string; name?: string | null; image?: unknown; roleGroup?: { _id: string; title: string | null } | null }[],
  roleGroups: { _id: string; title: string | null }[],
  labHeadId: string | null | undefined,
  max = 8
): StripPerson[] {
  const alumni = new Set(roleGroups.filter((g) => isAlumniGroup(g.title)).map((g) => g._id))
  return profiles
    .filter((p) => !(labHeadId && p._id === labHeadId))
    .filter((p) => !(p.roleGroup && alumni.has(p.roleGroup._id)))
    .filter((p) => Boolean(p.image) && Boolean(p.name?.trim()))
    .slice(0, max)
    .map((p) => ({ id: p._id, name: p.name!.trim(), image: p.image }))
}

const bare = (s: string) => s.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')

/** The MAESTRO overview minus any block that only repeats the register URL: the card has one register link. */
export function maestroOverview<B>(blocks: B[] | null | undefined, site: string | null | undefined): B[] {
  if (!blocks) return []
  if (!site) return blocks
  return blocks.filter((b) => bare(plainText([b])) !== bare(site))
}
```

  Import `ResearchProjectCover` and `ResearchProjectView` as types from `./researchModel`. Keep `plainTagline`, `currentMemberCount`, `shouldShowLabHeadCard` and `resolveLabHeadHref` unchanged.

  `app/api/revalidate/route.ts`: add a `siteCopy` case that calls `revalidatePath('/')`, with a one-line comment: "Home's hero statement and research fallback read siteCopy." Check the webhook's GROQ filter or projection (if one exists in this repo or in docs) and note in the report whether `siteCopy` needs adding to the Sanity webhook's filter. That is a manual Studio step for Brett, so don't make it yourself.

- [ ] **Step 4: Run the tests and confirm they pass.** Same command as step 2; all tests pass. Then run type-check.

- [ ] **Step 5: Run the gates, then commit.** Commit message: `feat(home): data seams for the rebuilt Home (siteCopy statement, research cards, people strip)`.

---

### Task 2: Hero (name, statement, lab-head card)

**Files:**
- Modify: `components/redesign/screens/Home.tsx` (`IdentityBlock`), `app/page.tsx`, `components/redesign/fixtures.ts`, `app/preview/components/Gallery.tsx`, `e2e/home.spec.ts`, `e2e/lab-head-spotlight.spec.ts`
- Test: `e2e/home.spec.ts`

**Interfaces:**
- Consumes: `homeStatement`, `IA_TAGLINE` (Task 1), `SiteCopyPayload`, `homeSiteCopyQuery`, `shouldShowLabHeadCard`, `resolveLabHeadHref`, `PORTRAIT_IMAGE_CLASS`, `STRIPE_BG`, `initialsOf`, `urlForImage`.
- Produces: `Home` gains the prop `siteCopy: SiteCopyPayload | null`. Gallery and `app/page.tsx` pass it. The `data-testid`s are:
  - `home-identity-title`, kept;
  - `home-statement`;
  - `home-lab-head-card`, which replaces `home-pi-panel`;
  - `home-lab-head-link`, kept, now inside the card.

**The design:**

1. **Kicker.** Keep the rule plus "The University of Sydney" kicker line as it is.
2. **h1.** Unchanged: `home.title?.trim() || siteName`, with `text-balance break-words text-display`.
3. **Statement.** Replaces the tagline: `<p data-testid="home-statement" data-cms-verbatim className="max-w-[40rem] text-pretty break-words text-lead text-text-muted">`, with the text from `homeStatement(siteCopy, home.overview)`. Don't set `leading-*` on top of `text-lead`: the token already carries a 1.6 line-height, and two line-height utilities would collide.
4. **Lab-head card.** Replaces both the old PI panel and the PI part of "The lab". It renders when `shouldShowLabHeadCard(settings) && labHead?.name?.trim()`.
   - Layout: `grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-5`. At `lg` it sits in the existing `IDENTITY_GRID` right column, `lg:grid-cols-[minmax(0,1fr)_20rem]`; below `lg` it stacks under the statement.
   - Contents:
     - Photo: the existing `PiPortrait64` (`alt=""`, because the name sits beside it inside the link). With no photo, show the initials tile. Keep that fallback, because the name is always present.
     - Name: an `<a>`/`Link` to `resolveLabHeadHref(labHead)`, `text-[1.3125rem] font-semibold`, with the group-hover and focus colour reveal. The link wraps the photo and the name, as `home-lab-head-link` does today.
     - Role: `labHead.role` verbatim, `text-[0.9375rem] text-text-muted`, `data-cms-verbatim`, only when it's non-blank. This replaces the hard-coded "Principal investigator" label, so no stacked labels are possible.
     - Email: `mailto:` link, `font-mono text-[0.8125rem] break-all text-link`, `data-identifier data-cms-verbatim`, only when set.
   - Wrap the card in `<div data-testid="home-lab-head-card" className="min-w-0 border-l border-rule pl-6">`.
5. **Remove the PI from "The lab".** Delete the PI column from `TheLabBlock`. Task 5 deletes the rest of it, so here just remove that column, the `home-pi-panel` markup and `IDENTITY_GRID`'s old `items-end` panel.

**Steps:**

- [ ] **Step 1: Write the failing e2e.** Add to `e2e/home.spec.ts`:

```ts
test('hero: statement comes from siteCopy → hero.subheading → home.overview → IA tagline', async ({ page }) => {
  const siteCopy = await e2eClient.fetch(`*[_type=="siteCopy"][0]{hero{subheading}, about{body}}`)
  const home = await e2eClient.fetch(`*[_type=="home"][0]{overview}`)
  await page.goto('/')
  const text = (await page.getByTestId('home-statement').innerText()).replace(/\s+/g, ' ').trim()
  expect(text.length).toBeGreaterThan(0)
  // Recompute the expected chain with the same pure function the screen uses.
  const { homeStatement } = await import('../components/redesign/homeModel')
  expect(text).toBe(homeStatement(siteCopy, home?.overview))
})

test('hero: lab-head card shows only the parts that are set, and names the PI once', async ({ page }) => {
  const s = await e2eClient.fetch(`*[_type=="settings"][0]{showLabHeadOnHome, labHead->{name, role, email, image}}`)
  await page.goto('/')
  const card = page.getByTestId('home-lab-head-card')
  const shown = Boolean(s?.labHead?.name?.trim()) && s?.showLabHeadOnHome !== false
  await expect(card).toHaveCount(shown ? 1 : 0)
  if (!shown) return
  await expect(card.getByTestId('home-lab-head-link')).toContainText(s.labHead.name.trim())
  if (s.labHead.role?.trim()) await expect(card).toContainText(s.labHead.role.trim())
  await expect(card.locator('a[href^="mailto:"]')).toHaveCount(s.labHead.email ? 1 : 0)
  await expect(card.locator('a[href="mailto:undefined"], a[href="mailto:null"]')).toHaveCount(0)
})
```

  If the dynamic import of `homeModel` in Playwright fails because of `@portabletext/react` ESM resolution, don't import it. Assert instead that the text equals one of the non-empty candidates, computed in the test with the same order, where `toPlainText` is replaced by joining span texts. State in the report which approach you used.

  Add a gallery instance `gallery-home-no-sitecopy`: `siteCopy={null}`, `home.overview` empty, and a lab head that has a name only. Add an e2e asserting that its statement equals the IA tagline, and that its card has no role line and no mailto.

- [ ] **Step 2: Run the new tests and confirm they fail.** Run `npx playwright test e2e/home.spec.ts -g "hero"`. They should fail because the new test ids don't exist yet.
- [ ] **Step 3: Implement.** Follow the design above. In `app/page.tsx`, add `sanityFetch({ query: homeSiteCopyQuery, stega: false })` to the `Promise.all`, cast it to `SiteCopyPayload | null`, and pass it as `siteCopy`. Update every gallery `Home` instance:
  - `gallery-home-a` gets a fixture `HOME_SITE_COPY_FIXTURE`, with a two-sentence `about.body` that mentions Alzheimer's;
  - `b` and `c` get `null`.

  Update `e2e/lab-head-spotlight.spec.ts` and `e2e/home.spec.ts` references from `home-pi-panel` to `home-lab-head-card`.
- [ ] **Step 4: Run the tests.** Home, typography, label-budget, section-label and axe must pass. Check with css:proof: `.lg\:grid-cols-\[minmax\(0\,1fr\)_20rem\]` and `.grid-cols-\[4rem_minmax\(0\,1fr\)\]`.
- [ ] **Step 5: Run the gates, then commit.** Commit message: `feat(home): hero with siteCopy statement and a single lab-head card`.

---

### Task 3: Recent papers with a lead row

**Files:**
- Create: `components/redesign/LeadPublication.tsx`
- Modify: `components/redesign/screens/Home.tsx` (`RecentWorkBlock`), `components/redesign/fixtures.ts`, `app/preview/components/Gallery.tsx`, `e2e/home.spec.ts`
- Test: `e2e/home.spec.ts`

**Interfaces:**
- Consumes: `splitLead` (Task 1), `Publication` (`publicationModel.ts`), `PublicationRow` (`variant="home"`), `LABEL`, `PUBLICATION_GRID`.
- Produces: `export function LeadPublication({ pub }: { pub: Publication }): JSX.Element`, rendered with `data-testid="home-lead-paper"`.

**The design:**

- **The block, top to bottom:**
  1. the lead;
  2. the existing ledger head (`data-testid="ledger-head"`, only at `xl`);
  3. the next four as `PublicationRow variant="home"`, each wrapped in `data-testid="pub-row"` as now;
  4. the "All N publications →" link.

  Delete the "Latest five, by date" note: the lead row makes the order obvious. The Section label becomes "Recent papers".
- **`LeadPublication` markup:**
  - Wrapper: `<article data-testid="home-lead-paper" className="border-t border-rule pt-6 pb-8">`.
  - Kicker: `{pub.year} · {pub.journal}` in `font-mono text-[0.8125rem] text-text-muted`, with `data-cms-verbatim` on the journal span. Omit the separator when the journal is empty.
  - Title: `<h3 className="mt-3 text-pretty break-words text-heading font-semibold">`.
    - When `pub.href` is set, the title is a `next/link` to it, carrying the hit-area and hover colour.
    - When it isn't, the title is plain text. Never pass `href={null}`.
  - Authors: `<p className="mt-3 text-body text-text-muted">` containing `authorsPre`, then `<strong className="font-semibold text-text">{authorsPI}</strong>`, then `authorsPost`. The `strong` appears only when `authorsPI` is set.
  - Identifier: when `linkHref` is set, `<a data-identifier data-cms-verbatim href={pub.linkHref} className="mt-4 inline-block font-mono text-[0.8125rem] break-all text-link">{pub.linkKind} {pub.linkLabel}</a>`.
  - The h3 is correct because the Section label is an `<h2>`. Confirm the outline has no skipped level.
- **"Recent papers" and the lead title** both appear in the heading outline, and that's fine.

**Steps:**

- [ ] **Step 1: Write the failing e2e.**

```ts
test('recent papers: newest is the lead; the next four are rows; unslugged lead is unlinked', async ({ page }) => {
  const pubs = await e2eClient.fetch(`*[_type=="publication"]|order(date desc)[0...5]{title, "slug": slug.current}`)
  await page.goto('/')
  if (pubs.length === 0) { await expect(page.getByTestId('home-lead-paper')).toHaveCount(0); return }
  const lead = page.getByTestId('home-lead-paper')
  await expect(lead.locator('h3')).toContainText(pubs[0].title.trim().slice(0, 40))
  await expect(lead.locator('h3 a')).toHaveCount(pubs[0].slug ? 1 : 0)
  await expect(page.getByTestId('home-recent-work').getByTestId('pub-row')).toHaveCount(pubs.length - 1)
})

test('gallery: an unslugged lead paper renders an unlinked title', async ({ page }) => {
  await page.goto('/preview/components')
  const lead = page.getByTestId('gallery-home-unslugged').getByTestId('home-lead-paper')
  await expect(lead.locator('h3')).toBeVisible()
  await expect(lead.locator('h3 a')).toHaveCount(0)
  await expect(lead.locator('a[href="null"], a[href=""]')).toHaveCount(0)
})
```

  Add a fixture `HOME_PUBLICATIONS_UNSLUGGED_FIXTURE`: `HOME_PUBLICATIONS_FIXTURE` with element 0 set to `href: null`. Add a gallery instance with `data-testid="gallery-home-unslugged"` that renders it, as a full-width frame following the existing `gallery-home` pattern (grid `col-span-full`).
- [ ] **Step 2: Run the tests and confirm they fail.**
- [ ] **Step 3: Implement `LeadPublication`** and the new `RecentWorkBlock`, using `splitLead(publications)`.
- [ ] **Step 4: Run the tests.** Also confirm:
  - The ledger-overflow checks in `e2e/home.spec.ts` and on `/publications` are still green.
  - The lead title at 320px passes the typography raw-split detector. Add `home-lead-paper h3` to the typography budget as a heading-level fixture: give the gallery lead a title containing "Neurodegenerative", and extend `e2e/typography.spec.ts`'s fixture list with it.
  - The label budget stays at 0.
- [ ] **Step 5: Run the gates, then commit.** Commit message: `feat(home): recent papers lead with the newest paper; unslugged titles stay unlinked`.

---

### Task 4: Research cards

**Files:**
- Modify: `components/redesign/screens/Home.tsx`, `app/page.tsx`, `components/redesign/fixtures.ts`, `app/preview/components/Gallery.tsx`, `e2e/home.spec.ts`
- Test: `e2e/home.spec.ts`

**Interfaces:**
- Consumes: `researchCards`, `ResearchCard` (Task 1), `researchProjectsQuery`, `toResearchView`, `SiteCopyPayload['about']['themes']`.
- Produces: the `Home` prop `researchProjects: ResearchProjectView[]`. The block is `data-testid="home-research"`, and each card is `data-testid="home-research-card"`.

**The design:**

- **Section:** labelled "Research", `labelHeading`. It renders only when `researchCards(...)` is non-empty.
- **Grid:** `grid grid-cols-1 gap-6 md:grid-cols-2`.
- **Card:** `<article data-testid="home-research-card" className="min-w-0 border-t border-rule pt-5">`, containing:
  - the optional cover: `next/image` with the view's `src`/`width`/`height`/`alt`, `sizes="(min-width: 768px) 50vw, 100vw"`, `className="aspect-[16/10] w-full object-cover"`, wrapped in `overflow-hidden`;
  - the title as an `<h3 className="mt-4 text-pretty break-words text-[1.25rem] font-semibold leading-[1.25]">`. It is a link when `href` is set, and plain text for themes;
  - the excerpt as a `<p className="mt-2 text-body text-text-muted">`, only when it's non-empty.
- **After the grid:** always add an "Our research →" link to `/research` (`text-[0.9375rem] font-medium text-link`). There is no show flag for Research, and the page exists even when it lists nothing.
- **Data:** in `app/page.tsx`, fetch `researchProjectsQuery` (`stega: false`), map it with `toResearchView`, and pass the result. The research revalidation case already revalidates `/`; confirm it in `route.ts`, where the `project` case includes `/`.

**Steps:**

- [ ] **Step 1: Write the failing e2e.**

```ts
test('research cards come from researchOrder projects, else siteCopy themes, else no block', async ({ page }) => {
  const projects = await e2eClient.fetch(`*[_type=="project" && defined(researchOrder)]|order(researchOrder asc){title, "slug": slug.current}`)
  const themes = await e2eClient.fetch(`*[_type=="siteCopy"][0].about.themes[defined(title) && title != ""]{title}`)
  await page.goto('/')
  const cards = page.getByTestId('home-research-card')
  if (projects.length > 0) {
    await expect(cards).toHaveCount(projects.length)
    for (const [i, p] of projects.entries()) {
      await expect(cards.nth(i).locator('h3')).toContainText(p.title.trim())
      if (p.slug) await expect(cards.nth(i).locator(`h3 a[href="/research#${p.slug}"]`)).toHaveCount(1)
    }
  } else if ((themes ?? []).length > 0) {
    await expect(cards).toHaveCount(themes.length)
    await expect(cards.locator('h3 a')).toHaveCount(0)
  } else {
    await expect(page.getByTestId('home-research')).toHaveCount(0)
  }
})

test('/research#<slug> targets exist for every project card link', async ({ page }) => {
  await page.goto('/')
  const hrefs = await page.getByTestId('home-research-card').locator('h3 a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
  for (const href of hrefs.filter((h): h is string => Boolean(h?.includes('#')))) {
    await page.goto(href)
    const id = href.split('#')[1]
    await expect(page.locator(`[id="${id}"]`)).toHaveCount(1)
  }
})
```

  Add gallery instances:
  - `gallery-home-a` gets 3 project views, reusing the Research gallery fixture views, at least one with a cover.
  - `gallery-home-b` gets `[]` plus a themes-only `siteCopy`, with themes whose summaries start with "- ".

  Add an e2e asserting that `gallery-home-b`'s card text contains no leading "- ".
- [ ] **Step 2: Run the tests and confirm they fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests and checks.**
  - Check that nothing overflows at 320–1440.
  - Run css:proof for `.md\:grid-cols-2` and `.aspect-\[16\/10\]`.
  - Run axe, and confirm no image fails the alt rule. The cover's alt comes from the view; when it's empty, the image is decorative and the title labels the card.
- [ ] **Step 5: Run the gates, then commit.** Commit message: `feat(home): research as cards linking to /research#slug`.

---

### Task 5: People strip, MAESTRO card, final block order

**Files:**
- Modify: `components/redesign/screens/Home.tsx`, `components/redesign/fixtures.ts`, `app/preview/components/Gallery.tsx`, `e2e/home.spec.ts`, `e2e/label-budget.spec.ts` (only if a selector changes)
- Test: `e2e/home.spec.ts`

**Interfaces:**
- Consumes: `peopleStrip`, `maestroOverview`, `currentMemberCount`, `shouldShowLabHeadCard` (Task 1), `PortraitFrame`/`PORTRAIT_IMAGE_CLASS` (`PersonCard.tsx`), `urlForImage`, `PortableBody`.
- Produces: final `data-testid`s. `home-people` holds `home-people-portrait` ×n, plus `home-meet-the-lab` and `home-support`. `home-maestro` keeps `maestro-title` and `home-maestro-register`. `TheLabBlock` is deleted, and so are `home-member-count` and its e2e, whose checks move into `home-meet-the-lab`.

**The design:**

- **Final order, each block omitted when empty:**

  | # | Block | Label |
  |---|---|---|
  | 1 | Hero | none |
  | 2 | Recent papers | "Recent papers" |
  | 3 | Research | "Research" |
  | 4 | People | "People" |
  | 5 | Resource | "Resources", unchanged |
  | 6 | MAESTRO | "Outreach", no longer `inverse` |
- **People block** renders when `memberCount > 0 || supportPage`. `memberCount` is `currentMemberCount(profiles, roleGroups, showLabHeadCard ? labHead._id : null)`, unchanged.
  - **Portraits:** `peopleStrip(profiles, roleGroups, labHead?._id ?? null)`. The lab head is always excluded here, because the hero names them. Lay out as `grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4`. Each item is a `<figure data-testid="home-people-portrait" className="min-w-0">` holding:
    - a 4:5 portrait: `PortraitFrame`, if it accepts `img`/`name` without forcing a width collision; otherwise a dedicated `aspect-[4/5] w-full` box with `next/image fill sizes="(min-width: 640px) 25vw, 50vw" className={PORTRAIT_IMAGE_CLASS}`, `alt=""`;
    - a `<figcaption className="mt-2 text-[0.875rem] font-medium break-words">{name}</figcaption>`.

    The figure isn't a link. Omit the grid when the strip is empty.
  - **Links:** a row, `mt-6 flex flex-wrap gap-x-8 gap-y-3`, holding:
    - `home-meet-the-lab`: a link to `/people` reading `Meet the lab — {memberCount} {memberCount === 1 ? 'person' : 'people'} →`, only when `settings.showPeople !== false && memberCount > 0`;
    - `home-support`: "Support our research →", when `supportPage` exists.
- **MAESTRO card.** The Section isn't `inverse` any more. The content is:
  - an `<article data-testid="home-maestro" className="max-w-[45rem]">`;
  - the title, `<h3 data-testid="maestro-title" data-cms-verbatim className="text-pretty break-words text-heading font-semibold">`;
  - `<PortableBody blocks={maestroOverview(maestro.overview, maestro.site)} variant="body" />`;
  - one link when `site` is set: `<a data-testid="home-maestro-register" href={site} className="mt-5 inline-block text-[0.9375rem] font-medium text-link">Register for MAESTRO talks →</a>`. The text isn't the URL, so it gets no `data-identifier`.
- **Cleanup.** Delete from `Home.tsx`: `TheLabBlock`, `LAB_GRID`, `siteLabel`, the inverse Outreach styling, and any imports that are now unused.

**Steps:**

- [ ] **Step 1: Write the failing e2e.**

```ts
test('people strip: ≤ 8 current members with photos, never the lab head or alumni; meet-the-lab count matches /people', async ({ page }) => {
  const s = await e2eClient.fetch(`*[_type=="settings"][0]{showPeople, showLabHeadOnHome, labHead->{_id, name}}`)
  await page.goto('/')
  const portraits = page.getByTestId('home-people-portrait')
  expect(await portraits.count()).toBeLessThanOrEqual(8)
  if (s?.labHead?.name) await expect(portraits.filter({ hasText: s.labHead.name.trim() })).toHaveCount(0)
  const meet = page.getByTestId('home-meet-the-lab')
  if ((await meet.count()) > 0) {
    const n = Number((await meet.innerText()).match(/(\d+)\s+(?:people|person)/)?.[1])
    await page.goto('/people')
    // /people's own meta line reports its current-member count; keep the existing cross-check helper
    // from the old home-member-count test (move it here unchanged).
    expect(n).toBeGreaterThan(0)
  }
})

test('the lab head is named exactly once on Home', async ({ page }) => {
  const s = await e2eClient.fetch(`*[_type=="settings"][0]{showLabHeadOnHome, labHead->{name}}`)
  const name = s?.labHead?.name?.trim()
  test.skip(!name || s.showLabHeadOnHome === false, 'no lab head shown on Home in this dataset')
  await page.goto('/')
  const count = await page.locator('main').evaluate((main, n) => {
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT)
    let c = 0
    for (let t = walker.nextNode(); t; t = walker.nextNode()) if ((t.textContent ?? '').includes(n)) c++
    return c
  }, name!)
  expect(count).toBe(1)
})

test('MAESTRO is a normal card with exactly one register link', async ({ page }) => {
  const m = await e2eClient.fetch(`*[_type=="project" && slug.current=="maestro"][0]{site}`)
  await page.goto('/')
  const card = page.getByTestId('home-maestro')
  if (!m) { await expect(card).toHaveCount(0); return }
  await expect(card.getByTestId('home-maestro-register')).toHaveCount(m.site ? 1 : 0)
  if (m.site) {
    const bare = m.site.replace(/^https?:\/\//, '').replace(/\/$/, '')
    await expect(card.locator(`a[href*="${bare}"]`)).toHaveCount(1)
  }
})
```

  Replace the old `home-member-count` tests with the "meet the lab" version. Keep its /people cross-check logic, and move the helper unchanged.

  Add gallery fixtures:
  - `gallery-home-a` has 10 current members with images, so the strip caps at 8, plus one alumnus with an image and the lab head with an image;
  - `gallery-home-c` has 2 current members, only 1 of them with an image.

  Add e2e cases:
  - `a` has 8 portraits and none is the lab head or the alumnus;
  - `c` has 1 portrait and reads "Meet the lab — 2 people".
- [ ] **Step 2: Run the tests and confirm they fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests and checks.**
  - All of `e2e/home.spec.ts` passes, along with label-budget, typography, section-label, preview-scrollbar and axe in light and dark.
  - No horizontal overflow at 320, 375, 768, 1024, 1280 and 1440 on `/` and `/preview/components`.
  - Run css:proof for each new class.
- [ ] **Step 5: Run the gates, then commit.** Commit message: `feat(home): people strip with meet-the-lab, MAESTRO as a normal card, PI named once`.

---

### Task 6: Docs

**Files:**
- Modify: `docs/redesign-experiment/phase-3-decisions.md`, `docs/superpowers/specs/2026-09-23-redesign-revision-design.md`, `docs/redesign-experiment/preview-walkthrough.md`

- [ ] **Step 1: `phase-3-decisions.md`.** Add a "Revision PR 2 — Home" section covering:
  - **The editorial-fields relaxation.** Home now reads `siteCopy` (`about.body`, `hero.subheading`, `about.themes`). This relaxes the IA's "zero editorial fields on Home" rule, accepted by the command centre on Brett's behalf on 2026-09-23.
  - The statement fallback chain as shipped, including `home.overview` before the IA tagline, and why.
  - The research-card source and its fallback.
  - The people-strip rules: ≤ 8, photo required, lab head and alumni excluded, orderRank order.
  - MAESTRO's echoed-URL filter, `maestroOverview`, and why it doesn't break the CMS-verbatim rule: the card's single register link carries the same URL.
  - The PI named once, and the "The lab" block removed.
  - The unslugged-lead fallback.
  - The `siteCopy` revalidation case, and whether the Sanity webhook's filter needs `siteCopy` adding. That is a manual step for Brett.
  - The deferred items now closed: stacked labels, and the PI named twice.
  - A verification table.
- [ ] **Step 2: The spec.** Record the one deviation: `home.overview` sits between `hero.subheading` and the IA tagline in the statement chain.
- [ ] **Step 3: `preview-walkthrough.md`.** Update the Home paragraph so it describes the new blocks, and which CMS content fills each one.
- [ ] **Step 4: Commit.** Commit message: `docs: revision PR 2 (Home) decisions`.
