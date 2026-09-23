import { expect, test } from '@playwright/test'

// Header geometry against the Publications page's FacetBand. The header
// is exactly `--nav-height` tall, at every width, because it is one
// sticky element (spec decision 4). Jump-links are gone (spec §7) -- there
// is no year-anchor scroll-offset test to carry over.
//
// The FacetBand itself is not sticky -- it stays in normal flow at every
// viewport, so it scrolls away with the page.

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

// Located via `data-testid="facet-band"` (FacetBand.tsx).
function facetBand(page: import('@playwright/test').Page) {
  return page.getByTestId('facet-band')
}

test.describe('the FacetBand is never sticky', () => {
  for (const viewport of [
    // Wide+tall, wide+short, and narrow mobile -- static at every combination.
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
})
