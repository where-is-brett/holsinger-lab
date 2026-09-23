import { expect, test } from '@playwright/test'

// Task 1 ("Fonts and type scale"): Brett's review of the preview found the
// root cause was typographic -- `--font-sans` pointed at the old site's
// mono face, and Archivo (the design's reading/display face) was loaded
// nowhere, so every heading, abstract and bio rendered mono, and at 375px
// Home's `<h1>` broke "Laborato/ry" mid-word. Fix round 2 (review):
// Chromium never hyphenates a capitalised word, so `hyphens-auto` is inert
// on nearly every heading here, and `break-words` alone decides whether a
// long word splits raw or a level's clamp floor genuinely fits it. This
// file proves: (a) live routes never overflow (the unconditional floor);
// (b) on the gallery's dedicated full-width fixtures, each type level's
// budget word fits *without* relying on a raw `overflow-wrap` split --
// see task-1-report.md's "Word-fit budgets"; (c) the body font is Archivo;
// (d) mono stays on data (a DOI).

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
// fallback, leaving only `hyphens-auto` and ordinary space-wrapping) and
// re-measure. If it still doesn't overflow its own box
// (`scrollWidth <= clientWidth`), whatever wrapping happens is either a real
// hyphenated break or a whole-word wrap -- never a raw split -- so the
// level's clamp floor genuinely fits its budget word. If it overflows once
// the fallback is removed, the original render was relying on a raw split
// (or would have overflowed outright), and the test fails. This is the
// "simpler equivalent" of the per-word toggle-and-compare probe: a raw
// split can only ever happen via `overflow-wrap`, so proving the heading
// survives without it is exactly proving no raw split occurred.
//
// Scoped to the gallery's dedicated "typography budget" section
// (Gallery.tsx), not every heading on the page: those fixtures render the
// real Home/PageTitle/PublicationPage/Research components at the page's
// actual gutter width (a `-mx-6` full-width wrapper, cancelling out
// `<main>`'s own padding -- see that section's comment), and each one's
// title pairs its level's budget word, capitalised, with a long lowercase
// word, so this exercises both the "can't hyphenate" and "does hyphenate"
// outcomes deliberately. Other gallery sections keep their narrower demo
// frames on purpose (isolated component previews, not page simulations),
// so they're intentionally out of scope for this stronger check -- they're
// still covered by (a) above.
const BUDGET_TOLERANCE_PX = 1

const BUDGET_FIXTURES = [
  { testId: 'typography-budget-display', level: 'display', word: 'Neuroscience' },
  { testId: 'typography-budget-title', level: 'title (page title)', word: 'Pathophysiology' },
  { testId: 'typography-budget-paper-title', level: 'title (paper title)', word: 'Pathophysiology' },
  { testId: 'typography-budget-heading', level: 'heading', word: 'Neurodegenerative' },
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
  testId: string
): Promise<{ found: boolean; overflowPx: number }> {
  return page.evaluate((id: string) => {
    const container = document.querySelector(`[data-testid="${id}"]`)
    const heading = container?.querySelector('h1, h2')
    if (!heading) return { found: false, overflowPx: 0 }

    const original = (heading as HTMLElement).style.overflowWrap
    ;(heading as HTMLElement).style.overflowWrap = 'normal'
    const overflowPx = heading.scrollWidth - heading.clientWidth
    ;(heading as HTMLElement).style.overflowWrap = original

    return { found: true, overflowPx }
  }, testId)
}

test.describe('gallery typography budget: each level fits its budget word without a raw split', () => {
  for (const width of WIDTHS) {
    test(`/preview/components at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/preview/components')

      const violations: RawSplitResult[] = []
      for (const fixture of BUDGET_FIXTURES) {
        const result = await checkNoRawSplit(page, fixture.testId)
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
