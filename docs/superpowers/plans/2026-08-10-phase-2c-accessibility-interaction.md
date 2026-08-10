# Phase 2C — Accessibility and Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the two remaining `<a onClick>` pseudo-buttons to real `<button>`s, fix `Publications.tsx`'s `<ul>`/`<div>` markup violation together with a full heading-hierarchy pass, give every route a `<main>` landmark, replace the mobile nav's `isBrowser`/`window.innerWidth` client-side gate with CSS-breakpoint server rendering, and give the mobile menu a complete keyboard/focus/ARIA contract — closing out every item in Phase 2's accessibility sub-phase.

**Architecture:** No new subsystems. This phase changes *how existing markup is structured and rendered*, not what data flows through it: `Navbar.tsx` stops being a client-only gate and becomes a thin server component that renders both nav variants unconditionally (visibility toggled by Tailwind responsive classes); `MobileNavBar.tsx` moves from a bare `Transition`-wrapped `<div>` panel to `@headlessui/react`'s `Dialog`, which supplies focus-trapping, Escape-to-close, and scroll-lock without hand-rolled logic; `Publications.tsx` groups its already-sorted data into per-year sections instead of interleaving a `<div>` inside a `<ul>`; `Layout.tsx`'s content wrapper becomes a `<main>` element. `@headlessui/react` (`2.2.10`) is already a dependency — no new packages are needed.

**Tech Stack:** Next.js 16 (App Router), React 19, `@headlessui/react` 2.2.10, Tailwind CSS 4.3.3, TypeScript 5 (`strict: true`), Vitest 4 (node environment, no DOM), Playwright 1.62.1 + `@axe-core/playwright` 4.12.1 (from Phase 2A).

## Global Constraints

- Node `>=22` (per `package.json` `engines`), matches CI's `node-version: 22`.
- Every task must leave `npx tsc --noEmit`, `npm run lint`, `npm run test`, and `npm run build` green before its commit — the same gates CI runs (`.github/workflows/ci.yml`).
- No GROQ query in `lib/sanity.queries.ts` changes in this phase, so `npm run typegen` should produce no diff — CI's freshness check (`git diff --exit-code sanity.types.ts`) stays a no-op background guarantee, not something this phase's tasks need to run themselves.
- Do not introduce React Testing Library or jsdom. Vitest's harness (`vitest.config.ts`) has no `environment: 'jsdom'` and this plan does not add one — every behavioral fix in this phase (interaction, focus, ARIA) is verified through Playwright against a real browser, per this phase's design doc §5. Vitest is used only for the two pure-function/source-text checks in Tasks 1–2.
- `@headlessui/react` 2.2.10 already provides everything Task 4 needs (`Dialog`, `DialogPanel`, built-in focus trap, Escape handling, and scroll lock — confirmed by reading `node_modules/@headlessui/react/dist/components/dialog/dialog.js` during this plan's research). Do not add `focus-trap-react`, `react-focus-lock`, or any other new dependency.
- Follow the existing code style: no semicolons, single quotes (`.prettierrc` via `package.json`), `simple-import-sort` groupings (external → `lib`/`components` absolute → relative).
- Preserve existing visual output wherever the fix is purely structural (tag swaps, landmark wrapping). Where a fix requires a genuine layout/spacing judgment call (Task 2's year-grouping spacing, Task 4's Dialog transition classes), the step says so explicitly — flag it for the task-scoped reviewer rather than agonizing over pixel parity.
- `e2e/axe.spec.ts`'s `KNOWN_VIOLATIONS` map is the authoritative, empirically-verified record of which axe violations exist on which route today (re-verified against `main` @ `d92e6251` on 2026-08-10 by running `npx playwright test e2e/axe.spec.ts` — all 6 routes passed with zero unexpected violations and zero stale entries, confirming Phase 2B did not disturb anything this phase touches). Each task that fixes a violation must delete that violation's id from every route's array in the same commit — this is how the test starts enforcing zero violations of that kind again, per the file's own header comment.
- Two known violations are explicitly **out of scope for this plan** and must not be touched: `color-contrast` on `/` (a `ProjectListItem.tsx` gray-on-white contrast ratio — a color/design-token decision, not a markup/interaction fix) and `heading-order` on `/tutorial` (a live Sanity content-authoring issue in that page's body, not a component bug — fixing it means either editing live CMS content this sandboxed environment has no write access to, or changing `CustomPortableText.tsx` to enforce sequential heading order programmatically, which is a distinct, larger change than anything this plan's six requested items cover). Leave both entries in `KNOWN_VIOLATIONS` untouched through every task in this plan.

---

## Context for the implementer

**Why `<main>` alone won't clear the `region` violation.** `e2e/axe.spec.ts`'s comment for `landmark-one-main`/`region` says both are "Fixed by 2C's Layout.tsx landmark task," implying a single change. This plan's research tested that claim directly (temporarily changing `Layout.tsx`'s wrapper `<div>` to `<main>` and re-running the axe suite) and found it's only half true: `landmark-one-main` clears immediately, but `region` does not — `axe-core`'s `region` rule requires **all** page content to be inside a landmark, and the Navbar tree (`Navbar.tsx` → `DesktopNavBar.tsx`/`MobileNavBar.tsx`) renders plain `<div>`s today, not a `<nav>`. Adding `<nav>` to `DesktopNavBar.tsx` alongside the `<main>` change was re-tested and clears `region` on all 6 routes with zero new violations introduced. `Footer.tsx` already renders `<footer>` (a landmark), so it needs no change. This is convenient, not just correct: Task 3 already touches `DesktopNavBar.tsx`/`MobileNavBar.tsx` for the CSS-breakpoint rewrite, so the `<nav>` wrap costs nothing extra there.

**Why the Dialog research matters.** Task 4 adopts `@headlessui/react`'s `Dialog` for the mobile panel instead of hand-rolling focus trap / Escape / scroll-lock logic. Reading the installed package's source (`dist/components/dialog/dialog.js`, `dist/hooks/use-escape.js`, `dist/hooks/document-overflow/*.js`) during this plan's research confirmed, precisely, what `Dialog` does for free when given `open`/`onClose`/`transition` props:
- **Focus trap + auto-focus + focus restore**: `Dialog` wraps its content in headless-ui's internal `FocusTrap` with `RestoreFocus | TabLock | AutoFocus | InitialFocus` features whenever it's open — Tab is trapped inside the panel, the panel receives focus on open, and focus returns to whatever triggered it on close. No manual focus management needed.
- **Escape-to-close**: `useEscape` attaches a `keydown` listener that calls `onClose` on `Escape`, gated so only the topmost open dialog responds. No manual listener needed.
- **Scroll lock**: `useScrollLock` → `useDocumentOverflowLockedEffect` sets `document.documentElement.style.overflow = 'hidden'` (plus a scrollbar-width-compensating `paddingRight`) for as long as any dialog using that lock is open, and removes it when the last one closes. **Note the property is on `document.documentElement` (the `<html>` element), not `document.body`** — Task 4's test asserts against `documentElement`.
- **Transitions**: passing `transition` (a boolean, not the old `Transition`/`static` v1 pattern — that pattern doesn't exist in this installed v2) makes `Dialog`/`DialogPanel` apply `data-closed`/`data-enter`/`data-leave` attributes during the relevant phase, matched with Tailwind's `data-[attr]:` arbitrary-variant syntax (Tailwind 4.3.3, already installed, supports this natively — confirmed no existing `data-[...]:` usage in the codebase yet, so this is a new-but-supported pattern, not a new dependency).
- **Default `unmount`**: `Dialog` defaults to `unmount={false}` — when closed, the panel and its links stay in the DOM with a `hidden` attribute rather than being removed, so a slide-out leave transition has something to animate and `aria-controls` always points at a real element. `hidden` removes the subtree from the accessibility tree, tab order, and visual rendering — so this does not reintroduce the "duplicate visible nav links" problem Task 3 already had to reason about for the CSS-breakpoint split.

If any of this doesn't match what you observe once the code is actually running (package behavior can have edge cases source-reading misses), trust the running app and Task 4's own Playwright tests over this summary — adapt the implementation to match reality and note the deviation when reporting the task back.

**Why Task 3 and Task 4 are split.** Both touch `MobileNavBar.tsx`, but they're separable along exactly the line "does a reviewer plausibly approve one while rejecting the other": Task 3 is about *which markup renders and whether it's inside a landmark* (a rendering-strategy question — CSS breakpoints, SSR, no JS-dependent gate). Task 4 is about *how the already-rendering panel behaves when opened* (a focus/keyboard/ARIA question). Task 3 leaves the mobile panel's existing `Transition as="div"` and `preventDefault`+`setTimeout`+`router.push` link-click pattern untouched — only Task 4 replaces it with `Dialog`, because the artificial 500ms navigation delay actively fights `Dialog`'s focus-restore-on-close behavior (a race between "focus returns to the trigger" and "navigate 500ms later") and needs to go once `Dialog` is in the picture.

**Why `Publications.tsx`'s markup fix and the heading-hierarchy pass are one task.** The `<div>`-inside-`<ul>` defect and the "year separators should be headings, not `<li>` text" gap (both named in this phase's design doc, §1.2) share one root cause and one fix: today's code interleaves a conditional year-marker `<li>` and a publication `<li>` inside a wrapping `<div>`, because it's iterating a flat, pre-sorted array and detecting year boundaries between adjacent items. Restructuring this into "group publications by year, then render one `<section>` per year with a real `<h2>` and a clean `<ul>` of only that year's publications" fixes both problems in the same restructuring — patching the existing broken structure to satisfy `<ul>`'s child-content model while separately turning the year marker into a heading would produce more code, not less. `lib/sanity.queries.ts:83`'s `publicationsQuery` already sorts `order(date desc)`, so publications sharing a year are guaranteed contiguous — grouping by simple adjacent-run detection (not a full re-sort) is correct and matches this phase's design doc §1.7, which already flagged `Publications.tsx`'s year-grouping logic as a good pure-function extraction candidate.

