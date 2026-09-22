import { expect, test } from '@playwright/test'

// The trigger ("Menu") lives in the outer sticky band. The panel draws its
// own copy of the same band, with the toggle reading "Close" there instead
// (spec decision 3) -- so once the dialog is open, every assertion targets
// the in-panel Close, not the outer trigger, which sits behind the panel.

test.describe('mobile menu accessibility contract', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('toggle has an accessible name equal to its visible text and toggles aria-expanded/aria-controls', async ({
    page,
  }) => {
    await page.goto('/')

    const trigger = page.getByRole('button', { name: 'Menu', exact: true })
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toHaveAttribute('aria-controls', 'mobile-menu-panel')

    await trigger.click()
    const close = page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true })
    await expect(close).toHaveAttribute('aria-expanded', 'true')
  })

  test('is reachable and operable via keyboard alone', async ({ page }) => {
    await page.goto('/')

    const trigger = page.getByRole('button', { name: 'Menu', exact: true })
    for (let i = 0; i < 5; i++) {
      if (await trigger.evaluate((el) => el === document.activeElement)) break
      await page.keyboard.press('Tab')
    }
    await expect(trigger).toBeFocused()

    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Controller ruling: initial focus lands on the in-panel Close, not the
    // wordmark link that leads it in DOM order.
    const close = dialog.getByRole('button', { name: 'Close', exact: true })
    await expect(close).toBeFocused()
  })

  test('Escape closes the menu and returns focus to the trigger', async ({
    page,
  }) => {
    await page.goto('/')

    const trigger = page.getByRole('button', { name: 'Menu', exact: true })
    await trigger.click()
    await expect(
      page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true })
    ).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toBeFocused()
  })

  test('Tab stays trapped inside the open panel', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    const panelLinks = page.getByRole('dialog').getByRole('link')
    const linkCount = await panelLinks.count()
    expect(linkCount).toBeGreaterThan(0)

    // Tab one more time than there are links in the panel; focus should
    // still be inside the dialog, never having escaped to page content
    // behind it (e.g. the outer wordmark link, which sits outside the
    // dialog while it is open).
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

    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    const overflowWhileOpen = await page.evaluate(
      () => document.documentElement.style.overflow
    )
    expect(overflowWhileOpen).toBe('hidden')

    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
    const overflowAfterClose = await page.evaluate(
      () => document.documentElement.style.overflow
    )
    expect(overflowAfterClose).not.toBe('hidden')
  })

  test('clicking a menu link navigates and closes the menu', async ({
    page,
  }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    await page
      .getByRole('dialog')
      .getByRole('link', { name: 'Publications' })
      .click()

    await expect(page).toHaveURL(/\/publications$/)
    await expect(
      page.getByRole('button', { name: 'Menu', exact: true })
    ).toHaveAttribute('aria-expanded', 'false')
  })

  test('has no axe violations while open', async ({ page }) => {
    const { default: AxeBuilder } = await import('@axe-core/playwright')
    await page.goto('/')
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    expect(
      results.violations,
      JSON.stringify(results.violations, null, 2)
    ).toEqual([])
  })

  test('the in-panel Close sits exactly over the outer toggle', async ({
    page,
  }) => {
    await page.goto('/')
    // The mono webfont swaps in after first paint; measuring before it
    // loads would compare a fallback-font box against a webfont box and
    // report a false geometry mismatch.
    await page.evaluate(() => document.fonts.ready)

    const trigger = page.getByRole('button', { name: 'Menu', exact: true })
    const triggerBox = (await trigger.boundingBox())!

    await trigger.click()
    const close = page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true })
    const closeBox = (await close.boundingBox())!

    // This is the geometry the design depends on: the panel draws its own
    // band at exactly the position of the one beneath it, so nothing
    // outside the dialog ever needs to receive a click while it is open.
    expect(Math.abs(closeBox.x - triggerBox.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(closeBox.y - triggerBox.y)).toBeLessThanOrEqual(1)
    expect(Math.abs(closeBox.width - triggerBox.width)).toBeLessThanOrEqual(1)
    expect(Math.abs(closeBox.height - triggerBox.height)).toBeLessThanOrEqual(1)
  })

  test('widening past md closes the menu', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.setViewportSize({ width: 800, height: 812 })

    await expect(page.getByRole('dialog')).toBeHidden()
    const overflow = await page.evaluate(() => document.documentElement.style.overflow)
    expect(overflow).not.toBe('hidden')
  })

  test.describe('touch input', () => {
    // Scoped to just this test: Playwright's touchscreen API requires a
    // touch-capable browser context (`hasTouch: true`), which the default
    // Desktop Chrome project doesn't have.
    test.use({ hasTouch: true })

    // A real tap, not a click, is the point of this test: Headless UI's
    // `useOutsideClick` calls `preventDefault` on `touchend` for anything
    // outside `DialogPanel`, which suppresses the synthesized click that
    // would otherwise follow. That is why the wordmark has to live inside
    // the panel -- a mouse-click version of this test would pass even if it
    // did not.

    test('tapping the wordmark inside the open sheet navigates home and closes', async ({
      page,
    }) => {
      // Start from a non-home route so the eventual `toHaveURL(/\/$/)`
      // assertion is a real transition, not trivially true because we
      // never left "/" in the first place.
      await page.goto('/publications')

      const trigger = page.getByRole('button', { name: 'Menu', exact: true })
      await trigger.click()
      await expect(
        page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true })
      ).toHaveAttribute('aria-expanded', 'true')

      await page.getByRole('dialog').getByTestId('mobile-wordmark').tap()

      await expect(page).toHaveURL(/\/$/)
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })
  })
})
