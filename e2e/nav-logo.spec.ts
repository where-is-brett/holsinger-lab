import { expect, test } from '@playwright/test'

test.describe('header logo and nav geometry', () => {
  test('desktop nav renders a logo', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/')
    // Scoped to the desktop nav specifically. Both navbars are in the DOM at
    // every viewport -- only one is displayed -- and while display:none keeps
    // the hidden one out of the accessibility tree (so an unscoped getByRole
    // would in fact resolve to one element), relying on that is fragile: any
    // future change to how the navbars hide would turn this into an opaque
    // strict-mode violation rather than a clear failure.
    const desktopNav = page.locator('nav.sticky')
    // Before Phase 4B the desktop nav had no logo at all.
    await expect(desktopNav.getByRole('img', { name: 'logo' })).toBeVisible()
  })

  test('the Publications sticky bar sits exactly at the bottom of the desktop nav', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/publications')

    const geometry = await page.evaluate(() => {
      const nav = document.querySelector('nav.sticky')
      // Scoped to `div.sticky` rather than the more generic
      // `[class*="sticky"][class*="top-"]`: the desktop nav itself carries
      // `sticky top-0`, so that broader selector's querySelector (which
      // returns the first DOM match) resolves to the nav, not this bar --
      // both live under the same ambiguous selector, and the nav comes
      // first in document order. Tag-scoping to the `<div>` disambiguates
      // them, since only these two elements in the app use a sticky class.
      const bar = document.querySelector('div.sticky')
      if (!nav || !bar) return null
      return {
        navHeight: nav.getBoundingClientRect().height,
        barTop: Number.parseFloat(getComputedStyle(bar).top),
      }
    })

    expect(geometry).not.toBeNull()
    // Defect D8: the bar was pinned at a literal 64px (the *mobile* nav
    // height) while the desktop nav measured 70px, so it overlapped the nav
    // by 6px -- which adding a logo would have widened to 12px. Both now come
    // from --nav-height, so they cannot disagree.
    expect(geometry!.barTop).toBeCloseTo(geometry!.navHeight, 0)
  })

  test('a year jump-link lands the heading clear of both sticky bars', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/publications')

    const yearLink = page.getByRole('navigation', { name: 'Jump to year' }).getByRole('link').first()
    test.skip(!(await yearLink.count()), 'dataset has only one publication year')

    const yearText = (await yearLink.textContent())!.trim()
    await yearLink.click()

    const heading = page.getByRole('heading', { name: yearText, level: 2 })
    const stackBottom = await page.evaluate(() => {
      const nav = document.querySelector('nav.sticky')
      // See the identical `div.sticky` note in the previous test: the
      // broader attribute selector would otherwise resolve to the nav
      // itself here too, double-counting its height instead of adding the
      // Publications bar's.
      const bar = document.querySelector('div.sticky')
      if (!nav || !bar) return 0
      return (
        nav.getBoundingClientRect().height + bar.getBoundingClientRect().height
      )
    })

    const box = (await heading.boundingBox())!
    // The heading must land below the combined sticky stack, not underneath
    // it. This is the assertion the stale "~139px" comment's zero-buffer
    // value would have failed once the nav grew.
    expect(box.y).toBeGreaterThanOrEqual(stackBottom)
  })
})
