import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// The footer's light/dark switch (components/redesign/ThemeToggle.tsx).
// Agreed behaviour: a visit starts on the device's setting; a click flips
// the page and holds for the rest of that visit (reloads and page changes),
// and a new visit follows the device again.

/** Mean of the body's background RGB channels: < 60 is dark, > 200 light. */
async function bodyBrightness(page: Page): Promise<number> {
  const bg = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor
  )
  const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) throw new Error(`unparseable colour: ${bg}`)
  return (Number(m[1]) + Number(m[2]) + Number(m[3])) / 3
}

const switchButton = (page: Page) =>
  page
    .locator('footer')
    .getByRole('button', { name: /^Switch to (light|dark) theme$/ })

test.describe('on a light-mode device', () => {
  test.use({ colorScheme: 'light' })

  test('starts light, and one click turns the page dark', async ({ page }) => {
    await page.goto('/')
    expect(await bodyBrightness(page)).toBeGreaterThan(200)
    await expect(switchButton(page)).toHaveAccessibleName(
      'Switch to dark theme'
    )

    await switchButton(page).click()

    expect(await bodyBrightness(page)).toBeLessThan(60)
    await expect(switchButton(page)).toHaveAccessibleName(
      'Switch to light theme'
    )
    await expect(page.locator('html')).toHaveAttribute('data-scheme', 'dark')
  })

  test('the choice holds across a reload and a page change, with no light flash', async ({
    page,
  }) => {
    await page.goto('/')
    await switchButton(page).click()

    await page.reload({ waitUntil: 'commit' })
    // Set by the inline <head> script, before React or the body exist.
    await page.waitForFunction(
      () => document.documentElement.dataset.scheme === 'dark'
    )
    await page.waitForLoadState('load')
    expect(await bodyBrightness(page)).toBeLessThan(60)

    await page.goto('/people')
    expect(await bodyBrightness(page)).toBeLessThan(60)
    await expect(switchButton(page)).toHaveAccessibleName(
      'Switch to light theme'
    )
  })

  test('a new visit follows the device again', async ({ browser }) => {
    const first = await browser.newContext({ colorScheme: 'light' })
    const page = await first.newPage()
    await page.goto('/')
    await switchButton(page).click()
    await first.close()

    const second = await browser.newContext({ colorScheme: 'light' })
    const fresh = await second.newPage()
    await fresh.goto('/')
    await expect(fresh.locator('html')).not.toHaveAttribute('data-scheme', /.*/)
    expect(await bodyBrightness(fresh)).toBeGreaterThan(200)
    await second.close()
  })

  test('works from the keyboard', async ({ page }) => {
    await page.goto('/')
    await switchButton(page).focus()
    await page.keyboard.press('Enter')
    expect(await bodyBrightness(page)).toBeLessThan(60)
  })

  test("the browser's address-bar colour follows the switch", async ({
    page,
  }) => {
    await page.goto('/')
    await switchButton(page).click()
    const surface = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--sem-surface')
        .trim()
    )
    const metas = page.locator('meta[name="theme-color"]')
    expect(await metas.count()).toBeGreaterThan(0)
    for (const content of await metas.evaluateAll((els) =>
      els.map((el) => el.getAttribute('content'))
    )) {
      expect(content?.toLowerCase()).toBe(surface.toLowerCase())
    }
  })

  test('picked dark has no accessibility violations', async ({ page }) => {
    await page.goto('/')
    await switchButton(page).click()
    const results = await new AxeBuilder({ page }).analyze()
    expect(
      results.violations,
      JSON.stringify(results.violations, null, 2)
    ).toEqual([])
  })
})

test.describe('on a dark-mode device', () => {
  test.use({ colorScheme: 'dark' })

  test('starts dark, and one click turns the page light', async ({ page }) => {
    await page.goto('/')
    expect(await bodyBrightness(page)).toBeLessThan(60)
    await expect(switchButton(page)).toHaveAccessibleName(
      'Switch to light theme'
    )

    await switchButton(page).click()

    expect(await bodyBrightness(page)).toBeGreaterThan(200)
    await expect(switchButton(page)).toHaveAccessibleName(
      'Switch to dark theme'
    )
  })

  test('picked light has no accessibility violations', async ({ page }) => {
    await page.goto('/')
    await switchButton(page).click()
    const results = await new AxeBuilder({ page }).analyze()
    expect(
      results.violations,
      JSON.stringify(results.violations, null, 2)
    ).toEqual([])
  })
})

test.describe('at phone width', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('the switch is in the footer, on screen, and adds no sideways scroll', async ({
    page,
  }) => {
    await page.goto('/')
    const button = switchButton(page)
    await button.scrollIntoViewIfNeeded()
    await expect(button).toBeInViewport()
    const box = await button.boundingBox()
    // WCAG 2.5.8 target size: at least 24 x 24 CSS px.
    expect(box!.width).toBeGreaterThanOrEqual(24)
    expect(box!.height).toBeGreaterThanOrEqual(24)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBeLessThanOrEqual(375)
  })
})
