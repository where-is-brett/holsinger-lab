import { expect, test } from '@playwright/test'

// The body font is Archivo, not the old site's mono face, and headings rely
// on `break-words` alone to decide whether a long word splits raw or a
// level's clamp floor genuinely fits it -- `hyphens-auto` is not used
// (Chromium never hyphenates a capitalised word, so it was inert on nearly
// every heading here, and would hyphenate lowercase words unpredictably
// depending on whether the platform's Chromium ships a dictionary). This
// file proves: (a) live routes never overflow (the unconditional floor);
// (b) on the gallery's dedicated full-width fixtures, each type level's
// budget word fits *without* relying on a raw `overflow-wrap` split; (c)
// the body font is Archivo; (d) mono stays on data (a DOI).

// -- (a) live routes: no h1/h2 word overflows its own line ------------------
//
// This only proves absence of overflow, which `break-words` guarantees by
// construction -- it cannot tell a real hyphenated wrap from a raw
// mid-word split (see (b) below for that). It stays because it's cheap,
// dataset-independent, and still a real regression guard: it would catch a
// heading whose word is wide enough to overflow even with `break-words`
// (e.g. a single unbreakable run wider than the whole column). Applied to
// live routes precisely because a raw split in real CMS content -- title
// case is nearly all of it -- is an accepted, documented fallback (spec
// exception, task-1-report.md), not a bug: this suite must hold for any
// valid dataset, so it must not fail CI over a raw split it can't help.
const OVERFLOW_TOLERANCE_PX = 1

interface OverflowViolation {
  route: string
  width: number
  tag: string
  word: string
  overflowPx: number
}

async function findOverflowingWords(
  page: import('@playwright/test').Page
): Promise<{ tag: string; word: string; overflowPx: number }[]> {
  return page.evaluate((tolerancePx: number) => {
    const violations: { tag: string; word: string; overflowPx: number }[] = []
    const headings = Array.from(document.querySelectorAll('h1, h2'))

    for (const heading of headings) {
      const containerRight = heading.getBoundingClientRect().right
      const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent ?? ''
        const wordRe = /[\p{L}\p{N}]+/gu
        for (let match = wordRe.exec(text); match; match = wordRe.exec(text)) {
          const start = match.index
          const end = start + match[0].length
          const range = document.createRange()
          range.setStart(node, start)
          range.setEnd(node, end)
          const rects = Array.from(range.getClientRects())

          const rightmost = Math.max(...rects.map((r) => r.right))
          const overflowPx = rightmost - containerRight

          if (overflowPx > tolerancePx) {
            violations.push({
              tag: heading.tagName.toLowerCase(),
              word: match[0],
              overflowPx: Math.round(overflowPx * 100) / 100,
            })
          }
        }
      }
    }
    return violations
  }, OVERFLOW_TOLERANCE_PX)
}

const ROUTES = ['/', '/research', '/people', '/preview/components']
const WIDTHS = [320, 375]

