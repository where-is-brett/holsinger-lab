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
    // therefore not the element that actually receives clicks). Select it by
    // its identifying attribute (`aria-controls="mobile-menu-panel"`) rather
    // than by document-order position - a plain "first non-dialog button"
    // selector would silently retarget to the wrong element if any other
    // button (a skip link, a cookie-banner control, etc.) were ever added
    // above the hamburger in document order. There are multiple buttons
    // carrying `aria-controls="mobile-menu-panel"` in the DOM (the header's
    // original hamburger, and the close-button overlay inside the dialog),
    // so we still filter out anything inside `[role="dialog"]`'s tree to
    // land on the one real header button.
    const headerButtonRect = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]')
      const headerButton = Array.from(
        document.querySelectorAll('button[aria-controls="mobile-menu-panel"]')
      ).find((button) => !dialog?.contains(button))
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

  test.describe('touch input', () => {
    // Scoped to just this test: Playwright's touchscreen API requires a
    // touch-capable browser context (`hasTouch: true`), which the default
    // Desktop Chrome project doesn't have. This is not incidental to the
    // test - it's the whole point. The bug this test guards against only
    // reproduces on touch input specifically: Headless UI's outside-click
    // handling calls `preventDefault()` on `touchend` for elements outside
    // DialogPanel's `resolveContainers()`, which suppresses the synthesized
    // `click` event a touch tap would otherwise produce - but has no effect
    // on a real `mouse.click()`, which fires a `click` event directly. A
    // mouse-click version of this test would stay green even if the logo
    // overlay regressed back to living outside DialogPanel, because mouse
    // and touch take different code paths through that handler. See the
    // logo overlay's comment in MobileNavBar.tsx for the full mechanism.
    test.use({ hasTouch: true })

    test('tapping the visible header logo (not just the overlay links own hit box) navigates home and closes the menu', async ({
      page,
    }) => {
      // Start from a non-home route so the eventual `toHaveURL(/\/$/)`
      // assertion is a real transition, not trivially true because we
      // never left "/" in the first place.
      await page.goto('/publications')

      const trigger = page.getByRole('button', { name: 'Open menu' })
      await trigger.click()
      await expect(
        page.getByRole('button', { name: 'Close menu' })
      ).toHaveAttribute('aria-expanded', 'true')

      // Locate the actual visible logo image in the header - the one that
      // keeps painting while the dialog is open but is `inert` (its
      // wrapping <Link> is a sibling of <Dialog>), so it is not the
      // element that actually receives taps. Measuring the <img> itself
      // (rather than its wrapping anchor, whose own box collapses since
      // its only child is absolutely positioned) gives the real on-screen
      // pixels a user taps. This element's own screen position doesn't
      // change depending on where the overlay lives (inside or outside
      // DialogPanel) - only whether tapping at these coordinates actually
      // navigates does.
      const logoRect = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]')
        const logoImage = document.querySelector('img[alt="logo"]')
        if (!logoImage || dialog?.contains(logoImage)) {
          return null
        }
        const rect = logoImage.getBoundingClientRect()
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
      })
      expect(logoRect).not.toBeNull()

      // Tap (not click) at the exact screen coordinates of the *visible*
      // logo, via the touchscreen API - not `page.mouse.click()`, and not
      // a role-resolved locator's own bounding box. Using touch is the
      // direct regression guard for the bug this test exists to catch:
      // navigating the logo overlay from inside DialogPanel back out to
      // being a Dialog-level sibling would make this tap close the menu
      // (via Headless UI's own outside-click-closes-dialog behavior) but
      // silently fail to navigate, while leaving a mouse-click version of
      // this same test green. This is also still the geometry-coupling
      // regression guard documented in MobileNavBar.tsx: if the logo's
      // `left-4`/`my-4` or the header bar's `h-16` ever drifts out of sync
      // with the overlay link's `left-4 top-0 h-16 w-[120px]`, this tap
      // lands on nothing functional and this test fails.
      const { x, y, width, height } = logoRect!
      await page.touchscreen.tap(x + width / 2, y + height / 2)

      await expect(page).toHaveURL(/\/$/)
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })
  })
})
