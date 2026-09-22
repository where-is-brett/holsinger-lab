import { expect, test } from '@playwright/test'

// Header geometry against the Publications page's FacetBand. The band is
// sticky only when the viewport is at least 64rem wide AND at least 56rem
// tall (spec §4.2, FacetBand.tsx, fix round 3), pinned at
// top: var(--nav-height); the header is exactly that tall, at every width,
// because it is one sticky element (spec decision 4). Jump-links are gone
// (spec §7) -- there is no year-anchor scroll-offset test to carry over.

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

// The FacetBand root is the ancestor div carrying its `z-[5]` utility
// (unique to that one element -- see FacetBand.tsx), located from the
// "Density" row label rather than by DOM position, since a broad `div`
// selector containing that text would also match every ancestor wrapper up
// to `<body>`.
function facetBand(page: import('@playwright/test').Page) {
  return page
    .getByText('Density', { exact: true })
    .locator('xpath=ancestor::div[contains(@class, "z-[5]")]')
    .first()
}

test('at 1280x1000 (>=64rem wide and >=56rem tall) the FacetBand sticks under the header', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 })
  await page.goto('/publications')
  const band = facetBand(page)
  const g = await page.evaluate((el) => {
    const header = document.querySelector('[data-testid="site-header"]')
    if (!header || !el) return null
    const style = getComputedStyle(el)
    return {
      headerHeight: header.getBoundingClientRect().height,
      position: style.position,
      top: Number.parseFloat(style.top),
    }
  }, await band.elementHandle())
  expect(g).not.toBeNull()
  expect(g!.position).toBe('sticky')
  expect(g!.top).toBeCloseTo(g!.headerHeight, 0)
})

test('at 1280x720 (wide enough but not tall enough) the FacetBand is not sticky', async ({
  page,
}) => {
  // 720px is under the 56rem (896px) height threshold, even though 1280px
  // clears the 64rem width one -- proves the band needs both conditions,
  // not just the width one `lg:` alone used to check.
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/publications')
  const band = facetBand(page)
  const position = await band.evaluate((el) => getComputedStyle(el).position)
  expect(position).toBe('static')
})

test('at 375x812 (narrow) the FacetBand is not sticky', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/publications')
  const band = facetBand(page)
  const position = await band.evaluate((el) => getComputedStyle(el).position)
  expect(position).toBe('static')
})