---

### Task 1: Convert `<a onClick>` toggles to real `<button>`s

**Files:**
- Modify: `components/pages/publications/Toggle.tsx:19` (the `<a onClick>` wrapping the Abstract/Citation label)
- Modify: `components/pages/people/Profile.tsx:88` (the `<a onClick>` wrapping the bio-toggle `AddIcon`)
- Create: `components/pages/interactive-elements-contract.test.ts`
- Create: `e2e/interactive-controls.spec.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing new-exported; both components keep their existing prop signatures (`Toggle({ show, callback, showMessage, hideMessage })`, `Profile({ profile })`). Only the rendered tag and its attributes change.

**Context:** `<a>` without an `href` attribute is not a link and — per basic HTML semantics, not a project-specific quirk — is **not part of the default tab order**, so today neither toggle is reachable by keyboard at all. This is the concrete, verifiable failure this task's tests target: not "does it visually toggle on click," but "can Tab reach it and can Enter/Space activate it." Converting to `<button type="button">` fixes keyboard reachability for free (buttons are natively focusable and Enter/Space-activatable). Two correctness details the tag swap alone doesn't cover:
- `Profile.tsx`'s toggle wraps only an `AddIcon` (`@sanity/icons/Add`, confirmed by reading `node_modules/@sanity/icons/dist/Add.js` to render a bare `<svg>` with no `aria-hidden` and no accessible name) — an icon-only `<button>` with no `aria-label` has no accessible name, which fails WCAG 4.1.2 and would trip `axe-core`'s `button-name` rule, turning this fix into a regression. This task adds `aria-label` (toggling "Show bio"/"Hide bio") and `aria-hidden="true"` on the icon itself.
- Both toggles are disclosure controls (they show/hide `ToggleContent`/the bio overlay `Transition`) — both get `aria-expanded` reflecting the open/closed boolean state already being tracked, so screen readers get the state, not just sighted users watching the icon rotate.

Live Sanity content was checked during this plan's research (`curl` against a real `npm run build && npm run start`): **no `/people` profile currently has `profile.bio` set**, so `Profile.tsx`'s toggle doesn't render on any live page today. This means it can't be exercised end-to-end against real content the way `Toggle.tsx` can (every publication unconditionally renders a "Citation" toggle — `Publication.tsx:70-75` has no `abstract &&`-style gate on it). This task therefore verifies both files with a fast, deterministic Vitest source-text contract test (works regardless of live content), plus a full Playwright keyboard/ARIA behavioral test against `Toggle.tsx`'s always-present "Citation" control specifically — matching this codebase's established pattern (Phase 2B's `image-hotspot-contract.test.ts`) for verifying a fix whose live-data coverage can't be guaranteed.

- [ ] **Step 1: Write the failing contract test**

  Create `components/pages/interactive-elements-contract.test.ts`:

  ```ts
  import { readFileSync } from 'node:fs'
  import { describe, expect, it } from 'vitest'

  describe('interactive-elements contract: no onClick anchors without href', () => {
    it('Toggle.tsx uses a real button, not an anchor', () => {
      const source = readFileSync(
        'components/pages/publications/Toggle.tsx',
        'utf8'
      )
      expect(source).not.toMatch(/<a\b[^>]*onClick/)
      expect(source).toMatch(/<button\b[^>]*type="button"/)
      expect(source).toMatch(/aria-expanded={show}/)
    })

    it('Profile.tsx uses a real button, not an anchor, for the bio toggle', () => {
      const source = readFileSync('components/pages/people/Profile.tsx', 'utf8')
      expect(source).not.toMatch(/<a\b[^>]*onClick/)
      expect(source).toMatch(/<button\b[^>]*type="button"/)
      expect(source).toMatch(/aria-expanded={showBio}/)
      expect(source).toMatch(/aria-label={showBio/)
    })
  })
  ```

- [ ] **Step 2: Run it, confirm it fails**

  Run: `npx vitest run components/pages/interactive-elements-contract.test.ts`

  Expected: FAIL — both files still use `<a onClick`, neither has `type="button"` or `aria-expanded` anywhere.

- [ ] **Step 3: Fix `Toggle.tsx`**

  In `components/pages/publications/Toggle.tsx`, change:

  ```tsx
  export function Toggle({
    show,
    callback,
    showMessage,
    hideMessage,
  }: {
    show: boolean
    callback: () => void
    showMessage: string
    hideMessage: string
  }) {
    return (
      <>
        <a onClick={callback} className="underline hover:cursor-pointer">
          {show ? (
            <>
              {hideMessage}
              <ChevronUpIcon className="inline-block h-4 w-4" />
            </>
          ) : (
            <>
              {showMessage}
              <ChevronDownIcon className="inline-block h-4 w-4" />
            </>
          )}
        </a>
      </>
    )
  }
  ```

  to:

  ```tsx
  export function Toggle({
    show,
    callback,
    showMessage,
    hideMessage,
  }: {
    show: boolean
    callback: () => void
    showMessage: string
    hideMessage: string
  }) {
    return (
      <button
        type="button"
        onClick={callback}
        aria-expanded={show}
        className="underline hover:cursor-pointer"
      >
        {show ? (
          <>
            {hideMessage}
            <ChevronUpIcon className="inline-block h-4 w-4" />
          </>
        ) : (
          <>
            {showMessage}
            <ChevronDownIcon className="inline-block h-4 w-4" />
          </>
        )}
      </button>
    )
  }
  ```

  (Dropped the now-redundant wrapping `<>...</>` fragment — a single `<button>` doesn't need one.)

- [ ] **Step 4: Fix `Profile.tsx`**

  In `components/pages/people/Profile.tsx`, change:

  ```tsx
        {profile.bio && (
          <a className="cursor-pointer" onClick={handleAddIconClick}>
            <AddIcon
              className={`${showBio ? 'rotate-45' : 'rotate-0'} transition-all`}
            />
          </a>
        )}
  ```

  to:

  ```tsx
        {profile.bio && (
          <button
            type="button"
            className="cursor-pointer"
            onClick={handleAddIconClick}
            aria-expanded={showBio}
            aria-label={showBio ? 'Hide bio' : 'Show bio'}
          >
            <AddIcon
              aria-hidden="true"
              className={`${showBio ? 'rotate-45' : 'rotate-0'} transition-all`}
            />
          </button>
        )}
  ```

- [ ] **Step 5: Run the contract test again — confirm it passes**

  Run: `npx vitest run components/pages/interactive-elements-contract.test.ts`

  Expected: PASS.

- [ ] **Step 6: Write the failing Playwright behavioral test**

  Create `e2e/interactive-controls.spec.ts`:

  ```ts
  import { expect, test } from '@playwright/test'

  test.describe('publication Citation toggle', () => {
    test('is keyboard-focusable, operable via Enter, and exposes aria-expanded', async ({
      page,
    }) => {
      await page.goto('/publications')

      const toggle = page.getByRole('button', { name: 'Citation' }).first()
      await toggle.focus()
      await expect(toggle).toBeFocused()
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')

      await page.keyboard.press('Enter')
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')

      await page.keyboard.press('Enter')
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    })

    test('is operable via Space as well as Enter', async ({ page }) => {
      await page.goto('/publications')

      const toggle = page.getByRole('button', { name: 'Citation' }).first()
      await toggle.focus()
      await page.keyboard.press('Space')
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    })
  })
  ```

- [ ] **Step 7: Run it against the now-fixed code — confirm it passes**

  Run: `npx playwright test e2e/interactive-controls.spec.ts`

  Expected: PASS. (This step intentionally runs against already-fixed code rather than confirming a pre-fix failure first — `getByRole('button', { name: 'Citation' })` wouldn't match an `<a>` at all pre-fix, since `<a>` has no implicit `button` role, so "run it, watch it fail, then fix" would test locator-resolution failure rather than the actual keyboard/ARIA behavior this test exists to lock in. Step 2's Vitest contract test is this task's true red/green TDD cycle; this Playwright test is characterization coverage for the real browser behavior the contract test can't see.)

- [ ] **Step 8: Run the full verification suite**

  Run: `npx tsc --noEmit && npm run lint && npm run test && npm run build`

  Expected: all green.

- [ ] **Step 9: Commit**

  ```bash
  git add components/pages/publications/Toggle.tsx components/pages/people/Profile.tsx \
    components/pages/interactive-elements-contract.test.ts e2e/interactive-controls.spec.ts
  git commit -m "fix: convert onClick anchors to real buttons in Toggle and Profile"
  ```

---

### Task 2: Fix `Publications.tsx`'s `<ul>`/`<div>` markup and complete the heading-hierarchy pass

**Files:**
- Create: `components/pages/publications/groupByYear.ts`
- Create: `components/pages/publications/groupByYear.test.ts`
- Modify: `components/pages/publications/Publications.tsx` (full rewrite of the render body)
- Modify: `components/pages/publications/Publication.tsx:55` (`<h4>` metadata row → `<div>`)
- Modify: `components/pages/home/ProjectListItem.tsx:44-46` (title `<div>` → `<h3>`)
- Modify: `e2e/axe.spec.ts` (remove `list`/`listitem` from `/publications`'s known-violations array)

**Interfaces:**
- Produces: `groupByYear<T extends { date?: string | null }>(publications: T[]): { year: string; publications: T[] }[]` in `components/pages/publications/groupByYear.ts`.
- Consumes: nothing from Task 1.

**Context:** See "Context for the implementer" above for why the markup fix and heading pass are combined. Final heading inventory this task produces (verified against every other heading in the app — `Header.tsx`'s `<h1>` and `HomePage.tsx`'s "Our Research Projects" `<h2>` are both already correct and untouched by this task):
- **Publications route**: `h1` ("Publications", unchanged) → `h2` (year, new — was `<li>` text) → `h2` (per-publication title, `Publication.tsx:38`, unchanged) → `h3` (authors, `Publication.tsx:52`, unchanged). The metadata row (`Publication.tsx:55`, journal/date + Abstract/Citation controls) drops from `h4` to a plain `<div>` — per this phase's design doc, that row is "metadata and interactive controls, not subordinate content," so removing its heading semantics rather than renumbering the rest of the publication's headings down a level is the correct, minimal fix (and it's what keeps the sequence heading-order-clean: `h2`(year) → `h2`(title) is a sibling repeat, not a skip; `h2`(title) → `h3`(author) is a one-level increase; no more headings follow until the next year's `h2`, and decreases are always fine per `axe-core`'s `heading-order` rule).
- **Home route**: `h1` (page title, unchanged) → `h2` ("Our Research Projects", unchanged) → `h3` (per-project title in `ProjectListItem.tsx`, new — was a plain `<div>`), one `h3` per showcase project, all siblings under the same `h2`. No skips.

- [ ] **Step 1: Write the failing test for `groupByYear`**

  Create `components/pages/publications/groupByYear.test.ts`:

  ```ts
  import { describe, expect, it } from 'vitest'

  import { groupByYear } from './groupByYear'

  describe('groupByYear', () => {
    it('groups consecutive publications sharing a year into one bucket, preserving order', () => {
      const result = groupByYear([
        { _id: '1', date: '2024-05-01' },
        { _id: '2', date: '2024-01-01' },
        { _id: '3', date: '2023-11-01' },
      ])

      expect(result).toEqual([
        {
          year: '2024',
          publications: [
            { _id: '1', date: '2024-05-01' },
            { _id: '2', date: '2024-01-01' },
          ],
        },
        { year: '2023', publications: [{ _id: '3', date: '2023-11-01' }] },
      ])
    })

    it('buckets a null date under "Undated"', () => {
      const result = groupByYear([{ _id: '1', date: null }])
      expect(result).toEqual([
        { year: 'Undated', publications: [{ _id: '1', date: null }] },
      ])
    })

    it('starts a new bucket if the same year appears non-consecutively', () => {
      const result = groupByYear([
        { _id: '1', date: '2024-01-01' },
        { _id: '2', date: '2023-01-01' },
        { _id: '3', date: '2024-06-01' },
      ])
      expect(result).toHaveLength(3)
      expect(result.map((g) => g.year)).toEqual(['2024', '2023', '2024'])
    })

    it('returns an empty array for an empty input', () => {
      expect(groupByYear([])).toEqual([])
    })
  })
  ```

- [ ] **Step 2: Run it, confirm it fails**

  Run: `npx vitest run components/pages/publications/groupByYear.test.ts`

  Expected: FAIL — `./groupByYear` doesn't exist yet.

- [ ] **Step 3: Implement `groupByYear`**

  Create `components/pages/publications/groupByYear.ts`:

  ```ts
  export interface YearGroup<T> {
    year: string
    publications: T[]
  }

  // Assumes `publications` is already sorted so same-year items are contiguous
  // (lib/sanity.queries.ts's publicationsQuery sorts `order(date desc)`) —
  // this walks the list once and clusters adjacent runs sharing a year, it
  // does not re-sort or fully bucket a non-contiguous input.
  export function groupByYear<T extends { date?: string | null }>(
    publications: T[]
  ): YearGroup<T>[] {
    const groups: YearGroup<T>[] = []

    for (const publication of publications) {
      const year = publication.date?.slice(0, 4) ?? 'Undated'
      const currentGroup = groups[groups.length - 1]

      if (currentGroup && currentGroup.year === year) {
        currentGroup.publications.push(publication)
      } else {
        groups.push({ year, publications: [publication] })
      }
    }

    return groups
  }
  ```

- [ ] **Step 4: Run the test again — confirm it passes**

  Run: `npx vitest run components/pages/publications/groupByYear.test.ts`

  Expected: PASS.

- [ ] **Step 5: Rewrite `Publications.tsx` to use `groupByYear` with valid `<ul>` markup and a real year heading**

  Change the entire file to:

  ```tsx
  import { PublicationPayload } from 'types'

  import { groupByYear } from './groupByYear'
  import Publication from './Publication'

  const Publications = ({
    publications,
  }: {
    publications: PublicationPayload[]
  }) => {
    const groups = groupByYear(publications)

    return (
      <>
        <h1 className="mb-8 text-3xl font-black md:text-5xl">Publications</h1>

        <div className="mb-16 space-y-10">
          {groups.map(({ year, publications: yearPublications }) => (
            <section key={year}>
              <h2 className="mb-5 text-3xl font-bold lg:text-4xl">{year}</h2>
              <ul className="ml-0 space-y-6">
                {yearPublications.map((publication) => (
                  <li key={publication._id}>
                    <Publication publication={publication} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </>
    )
  }

  export default Publications
  ```

  (`space-y-10` between year sections and `mb-5`/`space-y-6` within each are a reasonable carry-forward of the original spacing values, not a pixel-exact port — the original interleaved year-`<li>`s and publication-`<li>`s under one `space-y-6`, which this restructuring can't reproduce exactly since years are now separate `<section>`s. Flag this specific spacing for the task-scoped reviewer to eyeball against the live site; it's a judgment call, not a correctness requirement — the correctness requirement is "`<ul>` contains only `<li>` children" and "the year marker is a real heading," both of which this satisfies.)

- [ ] **Step 6: Fix `Publication.tsx`'s metadata row — `<h4>` to `<div>`**

  In `components/pages/publications/Publication.tsx`, change:

  ```tsx
          <h4 className="flex gap-4 font-ariana md:text-base lg:text-lg">
            <div>
              {journal}. {`${month} ${year}`}
            </div>
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
          </h4>
  ```

  to:

  ```tsx
          <div className="flex gap-4 font-ariana md:text-base lg:text-lg">
            <div>
              {journal}. {`${month} ${year}`}
            </div>
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
  ```

- [ ] **Step 7: Fix `ProjectListItem.tsx`'s project title — `<div>` to `<h3>`**

  In `components/pages/home/ProjectListItem.tsx`, change:

  ```tsx
          {/* Title */}
          <div className="mb-2 text-xl font-extrabold tracking-tight md:text-2xl">
            {project.title}
          </div>
  ```

  to:

  ```tsx
          {/* Title */}
          <h3 className="mb-2 text-xl font-extrabold tracking-tight md:text-2xl">
            {project.title}
          </h3>
  ```

- [ ] **Step 8: Update `e2e/axe.spec.ts` — retire the `list`/`listitem` entries for `/publications`**

  In `e2e/axe.spec.ts`, change:

  ```ts
  const KNOWN_VIOLATIONS: Record<string, string[]> = {
    '/': ['landmark-one-main', 'region', 'color-contrast'],
    '/contact': ['landmark-one-main', 'region'],
    '/people': ['landmark-one-main', 'region'],
    '/publications': ['landmark-one-main', 'region', 'list', 'listitem'],
    '/tutorial': ['landmark-one-main', 'region', 'heading-order'],
    '/projects/publication-highlights': ['landmark-one-main', 'region'],
  }
  ```

  to:

  ```ts
  const KNOWN_VIOLATIONS: Record<string, string[]> = {
    '/': ['landmark-one-main', 'region', 'color-contrast'],
    '/contact': ['landmark-one-main', 'region'],
    '/people': ['landmark-one-main', 'region'],
    '/publications': ['landmark-one-main', 'region'],
    '/tutorial': ['landmark-one-main', 'region', 'heading-order'],
    '/projects/publication-highlights': ['landmark-one-main', 'region'],
  }
  ```

  Also update the file's header comment: delete the `list`/`listitem` bullet (lines documenting "the `<div>` direct child of `<ul>`... Fixed by 2C's `<ul>` markup task") since that fix has now landed — leave the `landmark-one-main`/`region`, `color-contrast`, and `heading-order` bullets as-is (still open at this point in the plan).

- [ ] **Step 9: Run the axe suite for `/publications` and `/` — confirm `list`/`listitem` no longer fire and no new violation appeared**

  Run: `npx playwright install --with-deps chromium && npx playwright test e2e/axe.spec.ts`

  Expected: PASS on all 6 routes — `/publications` no longer reports `list`/`listitem` as either an unexpected or a stale violation (it's simply gone from both the code's expectations and axe's actual findings), and `/` doesn't report a new `heading-order` violation from the `ProjectListItem.tsx` `h3` change (it shouldn't, since `h3` correctly nests one level under the existing `h2`).

- [ ] **Step 10: Run the full verification suite**

  Run: `npx tsc --noEmit && npm run lint && npm run test && npm run build`

  Expected: all green.

- [ ] **Step 11: Commit**

  ```bash
  git add components/pages/publications/groupByYear.ts components/pages/publications/groupByYear.test.ts \
    components/pages/publications/Publications.tsx components/pages/publications/Publication.tsx \
    components/pages/home/ProjectListItem.tsx e2e/axe.spec.ts
  git commit -m "fix: restructure Publications list markup, complete heading-hierarchy pass"
  ```

---

### Task 3: Add `<main>`/`<nav>` landmarks and server-render the nav via CSS breakpoints

**Files:**
- Modify: `components/shared/Layout.tsx:26-30` (content wrapper `<div>` → `<main>`)
- Modify: `components/global/Navbar/Navbar.tsx` (full rewrite — drop `'use client'`, the `isBrowser`/`isSmallScreen` gate, and the resize-driven breakpoint detection; render both nav variants unconditionally)
- Modify: `components/global/Navbar/DesktopNavBar.tsx:17,68` (root `<div>` → `<nav>`; add `hidden md:flex` responsive classes)
- Modify: `components/global/Navbar/MobileNavBar.tsx` (root wrapper `<div>` → `<nav>` with `md:hidden`; move `isMenuOpen` state and the resize-based auto-close in from `Navbar.tsx` — the mobile panel's *own* rendering mechanics, i.e. the `Transition`/`preventDefault`+`setTimeout` link-click pattern, are untouched here; Task 4 replaces those)
- Modify: `e2e/axe.spec.ts` (remove `landmark-one-main`/`region` from every route's known-violations array)
- Create: `e2e/server-rendered-nav.spec.ts`

**Interfaces:**
- Consumes: nothing from Tasks 1–2.
- Produces: `MobileNavBar`'s prop signature drops `handleMenuClick`/`isMenuOpen` (no longer passed in from `Navbar.tsx` — the component owns this state itself now). `Navbar`'s own prop signature (`menuItems`/`showPublications`/`showPeople`/`showContactForm`) is unchanged — it's still the same public interface `Layout.tsx` calls.

**Context:** See "Context for the implementer" above for the empirically-verified scope (both `<main>` and a `<nav>` wrap are required to clear `region`; `<main>` alone only clears `landmark-one-main`). The CSS-breakpoint rewrite renders both `DesktopNavBar` and `MobileNavBar` unconditionally in server-rendered HTML — nothing computed from `window` decides which markup exists in the DOM — and lets Tailwind's `hidden`/`md:flex`/`md:hidden` classes decide which one is visible at a given viewport width, matching this phase's design doc §3.3. This removes the hydration-deferred blank-navbar problem at its root: previously `isBrowser` started `false` and only flipped to `true` inside a `useEffect`, so with JavaScript disabled (or during the brief pre-hydration window) **no navbar rendered at all**. Task 3's own Playwright test (`e2e/server-rendered-nav.spec.ts`) verifies this directly by disabling JS in the browser context and confirming both breakpoints' nav content is still present.

- [ ] **Step 1: Write the failing SSR-nav Playwright test**

  Create `e2e/server-rendered-nav.spec.ts`:

  ```ts
  import { expect, test } from '@playwright/test'

  test.describe('navigation renders without client-side JavaScript', () => {
    test.use({ javaScriptEnabled: false })

    test('desktop viewport shows the desktop nav links with JS disabled', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/')
      await expect(
        page.getByRole('link', { name: 'Publications' })
      ).toBeVisible()
    })

    test('mobile viewport shows the mobile nav bar with JS disabled', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto('/')
      await expect(page.getByAltText('logo')).toBeVisible()
    })
  })
  ```

- [ ] **Step 2: Run it, confirm it fails**

  Run: `npx playwright test e2e/server-rendered-nav.spec.ts`

  Expected: FAIL on both tests — with JS disabled, `isBrowser` never becomes `true` (its `useEffect` never runs without hydration), so the entire `{isBrowser && (...)}` block in `Navbar.tsx` renders nothing.

- [ ] **Step 3: Rewrite `Navbar.tsx` — drop the client gate, render both variants unconditionally**

  Change the entire file to:

  ```tsx
  import { MenuItem } from 'types'

  import DesktopNavBar from './DesktopNavBar'
  import MobileNavBar from './MobileNavBar'

  interface NavbarProps {
    menuItems?: MenuItem[] | null
    showPublications?: boolean | null
    showPeople?: boolean | null
    showContactForm?: boolean | null
  }

  export function Navbar({
    menuItems,
    showPublications = true,
    showPeople = true,
    showContactForm = true,
  }: NavbarProps) {
    return (
      <>
        <MobileNavBar
          menuItems={menuItems}
          showPublications={showPublications}
          showPeople={showPeople}
          showContactForm={showContactForm}
        />
        <DesktopNavBar
          menuItems={menuItems}
          showPublications={showPublications}
          showPeople={showPeople}
          showContactForm={showContactForm}
        />
      </>
    )
  }
  ```

  (No `'use client'` directive — this component has no state or effects of its own anymore. `DesktopNavBar` was already a server component; `MobileNavBar` keeps its own `'use client'` for the menu-open state it's about to own, below.)

- [ ] **Step 4: Add responsive visibility to `DesktopNavBar.tsx` and wrap it in `<nav>`**

  In `components/global/Navbar/DesktopNavBar.tsx`, change:

  ```tsx
    return (
      <div
        className={`sticky top-0 z-10 flex flex-wrap items-center gap-x-5
              border-y border-primary bg-background/80
              px-4 py-4 uppercase backdrop-blur md:px-16 md:py-5 lg:px-32`}
      >
  ```

  to:

  ```tsx
    return (
      <nav
        className={`sticky top-0 z-10 hidden flex-wrap items-center gap-x-5
              border-y border-primary bg-background/80
              px-4 py-4 uppercase backdrop-blur md:flex md:px-16 md:py-5 lg:px-32`}
      >
  ```

  and change the closing tag:

  ```tsx
          </Link>
        )}
      </div>
    )
  }
  ```

  to:

  ```tsx
          </Link>
        )}
      </nav>
    )
  }
  ```

  (`hidden` at the base breakpoint, `md:flex` restores the original `flex flex-wrap` layout at `md` and above — everything else in this file is unchanged.)

- [ ] **Step 5: Move `isMenuOpen` state and resize-based auto-close into `MobileNavBar.tsx`; wrap it in `<nav>` with `md:hidden`**

  In `components/global/Navbar/MobileNavBar.tsx`, change the props/setup section:

  ```tsx
  'use client'
  import { Transition } from '@headlessui/react'
  import { resolveHref } from 'lib/sanity.links'
  import Image from 'next/image'
  import Link from 'next/link'
  import { useRouter } from 'next/navigation'
  import logo from 'public/logo.svg'
  import { MenuItem } from 'types'

  const hamburgerLine = `h-[2px] w-6 my-[6px] bg-black transition ease transform duration-500`

  const MobileNavBar = ({
    handleMenuClick,
    isMenuOpen,
    menuItems,
    showPublications,
    showPeople,
    showContactForm,
  }: {
    handleMenuClick: () => void
    isMenuOpen: boolean
    menuItems?: MenuItem[] | null
    showPublications?: boolean | null
    showPeople?: boolean | null
    showContactForm?: boolean | null
  }) => {
    const router = useRouter()

    const handleLinkClick = (
      e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
      href: string
    ) => {
      e.preventDefault()
      handleMenuClick()
      setTimeout(() => {
        router.push(href)
      }, 500)
    }

    return (
      <>
        <div className={`uppercase`}>
  ```

  to:

  ```tsx
  'use client'
  import { Transition } from '@headlessui/react'
  import { resolveHref } from 'lib/sanity.links'
  import Image from 'next/image'
  import Link from 'next/link'
  import { useRouter } from 'next/navigation'
  import logo from 'public/logo.svg'
  import { useEffect, useState } from 'react'
  import { MenuItem } from 'types'

  const hamburgerLine = `h-[2px] w-6 my-[6px] bg-black transition ease transform duration-500`

  const MobileNavBar = ({
    menuItems,
    showPublications,
    showPeople,
    showContactForm,
  }: {
    menuItems?: MenuItem[] | null
    showPublications?: boolean | null
    showPeople?: boolean | null
    showContactForm?: boolean | null
  }) => {
    const router = useRouter()
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    useEffect(() => {
      const handleResize = () => {
        if (window.innerWidth >= 768) {
          setIsMenuOpen(false)
        }
      }
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }, [])

    const handleMenuClick = () => {
      setIsMenuOpen((open) => !open)
    }

    const handleLinkClick = (
      e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
      href: string
    ) => {
      e.preventDefault()
      handleMenuClick()
      setTimeout(() => {
        router.push(href)
      }, 500)
    }

    return (
      <>
        <nav className="uppercase md:hidden">
  ```

  (`handleLinkClick`'s `preventDefault`+`setTimeout`+`router.push` pattern is carried over unchanged in this task — Task 4 replaces it. This step only relocates `isMenuOpen`'s ownership and adds the auto-close-on-resize behavior that `Navbar.tsx` used to provide via its own `handleResize`, now scoped to just "close if we've grown past mobile width" since `MobileNavBar` no longer needs to detect which breakpoint it's *in* — CSS does that job now via `md:hidden`.)

  Then change the closing tag at the end of the file:

  ```tsx
            )}
          </Transition>
        </div>
      </>
    )
  }

  export default MobileNavBar
  ```

  to:

  ```tsx
            )}
          </Transition>
        </nav>
      </>
    )
  }

  export default MobileNavBar
  ```

- [ ] **Step 6: Change `Layout.tsx`'s content wrapper from `<div>` to `<main>`**

  In `components/shared/Layout.tsx`, change:

  ```tsx
        <div
          className={`mt-32 flex-grow md:mt-16 md:px-16 lg:px-32 ${childrenStyles}`}
        >
          {children}
        </div>
  ```

  to:

  ```tsx
        <main
          className={`mt-32 flex-grow md:mt-16 md:px-16 lg:px-32 ${childrenStyles}`}
        >
          {children}
        </main>
  ```

- [ ] **Step 7: Update `e2e/axe.spec.ts` — retire `landmark-one-main`/`region` from every route**

  Change:

  ```ts
  const KNOWN_VIOLATIONS: Record<string, string[]> = {
    '/': ['landmark-one-main', 'region', 'color-contrast'],
    '/contact': ['landmark-one-main', 'region'],
    '/people': ['landmark-one-main', 'region'],
    '/publications': ['landmark-one-main', 'region'],
    '/tutorial': ['landmark-one-main', 'region', 'heading-order'],
    '/projects/publication-highlights': ['landmark-one-main', 'region'],
  }
  ```

  to:

  ```ts
  const KNOWN_VIOLATIONS: Record<string, string[]> = {
    '/': ['color-contrast'],
    '/contact': [],
    '/people': [],
    '/publications': [],
    '/tutorial': ['heading-order'],
    '/projects/publication-highlights': [],
  }
  ```

  Update the file's header comment: delete the `landmark-one-main`/`region` bullet entirely (its fix has landed); keep the `color-contrast` and `heading-order` bullets, since both remain open and out of scope per this plan's Global Constraints.

- [ ] **Step 8: Run the SSR-nav test again — confirm it passes**

  Run: `npx playwright test e2e/server-rendered-nav.spec.ts`

  Expected: PASS on both tests — with JS disabled, `DesktopNavBar` (visible at 1280×800 via `md:flex`) and `MobileNavBar`'s logo (visible at 375×812, `md:hidden` doesn't hide it since we're below `md`) both render straight from server HTML.

- [ ] **Step 9: Run the axe suite — confirm `landmark-one-main`/`region` are gone on all 6 routes with no new violations**

  Run: `npx playwright test e2e/axe.spec.ts`

  Expected: PASS on all 6 routes.

- [ ] **Step 10: Run the existing route smoke suite — confirm no regression**

  Run: `npx playwright test e2e/routes.spec.ts`

  Expected: PASS. (`e2e/routes.spec.ts` asserts `getByRole('link', { name: 'Publications' })` is visible at the default — desktop-sized — Chromium project viewport; `DesktopNavBar`'s `<nav>` renders that link visibly at that width, `MobileNavBar`'s equivalent link is inside its closed `Transition` panel, which headless-ui unmounts by default when `show={false}`, so there's exactly one match, not a strict-mode-violating duplicate.)

- [ ] **Step 11: Run the full verification suite**

  Run: `npx tsc --noEmit && npm run lint && npm run test && npm run build`

  Expected: all green.

- [ ] **Step 12: Commit**

  ```bash
  git add components/shared/Layout.tsx components/global/Navbar/Navbar.tsx \
    components/global/Navbar/DesktopNavBar.tsx components/global/Navbar/MobileNavBar.tsx \
    e2e/axe.spec.ts e2e/server-rendered-nav.spec.ts
  git commit -m "feat: server-render nav via CSS breakpoints, add main/nav landmarks"
  ```

---

### Task 4: Mobile menu accessibility contract — focus trap, Escape, scroll lock, `aria-expanded`

**Files:**
- Modify: `components/global/Navbar/MobileNavBar.tsx` (replace `Transition as="div"` panel with `@headlessui/react`'s `Dialog`/`DialogPanel`; replace the empty `aria-label="button"` hamburger with a real toggling label + `aria-expanded`/`aria-controls`; drop the `preventDefault`+`setTimeout`+`router.push` link-click pattern in favor of natural `<Link>` navigation)
- Create: `e2e/mobile-menu.spec.ts`

**Interfaces:**
- Depends on: Task 3's `MobileNavBar.tsx` (the `isMenuOpen` state, `<nav className="uppercase md:hidden">` wrapper, and the removal of the `Navbar.tsx`-owned gate) must already be in place.
- Consumes: `@headlessui/react`'s `Dialog`/`DialogPanel` (already installed, `2.2.10` — no new dependency).
- Produces: nothing new-exported; `MobileNavBar`'s prop signature is unchanged from Task 3.

**Context:** See "Context for the implementer" above for the full research on what `Dialog` provides automatically (focus trap, Escape-to-close, scroll lock on `document.documentElement`, focus-restore-on-close) and the `transition`-prop + `data-[closed]:`/`data-[enter]:`/`data-[leave]:` pattern that replaces the old `enter`/`enterFrom`/`enterTo` prop API when animating a `Dialog`. This task also removes the `router` import and the `handleLinkClick` wrapper entirely — with `Dialog` restoring focus to the hamburger button on close, an artificial 500ms delay between "close the menu" and "navigate" has nothing to buy and actively risks a race with focus restoration; every menu `<Link>` instead just closes the menu in its own `onClick` and lets Next's router handle the actual navigation immediately, same as it always does for the desktop nav's links.

- [ ] **Step 1: Write the failing Playwright interaction tests**

  Create `e2e/mobile-menu.spec.ts`:

  ```ts
  import { expect, test } from '@playwright/test'

  test.describe('mobile menu accessibility contract', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('hamburger button has a real accessible name and toggles aria-expanded/aria-controls', async ({
      page,
    }) => {
      await page.goto('/')

      const trigger = page.getByRole('button', { name: 'Open menu' })
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      const controlsId = await trigger.getAttribute('aria-controls')
      expect(controlsId).toBeTruthy()

      await trigger.click()
      await expect(
        page.getByRole('button', { name: 'Close menu' })
      ).toHaveAttribute('aria-expanded', 'true')
    })

    test('is reachable and operable via keyboard alone', async ({ page }) => {
      await page.goto('/')

      await page.keyboard.press('Tab')
      const trigger = page.getByRole('button', { name: 'Open menu' })
      await expect(trigger).toBeFocused()

      await page.keyboard.press('Enter')
      await expect(
        page.getByRole('button', { name: 'Close menu' })
      ).toHaveAttribute('aria-expanded', 'true')
    })

    test('Escape closes the menu and returns focus to the trigger', async ({
      page,
    }) => {
      await page.goto('/')

      const trigger = page.getByRole('button', { name: 'Open menu' })
      await trigger.click()
      await expect(
        page.getByRole('button', { name: 'Close menu' })
      ).toBeVisible()

      await page.keyboard.press('Escape')
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await expect(trigger).toBeFocused()
    })

    test('Tab stays trapped inside the open panel', async ({ page }) => {
      await page.goto('/')

      await page.getByRole('button', { name: 'Open menu' }).click()
      const panelLinks = page.getByRole('dialog').getByRole('link')
      const linkCount = await panelLinks.count()
      expect(linkCount).toBeGreaterThan(0)

      // Tab one more time than there are links in the panel; focus should
      // still be inside the dialog, never having escaped to page content
      // behind it (e.g. the logo link, which sits outside the dialog).
      for (let i = 0; i < linkCount + 1; i++) {
        await page.keyboard.press('Tab')
      }
      const activeElementIsInDialog = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]')
        return dialog?.contains(document.activeElement) ?? false
      })
      expect(activeElementIsInDialog).toBe(true)
    })

    test('body scroll is locked while the menu is open', async ({ page }) => {
      await page.goto('/')

      const overflowBeforeOpen = await page.evaluate(
        () => document.documentElement.style.overflow
      )
      expect(overflowBeforeOpen).not.toBe('hidden')

      await page.getByRole('button', { name: 'Open menu' }).click()
      const overflowWhileOpen = await page.evaluate(
        () => document.documentElement.style.overflow
      )
      expect(overflowWhileOpen).toBe('hidden')

      await page.getByRole('button', { name: 'Close menu' }).click()
      const overflowAfterClose = await page.evaluate(
        () => document.documentElement.style.overflow
      )
      expect(overflowAfterClose).not.toBe('hidden')
    })

    test('clicking a menu link navigates and closes the menu', async ({
      page,
    }) => {
      await page.goto('/')

      await page.getByRole('button', { name: 'Open menu' }).click()
      await page.getByRole('dialog').getByRole('link', { name: 'Publications' }).click()

      await expect(page).toHaveURL(/\/publications$/)
      await expect(
        page.getByRole('button', { name: 'Open menu' })
      ).toHaveAttribute('aria-expanded', 'false')
    })

    test('has no axe violations while open', async ({ page }) => {
      const { default: AxeBuilder } = await import('@axe-core/playwright')
      await page.goto('/')
      await page.getByRole('button', { name: 'Open menu' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
    })
  })
  ```

- [ ] **Step 2: Run it, confirm it fails**

  Run: `npx playwright test e2e/mobile-menu.spec.ts`

  Expected: FAIL on every test — the hamburger button's `aria-label` is still the static, empty `"button"` string (no `"Open menu"`/`"Close menu"` text to match), there's no `role="dialog"` anywhere (the panel is a plain animated `<div>`), no focus trap, no Escape handling, and no scroll lock.

- [ ] **Step 3: Replace the `Transition`-only panel with `Dialog`/`DialogPanel`, fix the hamburger button's ARIA, drop the delayed-navigation pattern**

  In `components/global/Navbar/MobileNavBar.tsx`, change the import block:

  ```tsx
  'use client'
  import { Transition } from '@headlessui/react'
  import { resolveHref } from 'lib/sanity.links'
  import Image from 'next/image'
  import Link from 'next/link'
  import { useRouter } from 'next/navigation'
  import logo from 'public/logo.svg'
  import { useEffect, useState } from 'react'
  import { MenuItem } from 'types'
  ```

  to:

  ```tsx
  'use client'
  import { Dialog, DialogPanel } from '@headlessui/react'
  import { resolveHref } from 'lib/sanity.links'
  import Image from 'next/image'
  import Link from 'next/link'
  import logo from 'public/logo.svg'
  import { useEffect, useState } from 'react'
  import { MenuItem } from 'types'
  ```

  Change the component body (removing `useRouter`, `handleLinkClick`, and the `preventDefault`+`setTimeout` pattern):

  ```tsx
  const MobileNavBar = ({
    menuItems,
    showPublications,
    showPeople,
    showContactForm,
  }: {
    menuItems?: MenuItem[] | null
    showPublications?: boolean | null
    showPeople?: boolean | null
    showContactForm?: boolean | null
  }) => {
    const router = useRouter()
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    useEffect(() => {
      const handleResize = () => {
        if (window.innerWidth >= 768) {
          setIsMenuOpen(false)
        }
      }
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }, [])

    const handleMenuClick = () => {
      setIsMenuOpen((open) => !open)
    }

    const handleLinkClick = (
      e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
      href: string
    ) => {
      e.preventDefault()
      handleMenuClick()
      setTimeout(() => {
        router.push(href)
      }, 500)
    }

    return (
  ```

  to:

  ```tsx
  const MobileNavBar = ({
    menuItems,
    showPublications,
    showPeople,
    showContactForm,
  }: {
    menuItems?: MenuItem[] | null
    showPublications?: boolean | null
    showPeople?: boolean | null
    showContactForm?: boolean | null
  }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    useEffect(() => {
      const handleResize = () => {
        if (window.innerWidth >= 768) {
          setIsMenuOpen(false)
        }
      }
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }, [])

    const handleMenuClick = () => {
      setIsMenuOpen((open) => !open)
    }

    const closeMenu = () => setIsMenuOpen(false)

    return (
  ```

  Change the hamburger button:

  ```tsx
          <button
            type="button"
            aria-label="button"
            className="absolute right-6 border-0 bg-transparent py-4"
            onClick={handleMenuClick}
          >
  ```

  to:

  ```tsx
          <button
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu-panel"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            className="absolute right-6 border-0 bg-transparent py-4"
            onClick={handleMenuClick}
          >
  ```

  Change the entire panel — from:

  ```tsx
          <Transition
            as="div"
            show={isMenuOpen}
            enter="transition ease-out duration-500"
            enterFrom="transform translate-x-full"
            enterTo="transform translate-x-0"
            leave="transition duration-500"
            leaveFrom="transform ease-in translate-x-0"
            leaveTo="transform translate-x-full"
            className="fixed z-20 flex h-[100lvh]
                      w-full flex-col items-center justify-center gap-8
                      bg-background text-center text-2xl font-[400] text-black"
          >
            {menuItems &&
              menuItems.map((menuItem: MenuItem, key: number) => {
                const href = resolveHref(menuItem?._type, menuItem?.slug)
                if (!href) {
                  return null
                }
                return (
                  <Link
                    key={key}
                    onClick={(e) => {
                      handleLinkClick(e, href)
                    }}
                    className={`hover:text-gray-600`}
                    href={href}
                  >
                    {href === '/' ? 'Home' : menuItem.title}
                  </Link>
                )
              })}
            {showPublications && (
              <Link
                onClick={(e) => {
                  handleLinkClick(e, '/publications')
                }}
                className="hover:text-gray-600"
                href={'/publications'}
              >
                Publications
              </Link>
            )}
            {showPeople && (
              <Link
                onClick={(e) => {
                  handleLinkClick(e, '/people')
                }}
                className="hover:text-gray-600"
                href={'/people'}
              >
                People
              </Link>
            )}
            {showContactForm && (
              <Link
                onClick={(e) => {
                  handleLinkClick(e, '/contact')
                }}
                className="hover:text-gray-600"
                href={'/contact'}
              >
                Contact
              </Link>
            )}
          </Transition>
  ```

  to:

  ```tsx
          <Dialog open={isMenuOpen} onClose={closeMenu} transition className="relative z-20">
            <DialogPanel
              id="mobile-menu-panel"
              transition
              className="fixed inset-0 flex h-[100lvh] w-full flex-col items-center
                        justify-center gap-8 bg-background text-center text-2xl
                        font-[400] text-black transition duration-500
                        data-closed:translate-x-full data-enter:ease-out data-leave:ease-in"
            >
              {menuItems &&
                menuItems.map((menuItem: MenuItem, key: number) => {
                  const href = resolveHref(menuItem?._type, menuItem?.slug)
                  if (!href) {
                    return null
                  }
                  return (
                    <Link
                      key={key}
                      onClick={closeMenu}
                      className={`hover:text-gray-600`}
                      href={href}
                    >
                      {href === '/' ? 'Home' : menuItem.title}
                    </Link>
                  )
                })}
              {showPublications && (
                <Link onClick={closeMenu} className="hover:text-gray-600" href={'/publications'}>
                  Publications
                </Link>
              )}
              {showPeople && (
                <Link onClick={closeMenu} className="hover:text-gray-600" href={'/people'}>
                  People
                </Link>
              )}
              {showContactForm && (
                <Link onClick={closeMenu} className="hover:text-gray-600" href={'/contact'}>
                  Contact
                </Link>
              )}
            </DialogPanel>
          </Dialog>
  ```

  (No `unmount` prop passed to `Dialog` — the installed default, `unmount={false}`, is relied on deliberately: it keeps the panel mounted-but-`hidden` while closed so the leave transition has something to animate and `aria-controls="mobile-menu-panel"` always resolves to a real element. `data-closed:translate-x-full` is the v2 equivalent of the old `enterFrom`/`leaveTo` values — Tailwind 4's `data-[attr]:` arbitrary-variant syntax matches the `data-closed` boolean attribute Headless UI's `transition` prop applies. This is a new-to-this-codebase animation pattern; if the slide transition doesn't render the way the old `Transition` version did once this is running in a real browser, that's a CSS/timing detail to fix against what you actually see, not a sign the underlying `open`/`onClose`/focus-trap wiring is wrong.)

- [ ] **Step 4: Run the interaction tests again — confirm they pass**

  Run: `npx playwright test e2e/mobile-menu.spec.ts`

  Expected: PASS on all 7 tests. If the focus-trap test or the Escape/focus-restore test fails, check first whether `Dialog`'s automatic behavior is being fought by something else in the tree (e.g., another element outside the dialog also being programmatically focused) before assuming the wiring itself is wrong — per this task's Context section, the trap/restore/Escape/scroll-lock behavior comes from `Dialog` itself, not from anything hand-written here.

- [ ] **Step 5: Run the full axe suite — confirm no regression**

  Run: `npx playwright test e2e/axe.spec.ts`

  Expected: PASS on all 6 routes (this checks the *closed*-menu state per route, same as before; Step 4's own axe check inside `mobile-menu.spec.ts` covers the *open* state).

- [ ] **Step 6: Run the route smoke suite — confirm no regression**

  Run: `npx playwright test e2e/routes.spec.ts e2e/interactive-controls.spec.ts e2e/server-rendered-nav.spec.ts`

  Expected: PASS on all three files — `server-rendered-nav.spec.ts` in particular still needs to pass with JS disabled, which it should: `Dialog`'s `open={false}` initial state renders the same `hidden`-panel SSR HTML as `Transition`'s `show={false}` did.

- [ ] **Step 7: Run the full verification suite**

  Run: `npx tsc --noEmit && npm run lint && npm run test && npm run build`

  Expected: all green.

- [ ] **Step 8: Commit**

  ```bash
  git add components/global/Navbar/MobileNavBar.tsx e2e/mobile-menu.spec.ts
  git commit -m "feat: mobile menu accessibility contract via headlessui Dialog"
  ```

---

### Task 5: Extend axe coverage to mobile viewport, finalize `KNOWN_VIOLATIONS`

**Files:**
- Modify: `e2e/axe.spec.ts` (parametrize the existing per-route loop across both a desktop and a mobile viewport)

**Interfaces:**
- Depends on: Tasks 1–4 (this task's expectations assume every violation but `color-contrast` on `/` and `heading-order` on `/tutorial` is already cleared).
- Consumes/produces: nothing — this is a harness-only task, no application code changes.

**Context:** This phase's design doc §5 explicitly calls for axe checks "against both the mobile and desktop render paths at their respective breakpoints, not only the default viewport a developer happens to be testing in" — today's `e2e/axe.spec.ts` only runs at Playwright's default (desktop) viewport. Since `color-contrast` and `heading-order` are content/CSS issues independent of viewport width, the same `KNOWN_VIOLATIONS` map is expected to hold at both breakpoints — this task verifies that assumption empirically rather than asserting it blind.

- [ ] **Step 1: Parametrize the axe suite across two viewports**

  In `e2e/axe.spec.ts`, change:

  ```ts
  for (const [path, knownIds] of Object.entries(KNOWN_VIOLATIONS)) {
    test(`${path} has no unexpected accessibility violations`, async ({ page }) => {
      await page.goto(path)
      const results = await new AxeBuilder({ page }).analyze()
      const observedIds = results.violations.map((v) => v.id)

      const unexpected = results.violations.filter((v) => !knownIds.includes(v.id))
      expect(unexpected, JSON.stringify(unexpected, null, 2)).toEqual([])

      const stale = knownIds.filter((id) => !observedIds.includes(id))
      expect(
        stale,
        `These KNOWN_VIOLATIONS entries no longer fire — delete them from the list: ${stale.join(', ')}`
      ).toEqual([])
    })
  }
  ```

  to:

  ```ts
  // Run against both the mobile and desktop nav render paths (Phase 2C's
  // CSS-breakpoint split means the two can genuinely diverge), per this
  // phase's design doc §5. color-contrast and heading-order are
  // viewport-independent (CSS/content issues, not layout), so the same
  // KNOWN_VIOLATIONS map is expected to hold at both — this loop verifies
  // that rather than assuming it.
  const VIEWPORTS: Record<string, { width: number; height: number }> = {
    desktop: { width: 1280, height: 800 },
    mobile: { width: 375, height: 812 },
  }

  for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`${viewportName} viewport`, () => {
      test.use({ viewport })

      for (const [path, knownIds] of Object.entries(KNOWN_VIOLATIONS)) {
        test(`${path} has no unexpected accessibility violations`, async ({
          page,
        }) => {
          await page.goto(path)
          const results = await new AxeBuilder({ page }).analyze()
          const observedIds = results.violations.map((v) => v.id)

          const unexpected = results.violations.filter(
            (v) => !knownIds.includes(v.id)
          )
          expect(unexpected, JSON.stringify(unexpected, null, 2)).toEqual([])

          const stale = knownIds.filter((id) => !observedIds.includes(id))
          expect(
            stale,
            `These KNOWN_VIOLATIONS entries no longer fire — delete them from the list: ${stale.join(', ')}`
          ).toEqual([])
        })
      }
    })
  }
  ```

- [ ] **Step 2: Run it**

  Run: `npx playwright test e2e/axe.spec.ts`

  Expected: PASS — 12 tests total (6 routes × 2 viewports), all green. If the mobile-viewport run surfaces a violation the desktop run doesn't (or vice versa), investigate before adjusting `KNOWN_VIOLATIONS` — it would mean this task's "should hold at both breakpoints" assumption was wrong for a reason worth understanding (e.g., a mobile-only layout issue Tasks 1–4 didn't catch), not something to paper over by just adding the id to the map.

- [ ] **Step 3: Run the full verification suite**

  Run: `npx tsc --noEmit && npm run lint && npm run test && npm run build`

  Expected: all green.

- [ ] **Step 4: Commit**

  ```bash
  git add e2e/axe.spec.ts
  git commit -m "test: run axe suite against both mobile and desktop viewports"
  ```

---

## Phase-level verification (after all five tasks, before whole-branch review)

- [ ] Run the full gate once more from a clean state: `npx tsc --noEmit && npm run lint && npm run test && npm run build`
- [ ] Run `npx playwright install --with-deps chromium && npm run test:e2e` — confirms every e2e spec (`routes.spec.ts`, `axe.spec.ts`, `interactive-controls.spec.ts`, `server-rendered-nav.spec.ts`, `mobile-menu.spec.ts`) passes together against the fully built app.
- [ ] Manually resize a real browser window (or use the browser devtools' responsive mode) across the `md` breakpoint (768px) on `/` and confirm: the nav visibly switches between mobile and desktop presentation with no flash of missing content, the mobile hamburger opens/closes correctly, and no console errors appear — this is the one check in this phase that's faster to eyeball directly than to keep encoding as more Playwright assertions, per this phase's design doc's own precedent for genuinely visual judgment calls.
- [ ] Confirm `git diff --exit-code sanity.types.ts` after `npm run typegen` is clean — this phase touches no GROQ queries, so this should be a no-op, but it's the same freshness check CI runs and costs nothing to confirm locally.
- [ ] Re-read `e2e/axe.spec.ts`'s final `KNOWN_VIOLATIONS` map and its header comment — confirm it accurately lists exactly two remaining entries (`color-contrast` on `/`, `heading-order` on `/tutorial`) and that the comment correctly attributes both as explicitly out of scope for this plan, not silently dropped.

---

## Risks

| Risk | Mitigation |
|---|---|
| Task 4's `Dialog`/`transition`/`data-[closed]:` integration is based on reading the installed package's minified source rather than live-testing it in a browser during planning (no way to render React/Tailwind output without running the actual dev/build server mid-plan) | Task 4's own Step 1 writes Playwright tests *before* the implementation, so any mismatch between the researched behavior and actual runtime behavior surfaces immediately as a failing test the implementer must resolve against reality, not against this plan's assumptions |
| Task 2's year-section spacing (`space-y-10`/`mb-5`/`space-y-6`) is a judgment call, not derived from a design spec, since the original interleaved-`<li>` spacing can't be reproduced exactly under the new `<section>`-per-year structure | Explicitly flagged in Task 2 Step 5 for the task-scoped reviewer; easy to adjust without touching the semantic fix (heading + valid `<ul>`) the task exists to deliver |
| `Profile.tsx`'s bio-toggle button has no live Sanity content to exercise it end-to-end (`profile.bio` is unset on every current `/people` profile, confirmed during this plan's research) | Task 1 verifies it via a deterministic Vitest source-text contract test instead, and calls this out explicitly rather than silently skipping coverage; if/when live bio content exists, the same keyboard/`aria-expanded` Playwright pattern already proven against `Toggle.tsx` in `e2e/interactive-controls.spec.ts` applies directly |
| `color-contrast` on `/` and `heading-order` on `/tutorial` remain open after this phase, even though this plan's user request references the same axe suite that documents them | Explicitly named as out-of-scope in Global Constraints and re-confirmed in the phase-level verification checklist — not silently dropped, consistent with how prior phases (2B) carried forward items they didn't fix |
| Task 5's assumption that `KNOWN_VIOLATIONS` holds identically at both viewports could be wrong in a way that only a mobile-specific axe run reveals (e.g., a `target-size` or overlap issue unique to the 375px layout that Tasks 1–4 didn't anticipate) | Task 5 Step 2 explicitly instructs investigating rather than reflexively adding any newly-observed id to the map — keeps the map meaning "known and understood," not "whatever axe happened to report" |
| Removing the `preventDefault`+`setTimeout(500)`+`router.push` pattern in Task 4 changes observable timing (menu-close-then-navigate becomes instantaneous instead of delayed) | This is an intentional simplification enabled by `Dialog`'s automatic focus-restore, not an incidental side effect — Task 4's own Context section states the reasoning; flagged here so whole-branch review knows it's deliberate, not a missed regression |

