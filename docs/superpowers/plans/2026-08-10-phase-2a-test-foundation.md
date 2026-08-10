# Phase 2A — Test Framework Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Vitest for pure-logic unit tests and Playwright + `@axe-core/playwright` for
route-level accessibility smoke tests, wire both into CI, and pin down current (imperfect)
behavior with real tests — including an explicit, self-documenting allowlist of the accessibility
violations later sub-phases (2B/2C) will fix — so subsequent Phase 2 work has a harness to write
tests into from the start.

**Architecture:** Two independent test layers, added in sequence. Vitest covers pure functions in
`lib/` with zero I/O (Node environment, no `jsdom` — nothing under test touches the DOM or React).
Playwright + axe covers what only a real browser can verify — actual rendered HTML, real
`getComputedStyle`/accessibility-tree behavior, and cross-page navigation — against a real
`next build && next start` server, matching this project's established "verify against a live
build" methodology from Phases 0/1/1C rather than a mocked/jsdom render.

**Tech Stack:** `vitest@4.1.10`, `vite-tsconfig-paths@6.1.1` (Vitest layer); `@playwright/test@1.62.1`,
`@axe-core/playwright@4.12.1` (E2E layer). All four versions verified against the npm registry on
2026-08-10 — the same discipline the Phase 1 foundations doc applied to its own dependency bumps.

## Global Constraints

- **No behavioral change to the shipped app in this sub-phase.** 2A only adds test infrastructure.
  Where a test discovers a real defect (see the axe known-violations allowlist in Task 5), the task
  documents it as a tracked, expected finding — it does **not** fix it. Fixing belongs to Phase
  2B/2C, per `docs/superpowers/specs/2026-08-10-phase-2-foundations-design.md` §4. Mixing a fix into
  2A's diff would blur this sub-phase's own review and its git history.
- **Every task ends with `npx tsc --noEmit` and `npx eslint .` green**, plus `npm run test` green
  from Task 1 onward and `npm run test:e2e` green from Task 4 onward. Run with
  `NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production` exported (same
  public, non-secret values `.github/workflows/ci.yml` already uses) — `npm run build`, and
  therefore every `test:e2e` run (its `webServer` rebuilds), needs real network access to
  `*.api.sanity.io`, exactly as every prior phase's build verification has.
- **The E2E suite runs against the live published Sanity dataset**, the same one every prior
  phase's `next build` verification has used. Two of its routes (`/tutorial`,
  `/projects/publication-highlights`) are real, currently-published content chosen because they
  exist today — confirmed via a real `npm run build` run during this plan's own research (2026-08-10),
  which listed both among the statically-generated paths. If either is ever renamed or unpublished,
  the corresponding test in Task 4/5 needs updating; this is the same live-content coupling
  `generateStaticParams` itself already has, not a new fragility this plan introduces.
- **No `jsdom`, no `@vitejs/plugin-react`.** Everything Vitest covers in this sub-phase is pure
  Node-environment logic — nothing renders React or touches the DOM. Component-level rendering
  tests, if ever needed, are out of scope here; Playwright already covers real-browser rendering for
  everything this project currently needs verified.
- **Test files import `describe`/`it`/`expect`/`vi` explicitly from `'vitest'`** (no global test
  APIs). This avoids a `tsconfig.json`/ESLint globals-config change and matches the codebase's
  existing no-ambient-magic style (every other module is explicit about its imports).

---

## Task 1: Install Vitest; characterization tests for `resolveHref`

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `lib/sanity.links.test.ts`

**Interfaces:**
- Consumes: `resolveHref(documentType?: string, slug?: string): string | undefined` from
  `lib/sanity.links.ts:1-16` (existing, unmodified by this task).
