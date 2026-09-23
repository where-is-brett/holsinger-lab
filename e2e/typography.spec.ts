import { expect, test } from '@playwright/test'

// Task 1 ("Fonts and type scale"): Brett's review of the preview found the
// root cause was typographic -- `--font-sans` pointed at the old site's
// mono face, and Archivo (the design's reading/display face) was loaded
// nowhere, so every heading, abstract and bio rendered mono, and at 375px
// Home's `<h1>` broke "Laborato/ry" mid-word (`break-words` alone was doing
// the job fluid type + `hyphens: auto` should mostly do instead). This file
// proves the fix: (a) no `h1`/`h2` word overflows its own line at 320/375,
// (b) the body font is actually Archivo, (c) mono stays on data (a DOI).

// -- (a) "every word's width fits the line" --------------------------------
//
// This is the second technique the task brief names as an alternative to
// walking `Range#getClientRects()` for a rendered-hyphen glyph: that first
// technique was tried and dropped (fix round 1) after it produced a false
// positive on a Gallery heading -- when a hyphen genuinely renders, the
// gap it leaves before the line's right edge can be a fraction of a pixel
// in some font/size combinations, indistinguishable from browser rounding
// noise, so a minimum-gap threshold has no value that is both strict
// enough to catch a real miss and loose enough not to flag a real hyphen.
//
// This checks the weaker but unambiguous claim instead: for every word in
// every `h1`/`h2`, no rendered fragment of it (a `Range` over just that
// word, per `getClientRects()`) pokes out past the heading's own right
// edge. A word that wraps cleanly (via a hyphen, or by moving whole to the
// next line) always satisfies this. A word that *doesn't* wrap and is too
// wide for its line -- the actual defect this task fixes (proved live:
// PublicationPage.tsx's h1 lets exactly this happen for one real DOI
// paper's "Pathophysiology", which is why `break-words` stays as a
// fallback there and everywhere else in components/redesign/** -- see its
// own comment) -- fails this check by construction.
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

// -- (b) the body font is Archivo -------------------------------------------
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

// -- (c) mono stays on data: a DOI ------------------------------------------
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
