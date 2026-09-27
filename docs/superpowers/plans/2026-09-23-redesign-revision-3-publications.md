# Redesign revision PR 3 — Publications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the publications chip band with native `<select>` filters (and a "Filter (n)" sheet below `md`), remove the density toggle, get the first paper above the fold on a phone, and give the paper page a "Read paper ↗" button, plain DOI data and one citation block.

**Architecture:** A pure `filterModel.ts` owns filter state shape, option lists and the active count. `FilterSelects` renders three labelled native selects. `FilterBar` composes them: a desktop row from `md`, and a Headless UI `Dialog` sheet below `md`. `PublicationsIndex` keeps one `Filters` state and passes it to both. The old `FacetBand`/`FacetChip`/density code is deleted, not left as dead code. The paper page swaps its "Canonical link" column for a primary button and a DOI data line.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind 4, Headless UI 2.2.10 `Dialog`, Vitest, Playwright (projects `chromium`, `mobile-safari` = iPhone 13 WebKit, `mobile-chrome` = Pixel 7).

**Spec:** `docs/superpowers/specs/2026-09-23-redesign-revision-design.md` §PR 3. Also read `docs/redesign-experiment/phase-3-decisions.md` "Deferred to PR 2–4" (findings 6 and 11).

**Base:** branch `redesign/revision-publications` off `redesign/integration` at `f60dd70` (PR #51 merged, so the mobile projects run in CI).

## Global Constraints

- Never write to any Sanity dataset. Never touch `main`. Never bare `git stash`. Never `npm audit fix --force`.
- e2e must hold for **any valid dataset**. Expectations come from the page itself or from `e2eClient` (`e2e/support/sanity.ts`); states the dataset can't guarantee go on gallery fixtures at `/preview/components` (`app/preview/components/Gallery.tsx`, `components/redesign/fixtures.ts`).
- The suite runs on three Playwright projects. A test that needs the desktop row sets its own viewport (`page.setViewportSize({ width: 1280, height: 900 })`); a test that needs the sheet sets `{ width: 375, height: 812 }`. No project-name skips unless a limit is measured and stated.
- Tailwind 4: never two utilities setting the same property at the same breakpoint on one element; use `h-(--x)` for bare custom properties; base CSS rules are unlayered, so overriding them needs `!`. Prove every new arbitrary-value utility with `npm run css:proof -- --grep '<class selector>'`.
- No unspaced `calc(`: WebKit drops the whole declaration.
- Label budget ≤ 6 shouted labels per page at 1440 and 375 (`e2e/label-budget.spec.ts`). All new labels are sentence-case Archivo (`MICRO_LABEL` in `components/redesign/tokens.ts`).
- Identifiers (DOI, URL) print verbatim: `normal-case!`, `data-identifier`, `data-cms-verbatim`, `break-all`.
- Comments state the current reason only — no task numbers, review rounds or history.
- Implementation subagents use Sonnet.
- Local e2e: `rm -rf .next/cache/fetch-cache` first. `:3000` may belong to another worktree — use an untracked `playwright.alt.config.ts` (spread the base config; `webServer.command: 'npm run build && npx next start -p 3100'`, `url`/`baseURL` `http://localhost:3100`, `reuseExistingServer: false`) and delete it before committing. Afterwards `git checkout origin/redesign/integration -- next-env.d.ts`; delete any generated `AGENTS.md`/`CLAUDE.md`.
- Gates per task: `npm run type-check`, `npm run lint` (0 errors, 4 warnings), `npx vitest run`, `npm run build`, full e2e on all three projects (`npx playwright test -c playwright.alt.config.ts`).
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rulings this plan takes (record them in the decisions doc, Task 3)

1. **No separate "Filter" section.** The filters sit at the top of the "Record" section. This closes finding 6 by construction (no label floating above a band, and the section's own full-width top rule replaces the band's column-only hairline). It also avoids "Filter" / "Filter (n)" stacking below `md`.
2. **Options carry counts**, e.g. `2025 (4)`. A group with no values (e.g. Type before the type backfill) is not rendered.
3. **Selects apply immediately.** The sheet's "Show N results" just closes it; there is no pending/apply state.
4. **Selects are 16px** so iOS Safari doesn't zoom the page on focus.
5. **Deleted, not deprecated:** `FacetBand`, `FacetChip`, `toggleFacet`, `PublicationRow`'s `density` prop and compact branch, and `CopyCitation`'s `compact` prop (its only caller is the compact branch).
6. **Paper page:** the DOI prints as plain data, not a second link (the button is the link). A URL-fallback paper shows the button only. "Cite and access" becomes "Citation" with no sub-labels, which closes finding 11.
7. **Primary button** uses the ON-chip ink fill (`bg-surface-inverse text-text-inverse`), already contrast-guarded in `styles/tokens.test.ts`.
8. **Filter state is not synced to the URL** (not in the spec).

## Review Focus

1. **iOS focus zoom.** A select under 16px makes iOS Safari zoom the page on tap. Expect: every filter select computes `font-size >= 16px` (Task 1 e2e).
2. **Widening with the sheet open.** Open the sheet at 375px, resize to 1024px. Expect: the sheet closes and body scroll unlocks, as `MobileHeader` does (Task 1 e2e).
3. **One state across breakpoints.** Set Year on the desktop row, narrow to 375px. Expect: the button reads "Filter (1)" and the sheet's Year select shows the same value (Task 2 e2e).
4. **Sparse datasets.** No `type` values (backfill not run) or no topics. Expect: that select is absent, never an "All"-only select; the other filters still work (Task 1 unit + gallery fixture).
5. **Paper with no canonical link.** Expect: no "Read paper" button, no DOI line, citation still renders, no crash (Task 3 gallery fixture + e2e).

---

### Task 1: Filter model, `FilterSelects`, `FilterBar` and the gallery fixture

**Files:**
- Create: `components/redesign/filterModel.ts`, `components/redesign/filterModel.test.ts`
- Create: `components/redesign/FilterSelects.tsx`, `components/redesign/FilterBar.tsx`
- Modify: `app/preview/components/Gallery.tsx` (add a `gallery-filter-bar` section; leave the old facet-band section for Task 2 to delete)
- Modify: `e2e/redesign-components.spec.ts` (new gallery tests)

**Interfaces:**
- Produces (Task 2 relies on these exact names):

```ts
// components/redesign/filterModel.ts
export type Filters = { year: string | null; type: string | null; topic: string | null }
export const NO_FILTERS: Filters
export type FilterKey = keyof Filters
export interface FilterOption { value: string; label: string } // label e.g. "2025 (4)"
export type FilterOptions = Record<FilterKey, FilterOption[]>
export const TYPE_ORDER: readonly string[] // ['Article', 'Review', 'Case report']
export function filterOptions(pubs: Publication[], topicOrder: readonly string[]): FilterOptions
export function activeFilterCount(f: Filters): number

// components/redesign/FilterBar.tsx
export interface FilterBarProps {
  options: FilterOptions
  value: Filters
  onChange: (next: Filters) => void
  resultCount: number
}
export function FilterBar(props: FilterBarProps): JSX.Element
```

- Consumes: `countBy` from `components/redesign/facets.ts`; `Publication` from `publicationModel.ts`; `MICRO_LABEL`, `HAIRLINE`, `PRESS` from `tokens.ts`; `Button` from `Button.tsx`.

- [ ] **Step 1: Write the failing unit tests** in `components/redesign/filterModel.test.ts`. Reuse the `pub()` factory shape from `facets.test.ts` (copy it; don't import from a test file).

```ts
import { describe, expect, it } from 'vitest'

import { activeFilterCount, filterOptions, NO_FILTERS } from './filterModel'
import type { Publication } from './publicationModel'

const pub = (over: Partial<Publication>): Publication => ({
  id: 'p1', href: null, year: '2023', dateLabel: '', title: 't',
  authorsPre: '', authorsPI: '', authorsPost: '', journal: 'j', ref: 'r',
  linkKind: 'DOI', linkLabel: 'l', linkHref: 'h', type: 'Article', topics: [],
  cite: 'c', abstract: [], resources: [], ...over,
})
const TOPICS = ['Glia', 'Gut', 'Unused'] as const

describe('filterOptions', () => {
  it('lists years newest first, with counts', () => {
    const o = filterOptions([pub({ year: '2020' }), pub({ year: '2023' }), pub({ year: '2023' })], TOPICS)
    expect(o.year).toEqual([
      { value: '2023', label: '2023 (2)' },
      { value: '2020', label: '2020 (1)' },
    ])
  })

  it('orders types by TYPE_ORDER and drops types with no papers', () => {
    const o = filterOptions([pub({ type: 'Review' }), pub({ type: 'Article' })], TOPICS)
    expect(o.type.map((x) => x.value)).toEqual(['Article', 'Review'])
  })

  it('returns no type options when no paper has a type', () => {
    const o = filterOptions([pub({ type: '' }), pub({ type: '' })], TOPICS)
    expect(o.type).toEqual([])
  })

  it('orders topics by the given order and drops unused ones', () => {
    const o = filterOptions([pub({ topics: ['Gut', 'Glia'] }), pub({ topics: ['Gut'] })], TOPICS)
    expect(o.topic).toEqual([
      { value: 'Glia', label: 'Glia (1)' },
      { value: 'Gut', label: 'Gut (2)' },
    ])
  })

  it('ignores a blank year', () => {
    const o = filterOptions([pub({ year: '' })], TOPICS)
    expect(o.year).toEqual([])
  })
})

describe('activeFilterCount', () => {
  it('is 0 with no filters', () => expect(activeFilterCount(NO_FILTERS)).toBe(0))
  it('counts each set filter', () =>
    expect(activeFilterCount({ year: '2023', type: null, topic: 'Glia' })).toBe(2))
})
```

- [ ] **Step 2: Run** `npx vitest run components/redesign/filterModel.test.ts`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement** `components/redesign/filterModel.ts`:

```ts
import { countBy } from './facets'
import type { Publication } from './publicationModel'

export type Filters = { year: string | null; type: string | null; topic: string | null }
export type FilterKey = keyof Filters
export interface FilterOption { value: string; label: string }
export type FilterOptions = Record<FilterKey, FilterOption[]>

export const NO_FILTERS: Filters = { year: null, type: null, topic: null }

// Fixed presentation order for publication types.
export const TYPE_ORDER: readonly string[] = ['Article', 'Review', 'Case report']

function withCounts(values: readonly string[], counts: Record<string, number>): FilterOption[] {
  return values
    .filter((v) => v && (counts[v] ?? 0) > 0)
    .map((v) => ({ value: v, label: `${v} (${counts[v]})` }))
}

export function filterOptions(pubs: Publication[], topicOrder: readonly string[]): FilterOptions {
  const years = countBy(pubs, (p) => p.year)
  const types = countBy(pubs, (p) => p.type)
  const topics = countBy(pubs, (p) => p.topics)
  const yearValues = Object.keys(years).sort((a, b) => (a < b ? 1 : -1))
  return {
    year: withCounts(yearValues, years),
    type: withCounts(TYPE_ORDER, types),
    topic: withCounts(topicOrder, topics),
  }
}

export function activeFilterCount(f: Filters): number {
  return [f.year, f.type, f.topic].filter(Boolean).length
}
```

- [ ] **Step 4: Run** the unit tests. Expected: PASS.

- [ ] **Step 5: Implement `FilterSelects.tsx`** (`'use client'`). One labelled native select per non-empty group, each with an "All" option (`value=""`). Groups with zero options are not rendered.

```tsx
'use client'

import type { FilterKey, FilterOptions, Filters } from './filterModel'
import { MICRO_LABEL } from './tokens'

const GROUPS: { key: FilterKey; label: string }[] = [
  { key: 'year', label: 'Year' },
  { key: 'type', label: 'Type' },
  { key: 'topic', label: 'Topic' },
]

// 16px: iOS Safari zooms the page when a focused control's text is smaller.
// Native `appearance` keeps the platform picker and its own chevron.
const SELECT =
  'mt-1.5 block min-h-11 w-full min-w-0 border border-rule-strong bg-surface px-3 font-sans text-[16px] leading-[1.25] text-text'

export interface FilterSelectsProps {
  options: FilterOptions
  value: Filters
  onChange: (next: Filters) => void
  /** Prefix for element ids; the desktop row and the sheet each pass their own. */
  idPrefix: string
  /** Grid classes for the wrapper; the row and the sheet lay out differently. */
  className: string
}

export function FilterSelects({ options, value, onChange, idPrefix, className }: FilterSelectsProps) {
  return (
    <div className={className}>
      {GROUPS.filter((g) => options[g.key].length > 0).map((g) => {
        const id = `${idPrefix}-${g.key}`
        return (
          <div key={g.key} className="min-w-0">
            <label htmlFor={id} className={MICRO_LABEL}>
              {g.label}
            </label>
            <select
              id={id}
              className={SELECT}
              value={value[g.key] ?? ''}
              onChange={(e) => onChange({ ...value, [g.key]: e.target.value || null })}
            >
              <option value="">All</option>
              {options[g.key].map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 6: Implement `FilterBar.tsx`** (`'use client'`). From `md`: one row of selects plus a "Clear" text button when any filter is set. Below `md`: a "Filter (n)" button opening a bottom sheet. The sheet has a `DialogTitle` "Filter publications", a Close button, the same selects (different `idPrefix`), Clear, and a primary "Show N results" button that closes it. Close the sheet when the viewport reaches `md` (copy `MobileHeader.tsx`'s `matchMedia('(min-width: 48rem)')` effect). A single polite status line announces the result count.

```tsx
'use client'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useEffect, useState } from 'react'

import { Button } from './Button'
import { activeFilterCount, type FilterOptions, type Filters, NO_FILTERS } from './filterModel'
import { FilterSelects } from './FilterSelects'

export interface FilterBarProps {
  options: FilterOptions
  value: Filters
  onChange: (next: Filters) => void
  resultCount: number
}

const TEXT_BUTTON = 'min-h-11 font-sans text-[15px] font-medium text-link'

export function FilterBar({ options, value, onChange, resultCount }: FilterBarProps) {
  const [open, setOpen] = useState(false)
  const active = activeFilterCount(value)
  const clear = () => onChange(NO_FILTERS)
  const results = `${resultCount} ${resultCount === 1 ? 'result' : 'results'}`

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 48rem)')
    const onChangeMq = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false)
    }
    mq.addEventListener('change', onChangeMq)
    return () => mq.removeEventListener('change', onChangeMq)
  }, [])

  return (
    <div data-testid="filter-bar">
      <p role="status" className="sr-only">
        {results}
      </p>

      <div data-testid="filter-row" className="hidden items-end gap-x-6 md:flex">
        <FilterSelects
          options={options}
          value={value}
          onChange={onChange}
          idPrefix="filter"
          className="grid flex-1 grid-cols-3 gap-x-4"
        />
        {active > 0 && (
          <button type="button" className={TEXT_BUTTON} onClick={clear}>
            Clear
          </button>
        )}
      </div>

      <div className="md:hidden">
        <Button onClick={() => setOpen(true)}>{active > 0 ? `Filter (${active})` : 'Filter'}</Button>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-surface-inverse/40" aria-hidden="true" />
        <DialogPanel
          data-testid="filter-sheet"
          className="fixed inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto border-t border-rule bg-surface px-(--spacing-gutter) pt-5 pb-8"
        >
          <div className="flex items-center justify-between">
            <DialogTitle className="font-sans text-[17px] font-semibold">Filter publications</DialogTitle>
            <button type="button" className={TEXT_BUTTON} onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          <FilterSelects
            options={options}
            value={value}
            onChange={onChange}
            idPrefix="filter-sheet"
            className="mt-4 grid grid-cols-1 gap-y-4"
          />
          <div className="mt-6 flex items-center justify-between gap-4">
            {active > 0 ? (
              <button type="button" className={TEXT_BUTTON} onClick={clear}>
                Clear
              </button>
            ) : (
              <span />
            )}
            <Button variant="primary" onClick={() => setOpen(false)}>
              Show {results}
            </Button>
          </div>
        </DialogPanel>
      </Dialog>
    </div>
  )
}
```

`Button` has no `variant` prop yet. Add it here (Task 3 relies on it too):

```ts
// components/redesign/Button.tsx — new props
variant?: 'default' | 'primary'
/** Opens `href` in a new tab with rel="noopener noreferrer". */
external?: boolean
```

For `variant="primary"`, use a complete separate class string (never layered on `SHAPE`, which sets the mono font/size and `bg-transparent`):

```ts
const PRIMARY = 'inline-flex min-h-11 items-center justify-center gap-2 px-5 font-sans text-[15px] leading-none font-medium border border-surface-inverse bg-surface-inverse text-text-inverse hl-press active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-[0.45]'
```

`active` is ignored when `variant="primary"`. With `href` and `external`, render `<a target="_blank" rel="noopener noreferrer">`. Check `bg-surface-inverse/40` generates (css:proof); if the token can't take an alpha modifier, use a solid `bg-surface-inverse opacity-40` backdrop instead.

- [ ] **Step 7: Add the gallery fixture.** In `Gallery.tsx`, add `<section data-testid="gallery-filter-bar">` with a `Heading` "Filter bar", holding a `FilterBar` driven by local `Filters` state over `SAMPLE_PUBLICATIONS` (`filterOptions(SAMPLE_PUBLICATIONS, TOPIC_TITLES)`, rows via `applyFacets`), and a `<span data-testid="filter-result-count">` showing the filtered count. Add a second instance, `data-testid="gallery-filter-bar-sparse"`, over a copy of `SAMPLE_PUBLICATIONS` with `type: ''` on every paper (Review Focus 4).

- [ ] **Step 8: Write the gallery e2e** in `e2e/redesign-components.spec.ts` (inside the existing gallery `describe`, which already navigates to `/preview/components`):

```ts
test('filter bar: a Year select filters, and Clear restores', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const bar = page.getByTestId('gallery-filter-bar')
  const count = bar.getByTestId('filter-result-count')
  const total = await count.textContent()
  await bar.getByTestId('filter-row').getByLabel('Year').selectOption({ index: 1 })
  await expect(count).not.toHaveText(total!)
  await bar.getByRole('button', { name: 'Clear' }).click()
  await expect(count).toHaveText(total!)
})

