# Redesign Phase 3 step 1 — Layout and site chrome: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old `Navbar` / `Footer` chrome in `components/shared/Layout.tsx` with the redesign's `SiteNav` / `MobileHeader` / `SiteFooter`, driven by a code-owned IA nav model. Settle the 768–1024px wrap with an automated width check.

**Architecture:** A pure `navModel.ts` owns the nav items, current-page matching and footer-line extraction, and is unit-tested. The three presentational components take plain props. A small `'use client'` `SiteChrome` reads `usePathname()` and renders one sticky header. `Layout` stays the server seam: it resolves branding and settings and passes plain data down.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, `@headlessui/react` 2.2.10 (already a dependency), Vitest (node env, `**/*.test.ts` only), Playwright + `@axe-core/playwright`.

**Spec:** `docs/superpowers/specs/2026-09-22-redesign-phase-3-layout-design.md`. Read it before any task.

## Global Constraints

- Branch `redesign/phase-3-layout`. Never touch `main`. The PR targets `redesign/integration`.
- **No new runtime or dev dependencies.** No `cn()` / `clsx` / `tailwind-merge`.
- **Two Tailwind utilities setting the same CSS property never merge**; the later-generated one wins. Never concatenate a base string with a same-property override. Responsive pairs (`flex-col md:flex-row`) are fine.
- **Tailwind 4 arbitrary values:** `h-(--nav-height)` when the custom property is the whole value; write `var()` explicitly inside a composite (`grid-cols-[var(--spacing-rail)_1fr]`); a bare `[--x]` emits invalid CSS.
- **Empirical CSS proof is mandatory for every component task:** `npm run css:proof -- --grep '<declaration>'` must exit 0 for each new utility (listed per task). Type-check and lint cannot see an unemitted class.
- Vitest collects only `**/*.test.ts` in Node. There is no React render testing; rendering is asserted in Playwright.
- `.env.local` exists in the worktree **without** `SANITY_API_WRITE_TOKEN`. Never write to the Sanity dataset. Never touch any schema file.
- Do **not** read, remove or rename the CMS fields `menuItems`, `showPublications`, `showPeople`, `showContactForm`. Do not touch `project` anything.
- The e2e `webServer` has `reuseExistingServer: !CI`: **before `npm run test:e2e`, make sure nothing is listening on :3000** (`lsof -i :3000`), or Playwright tests a stale server.
- Lint baseline: 0 errors, 4 warnings (`components/global/Logo.tsx`, `e2e/brand-colour.spec.ts`). **Any new warning is a regression.**
- Identifiers print verbatim; `uppercase` goes on labels only (wordmark, nav labels and footer lines are labels).
- Commit messages: conventional prefix, and end with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## Review Focus

1. **A long CMS `siteName`** (e.g. "Laboratory of Molecular Neuroscience and Dementia") must not wrap or grow the bar at 768–1279px. Pinned by Task 4's `nav-wrap.spec.ts` (gallery fixture plus arithmetic).
2. **Current-page matching on nested and odd paths**: `/publications/some-slug`, a trailing slash, `/people/x`, an unknown path, and `null` from `usePathname`. Pinned in Task 1's unit tests.
3. **Footer content shapes**: `null`, `[]`, blocks with empty text, non-block objects, junk. Must never render an empty footer. Pinned in Task 1.
4. **Mobile menu after a client-side navigation** (Layout re-renders in place, so state can survive a route change): a row tap must close it. Pinned in Task 4's `mobile-menu.spec.ts` ("clicking a menu link navigates and closes").
5. **Viewport growing past `md` while the menu is open**: the dialog must close, not stay open behind the desktop bar. Pinned in Task 4's `mobile-menu.spec.ts` (resize test).

---

### Task 1: `navModel.ts` — nav items, current page, footer lines

**Files:**
- Create: `components/redesign/navModel.ts`
- Test: `components/redesign/navModel.test.ts`

**Interfaces:**
- Produces:
  - `type NavId = 'home' | 'pubs' | 'research' | 'resources' | 'people' | 'lab' | 'contact'`
  - `interface NavItem { id: NavId; label: string; href: string }`
  - `const SITE_NAV: readonly (NavItem & { live: boolean })[]`
  - `function liveNavItems(): NavItem[]`
  - `function currentNavId(pathname: string | null | undefined, items: readonly NavItem[]): NavId | undefined`
  - `const FOOTER_FALLBACK: readonly string[]`
  - `function footerLines(blocks: unknown): string[]`

- [ ] **Step 1: Write the failing test** — `components/redesign/navModel.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  currentNavId,
  FOOTER_FALLBACK,
  footerLines,
  liveNavItems,
  SITE_NAV,
} from './navModel'

describe('SITE_NAV', () => {
  it('carries the IA six in IA order, with Contact standing in where Lab sits', () => {
    expect(SITE_NAV.map((i) => i.id)).toEqual([
      'home', 'pubs', 'research', 'resources', 'people', 'lab', 'contact',
    ])
  })

  it('shows only routes that exist today', () => {
    expect(liveNavItems().map((i) => [i.label, i.href])).toEqual([
      ['Home', '/'],
      ['Publications', '/publications'],
      ['People', '/people'],
      ['Contact', '/contact'],
    ])
  })
})

describe('currentNavId', () => {
  const items = liveNavItems()
  it.each([
    ['/', 'home'],
    ['/publications', 'pubs'],
    ['/publications/', 'pubs'],
    ['/publications/some-paper-2024', 'pubs'],
    ['/people/jane-doe', 'people'],
    ['/contact', 'contact'],
  ])('%s -> %s', (path, id) => {
    expect(currentNavId(path, items)).toBe(id)
  })

  it.each([['/tutorial'], ['/publicationsx'], [''], [null], [undefined]])(
    'marks nothing for %s',
    (path) => {
      expect(currentNavId(path, items)).toBeUndefined()
    }
  )
})

describe('footerLines', () => {
  const block = (...texts: string[]) => ({
    _type: 'block',
    children: texts.map((text) => ({ _type: 'span', text })),
  })

  it('reads one line per block, joining spans', () => {
    expect(
      footerLines([block('Designed by ', 'Brett Yang'), block('Copyright 2026 © Holsinger Lab')])
    ).toEqual(['Designed by Brett Yang', 'Copyright 2026 © Holsinger Lab'])
  })

  it('drops empty blocks and non-block objects', () => {
    expect(
      footerLines([block('  '), { _type: 'image' }, block(' Kept ')])
    ).toEqual(['Kept'])
  })

  it.each([[null], [undefined], [[]], ['junk'], [[block('')]], [[{ nope: 1 }]]])(
    'falls back to the IA text for %j',
    (value) => {
      expect(footerLines(value)).toEqual([...FOOTER_FALLBACK])
    }
  )

  it('fallback is the IA footer verbatim', () => {
    expect(FOOTER_FALLBACK).toEqual(['Designed by Brett Yang', 'Copyright 2026 © Holsinger Lab'])
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run components/redesign/navModel.test.ts`
Expected: FAIL, cannot resolve `./navModel`.

