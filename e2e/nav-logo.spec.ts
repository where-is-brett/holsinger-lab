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
