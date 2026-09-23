import { expect, test } from '@playwright/test'

import { stubClipboardWriteToReject } from './support/clipboard'
import { e2eClient } from './support/sanity'

// This spec deliberately never calls `test.use({ viewport })` -- the whole
// point is to inherit each project's real device viewport, user agent and
// `hasTouch` (playwright.config.ts's mobile-safari / mobile-chrome
// projects), which every other spec's own `test.use({ viewport })` calls
// override. `locator.tap()` requires `hasTouch`, which the desktop
// `chromium` project doesn't set, so the touch-driven menu tests below are
// skipped there rather than failed.

async function firstPublicationSlug(): Promise<string | null> {
  return e2eClient.fetch<string | null>(
    `*[_type == "publication" && defined(slug.current)] | order(_createdAt asc) [0].slug.current`
  )
}

async function piProfileSlug(): Promise<string | null> {
  // Prefer settings.labHead when it's set and has a page; otherwise fall
  // back to any profile with no roleGroup (the PI shape in the current
  // dataset -- see memory/holsinger_lab_next_up.md's "roleGroup taxonomy"
  // note) that has a page of its own. Either way this resolves against the
  // live dataset rather than a hardcoded slug (constraints.md).
  const labHead = await e2eClient.fetch<{ slug: string | null; hasPage: boolean | null } | null>(
    `*[_type == "settings"][0].labHead->{"slug": slug.current, hasPage}`
  )
  if (labHead?.hasPage && labHead.slug) return labHead.slug
  return e2eClient.fetch<string | null>(
    `*[_type == "profile" && !defined(roleGroup) && hasPage == true && defined(slug.current)][0].slug.current`
  )
}

test.describe('mobile menu, tap-driven', () => {
  test.skip(({ hasTouch }) => !hasTouch, 'touch-only spec')

  test('tap Menu, tap Publications, close by close control, close by Escape', async ({ page }) => {
    await page.goto('/')

    const trigger = page.getByRole('button', { name: 'Menu', exact: true })
    await trigger.tap()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const focusIsInDialog = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]')
      return dlg?.contains(document.activeElement) ?? false
    })
    expect(focusIsInDialog).toBe(true)

    await dialog.getByRole('link', { name: 'Publications' }).tap()
    await expect(page).toHaveURL(/\/publications$/)
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Reopen, tap the close control.
    await page.getByRole('button', { name: 'Menu', exact: true }).tap()
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Close', exact: true }).tap()
    await expect(dialog).toBeHidden()

    // Reopen, close via Escape; focus returns to the Menu button.
    const menuTrigger = page.getByRole('button', { name: 'Menu', exact: true })
    await menuTrigger.tap()
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(menuTrigger).toBeFocused()
  })
})

test.describe('no horizontal overflow at the device viewport', () => {
  async function resolvedPaths(): Promise<{ label: string; path: string }[]> {
    const [pubSlug, piSlug] = await Promise.all([firstPublicationSlug(), piProfileSlug()])
    const paths = [
      { label: '/', path: '/' },
      { label: '/publications', path: '/publications' },
      { label: '/people', path: '/people' },
      { label: '/research', path: '/research' },
      { label: '/resources', path: '/resources' },
      { label: '/contact', path: '/contact' },
    ]
    if (pubSlug) paths.push({ label: 'paper page', path: `/publications/${pubSlug}` })
    if (piSlug) paths.push({ label: 'PI profile', path: `/people/${piSlug}` })
    return paths
  }

  test('every resolved page fits the viewport width', async ({ page }) => {
    const paths = await resolvedPaths()
    for (const { label, path } of paths) {
      await page.goto(path)
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(scrollWidth, `${label} (${path}) overflows`).toBeLessThanOrEqual(clientWidth)
    }
  })
})

test.describe('copy citation, tap-driven', () => {
  test.skip(({ hasTouch }) => !hasTouch, 'touch-only spec')

  test('tapping the first row copy button shows the copied state', async ({ page, context, browserName }) => {
    // mobile-chrome is Chromium, where `navigator.clipboard.writeText()`
    // is gated behind the Permissions API and fails without an explicit
    // grant (measured: without this, the control never reaches "Copied").
    // mobile-safari is WebKit, where `grantPermissions(['clipboard-write'])`
    // itself throws ("Unknown permission: clipboard-write") but the write
    // still succeeds with no grant at all under a real tap (constraints.md
    // harness limit (b)) -- so the grant only ever applies to the
    // non-WebKit project.
    if (browserName !== 'webkit') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    }
    await page.goto('/publications')
    const firstRow = page.locator('[data-testid="pub-row"]').first()
    const copyButton = firstRow.getByRole('button', { name: 'Copy citation' })
    await copyButton.tap()
    await expect(copyButton).toHaveText(/Copied/)
  })
})

test.describe('copy citation, clipboard write fails', () => {
  test('shows a visible fallback message and selects the citation text', async ({ page, browserName }) => {
    // No clipboard grant at all: Chromium (chromium, mobile-chrome) denies
    // `writeText` without an explicit grant, which is exactly the failure
    // path under test. WebKit succeeds without a grant (harness limit
    // (b)), so its write is forced to reject instead, deliberately, rather
    // than relying on an ungranted permission it doesn't need.
    if (browserName === 'webkit') {
      await stubClipboardWriteToReject(page)
    }
    await page.goto('/publications')

    const firstRow = page.locator('[data-testid="pub-row"]').first()
    const copyButton = firstRow.getByRole('button', { name: 'Copy citation' })
    const citeText = await firstRow.getByTestId('copy-citation-text').textContent()

    const coarsePointer = await page.evaluate(() => matchMedia('(pointer: coarse)').matches)
    if (coarsePointer) {
      await copyButton.tap()
    } else {
      await copyButton.click()
    }

    const status = firstRow.getByRole('status')
    await expect(status).toBeVisible()
    await expect(status).toHaveText(coarsePointer ? "Use your device's copy action" : /Press (⌘C|Ctrl\+C) to copy/)

    const selectedText = await page.evaluate(() => window.getSelection()?.toString() ?? '')
    expect(selectedText).toBe(citeText)
  })
})
