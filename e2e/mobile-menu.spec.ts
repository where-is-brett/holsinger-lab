import { expect, test } from '@playwright/test'

test.describe('mobile menu accessibility contract', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('hamburger button has a real accessible name and toggles aria-expanded/aria-controls', async ({
    page,
  }) => {
    await page.goto('/')

    const trigger = page.getByRole('button', { name: 'Open menu' })
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    const controlsId = await trigger.getAttribute('aria-controls')
    expect(controlsId).toBeTruthy()

    await trigger.click()
    await expect(
      page.getByRole('button', { name: 'Close menu' })
    ).toHaveAttribute('aria-expanded', 'true')
  })

  test('is reachable and operable via keyboard alone', async ({ page }) => {
    await page.goto('/')

    // Two Tabs, not one: the header's logo <Link href="/"> precedes the
    // hamburger button in DOM order (Task 3's markup), so it's the first
    // stop in tab order. Verified against the live page (a tab-order probe
    // logging document.activeElement after each Tab) rather than assumed -
    // the original single-Tab version of this test failed not because the
    // button was unreachable, but because it's the *second* stop, not the
    // first.
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    const trigger = page.getByRole('button', { name: 'Open menu' })
    await expect(trigger).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('button', { name: 'Close menu' })
    ).toHaveAttribute('aria-expanded', 'true')
  })

  test('Escape closes the menu and returns focus to the trigger', async ({
    page,
  }) => {
    await page.goto('/')

    const trigger = page.getByRole('button', { name: 'Open menu' })
    await trigger.click()
    await expect(page.getByRole('button', { name: 'Close menu' })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toBeFocused()
  })

  test('Tab stays trapped inside the open panel', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Open menu' }).click()
    const panelLinks = page.getByRole('dialog').getByRole('link')
    const linkCount = await panelLinks.count()
    expect(linkCount).toBeGreaterThan(0)

    // Tab one more time than there are links in the panel; focus should
    // still be inside the dialog, never having escaped to page content
    // behind it (e.g. the logo link, which sits outside the dialog).
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

    await page.getByRole('button', { name: 'Open menu' }).click()
    const overflowWhileOpen = await page.evaluate(
      () => document.documentElement.style.overflow
    )
    expect(overflowWhileOpen).toBe('hidden')

    await page.getByRole('button', { name: 'Close menu' }).click()
    const overflowAfterClose = await page.evaluate(
      () => document.documentElement.style.overflow
    )
    expect(overflowAfterClose).not.toBe('hidden')
  })

  test('clicking a menu link navigates and closes the menu', async ({
    page,
  }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Open menu' }).click()
    await page
      .getByRole('dialog')
      .getByRole('link', { name: 'Publications' })
      .click()

    await expect(page).toHaveURL(/\/publications$/)
    await expect(
      page.getByRole('button', { name: 'Open menu' })
    ).toHaveAttribute('aria-expanded', 'false')
  })

  test('has no axe violations while open', async ({ page }) => {
    const { default: AxeBuilder } = await import('@axe-core/playwright')
    await page.goto('/')
    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    expect(
      results.violations,
      JSON.stringify(results.violations, null, 2)
    ).toEqual([])
  })

  test('tapping the visible header icon (not just the overlay buttons own hit box) closes the menu', async ({
    page,
  }) => {
    await page.goto('/')

    const trigger = page.getByRole('button', { name: 'Open menu' })
    await trigger.click()
    await expect(
      page.getByRole('button', { name: 'Close menu' })
    ).toHaveAttribute('aria-expanded', 'true')

    // Locate the ORIGINAL header button - the one that still visually paints
    // the hamburger/close icon while the dialog is open, but is `inert` (and
    // therefore not the element that actually receives clicks). It's the
    // <button> that is NOT inside [role="dialog"]'s tree; the overlay button
    // that *does* handle the click lives inside that tree.
    const headerButtonRect = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]')
      const headerButton = Array.from(document.querySelectorAll('button')).find(
        (button) => !dialog?.contains(button)
      )
      const rect = headerButton?.getBoundingClientRect()
      return rect
        ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
        : null
    })
    expect(headerButtonRect).not.toBeNull()

    // Click at the exact screen coordinates of the *visible* icon - not a
    // role-resolved locator's own bounding box (which would still pass even
    // if the overlay drifted out of alignment with the header button). This
    // is the direct regression guard for the geometry coupling documented in
    // MobileNavBar.tsx: if the header button's `right-6`/`py-4` or the
    // header bar's `h-16` ever drifts out of sync with the overlay button's
    // `right-6 top-0 h-16 w-9`, this click lands on nothing functional and
    // this test fails, even though every other test here (which clicks the
    // overlay's own bounding box directly) would stay green.
    const { x, y, width, height } = headerButtonRect!
    await page.mouse.click(x + width / 2, y + height / 2)

    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
