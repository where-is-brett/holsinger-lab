import { expect, test } from '@playwright/test'

import { expectedPublications } from './support/expected'

// This spec runs only under the touch-capable device projects
// (mobile-safari / mobile-chrome) and deliberately never calls
// `test.use({ viewport })` -- the whole point is to inherit each project's
// real device viewport, user agent and `hasTouch`, which every other spec's
// own `test.use({ viewport })` calls override. Skips cleanly (rather than
// failing) under the `chromium` project, which has `hasTouch: false`.
test.skip(({ hasTouch }) => !hasTouch, 'requires a touch-capable device project (mobile-safari / mobile-chrome)')

test.describe('mobile menu, touch path', () => {
  test('tap Open menu, tap Team link, navigates and closes', async ({ page }) => {
    await page.goto('/')
    const menuButton = page.getByRole('button', { name: 'Open menu' })
    const menuButtonNode = page.locator('#mobile-menu-button')
    await menuButton.tap()
    const dialog = page.getByRole('dialog', { name: 'Menu' })
    await expect(dialog).toBeVisible()
    await expect(menuButtonNode).toHaveAttribute('aria-expanded', 'true')
    await dialog.getByRole('link', { name: 'Team' }).tap()
    await expect(page).toHaveURL(/\/team$/)
    await expect(dialog).toBeHidden()
  })

  test('tap Open menu, tap Close menu, dialog closes', async ({ page }) => {
    await page.goto('/')
    const menuButton = page.getByRole('button', { name: 'Open menu' })
    const menuButtonNode = page.locator('#mobile-menu-button')
    await menuButton.tap()
    const dialog = page.getByRole('dialog', { name: 'Menu' })
    await expect(dialog).toBeVisible()
    await page.getByRole('button', { name: 'Close menu' }).tap()
    await expect(dialog).toBeHidden()
    await expect(menuButtonNode).toHaveAttribute('aria-expanded', 'false')
  })
})

test.describe('citations on mobile', () => {
  test('copy citation announces the measured per-engine outcome', async ({ page, context, browserName }) => {
    await page.goto('/publications')
    const firstEntry = page.locator('[data-wix="publication"]').first()
    // Same empirical rule as e2e/wix-publications.spec.ts, item 3: WebKit
    // (mobile-safari) doesn't support grantPermissions(['clipboard-write'])
    // at all, but measured directly -- without any grant --
    // navigator.clipboard.writeText() still succeeds there, so
    // CitationActions shows "Copied". mobile-chrome is the Chromium engine,
    // where grantPermissions *is* supported and is what the desktop
    // Chromium test relies on; without it, a first empirical run here
    // showed the write fail and fall through to the manual-select fallback
    // -- but that fallback's text depends on isMac(), which reads
    // navigator.platform, which Playwright's Pixel 7 device emulation does
    // NOT override (only userAgent/viewport/touch are emulated) -- so on a
    // Mac host it reads "Press ⌘C" and on CI's ubuntu-latest host it would
    // read "Press Ctrl+C" for the exact same emulated Android device. That
    // is a real, host-OS-dependent hole in isMac() outside this task's
    // scope to fix, and hardcoding either string here would make this test
    // pass or fail depending on where it runs. Granting permission on the
    // Chromium project -- mirroring the desktop test -- sidesteps it: the
    // write then succeeds deterministically, same as it does today.
    if (browserName !== 'webkit') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    }
    await firstEntry.getByRole('button', { name: 'Copy citation' }).tap()
    await expect(firstEntry.getByRole('status')).toHaveText('Copied')
  })

  test('per-entry BibTeX download', async ({ page }) => {
    const pubs = await expectedPublications()
    await page.goto('/publications')
    const firstEntry = page.locator('[data-wix="publication"]').first()
    const [download] = await Promise.all([page.waitForEvent('download'), firstEntry.getByRole('button', { name: 'BibTeX' }).tap()])
    const expectedName = `${pubs[0].slug || pubs[0]._id}.bib`
    expect(download.suggestedFilename()).toBe(expectedName)
  })

  test('download all publications as RIS', async ({ page }) => {
    await page.goto('/publications')
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-wix="publications-download-all"]').getByRole('button', { name: 'Download all publications as RIS' }).tap(),
    ])
    expect(download.suggestedFilename()).toBe('holsinger-lab-publications.ris')
  })
})

test.describe('no horizontal scroll at real device width', () => {
  for (const path of ['/', '/publications']) {
    test(`${path}`, async ({ page }) => {
      await page.goto(path)
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
    })
  }
})
