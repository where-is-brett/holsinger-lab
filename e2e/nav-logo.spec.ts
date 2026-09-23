import { expect, test } from '@playwright/test'

// Header geometry against the Publications page's FacetBand. The header
// is exactly `--nav-height` tall, at every width, because it is one
// sticky element (spec decision 4). Jump-links are gone (spec §7) -- there
// is no year-anchor scroll-offset test to carry over.
//
// Task 2 fix round 2 (controller ruling): the FacetBand itself is no
// longer sticky (removed -- PR 3 was already going to remove sticky
// filtering, and fix round 1's `Section label="Filter"` wrap had broken
// its sticky positioning anyway, per the re-review's "New Breakage 1").
// This file used to assert the band pinned at `top: var(--nav-height)`
// above a combined 64rem/56rem breakpoint; it now asserts the opposite --
// the band never becomes sticky, at any viewport, and stays in normal
// flow when the page scrolls -- so this coverage isn't silently dropped,
// just inverted to match the new behaviour.

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

    test('the header stays pinned after scrolling', async ({ page }) => {
      await page.goto('/publications')
      await page.mouse.wheel(0, 1500)
      await expect
        .poll(() => page.evaluate(() => document.querySelector('[data-testid="site-header"]')!.getBoundingClientRect().top))
        .toBe(0)
    })
  })
}

// `data-testid="facet-band"` (FacetBand.tsx, fix round 2) -- replaces the
// old `z-[5]`-ancestor lookup, which existed only because `z-[5]` was this
// element's one unique class while it was the sticky-positioning trigger.
function facetBand(page: import('@playwright/test').Page) {
  return page.getByTestId('facet-band')
}

test.describe('the FacetBand is never sticky', () => {
  for (const viewport of [
    // The widest/tallest combination this file used to assert *was*
    // sticky under the old 64rem/56rem rule -- now the opposite.
    { width: 1280, height: 1000 },
    { width: 1280, height: 720 },
    { width: 375, height: 812 },
  ]) {
    test(`at ${viewport.width}x${viewport.height}, position is static`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/publications')
      const position = await facetBand(page).evaluate((el) => getComputedStyle(el).position)
      expect(position).toBe('static')
    })
  }
  // Task 2 fix round 3 (re-review round 2 Minor 3): a "scrolls away with
  // the page" behavioural test used to sit here, asserting the band's
  // `top` goes negative after scrolling. Deleted -- the re-review found it
  // could never go red: forcing `position: sticky` back onto the band (in
  // the live page, with `Section`'s content cell still exactly the band's
  // own height) still measured `top: -1266` after the same scroll, because
  // the cell it's boxed into has nowhere to let it travel regardless of
  // its own `position`. The `position: static` assertions above are what
  // actually catch a sticky regression; this test proved nothing beyond
  // them.
})