- [ ] **Step 3: Implement** — `components/redesign/navModel.ts`:

```ts
// The site's primary navigation, owned in code from the agreed IA
// (docs/redesign-experiment/design-system/agreed-ia.md §1) rather than read
// from the CMS. `settings.menuItems` / `showPublications` / `showPeople` /
// `showContactForm` stay in the schema untouched -- a parallel track on the
// same dataset may still read them -- but the redesign chrome does not.
//
// Named navModel, not siteNav: `siteNav.ts` beside `SiteNav.tsx` collides on
// a case-insensitive filesystem (see publicationRow.ts / PublicationRow.tsx).

export type NavId =
  | 'home'
  | 'pubs'
  | 'research'
  | 'resources'
  | 'people'
  | 'lab'
  | 'contact'

export interface NavItem {
  id: NavId
  label: string
  href: string
}

/**
 * IA order. `live: false` items have no route yet and are not rendered; the
 * step that builds each route flips its flag. Contact is Lab's stand-in: the
 * IA puts Contact under Lab, so remove this entry when `lab` goes live.
 */
export const SITE_NAV: readonly (NavItem & { live: boolean })[] = [
  { id: 'home', label: 'Home', href: '/', live: true },
  { id: 'pubs', label: 'Publications', href: '/publications', live: true },
  { id: 'research', label: 'Research', href: '/research', live: false },
  { id: 'resources', label: 'Resources', href: '/resources', live: false },
  { id: 'people', label: 'People', href: '/people', live: true },
  { id: 'lab', label: 'Lab', href: '/lab', live: false },
  { id: 'contact', label: 'Contact', href: '/contact', live: true },
]

export function liveNavItems(): NavItem[] {
  return SITE_NAV.filter((item) => item.live).map(({ id, label, href }) => ({
    id,
    label,
    href,
  }))
}

/**
 * Home matches `/` only; every other item matches its href or anything
 * beneath it, so `/publications/<slug>` marks Publications. `usePathname`
 * can return null, which marks nothing.
 */
export function currentNavId(
  pathname: string | null | undefined,
  items: readonly NavItem[]
): NavId | undefined {
  if (!pathname) return undefined
  const path =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname
  return items.find((item) =>
    item.href === '/'
      ? path === '/'
      : path === item.href || path.startsWith(`${item.href}/`)
  )?.id
}

/** agreed-ia.md §3, Home block 6. Used when `settings.footer` is empty. */
export const FOOTER_FALLBACK: readonly string[] = [
  'Designed by Brett Yang',
  'Copyright 2026 © Holsinger Lab',
]

/**
 * `settings.footer` is portable text. The chrome renders it as plain mono
 * lines, one per block -- marks and links are flattened (the live content
 * has none). Anything unreadable falls back rather than rendering an empty
 * footer.
 */
export function footerLines(blocks: unknown): string[] {
  if (!Array.isArray(blocks)) return [...FOOTER_FALLBACK]
  const lines = blocks
    .filter(
      (b): b is { _type: 'block'; children?: unknown } =>
        typeof b === 'object' && b !== null && (b as { _type?: unknown })._type === 'block'
    )
    .map((b) =>
      (Array.isArray(b.children) ? b.children : [])
        .map((c) =>
          typeof c === 'object' && c !== null && typeof (c as { text?: unknown }).text === 'string'
            ? (c as { text: string }).text
            : ''
        )
        .join('')
        .trim()
    )
    .filter((line) => line.length > 0)
  return lines.length > 0 ? lines : [...FOOTER_FALLBACK]
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run components/redesign/navModel.test.ts && npm test && npm run type-check && npm run lint`
Expected: all PASS; the total rises from 351; lint stays at 0 errors / 4 warnings.

- [ ] **Step 5: Commit**

```bash
git add components/redesign/navModel.ts components/redesign/navModel.test.ts
git commit -m "feat: code-owned IA nav model with current-page and footer helpers"
```

---

### Task 2: Rebuild `SiteNav` and `SiteFooter` on real routes and CMS data

**Files:**
- Modify: `components/redesign/SiteNav.tsx` (full rewrite, below)
- Modify: `components/redesign/SiteFooter.tsx` (full rewrite, below)
- Modify: `components/redesign/MobileHeader.tsx` (**one line only**: its `NAV_ITEMS` import, see Step 3)
- Modify: `app/preview/components/Gallery.tsx` (Site nav + Site footer sections, and the MobileHeader `items` props)
- Modify: `e2e/redesign-components.spec.ts` (SiteNav / SiteFooter tests)