test('filter selects are at least 16px so iOS does not zoom on focus', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const sizes = await page
    .getByTestId('gallery-filter-bar')
    .locator('select')
    .evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent).map((e) => parseFloat(getComputedStyle(e).fontSize)))
  expect(sizes.length).toBeGreaterThan(0)
  for (const s of sizes) expect(s).toBeGreaterThanOrEqual(16)
})

test('a filter group with no values is not rendered', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const row = page.getByTestId('gallery-filter-bar-sparse').getByTestId('filter-row')
  await expect(row.getByLabel('Year')).toBeVisible()
  await expect(row.getByLabel('Type')).toHaveCount(0)
})

test('below md, Filter (n) opens a sheet, Show N results closes it', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const bar = page.getByTestId('gallery-filter-bar')
  await expect(bar.getByTestId('filter-row')).toBeHidden()
  await bar.getByRole('button', { name: 'Filter', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Filter publications' })
  await expect(sheet).toBeVisible()
  await sheet.getByLabel('Year').selectOption({ index: 1 })
  await sheet.getByRole('button', { name: /^Show \d+ results?$/ }).click()
  await expect(sheet).toBeHidden()
  await expect(bar.getByRole('button', { name: 'Filter (1)' })).toBeVisible()
})

test('widening past md closes the filter sheet and unlocks scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const bar = page.getByTestId('gallery-filter-bar')
  await bar.getByRole('button', { name: 'Filter', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Filter publications' })).toBeVisible()
  await page.setViewportSize({ width: 1024, height: 812 })
  await expect.poll(() => page.evaluate(() => matchMedia('(min-width: 48rem)').matches)).toBe(true)
  await expect(page.getByRole('dialog', { name: 'Filter publications' })).toBeHidden()
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe('hidden')
})

test('the open filter sheet has no axe violations', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.getByTestId('gallery-filter-bar').getByRole('button', { name: 'Filter', exact: true }).click()
  const sheet = page.getByTestId('filter-sheet')
  await expect(sheet).toBeVisible()
  const results = await new AxeBuilder({ page }).include('[data-testid="filter-sheet"]').analyze()
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
})
```

If the sheet gets a `transition`, wait for it to settle before axe (poll computed opacity to `'1'` and no `data-enter`/`data-transition` attribute), as `e2e/mobile-menu.spec.ts` does. The plan's sheet has no transition, so this should not be needed.

- [ ] **Step 9: Run** the new gallery tests on all three projects, then the full gates. Prove each new arbitrary utility with `npm run css:proof -- --grep '<selector>'` (e.g. `max-h-\[85dvh\]`, `text-\[16px\]`, `bg-surface-inverse\/40`). Expected: all pass.

- [ ] **Step 10: Commit** `feat(publications): native select filters with a mobile sheet`.

---

### Task 2: Wire the filters into Publications and delete the chip band and density

**Files:**
- Modify: `components/redesign/screens/PublicationsIndex.tsx`
- Delete: `components/redesign/FacetBand.tsx`, `components/redesign/FacetChip.tsx`
- Modify: `components/redesign/facets.ts` and `facets.test.ts` (remove `toggleFacet` and its tests)
- Modify: `components/redesign/PublicationRow.tsx` (remove the `density` prop and compact branch)
- Modify: `components/redesign/CopyCitation.tsx` (remove the `compact` prop if nothing else passes it; `git grep -n "compact" -- components app` to confirm)
- Modify: `app/preview/components/Gallery.tsx` (remove the facet-band section, the "Compact density" sample, the density state, and every `density=` prop; retitle "Comfortable density" to "Default")
- Modify: `e2e/publications-interactive.spec.ts`, `e2e/nav-logo.spec.ts`, `e2e/redesign-components.spec.ts`, and any other spec that references `facet-band`, `aria-pressed` chips, "Compact" or "Density" (`git grep -n "facet-band\|Compact\|Density\|aria-pressed" -- e2e`)

**Interfaces:**
- Consumes: `Filters`, `NO_FILTERS`, `filterOptions`, `FilterBar` from Task 1; `applyFacets` from `facets.ts` (unchanged signature, takes a `Filters`-shaped object).

- [ ] **Step 1: Write the failing e2e** in `e2e/publications-interactive.spec.ts`. Replace the chip tests ("clicking a Year chip…", "the Type group…", "an impossible year+type…") with select-driven equivalents, delete the density test, and update the "ledger cells" comment that mentions Compact. Each desktop test sets `{ width: 1280, height: 900 }` first. Locate selects as `page.getByTestId('filter-row').getByLabel('Year')`. Pick the option to select from the page itself (`locator('option').nth(1)` value), never hardcoded. Keep the Type skip wording (Type select absent ⇒ backfill hasn't run).

Add these tests:

```ts
test('the first paper is visible without scrolling at 375x812', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/publications')
  const title = page.locator('[data-testid="pub-row"]').first().getByTestId('pub-title')
  const box = await title.boundingBox()
  expect(box).not.toBeNull()
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  expect(box!.y + box!.height).toBeLessThanOrEqual(812)
})