test.describe('no h1/h2 word overflows its own line', () => {
  for (const route of ROUTES) {
    for (const width of WIDTHS) {
      test(`${route} at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(route)

        const found = await findOverflowingWords(page)
        const violations: OverflowViolation[] = found.map((v) => ({ route, width, ...v }))

        expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
      })
    }
  }
})

// -- (b) gallery typography budget: no *raw* mid-word split -----------------
//
// The reviewer's detection method: for the heading inside each fixture, set
// `overflow-wrap: normal` on it (removing `break-words`'s raw-split
// fallback, leaving only ordinary space-wrapping) and re-measure. If it
// still doesn't overflow its own box (`scrollWidth <= clientWidth`),
// whatever wrapping happens is a whole-word wrap -- never a raw split -- so
// the level's clamp floor genuinely fits its budget word. If it overflows
// once the fallback is removed, the original render was relying on a raw
// split (or would have overflowed outright), and the test fails. This is
// the "simpler equivalent" of the per-word toggle-and-compare probe: a raw
// split can only ever happen via `overflow-wrap`, so proving the heading
// survives without it is exactly proving no raw split occurred.
//
// `el.style.hyphens = 'manual'` joins `overflow-wrap: normal` in the
// toggle as a belt-and-braces guard against the CSS initial value -- no
// heading currently declares `hyphens: auto`, but a future one might, and
// this check should keep proving the budget holds without it regardless.
// Each fixture's non-budget words are also kept short enough to fit at
// 320px on their own (fixtures.ts), so the check never depends on
// platform-dependent hyphenation (CI's Linux Chromium ships no hyphenation
// dictionaries; a developer's macOS Chromium does).
//
// Scoped to the gallery's dedicated "typography budget" section
// (Gallery.tsx) by an explicit selector per fixture, not the first `h1`/`h2`
// inside its container: `typography-budget-heading` wraps a full `Research`
// render, whose own `PageTitle` ("Research") is a heading that sits before
// the project title this fixture exists to test, so a generic `querySelector
// ('h1, h2')` would measure the wrong heading. Other gallery sections keep
// their narrower demo frames on purpose (isolated component previews, not
// page simulations), so they're intentionally out of scope for this
// stronger check -- they're still covered by (a) above.
const BUDGET_TOLERANCE_PX = 1

const BUDGET_FIXTURES = [
  {
    testId: 'typography-budget-display',
    level: 'display',
    word: 'Neuroscience',
    selector: '[data-testid="home-identity-title"]',
  },
  {
    testId: 'typography-budget-title',
    level: 'title (page title)',
    word: 'Pathophysiology',
    selector: '[data-testid="page-title-heading"]',
  },
  {
    testId: 'typography-budget-paper-title',
    level: 'title (paper title)',
    word: 'Pathophysiology',
    selector: '[data-testid="paper-title"]',
  },
  {
    testId: 'typography-budget-heading',
    level: 'heading',
    word: 'Neurodegenerative',
    selector: '[data-testid="research-project-title"]',
  },
  {
    testId: 'typography-budget-lead-paper',
    level: 'heading (lead paper)',
    word: 'Neurodegenerative',
    selector: '[data-testid="home-lead-paper"] h3',
  },
]

interface RawSplitResult {
  testId: string
  level: string
  word: string
  found: boolean
  overflowPx: number
}

async function checkNoRawSplit(
  page: import('@playwright/test').Page,
  containerTestId: string,
  headingSelector: string
): Promise<{ found: boolean; overflowPx: number }> {
  return page.evaluate(
    ({ containerTestId, headingSelector }) => {
      const container = document.querySelector(`[data-testid="${containerTestId}"]`)
      const heading = container?.querySelector(headingSelector)
      if (!heading) return { found: false, overflowPx: 0 }

      const el = heading as HTMLElement
      const originalWrap = el.style.overflowWrap
      const originalHyphens = el.style.hyphens
      el.style.overflowWrap = 'normal'
      el.style.hyphens = 'manual'
      const overflowPx = heading.scrollWidth - heading.clientWidth
      el.style.overflowWrap = originalWrap
      el.style.hyphens = originalHyphens

      return { found: true, overflowPx }
    },
    { containerTestId, headingSelector }
  )
}

test.describe('gallery typography budget: each level fits its budget word without a raw split', () => {
  for (const width of WIDTHS) {
    test(`/preview/components at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/preview/components')
      // Waits for fonts so an unloaded Archivo (fallback stack resolves
      // wider) can't turn this tight-margin (down to ~15px at 320px)
      // budget check red for a font-loading reason rather than a layout one.
      await page.evaluate(() => document.fonts.ready)

      const violations: RawSplitResult[] = []
      for (const fixture of BUDGET_FIXTURES) {
        const result = await checkNoRawSplit(page, fixture.testId, fixture.selector)
        if (!result.found || result.overflowPx > BUDGET_TOLERANCE_PX) {
          violations.push({ ...fixture, ...result })
        }
      }

      expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
    })
  }
})

// -- (c) the body font is Archivo -------------------------------------------
//
// `getComputedStyle` reports the resolved `font-family` stack, whose first
// entry is next/font's generated Archivo family name (a hashed
// `__Archivo_...` class the build assigns) -- checked as a case-insensitive
// substring of the *first* stack entry so this doesn't depend on the exact
// hash a given build produces.
test('the body font is Archivo, not a mono face', async ({ page }) => {
  await page.goto('/')
  const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily)
  const firstFamily = fontFamily.split(',')[0]?.toLowerCase() ?? ''
  expect(firstFamily, fontFamily).toContain('archivo')
})

// -- (d) mono stays on data: a DOI ------------------------------------------
//
// Mirrors publication-page.spec.ts's own "find a DOI row, skip if this
// dataset has none" pattern -- an assertion that holds for any valid
// dataset means skipping cleanly rather than asserting on data that may not
// exist, not hardcoding a title or count.
test('a DOI identifier on /publications renders in a monospace font', async ({ page }) => {
  await page.goto('/publications')
  const doiRow = page.locator('[data-testid="pub-row"][data-link-kind="DOI"]').first()
  const hasDoiRow = (await doiRow.count()) > 0
  test.skip(!hasDoiRow, 'no DOI publication in this dataset')

  const identifier = doiRow.locator('[data-identifier]').first()
  const fontFamily = await identifier.evaluate((el) => getComputedStyle(el).fontFamily)
  expect(fontFamily.toLowerCase()).toContain('mono')
})