- Produces: the `npm run test` script and `vitest.config.ts`'s path-resolution setup
  (`vite-tsconfig-paths`, so bare imports like `lib/sanity.links` resolve the same way they do
  under `tsconfig.json`'s `baseUrl: "."`) that Tasks 2 and 3 rely on unchanged.

**Note on TDD phasing:** `resolveHref` already exists and already behaves correctly — there is no
new behavior to drive into existence, so there is no natural "red" phase here. This task is
*characterization testing*: pinning down real, already-correct behavior in an executable test, so a
future change that breaks it is caught. Write the tests to match the function's actual behavior
(read `lib/sanity.links.ts` first), then confirm they pass — not the write-test-see-it-fail cycle
Tasks in later sub-phases (2B/2C), which change real behavior, will use.

- [ ] **Step 1: Install Vitest and the tsconfig-paths resolver**

```bash
npm install -D vitest@4.1.10 vite-tsconfig-paths@6.1.1
```

Expected: `package.json`'s `devDependencies` gains both entries; `package-lock.json` updates; no
`ERESOLVE` errors. (`vitest` declares `vite` as a regular dependency as well as a peer range, so a
compatible `vite` installs automatically — no separate `vite` install needed.)

- [ ] **Step 2: Add test scripts to `package.json`**

Add to the `scripts` block (alphabetical position: after `start`, before `type-check`):

```json
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['**/*.test.ts'],
    exclude: ['node_modules', '.next', 'e2e'],
  },
})
```

- [ ] **Step 4: Write `lib/sanity.links.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest'

import { resolveHref } from './sanity.links'

describe('resolveHref', () => {
  it('resolves a home document to the root path, ignoring any slug', () => {
    expect(resolveHref('home')).toBe('/')
    expect(resolveHref('home', 'ignored')).toBe('/')
  })

  it('resolves a page document to /<slug>', () => {
    expect(resolveHref('page', 'about')).toBe('/about')
  })

  it('returns undefined for a page document with no slug', () => {
    expect(resolveHref('page')).toBeUndefined()
    expect(resolveHref('page', '')).toBeUndefined()
  })

  it('resolves a project document to /projects/<slug>', () => {
    expect(resolveHref('project', 'my-project')).toBe('/projects/my-project')
  })

  it('returns undefined for a project document with no slug', () => {
    expect(resolveHref('project')).toBeUndefined()
  })

  it('returns undefined and warns for an unrecognized document type', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(resolveHref('publication', 'x')).toBeUndefined()
    expect(warn).toHaveBeenCalledWith('Invalid document type:', 'publication')

    warn.mockRestore()
  })

  it('returns undefined and warns when documentType is undefined', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(resolveHref()).toBeUndefined()
    expect(warn).toHaveBeenCalledWith('Invalid document type:', undefined)

    warn.mockRestore()
  })

  it('does not warn for any recognized document type', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    resolveHref('home')
    resolveHref('page', 'about')
    resolveHref('project', 'my-project')
    expect(warn).not.toHaveBeenCalled()

    warn.mockRestore()
  })
})
```

- [ ] **Step 5: Run the suite**

```bash
npx vitest run
```

Expected: `lib/sanity.links.test.ts` — 8 passed, 0 failed.

- [ ] **Step 6: Confirm no regressions**

```bash
npx tsc --noEmit
npx eslint .
```

Expected: both clean, no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/sanity.links.test.ts
git commit -m "test: add Vitest and characterize resolveHref"
```

---

## Task 2: Characterization tests for `isNoindexPath`

**Files:**
- Create: `lib/site.test.ts`

**Interfaces:**
- Consumes: `isNoindexPath(path: string): boolean` from `lib/site.ts:26-28` (existing, unmodified).
  Internally depends on the module-level `noindexPaths` Set (`lib/site.ts:16`, currently
  `new Set(['/tutorial'])`) and the unexported `normalizePath` helper (`lib/site.ts:19-24`) — this
  task tests `isNoindexPath`'s public contract only; `normalizePath` stays unexported and is
  exercised indirectly.
- Produces: nothing new consumed by later tasks — this is a standalone characterization suite.

- [ ] **Step 1: Write `lib/site.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

import { isNoindexPath } from './site'

describe('isNoindexPath', () => {
  it('is true for the exact noindexed path', () => {
    expect(isNoindexPath('/tutorial')).toBe(true)
  })

  it('strips a trailing slash before matching', () => {
    expect(isNoindexPath('/tutorial/')).toBe(true)
  })

  it('strips a query string before matching', () => {
    expect(isNoindexPath('/tutorial?ref=abc')).toBe(true)
  })

  it('strips a hash fragment before matching', () => {
    expect(isNoindexPath('/tutorial#section')).toBe(true)
  })

  it('is false for the root path', () => {
    expect(isNoindexPath('/')).toBe(false)
  })

  it('is false for an unrelated path', () => {
    expect(isNoindexPath('/people')).toBe(false)
  })

  it('is case-sensitive', () => {
    expect(isNoindexPath('/Tutorial')).toBe(false)
  })

  it('does not match a path that merely starts with a noindexed path', () => {
    expect(isNoindexPath('/tutorial/extra')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the suite**

```bash
npx vitest run
```

Expected: `lib/sanity.links.test.ts` and `lib/site.test.ts` both run — 16 passed total, 0 failed.

- [ ] **Step 3: Confirm no regressions**

```bash
npx tsc --noEmit
npx eslint .
```

Expected: both clean, no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/site.test.ts
git commit -m "test: characterize isNoindexPath"
```

---

## Task 3: Characterization tests for `buildMetadata`

**Files:**
- Create: `lib/metadata.test.ts`

**Interfaces:**
- Consumes: `buildMetadata({ path, baseTitle?, title?, description?, image?, noindex? }): Metadata`
  from `lib/metadata.ts:6-53` (existing, unmodified). Only the `image: undefined` path is tested —
  per `docs/superpowers/specs/2026-08-10-phase-2-foundations-design.md` §1.7, the `image`-present
  path calls `urlForImage` (`lib/sanity.image.ts`), which closes over a module-scoped builder
  constructed from env vars at import time; testing it would need mocking `lib/sanity.image.ts` or
  stubbing env vars before import, which is out of this task's scope (no caller in the codebase
  passes `image` from anything other than `settings.ogImage`, itself untested content today).
- Produces: nothing new consumed by later tasks — standalone characterization suite.

- [ ] **Step 1: Write `lib/metadata.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

import { buildMetadata } from './metadata'

describe('buildMetadata', () => {
  it('joins title and baseTitle with a pipe', () => {
    const metadata = buildMetadata({
      path: '/',
      title: 'Home',
      baseTitle: 'Holsinger Lab',
    })
    expect(metadata.title).toBe('Home | Holsinger Lab')
  })

  it('falls back to baseTitle alone when title is omitted', () => {
    const metadata = buildMetadata({ path: '/', baseTitle: 'Holsinger Lab' })
    expect(metadata.title).toBe('Holsinger Lab')
  })

  it('falls back to the site name when neither title nor baseTitle is given', () => {
    const metadata = buildMetadata({ path: '/' })
    expect(metadata.title).toBe('Holsinger Lab')
  })

  it('builds an absolute canonical URL from siteUrl + path', () => {
    const metadata = buildMetadata({ path: '/about' })
    expect(metadata.alternates?.canonical).toBe(
      'https://holsingerlab.vercel.app/about'
    )
  })

  it('sets robots.index=false for a path in the noindex list', () => {
    const metadata = buildMetadata({ path: '/tutorial' })
    expect(metadata.robots).toEqual({ index: false })
  })

  it('sets robots.index=false when noindex is explicitly true, even off the noindex list', () => {
    const metadata = buildMetadata({ path: '/', noindex: true })
    expect(metadata.robots).toEqual({ index: false })
  })

  it('leaves robots undefined for an indexable path', () => {
    const metadata = buildMetadata({ path: '/' })
    expect(metadata.robots).toBeUndefined()
  })

  it('carries description through to openGraph and twitter', () => {
    const metadata = buildMetadata({ path: '/about', description: 'A description' })
    expect(metadata.openGraph?.description).toBe('A description')
    expect(metadata.twitter?.description).toBe('A description')
  })

  it('omits images and uses the summary Twitter card when no image is given', () => {
    const metadata = buildMetadata({ path: '/' })
    expect(metadata.openGraph?.images).toBeUndefined()
    expect(metadata.twitter?.card).toBe('summary')
  })
})
```

- [ ] **Step 2: Run the suite**

```bash
npx vitest run
```

Expected: `lib/sanity.links.test.ts`, `lib/site.test.ts`, `lib/metadata.test.ts` all run — 25 passed
total, 0 failed.

- [ ] **Step 3: Confirm no regressions**

```bash
npx tsc --noEmit
npx eslint .
```

Expected: both clean, no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/metadata.test.ts
git commit -m "test: characterize buildMetadata"
```

---

## Task 4: Install Playwright; route smoke tests

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Modify: `eslint.config.mjs`
- Create: `playwright.config.ts`
- Create: `e2e/routes.spec.ts`

**Interfaces:**
- Consumes: nothing from Tasks 1-3.
- Produces: `playwright.config.ts` (its `webServer`/`baseURL`/`projects` setup, which Task 5 relies
  on unchanged) and the `npm run test:e2e` script.

**Why the assertions below don't check for a `<nav>` landmark:** confirmed by reading
`components/global/Navbar/DesktopNavBar.tsx` and `MobileNavBar.tsx` in full — neither uses a `<nav>`
element or `role="navigation"` today (both are plain `<div>`s). That's a real gap, but fixing it is
Phase 2C's job (it naturally belongs with 2C's broader Navbar rewrite — see
`docs/superpowers/specs/2026-08-10-phase-2-foundations-design.md` §1.1/§3.3), not this task's. The
smoke test instead asserts on the "Publications" nav link by its accessible role and name, which
exists in both `DesktopNavBar.tsx` and `MobileNavBar.tsx` today whenever `settings.showPublications`
is true — true for the live dataset right now (confirmed: `npm run build` during this plan's
research generated `/publications` as a static route, which only happens when the toggle is on).

- [ ] **Step 1: Install Playwright and its browser binary**

```bash
npm install -D @playwright/test@1.62.1
npx playwright install --with-deps chromium
```

Expected: `package.json`'s `devDependencies` gains `@playwright/test`; the Chromium binary and its
OS-level dependencies install without error.

- [ ] **Step 2: Add the E2E test script to `package.json`**

Add to the `scripts` block (alphabetical position: after `test`, before `test:watch` —
`prettier-plugin-packagejson` will re-sort on the next `npm run format` regardless, so exact
placement here isn't load-bearing):

```json
    "test": "vitest run",
    "test:e2e": "playwright test",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit"
```

- [ ] **Step 3: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Rebuilds and serves a real production build rather than `next dev`, matching
  // this project's established "verify against a real build" approach (Phases
  // 0/1/1C). This means every `test:e2e` run rebuilds even if `npm run build` was
  // just run separately (e.g. in CI's own prior "Build" step) — a deliberate
  // tradeoff for a config that works identically and self-containedly in local
  // dev and CI, at the cost of one redundant build in CI. See Task 6.
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
```

- [ ] **Step 4: Create `e2e/routes.spec.ts`**

```ts
import { expect, test } from '@playwright/test'

// Chosen because they're real, currently-published content (confirmed via
// `npm run build` during this plan's research on 2026-08-10) — /tutorial and
// /projects/publication-highlights represent the two dynamic route families
// ([slug] and projects/[slug]) alongside the four static content routes.
const CONTENT_ROUTES = [
  '/',
  '/contact',
  '/people',
  '/publications',
  '/tutorial',
  '/projects/publication-highlights',
]

for (const path of CONTENT_ROUTES) {
  test(`${path} loads with a title and visible navigation`, async ({ page }) => {
    const response = await page.goto(path)
    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(/.+/)
    await expect(
      page.getByRole('link', { name: 'Publications' })
    ).toBeVisible()
  })
}
```

- [ ] **Step 5: Update `.gitignore`**

Add under the existing `# testing` section (`.gitignore:9-10`):

```
# testing
/coverage
/playwright-report
/test-results
```

- [ ] **Step 6: Update `eslint.config.mjs`'s ignores**

```js
  {
    ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**'],
  },
```

- [ ] **Step 7: Run the suite**

```bash
export NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os
export NEXT_PUBLIC_SANITY_DATASET=production
npm run test:e2e
```

Expected: 6 passed (one per route in `CONTENT_ROUTES`). This will take roughly as long as a full
`npm run build` plus `next start` boot, since the `webServer` performs both.

- [ ] **Step 8: Confirm no regressions**

```bash
npx tsc --noEmit
npx eslint .
```

Expected: both clean, no errors.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json .gitignore eslint.config.mjs playwright.config.ts e2e/routes.spec.ts
git commit -m "test: add Playwright and route smoke tests"
```

---

## Task 5: Axe accessibility assertions with a tracked known-violations allowlist

**Files:**
- Modify: `package.json`
- Create: `e2e/axe.spec.ts`

**Interfaces:**
- Consumes: `playwright.config.ts`'s `testDir`/`baseURL`/`webServer` from Task 4, unchanged.
- Produces: nothing new consumed by later tasks. The `KNOWN_VIOLATIONS` map defined here is the
  living contract Phase 2C's tasks must satisfy — each entry should be deleted, not merely edited,
  by whichever 2C task fixes it, at which point this test starts enforcing zero violations of that
  id on that route again automatically.

**Where the known-violations list below comes from:** not guessed. Verified empirically on
2026-08-10 by running `npm run build && npm run start`, opening a real browser against `/`,
`/contact`, `/people`, and `/publications`, injecting `axe-core@4.12.1`, and calling `axe.run()`
directly — the same real-build, real-browser verification method this project's plans have used
since Phase 1C, applied here to accessibility instead of computed CSS values. Full results are
recorded in `docs/superpowers/specs/2026-08-10-phase-2-foundations-design.md` §1.2a. `/tutorial` and
`/projects/publication-highlights` were not directly re-verified during that research pass, but both
render through the exact same `components/shared/Layout.tsx` wrapper that produces the
`landmark-one-main`/`region` violations on every other route (there is only one `Layout` component
in the whole app), so the same two entries are expected there too — Step 4 below has you confirm
this directly rather than trust the inference.

- [ ] **Step 1: Install `@axe-core/playwright`**

```bash
npm install -D @axe-core/playwright@4.12.1
```

Expected: `package.json`'s `devDependencies` gains the entry; no `ERESOLVE` errors (its only peer,
`playwright-core`, is already satisfied transitively by `@playwright/test`).

- [ ] **Step 2: Create `e2e/axe.spec.ts`**

```ts
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// Violations already known to exist today, each tracked to the Phase 2C task
// that fixes it. Delete an entry (not just an id inside it) once its fix
// lands — this test then starts enforcing zero violations of that kind on
// that route again, with no further change needed here.
//
// - landmark-one-main / region: components/shared/Layout.tsx wraps every
//   route's content in a plain <div>, not a <main> element. Fixed by 2C's
//   Layout.tsx landmark task.
// - list / listitem (moderate on /publications only): the <div> direct
//   child of <ul> in components/pages/publications/Publications.tsx.
//   Fixed by 2C's <ul> markup task.
const KNOWN_VIOLATIONS: Record<string, string[]> = {
  '/': ['landmark-one-main', 'region'],
  '/contact': ['landmark-one-main', 'region'],
  '/people': ['landmark-one-main', 'region'],
  '/publications': ['landmark-one-main', 'region', 'list', 'listitem'],
  '/tutorial': ['landmark-one-main', 'region'],
  '/projects/publication-highlights': ['landmark-one-main', 'region'],
}

for (const [path, knownIds] of Object.entries(KNOWN_VIOLATIONS)) {
  test(`${path} has no unexpected accessibility violations`, async ({ page }) => {
    await page.goto(path)
    const results = await new AxeBuilder({ page }).analyze()
    const unexpected = results.violations.filter((v) => !knownIds.includes(v.id))
    expect(unexpected, JSON.stringify(unexpected, null, 2)).toEqual([])
  })
}
```

- [ ] **Step 3: Run the suite**

```bash
export NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os
export NEXT_PUBLIC_SANITY_DATASET=production
npm run test:e2e
```

Expected: all 6 `e2e/routes.spec.ts` tests plus all 6 `e2e/axe.spec.ts` tests pass — 12 passed
total.

- [ ] **Step 4: Confirm `/tutorial` and `/projects/publication-highlights`'s allowlist entries are
  correct, not assumed**

Temporarily change each of those two routes' `KNOWN_VIOLATIONS` entries to `[]` and rerun:

```bash
npm run test:e2e -- e2e/axe.spec.ts
```

Expected: both tests fail, and the failure output (the `unexpected` array, printed via the
`expect(..., JSON.stringify(...))` message) shows exactly `landmark-one-main` and `region` — nothing
else. If anything else appears, that route has a real, additional violation this plan's research
didn't catch; add it to that route's array with a comment explaining what it is and which future
task should fix it, following the same format as the existing entries. Once confirmed, restore both
entries to `['landmark-one-main', 'region']` and rerun to confirm green again.

- [ ] **Step 5: Prove the harness actually catches a real regression**

Temporarily remove `'list'` and `'listitem'` from `/publications`'s entry (leaving
`['landmark-one-main', 'region']`) and rerun:

```bash
npm run test:e2e -- e2e/axe.spec.ts
```

Expected: the `/publications` test fails, with the `unexpected` array showing the `list` and
`listitem` violations (impact `serious`, from the real `<div>`-in-`<ul>` defect). This confirms the
axe harness genuinely detects the defect rather than rubber-stamping. Restore the entry to
`['landmark-one-main', 'region', 'list', 'listitem']` and rerun to confirm green again before
committing.

- [ ] **Step 6: Confirm no regressions**

```bash
npx tsc --noEmit
npx eslint .
```

Expected: both clean, no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json e2e/axe.spec.ts
git commit -m "test: add axe accessibility smoke tests with tracked known violations"
```

---

## Task 6: Wire both suites into CI; pin a Node engines floor

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `package.json`

**Interfaces:**
- Consumes: `npm run test` (Task 1), `npm run test:e2e` (Tasks 4-5), both unchanged.
- Produces: nothing consumed by later Phase 2 sub-phases — this task closes out 2A.

- [ ] **Step 1: Add an `engines` field to `package.json`**

Add as a new top-level key (position: after `"private": true,`, before `"scripts"`):

```json
  "private": true,
  "engines": {
    "node": ">=22"
  },
  "scripts": {
```

CI already pins `node-version: 22` (`.github/workflows/ci.yml:22`); this makes the same floor
explicit for local development, where no `.nvmrc` or `engines` field exists today. A floor (`>=22`),
not an exact pin, since both new tools' own engine ranges (`vitest`: `^20 || ^22 || >=24`;
`@playwright/test`: `>=20`) are satisfied by anything at or above 22 — there's no reason to forbid a
newer Node.

- [ ] **Step 2: Add unit and E2E test steps to `.github/workflows/ci.yml`**

Insert a new "Unit tests" step after the existing "Lint" step (`.github/workflows/ci.yml:30-31`) and
before "Sanity TypeGen freshness":

```yaml
      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm run test

      - name: Sanity TypeGen freshness
```

Insert "Install Playwright browsers" and "E2E tests" steps after the existing "Build" step
(`.github/workflows/ci.yml:41-42`), at the end of the job:

```yaml
      - name: Build
        run: npm run build

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: E2E tests
        run: npm run test:e2e
```

Full resulting `steps:` list, for reference (only the four new steps are additions — everything
else is unchanged from the current file):

```yaml
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm run test

      - name: Sanity TypeGen freshness
        run: |
          npm run typegen
          if ! git diff --exit-code sanity.types.ts; then
            echo "::error::sanity.types.ts is out of date — run 'npm run typegen' and commit the result."
            exit 1
          fi

      - name: Build
        run: npm run build

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: E2E tests
        run: npm run test:e2e
```

Note: the E2E step's `webServer` (per `playwright.config.ts`, Task 4) runs `npm run build` again
internally before starting the server, even though the "Build" step already ran it moments earlier
in the same job. This is deliberate — see the comment on `webServer` in `playwright.config.ts` —
rather than an oversight; don't "optimize" it away by trying to reuse the earlier build's output
without also updating that comment and this note.

- [ ] **Step 3: Verify the YAML is well-formed**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" && echo "valid YAML"
```

Expected: `valid YAML`. This confirms syntax only — actual CI behavior (env vars reaching the
`webServer` subprocess, runner timing) can only be confirmed by a real CI run on the PR this task's
commit goes into, matching how every prior phase's CI-file changes were ultimately verified.

- [ ] **Step 4: Confirm no regressions locally**

```bash
npx tsc --noEmit
npx eslint .
npm run test
```

Expected: all clean/passing. (Don't re-run `test:e2e` here — Task 5's Step 3 already confirmed it
passes, and this step only touches CI config and `package.json`'s `engines` field, neither of which
`test:e2e`'s outcome depends on.)

- [ ] **Step 5: Commit**

```bash
git add package.json .github/workflows/ci.yml
git commit -m "ci: run Vitest and Playwright suites; pin a Node engines floor"
```

---

**Exit criteria for this sub-phase:** `tsc --noEmit`, `eslint .`, `npm run test`, and
`npm run test:e2e` all green, locally and in CI on the PR. 25 Vitest assertions characterizing
`resolveHref`/`isNoindexPath`/`buildMetadata`. 12 Playwright tests (6 route smoke + 6 axe) covering
every content route family. The axe suite's `KNOWN_VIOLATIONS` map is the authoritative, current
record of every accessibility defect this sub-phase found and did not fix — Phase 2C's plan should
read it directly rather than re-deriving the list from scratch.