test('filter state is shared between the desktop row and the mobile sheet', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/publications')
  const year = page.getByTestId('filter-row').getByLabel('Year')
  const value = await year.locator('option').nth(1).getAttribute('value')
  await year.selectOption(value!)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.getByRole('button', { name: 'Filter (1)' }).click()
  await expect(page.getByRole('dialog', { name: 'Filter publications' }).getByLabel('Year')).toHaveValue(value!)
})

test('the filters sit at the top of the Record section, under its full-width rule', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/publications')
  const section = page.locator('section', { has: page.getByTestId('filter-bar') })
  await expect(section.getByTestId('section-label')).toHaveText('Record')
  const [sectionBox, rowBox, labelBox] = await Promise.all([
    section.boundingBox(),
    page.getByTestId('filter-row').boundingBox(),
    section.getByTestId('section-label').boundingBox(),
  ])
  // The label lines up with the filter row, not floating above it.
  expect(Math.abs(labelBox!.y - rowBox!.y)).toBeLessThanOrEqual(4)
  // The top rule belongs to the section, which spans the page width.
  expect(await section.evaluate((el) => getComputedStyle(el).borderTopWidth)).not.toBe('0px')
  expect(sectionBox!.width).toBeGreaterThanOrEqual(1440 - 20)
})
```

Replace `e2e/nav-logo.spec.ts`'s "the FacetBand is never sticky" block with the same checks against `page.getByTestId('filter-bar')` (rename the describe to "the filter bar is never sticky"). In `e2e/redesign-components.spec.ts`, delete the facet-chip tests and the ON/OFF-chip axe tests (light and dark), remove `'facet-band'` from the section list at the top if it lists gallery section ids, and add `'filter-bar'` if that list must match the gallery.

- [ ] **Step 2: Run** those specs. Expected: FAIL (no `filter-bar` on `/publications` yet).

- [ ] **Step 3: Rewrite `PublicationsIndex.tsx`.** One `Filters` state; options from `filterOptions(publications, TOPIC_TITLES)`; rows from `applyFacets(publications, filters)`. Remove the "Filter" `Section`, the density state and the `FacetBand` import. The "Record" `Section` uses the default `borderTop` and keeps `padTop="32px"`; its content is:

```tsx
<Section label="Record" labelHeading padTop="32px">
  <div className="mb-8">
    <FilterBar
      options={options}
      value={filters}
      onChange={setFilters}
      resultCount={rows.length}
    />
  </div>
  <div data-testid="ledger-head" className={`${COLUMN_HEADS} ${LABEL}`}>…unchanged…</div>
  {rows.length === 0 ? (
    <div className="flex flex-col items-start gap-4 py-8">
      <p className="text-[14px] leading-[1.5] text-text-muted">No records match these filters.</p>
      <Button onClick={() => setFilters(NO_FILTERS)}>Clear filters</Button>
    </div>
  ) : (
    rows.map((pub) => (/* same pub-row wrapper, PublicationRow without density */))
  )}