**Interfaces:**
- Consumes: `NavItem`, `NavId`, `SITE_NAV` from `components/redesign/navModel.ts` (Task 1).
- Produces:
  - `SiteNav(props: { items: readonly NavItem[]; current?: NavId; wordmark: { long: string; short: string }; logo?: ReactNode; label?: string })`. No `'use client'`. Root is `<header data-testid="site-nav">`; wordmark spans carry `data-testid="site-wordmark-long"` / `"site-wordmark-short"`; `<nav aria-label={label ?? 'Primary'}>`.
  - `SiteFooter(props: { lines: readonly string[] })`.
  - Gallery test ids: `gallery-site-nav` (existing), plus a new `gallery-site-nav-long`.

- [ ] **Step 1: Update the gallery e2e first (failing)** — in `e2e/redesign-components.spec.ts`:

Replace the test `'SiteNav marks exactly the current item aria-current'` with:

```ts
  test('SiteNav marks exactly the current item aria-current, with real hrefs', async ({ page }) => {
    const nav = page.getByTestId('gallery-site-nav')
    await expect(nav.locator('a[aria-current="page"]')).toHaveText('Publications')
    await expect(nav.locator('a[aria-current="page"]')).toHaveCount(1)
    await expect(nav.getByRole('link', { name: 'Publications' })).toHaveAttribute('href', '/publications')
  })
```

Replace `'SiteFooter renders both the default and compact density'` with:

```ts
  test('SiteFooter renders one span per line', async ({ page }) => {
    const footer = page.getByTestId('gallery-site-footer').locator('footer')
    await expect(footer).toHaveCount(1)
    await expect(footer.locator('span')).toHaveText(['Designed by Brett Yang', 'Copyright 2026 © Holsinger Lab'])
  })
```

Search the file for `nav-last-navigated` and delete any test that uses it (the `onNavigate` prop is removed).

- [ ] **Step 2: Rewrite `components/redesign/SiteNav.tsx`**:

```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'

import type { NavId, NavItem } from './navModel'

export interface SiteNavProps {
  items: readonly NavItem[]
  current?: NavId
  /** Already resolved by `resolveBranding` -- never raw CMS input. */
  wordmark: { long: string; short: string }
  /** A pre-rendered <Logo>, passed only when `settings.logo` is set. */
  logo?: ReactNode
  /** Landmark name. The gallery renders several instances and needs distinct ones. */
  label?: string
}

// Ported from
// docs/redesign-experiment/design-system/components/navigation/SiteNav.jsx,
// then wired to real routes (Phase 3 step 1). Server-renderable: no handlers.
//
// Height comes from --nav-height (the single authority for header height;
// see styles/nav-height.test.ts). No background of its own -- SiteChrome's
// sticky wrapper paints it. `px-8` is the vendored source's 2rem, kept
// verbatim (it matches none of the gutter tokens; the source's choice).
const HEADER =
  'flex h-(--nav-height) items-center justify-between gap-6 box-border border-b border-rule px-8'

// The wordmark may truncate but never wraps: a long CMS siteName clips with
// an ellipsis rather than growing the bar (spec decision 2). `min-w-0` lets
// the flex item shrink below its content width; the nav is `shrink-0`, so
// the links always win the space.
const WORDMARK_LINK = 'min-w-0'
const WORDMARK =
  'block truncate font-mono text-[12px] leading-none font-medium tracking-[0.1em] uppercase'

const NAV = 'flex shrink-0 gap-7 font-mono text-[12px] leading-none tracking-[0.08em] uppercase'

// Two fully-formed class strings, not one base plus a same-property
// override: the current item never underlines, even on hover (source
// components.css `.hl-navlink[aria-current="page"]:hover`).
const NAVLINK =
  'text-inherit transition-[color] duration-(--sem-motion-fast) ease-(--sem-ease) hover:text-link hover:underline underline-offset-[5px]'
const NAVLINK_CURRENT =
  'text-link no-underline transition-[color] duration-(--sem-motion-fast) ease-(--sem-ease)'

export function SiteNav({ items, current, wordmark, logo, label = 'Primary' }: SiteNavProps) {
  return (
    <header data-testid="site-nav" className={HEADER}>
      {logo ? (
        <Link href="/" aria-label="Home" className="shrink-0">
          {logo}
        </Link>
      ) : (
        // shortName below lg, siteName from lg (spec decision 2, amended):
        // the full name does not fit beside the links at 768-1023px.
        <Link href="/" className={WORDMARK_LINK}>
          <span data-testid="site-wordmark-short" title={wordmark.short} className={`${WORDMARK} lg:hidden`}>
            {wordmark.short}
          </span>
          <span data-testid="site-wordmark-long" title={wordmark.long} className={`${WORDMARK} hidden lg:block`}>
            {wordmark.long}
          </span>
        </Link>
      )}
      <nav aria-label={label} className={NAV}>
        {items.map((it) => {
          const isCurrent = current === it.id
          return (
            <Link
              key={it.id}
              href={it.href}
              aria-current={isCurrent ? 'page' : undefined}
              className={isCurrent ? NAVLINK_CURRENT : NAVLINK}
            >
              {it.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
```

Note: `WORDMARK` sets `display: block` via `block`. `lg:hidden` / `hidden lg:block` set `display` behind *different* breakpoints on each span, so this is not a same-property collision. On the short span, `block` and `lg:hidden` differ by variant, and the `lg:` rule is generated later and wins at lg. Prove it in Step 5.

- [ ] **Step 3: Keep `MobileHeader.tsx` compiling.** It imports `NAV_ITEMS` from `./SiteNav`, which no longer exists. Change only that import line to:

```ts
import { SITE_NAV as NAV_ITEMS } from './navModel'
```

Nothing else in `MobileHeader.tsx` changes in this task (Task 3 rewrites it).

- [ ] **Step 4: Rewrite `components/redesign/SiteFooter.tsx`**:

```tsx
export interface SiteFooterProps {
  /** From navModel's `footerLines(settings.footer)` -- never empty. */
  lines: readonly string[]
}

// Ported from
// docs/redesign-experiment/design-system/components/navigation/SiteFooter.jsx.
// The source's `compact` variant is now the below-`md` layout and its
// default the `md`-and-up layout, as responsive pairs: each property is set
// once per breakpoint, so no two utilities fight over one property at the
// same width. Content comes from `settings.footer` (spec decision 5).
const FOOTER =
  'box-border flex flex-col gap-[5px] border-t border-rule px-(--spacing-gutter) pt-3.5 pb-[18px] font-mono text-[8.5px] leading-[1.4] tracking-[0.08em] uppercase text-text-faint md:flex-row md:justify-between md:gap-6 md:px-8 md:pt-5 md:pb-[26px] md:text-[11px] md:leading-none'

export function SiteFooter({ lines }: SiteFooterProps) {
  return (
    <footer className={FOOTER}>
      {lines.map((line, i) => (
        <span key={i}>{line}</span>
      ))}
    </footer>
  )
}
```

- [ ] **Step 5: Update `app/preview/components/Gallery.tsx`.**
  - Imports: remove `NAV_ITEMS` from the `SiteNav` import. Add `import { FOOTER_FALLBACK, SITE_NAV } from 'components/redesign/navModel'`.
  - Delete the `lastNavigated` state and its `<p>… nav-last-navigated …</p>`.
  - Replace the `gallery-site-nav` section body. Rewrite its long comment to say the `hidden md:block` split mirrors production's SiteChrome, and that each instance has a distinct `label` because several navs are visible at once:

```tsx
        <div className="hidden border border-rule md:block">
          <SiteNav
            current="pubs"
            items={SITE_NAV}
            wordmark={{ long: 'Holsinger Lab — The University of Sydney', short: 'Holsinger Lab' }}
            label="Gallery: site nav"
          />
        </div>
      </section>

      {/* Width fixture for e2e/nav-wrap.spec.ts: the longest realistic
          siteName with all six IA items. Its test measures intrinsic widths
          against the viewport, so this container's own padding does not
          matter. */}
      <section data-testid="gallery-site-nav-long">
        <Heading>Site nav — long site name</Heading>
        <div className="hidden border border-rule md:block">
          <SiteNav
            items={SITE_NAV.filter((i) => i.id !== 'contact')}
            wordmark={{ long: 'Laboratory of Molecular Neuroscience and Dementia', short: 'Holsinger Lab' }}
            label="Gallery: site nav, long name"
          />
        </div>
```

  (The fixture drops `contact` because the IA's six are Home · Publications · Research · Resources · People · Lab. Contact only stands in while Lab is not live.)
  - In the mobile-header section, change both `items={NAV_ITEMS}` to `items={SITE_NAV}` and delete the `onNavigate={setLastNavigated}` prop.
  - Replace the site-footer section body with a single `<div className="border border-rule"><SiteFooter lines={FOOTER_FALLBACK} /></div>`, dropping the Default/Compact subheadings.
  - Add `'site-nav-long'` to `GALLERY_SECTIONS` in `e2e/redesign-components.spec.ts`.

- [ ] **Step 6: CSS proof.** Every command must exit 0:

```bash
npm run css:proof -- --grep 'height: var(--nav-height)'
npm run css:proof -- --grep 'text-overflow: ellipsis'
npm run css:proof -- --grep 'transition-duration: var(--sem-motion-fast)'
npm run css:proof -- --grep 'padding-inline: var(--spacing-gutter)'
npm run css:proof -- --grep 'font-size: 8.5px'
npm run css:proof -- --grep 'padding-bottom: 26px'
```

Then open `node_modules/.cache/css-proof/index.css` and confirm `.lg\:hidden` and `.lg\:block` sit inside an `@media (width >= 64rem)` block and come after `.block` / `.hidden` in the file. That ordering is what makes the wordmark swap work.

- [ ] **Step 7: Verify.** Make sure :3000 is free first.

Run: `npm run type-check && npm run lint && npm test && npm run test:e2e -- e2e/redesign-components.spec.ts e2e/axe.spec.ts`
Expected: all PASS; lint 0 errors / 4 warnings.

- [ ] **Step 8: Commit**

```bash
git add components/redesign/SiteNav.tsx components/redesign/SiteFooter.tsx components/redesign/MobileHeader.tsx app/preview/components/Gallery.tsx e2e/redesign-components.spec.ts
git commit -m "feat: wire SiteNav and SiteFooter to real routes and CMS data"
```

---

### Task 3: Rebuild `MobileHeader` around Headless UI `Dialog`

**Files:**
- Modify: `components/redesign/MobileHeader.tsx` (full rewrite)
- Modify: `app/preview/components/Gallery.tsx` (mobile-header section only)
- Modify: `e2e/redesign-components.spec.ts` (mobile-header test)

**Interfaces:**
- Consumes: `NavItem`, `NavId`, `SITE_NAV` (Task 1).
- Produces (all exported from `MobileHeader.tsx`):
  - `MobileHeader(props: { items: readonly NavItem[]; current?: NavId; wordmark: string; logo?: ReactNode })`. Stateful. Root `<div data-testid="mobile-header">`.
  - `MobileBand(props: { wordmark: string; logo?: ReactNode; open: boolean; onToggle?: () => void; onHome?: () => void })`
  - `MobileNavRows(props: { items: readonly NavItem[]; current?: NavId; onNavigate?: () => void; label?: string })`
  - The toggle's accessible name equals its visible word: **"Menu"** when closed and **"Close"** when open. The ✕ glyph is `aria-hidden`. There is no `aria-label` on the toggle (WCAG 2.5.3).

Why the structure: the old `MobileNavBar.tsx` needed two transparent overlay elements because its visible toggle and logo lived *outside* the `Dialog` and went `inert` while it was open. Here the `DialogPanel` renders its own `MobileBand` at the identical position. Everything the user sees while the menu is open is inside the dialog, so no click-passthrough is needed.

- [ ] **Step 1: Update the gallery e2e (failing)** — replace `'mobile header renders both a closed and an open state'` with:

```ts
  test('mobile header renders both a closed and an open state', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const section = page.getByTestId('gallery-mobile-header')
    await expect(section.getByRole('button', { name: 'Menu', exact: true })).toBeVisible()
    await expect(section.getByRole('button', { name: 'Close', exact: true })).toBeVisible()
    await expect(section.locator('a[aria-current="page"]')).toHaveCount(1)
    await expect(section.locator('a[aria-current="page"]')).toContainText('Publications')
  })
```

- [ ] **Step 2: Rewrite `components/redesign/MobileHeader.tsx`**:

```tsx
'use client'

import { Dialog, DialogPanel } from '@headlessui/react'
import Link from 'next/link'
import { type ReactNode, useEffect, useState } from 'react'

import type { NavId, NavItem } from './navModel'

// Ported from
// docs/redesign-experiment/design-system/components/navigation/MobileHeader.jsx,
// with the open state moved into a Headless UI Dialog for focus trap,
// Escape, scroll lock and `inert` (spec decision 3).
//
// The DialogPanel renders its own MobileBand at exactly the position of the
// one beneath it (both at the top of the viewport: the outer band sits in a
// `sticky top-0` header, the panel is `fixed inset-0`). While open, every
// control the user can see is inside the dialog's own tree, so nothing
// outside it ever needs to receive a click. That is what retires the two
// transparent overlays components/global/Navbar/MobileNavBar.tsx carried.

// Height from --nav-height, not the source's hardcoded 48 (styles/nav-height.test.ts).
const BAND =
  'flex h-(--nav-height) items-stretch justify-between box-border border-b border-rule px-(--spacing-gutter)'

const WORDMARK =
  'flex min-w-0 items-center font-mono text-[9.5px] leading-none font-medium tracking-[0.1em] uppercase'

// `min-w-11`: the source's ~43px-wide toggle sits under the 44px floor; the
// band's full height already clears it vertically (`items-stretch`).
const TOGGLE =
  'flex min-w-11 shrink-0 items-center justify-center px-1 font-mono text-[9.5px] leading-none font-medium tracking-[0.14em] uppercase text-link'

const SHEET_ROW =
  'flex min-h-14 items-center gap-4 box-border border-b border-rule px-(--spacing-gutter) font-mono text-[14px] leading-none font-medium tracking-[0.12em] uppercase'

const SHEET_NUMBER = 'w-[18px] font-mono text-[10px] leading-none text-text-faint'

export interface MobileBandProps {
  /** shortName, already resolved by `resolveBranding`. */
  wordmark: string
  logo?: ReactNode
  open: boolean
  onToggle?: () => void
  /** Called when the wordmark link is activated -- the open sheet closes itself. */
  onHome?: () => void
}

export function MobileBand({ wordmark, logo, open, onToggle, onHome }: MobileBandProps) {
  return (
    <div className={BAND}>
      <Link
        href="/"
        onClick={onHome}
        aria-label={logo ? 'Home' : undefined}
        data-testid="mobile-wordmark"
        className={WORDMARK}
      >
        {logo ?? <span className="truncate" title={wordmark}>{wordmark}</span>}
      </Link>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="mobile-menu-panel"
        className={TOGGLE}
      >
        {open ? (
          <>
            Close<span aria-hidden="true">&nbsp;✕</span>
          </>
        ) : (
          'Menu'
        )}
      </button>
    </div>
  )
}

export interface MobileNavRowsProps {
  items: readonly NavItem[]
  current?: NavId
  onNavigate?: () => void
  label?: string
}

export function MobileNavRows({ items, current, onNavigate, label = 'Primary' }: MobileNavRowsProps) {
  return (
    <>
      <nav aria-label={label} className="flex flex-col">
        {items.map((it, i) => {
          const isCurrent = current === it.id
          return (
            <Link
              key={it.id}
              href={it.href}
              onClick={onNavigate}
              aria-current={isCurrent ? 'page' : undefined}
              className={`${SHEET_ROW} ${isCurrent ? 'text-link' : 'text-inherit'}`}
            >
              <span className={SHEET_NUMBER}>{String(i + 1).padStart(2, '0')}</span>
              {it.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-(--spacing-gutter) pt-4 pb-5 font-mono text-[8.5px] leading-[1.5] tracking-[0.1em] uppercase text-text-faint">
        The University of Sydney
      </div>
    </>
  )
}

export interface MobileHeaderProps {
  items: readonly NavItem[]
  current?: NavId
  wordmark: string
  logo?: ReactNode
}

export function MobileHeader({ items, current, wordmark, logo }: MobileHeaderProps) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  // Close when the viewport reaches `md` (48rem): the desktop bar takes
  // over there, and a dialog left open behind it would keep scroll locked.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 48rem)')
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return (
    <div data-testid="mobile-header">
      <MobileBand wordmark={wordmark} logo={logo} open={open} onToggle={() => setOpen(true)} />
      <Dialog
        open={open}
        onClose={close}
        transition
        unmount={false}
        aria-label="Menu"
        className="relative z-50"
      >
        <DialogPanel
          id="mobile-menu-panel"
          transition
          className="fixed inset-0 overflow-y-auto bg-surface text-text transition-opacity duration-(--sem-motion-reveal) ease-(--sem-ease) data-closed:opacity-0"
        >
          <MobileBand wordmark={wordmark} logo={logo} open onToggle={close} onHome={close} />
          <MobileNavRows items={items} current={current} onNavigate={close} />
        </DialogPanel>
      </Dialog>
    </div>
  )
}
```

The row links and the wordmark call `close` in `onClick`. Layout re-renders in place across a client-side navigation, so the open state would otherwise survive the route change.

- [ ] **Step 3: Update the gallery's mobile-header section** in `app/preview/components/Gallery.tsx`:
  - Import `{ MobileBand, MobileHeader, MobileNavRows }` from `'components/redesign/MobileHeader'`.
  - Delete the `mobileOpen` state.
  - Replace the section body with:

```tsx
        <SubHeading>Closed (live component -- Menu opens the real dialog)</SubHeading>
        <div className="mb-6 max-w-sm border border-rule">
          <MobileHeader current="pubs" items={SITE_NAV} wordmark="Holsinger Lab" />
        </div>

        <SubHeading>Open sheet (static rendering of the dialog's contents)</SubHeading>
        {/* md:hidden: at md+ the gallery's SiteNav instances are visible, and
            this nav would be one more landmark on the page. */}
        <div className="max-w-sm border border-rule md:hidden">
          <MobileBand wordmark="Holsinger Lab" open />
          <MobileNavRows items={SITE_NAV} current="pubs" label="Gallery: mobile sheet" />
        </div>
```

- [ ] **Step 4: CSS proof.** Each must exit 0:

```bash
npm run css:proof -- --grep 'min-height: calc(var(--spacing) * 14)'
npm run css:proof -- --grep 'min-width: calc(var(--spacing) * 11)'
npm run css:proof -- --grep 'transition-duration: var(--sem-motion-reveal)'
npm run css:proof -- --grep 'opacity: 0%'
```

If a grep misses, read the generated CSS for that utility (`grep -n 'min-h-14' node_modules/.cache/css-proof/index.css`) and grep its real declaration instead. The goal is proof that the utility emits a valid declaration, not a particular spelling. For `data-closed:opacity-0`, confirm a `[data-closed]` selector exists.

- [ ] **Step 5: Verify.** :3000 must be free first.

Run: `npm run type-check && npm run lint && npm test && npm run test:e2e -- e2e/redesign-components.spec.ts`
Expected: PASS; lint 0 errors / 4 warnings. (`e2e/mobile-menu.spec.ts` still targets the old navbar, which Layout still renders until Task 4, so it should still pass too. Run it to confirm.)

- [ ] **Step 6: Commit**

```bash
git add components/redesign/MobileHeader.tsx app/preview/components/Gallery.tsx e2e/redesign-components.spec.ts
git commit -m "feat: rebuild MobileHeader on a Dialog whose panel draws its own band"
```

---

### Task 4: `SiteChrome` + `Layout` swap, remove the old chrome, rewrite the e2e contracts

**Files:**
- Create: `components/redesign/SiteChrome.tsx`
- Modify: `components/shared/Layout.tsx`
- Delete: `components/global/Navbar/Navbar.tsx`, `components/global/Navbar/DesktopNavBar.tsx`, `components/global/Navbar/MobileNavBar.tsx`, `components/global/Footer.tsx`
- Modify: `components/global/logo-contract.test.ts` (remove the `mobileNav()` reader and its assertion(s))
- Modify: `components/global/Logo.tsx` and `lib/logo.ts` — **comments only**, where they mention `MobileNavBar`'s overlay (no code change)
- Rewrite: `e2e/mobile-menu.spec.ts`, `e2e/nav-logo.spec.ts`, `e2e/server-rendered-nav.spec.ts`
- Create: `e2e/nav-wrap.spec.ts`
- Check: `e2e/axe.spec.ts` (expected to pass unchanged)

**Interfaces:**
- Consumes: `liveNavItems`, `currentNavId`, `footerLines`, `NavItem` (Task 1); `SiteNav` (Task 2); `SiteFooter` (Task 2); `MobileHeader` (Task 3).
- Produces: `SiteChrome(props: { items: readonly NavItem[]; wordmark: { long: string; short: string }; logo?: ReactNode })`. It renders `<div data-testid="site-header" class="sticky top-0 z-40 bg-surface">`.

- [ ] **Step 1: Write the new e2e specs (failing against the old chrome).**

`e2e/nav-wrap.spec.ts`:

```ts
import { expect, type Page, test } from '@playwright/test'

// The 768-1024px wrap check carried from Phase 1 (phase-3-start-here.md,
// "Also outstanding"). axe and the token guards cannot see a wrap, so this
// measures it. Two halves:
//  - the real header on `/`, with whatever the CMS holds today;
//  - a gallery fixture with the longest realistic siteName and all six IA
//    items, so a future Settings edit cannot reintroduce the wrap unnoticed.
//    The gallery container is narrower than the viewport, so the fixture is
//    judged by arithmetic -- intrinsic content widths against the viewport,
//    which is what the real full-bleed header gets.

const WIDTHS = [768, 900, 1023, 1024, 1280]

async function navHeightPx(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement('div')
    probe.style.height = 'var(--nav-height)'
    document.body.appendChild(probe)
    const h = probe.getBoundingClientRect().height
    probe.remove()
    return h
  })
}

for (const width of WIDTHS) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } })

    test('the live header is one row, nav-height tall, wordmark unclipped', async ({ page }) => {
      await page.goto('/')
      const expected = await navHeightPx(page)
      const m = await page.evaluate(() => {
        const header = document.querySelector('[data-testid="site-header"] [data-testid="site-nav"]')!
        const links = [...header.querySelectorAll('nav a')]
        const spans = [...header.querySelectorAll('[data-testid^="site-wordmark-"]')].filter(
          (s) => getComputedStyle(s).display !== 'none'
        )
        return {
          height: header.getBoundingClientRect().height,
          tops: [...new Set(links.map((a) => Math.round(a.getBoundingClientRect().top)))],
          clipped: spans.some((s) => s.scrollWidth > s.clientWidth),
        }
      })
      expect(m.height).toBeCloseTo(expected, 0)
      expect(m.tops).toHaveLength(1)
      expect(m.clipped).toBe(false)
    })

    test('the long-siteName fixture fits the viewport', async ({ page }) => {
      await page.goto('/preview/components')
      const m = await page.evaluate(() => {
        const header = document.querySelector('[data-testid="gallery-site-nav-long"] [data-testid="site-nav"]')!
        const cs = getComputedStyle(header)
        const span = [...header.querySelectorAll('[data-testid^="site-wordmark-"]')].find(
          (s) => getComputedStyle(s).display !== 'none'
        )!
        const nav = header.querySelector('nav')!
        return {
          which: span.getAttribute('data-testid'),
          needed:
            span.scrollWidth +
            nav.scrollWidth +
            parseFloat(cs.columnGap) +
            parseFloat(cs.paddingLeft) +
            parseFloat(cs.paddingRight),
          tops: [...new Set([...nav.querySelectorAll('a')].map((a) => Math.round(a.getBoundingClientRect().top)))],
        }
      })
      expect(m.which).toBe(width >= 1024 ? 'site-wordmark-long' : 'site-wordmark-short')
      expect(m.needed).toBeLessThanOrEqual(width)
      expect(m.tops).toHaveLength(1)
    })
  })
}
```

If the fixture's `needed` exceeds 1024 at exactly 1024px, **stop and report**; do not tweak the fixture or loosen the assertion. The spec estimated about 983px, and a miss is a design decision (move the long wordmark to `xl`), not an implementation detail.

`e2e/nav-logo.spec.ts`: replace its whole contents with:

```ts
import { expect, test } from '@playwright/test'

// Header geometry against the Publications page's sticky bar. The bar is
// pinned at top: var(--nav-height); the header is exactly that tall, at
// every width, because it is one sticky element (spec decision 4).

for (const viewport of [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
]) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test('the header links home via its wordmark', async ({ page }) => {
      await page.goto('/publications')
      const header = page.getByTestId('site-header')
      const home = header.locator('a[href="/"]').filter({ visible: true }).first()
      await expect(home).toBeVisible()
      await home.click()
      await expect(page).toHaveURL(/\/$/)
    })

    test('the Publications sticky bar sits exactly at the bottom of the header', async ({ page }) => {
      await page.goto('/publications')
      const g = await page.evaluate(() => {
        const header = document.querySelector('[data-testid="site-header"]')
        const bar = document.querySelector('main div.sticky')
        if (!header || !bar) return null
        return {
          headerHeight: header.getBoundingClientRect().height,
          barTop: Number.parseFloat(getComputedStyle(bar).top),
        }
      })
      expect(g).not.toBeNull()
      expect(g!.barTop).toBeCloseTo(g!.headerHeight, 0)
    })

    test('the header stays pinned after scrolling', async ({ page }) => {
      await page.goto('/publications')
      await page.mouse.wheel(0, 1500)
      await expect
        .poll(() => page.evaluate(() => document.querySelector('[data-testid="site-header"]')!.getBoundingClientRect().top))
        .toBe(0)
    })
  })
}

test('a year jump-link lands the heading clear of both sticky bars', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/publications')
  const yearLink = page.getByRole('navigation', { name: 'Jump to year' }).getByRole('link').first()
  test.skip(!(await yearLink.count()), 'dataset has only one publication year')
  const yearText = (await yearLink.textContent())!.trim()
  await yearLink.click()
  const heading = page.getByRole('heading', { name: yearText, level: 2 })
  const stackBottom = await page.evaluate(() => {
    const header = document.querySelector('[data-testid="site-header"]')
    const bar = document.querySelector('main div.sticky')
    if (!header || !bar) return 0
    return header.getBoundingClientRect().height + bar.getBoundingClientRect().height
  })
  const box = (await heading.boundingBox())!
  expect(box.y).toBeGreaterThanOrEqual(stackBottom)
})
```

`e2e/server-rendered-nav.spec.ts`: replace the mobile test body with:

```ts
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await expect(page.getByTestId('mobile-wordmark').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible()
```

Keep the desktop test. Scope its locator to the header: `page.getByTestId('site-header').getByRole('link', { name: 'Publications' })`. Update the file's comments to match.

`e2e/mobile-menu.spec.ts`: rewrite it. Keep every behavioural test, with the new names: trigger `getByRole('button', { name: 'Menu', exact: true })`, in-panel close `page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true })`. Specifically:
  - "toggle has an accessible name equal to its visible text and toggles aria-expanded / aria-controls": the trigger has `aria-expanded="false"` and `aria-controls="mobile-menu-panel"`; after a click, the in-panel Close has `aria-expanded="true"`.
  - "is reachable and operable via keyboard alone": Tab (up to 5 presses) until the trigger is focused, then Enter; the dialog is visible.
  - "Escape closes the menu and returns focus to the trigger": unchanged logic, new names.
  - "Tab stays trapped inside the open panel": unchanged.
  - "body scroll is locked while the menu is open": unchanged logic; close with the in-panel Close.
  - "clicking a menu link navigates and closes the menu": unchanged, new names.
  - "has no axe violations while open": unchanged.
  - "the in-panel Close sits exactly over the outer toggle": compare the `boundingBox()` of the in-panel Close to the outer trigger's box captured before opening; x, y, width and height must be within 1px. That is the geometry the design depends on.
  - "tapping the wordmark inside the open sheet navigates home and closes" (in `test.describe('touch input')` with `hasTouch: true`): from `/publications`, open, then `page.getByRole('dialog').getByTestId('mobile-wordmark').tap()`; expect URL `/\/$/` and the trigger `aria-expanded="false"`.
  - **New**, "widening past md closes the menu": open at 375px, `page.setViewportSize({ width: 800, height: 812 })`, and expect `page.getByRole('dialog')` to be hidden and `document.documentElement.style.overflow` to not be `'hidden'`.
  - Delete the two old geometry pass-through tests ("tapping the visible header icon…", "tapping the visible header logo…"): the overlays they guarded no longer exist.

- [ ] **Step 2: Run the new specs against the old chrome to confirm they fail**

Run (:3000 free): `npm run test:e2e -- e2e/nav-wrap.spec.ts e2e/nav-logo.spec.ts e2e/mobile-menu.spec.ts`
Expected: FAIL. `site-header` does not exist yet, and the button names differ.

- [ ] **Step 3: Create `components/redesign/SiteChrome.tsx`**:

```tsx
'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { MobileHeader } from './MobileHeader'
import { currentNavId, type NavItem } from './navModel'
import { SiteNav } from './SiteNav'

export interface SiteChromeProps {
  items: readonly NavItem[]
  /** Already resolved by `resolveBranding`. */
  wordmark: { long: string; short: string }
  /** Pre-rendered on the server; a React element can cross the RSC boundary, a function cannot. */
  logo?: ReactNode
}

// The one client seam in the chrome: the current page comes from the URL
// (spec decision 6). One sticky header at every width (decision 4) -- the
// Publications sticky bar keys its `top` off --nav-height, which is this
// element's height by construction.
export function SiteChrome({ items, wordmark, logo }: SiteChromeProps) {
  const current = currentNavId(usePathname(), items)
  return (
    <div data-testid="site-header" className="sticky top-0 z-40 bg-surface">
      <div className="hidden md:block">
        <SiteNav items={items} current={current} wordmark={wordmark} logo={logo} />
      </div>
      <div className="md:hidden">
        <MobileHeader items={items} current={current} wordmark={wordmark.short} logo={logo} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rewrite `components/shared/Layout.tsx`**:

```tsx
import Logo from 'components/global/Logo'
import { footerLines, liveNavItems } from 'components/redesign/navModel'
import { SiteChrome } from 'components/redesign/SiteChrome'
import { SiteFooter } from 'components/redesign/SiteFooter'
import { resolveBranding } from 'lib/branding'
import { fallbackSettings, type SettingsPayload } from 'types'

export interface LayoutProps {
  children: React.ReactNode
  settings: SettingsPayload | undefined
  childrenStyles?: string
}

export default function Layout({
  children,
  settings = fallbackSettings,
  childrenStyles = 'px-gutter',
}: LayoutProps) {
  const { siteName, shortName } = resolveBranding(settings)

  // Phase 4B's uploaded logo still wins over the text wordmark when set.
  const logo = settings?.logo ? (
    <Logo logo={settings.logo} logoDark={settings.logoDark} shortName={shortName} />
  ) : undefined

  return (
    <div className="flex min-h-screen flex-col bg-surface text-text">
      <SiteChrome
        items={liveNavItems()}
        wordmark={{ long: siteName, short: shortName }}
        logo={logo}
      />

      {/* The header is now in-flow and sticky at every width. `mt-20`
          keeps mobile content where it sat under the old 48px fixed bar
          plus mt-32 (128 - 48 = 80px); desktop was already in-flow, so
          md:mt-16 is unchanged. Step 2's screen rebuilds own this spacing
          from here on. */}
      <main className={`mt-20 flex-grow md:mt-16 md:px-gutter-md lg:px-gutter-lg ${childrenStyles}`}>
        {children}
      </main>

      <SiteFooter lines={footerLines(settings?.footer)} />
    </div>
  )
}
```

- [ ] **Step 5: Delete the old chrome and fix what referenced it.**

```bash
git rm components/global/Navbar/Navbar.tsx components/global/Navbar/DesktopNavBar.tsx components/global/Navbar/MobileNavBar.tsx components/global/Footer.tsx
grep -rn "MobileNavBar\|DesktopNavBar\|global/Navbar\|global/Footer" app components lib e2e styles
```

For each hit: in `components/global/logo-contract.test.ts`, delete the `mobileNav` reader and any `it` that asserts on it. In comments (`Logo.tsx`, `lib/logo.ts`, `styles/`, `e2e/`), reword the reference to what is true now. The logo's width no longer sizes any overlay, because the overlay is gone. Keep each comment short. **Do not change code in `Logo.tsx` or `lib/logo.ts`.** Re-run the grep until it prints nothing, except `docs/` (historical, leave it).

- [ ] **Step 6: CSS proof** (each must exit 0):

```bash
npm run css:proof -- --grep 'position: sticky'
npm run css:proof -- --grep 'z-index: 40'
npm run css:proof -- --grep 'margin-top: calc(var(--spacing) * 20)'
```

- [ ] **Step 7: Full verification** (:3000 free):

Run: `npm run type-check && npm run lint && npm test && npm run build && npm run test:e2e`
Expected: all PASS. Lint 0 errors / 4 warnings. Build 23 routes. e2e: no failures, and the passed count is ≥ 102 (some old tests are deleted, more are added). Report the exact passed/skipped numbers.

- [ ] **Step 8: Commit**

```bash
git add -A components app e2e lib styles
git commit -m "feat: rebuild Layout on the redesign chrome and retire the old navbars"
```

---

### Task 5: Record decisions and hand-off state

**Files:**
- Create: `docs/redesign-experiment/phase-3-decisions.md`
- Modify: `docs/redesign-experiment/phase-3-start-here.md` (status only)

- [ ] **Step 1: Write `docs/redesign-experiment/phase-3-decisions.md`.** Follow the style of `phase-2-decisions.md`. Cover:
  - A status table for Phase 3's four steps: step 1 done; step 3 done early via the cherry-picked warm preset commit; steps 2 and 4 open.
  - The wrap measurement: the old nav at 630px and the redesign at 907px at 768px, plus what the fixture measured at 1024px.
  - The six decisions and both amendments, each with its reason.
  - The Wix-track caution: the CMS nav fields and `project` are not to be retired without coordinating with `redesign/wix`.
  - Deletions and the possible merge conflict with `redesign/wix`.
  - What step 2 must do to the nav model: flip `live` on research / resources / lab, and remove the `contact` stand-in when Lab ships.
  - The verification table (unit / type-check / lint / typegen / build / e2e) with the real numbers from Task 4 Step 7.

- [ ] **Step 2: Update `phase-3-start-here.md`.** Mark step 1 (and step 3) as done, pointing at the new decisions file. Replace the "Also outstanding" wrap paragraph with one line saying it is settled and guarded by `e2e/nav-wrap.spec.ts`.

- [ ] **Step 3: Commit**

```bash
git add docs/redesign-experiment/phase-3-decisions.md docs/redesign-experiment/phase-3-start-here.md
git commit -m "docs: Phase 3 step 1 decisions and hand-off state"
```