</Section>
```

If the "Record" label doesn't line up with the filter row within 4px at 1440 (it should: both are the first items of their grid cells), fix the alignment in this screen, not in `Section`.

- [ ] **Step 4: Delete** `FacetBand.tsx`, `FacetChip.tsx`, `toggleFacet` (+ its tests), `PublicationRow`'s compact branch and `density` prop, and `CopyCitation`'s `compact` prop (+ `CopyCitation.test.ts` cases for it, if any). Remove the gallery's facet-band section, compact sample and density state. `git grep -n "FacetBand\|FacetChip\|toggleFacet\|density\|compact" -- components app e2e` must return nothing relevant afterwards (the Home comment about "comfortable-density" in `e2e/home.spec.ts:490` should be reworded to drop "density").

- [ ] **Step 5: Run** the gates, including the full e2e on all three projects and `e2e/label-budget.spec.ts` at 1440 and 375. Expected: all pass.

- [ ] **Step 6: Commit** `feat(publications): select filters replace the chip band; remove density`.

---

### Task 3: Paper page — Read paper button, DOI as data, one citation block; decisions doc

**Files:**
- Modify: `components/redesign/screens/PublicationPage.tsx`
- Modify: `app/preview/components/Gallery.tsx` (add `gallery-paper-no-link`: `<PublicationPage pub={NO_LINK_PUB} />`, using the existing `NO_LINK_PUB` fixture; confirm `PublicationPage` renders in the client gallery — it has no hooks)
- Modify: `e2e/publication-page.spec.ts`, `e2e/redesign-components.spec.ts`
- Modify: `docs/redesign-experiment/phase-3-decisions.md` (new "Revision PR 3 — Publications" section)

**Interfaces:**
- Consumes: `Button` with `variant="primary"`, `href`, `external` (Task 1).

- [ ] **Step 1: Write the failing e2e** in `e2e/publication-page.spec.ts`. Rework the DOI and URL tests: the canonical identifier is no longer a second `<a data-identifier>`.

```ts
// DOI paper, after navigating to its page from the row (as today)
const readPaper = page.getByRole('link', { name: /^Read paper/ })
await expect(readPaper).toHaveAttribute('href', identifierHref!)
await expect(readPaper).toHaveAttribute('target', '_blank')
await expect(readPaper).toHaveAttribute('rel', 'noopener noreferrer')
const doi = page.getByTestId('paper-doi')
await expect(doi).toBeVisible()
expect(identifierHref).toContain((await doi.locator('[data-identifier]').textContent())!.trim())
expect(await doi.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/Plex Mono/i)
// no stacked sub-labels under the citation section label
await expect(page.getByText('Canonical link', { exact: false })).toHaveCount(0)
await expect(page.getByText('Formatted citation', { exact: true })).toHaveCount(0)
```

For the URL-fallback test: the same `readPaper` assertions, and `await expect(page.getByTestId('paper-doi')).toHaveCount(0)`.

Add:

```ts
test('the abstract is Archivo at 17px / 1.6', async ({ page }) => {
  // find a slug with an abstract via e2eClient, as the existing hasAbstract helper does;
  // test.skip with a reason if the dataset has none
  const p = page.getByTestId('paper-abstract').first()
  const s = await p.evaluate((el) => {
    const c = getComputedStyle(el)
    return { family: c.fontFamily, size: c.fontSize, lh: c.lineHeight }
  })
  expect(s.family).toMatch(/Archivo/i)
  expect(s.size).toBe('17px')
  expect(parseFloat(s.lh)).toBeCloseTo(27.2, 0)
})
```

In `e2e/redesign-components.spec.ts`:

```ts
test('a paper with no canonical link renders no Read paper button and no DOI line', async ({ page }) => {
  const s = page.getByTestId('gallery-paper-no-link')
  await expect(s.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(s.getByRole('link', { name: /^Read paper/ })).toHaveCount(0)
  await expect(s.getByTestId('paper-doi')).toHaveCount(0)
  await expect(s.getByTestId('pub-citation-box')).toBeVisible()
})
```

The gallery page will then contain two `<h1>`s if `PublicationPage`'s title is an `h1`. Check whether the gallery already renders other screen `h1`s (it passes `headingLevel` to Home's identity block); if the axe `page-has-heading-one`/duplicate checks complain, give `PaperBlock` an optional `headingLevel` prop (default `'h1'`), mirroring `PageTitle`'s, and pass `'h2'` from the gallery.

- [ ] **Step 2: Run** those specs. Expected: FAIL.

- [ ] **Step 3: Implement.** In `PaperBlock`, after the tags row, when `pub.linkHref !== ''`:

```tsx
<div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
  <Button variant="primary" href={pub.linkHref} external>
    Read paper <span aria-hidden="true">↗</span>
    <span className="sr-only"> (opens in a new tab)</span>
  </Button>
  {pub.linkKind === 'DOI' && (
    <p data-testid="paper-doi" className="mb-0! font-mono text-[13px] leading-[1.5] text-text-muted">
      DOI{' '}
      <span data-identifier data-cms-verbatim className="normal-case! break-all text-text">
        {pub.linkLabel}
      </span>
    </p>
  )}
</div>
```

Confirm `pub.linkLabel` for a DOI is the bare DOI (`10.…`), not the full URL; if it's the URL, strip `https://doi.org/` for display only. Give each abstract `<p>` `data-testid="paper-abstract"`. Replace `CiteAndAccessBlock` with a `CitationBlock` that renders only the existing citation box (`pub-citation-box`, `pub-cite-text`, `CopyCitation`), with no `MICRO_LABEL`s and no grid. Rename the block's Section label from "Cite and access" to "Citation" (`labelHeading` stays true). Remove the now-unused `IDENTIFIER` constant and `MICRO_LABEL` import if nothing else in the file uses them.

- [ ] **Step 4: Run** the gates, full e2e on all three projects, and the 320/375 overflow checks for paper pages (existing test). Expected: all pass.

- [ ] **Step 5: Write the decisions doc section.** Append "## Revision PR 3 — Publications" to `docs/redesign-experiment/phase-3-decisions.md`: what changed (one line each), the eight rulings from this plan's "Rulings" list, findings 6 and 11 marked closed with how, and a "Verification" table (gates and per-project e2e counts) filled with this task's real numbers.

- [ ] **Step 6: Commit** `feat(paper): Read paper button, DOI as data, one citation block` (code) and `docs: record revision PR 3 decisions` (doc).
