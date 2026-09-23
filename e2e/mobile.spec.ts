import type { TestInfo } from '@playwright/test'
import { expect, test } from '@playwright/test'

import { grantClipboardOrSkipWebkit, stubClipboardWriteToReject } from './support/clipboard'
import { e2eClient } from './support/sanity'

// This spec deliberately never calls `test.use({ viewport })` -- the whole
// point is to inherit each project's real device viewport, user agent and
// `hasTouch` (playwright.config.ts's mobile-safari / mobile-chrome
// projects). `locator.tap()` requires `hasTouch`, which the desktop
// `chromium` project doesn't set, so the touch-driven describe blocks below
// are skipped there rather than failed.

async function firstPublicationSlug(): Promise<string | null> {
  return e2eClient.fetch<string | null>(
    `*[_type == "publication" && defined(slug.current)] | order(_createdAt asc) [0].slug.current`
  )
}

async function piProfileSlug(): Promise<string | null> {
  // Prefer settings.labHead when it's set and has a page; otherwise fall
  // back to any profile with no roleGroup (the PI shape in the current
  // dataset) that has a page of its own. Either way this resolves against
  // the live dataset rather than a hardcoded slug (constraints.md).
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

    const dialog = page.getByRole('dialog', { name: 'Menu' })
    await expect(dialog).toBeVisible()
    // @headlessui/react's <Dialog> focuses its own root on a coarse
    // pointer rather than a specific child (see
    // components/redesign/MobileHeader.tsx's `autoFocus` comment) --
    // VoiceOver/TalkBack announce that as "Menu, dialog", so the
    // assertion targets the named dialog itself.
    await expect(dialog).toBeFocused()

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
  async function resolvedPaths(testInfo: TestInfo): Promise<{ label: string; path: string }[]> {
    const [pubSlug, piSlug] = await Promise.all([firstPublicationSlug(), piProfileSlug()])
    const paths = [
      { label: '/', path: '/' },
      { label: '/publications', path: '/publications' },
      { label: '/people', path: '/people' },
      { label: '/research', path: '/research' },
      { label: '/resources', path: '/resources' },
      { label: '/contact', path: '/contact' },
    ]
    // Annotate rather than silently drop: if either slug fails to
    // resolve, this test still runs (and can still fail on the six routes
    // above), but the reduced coverage is visible in the report instead of
    // passing quietly with fewer routes checked than intended.
    if (pubSlug) {
      paths.push({ label: 'paper page', path: `/publications/${pubSlug}` })
    } else {
      testInfo.annotations.push({ type: 'reduced-coverage', description: 'no publication with a slug resolved; paper page skipped' })
    }
    if (piSlug) {
      paths.push({ label: 'PI profile', path: `/people/${piSlug}` })
    } else {
      testInfo.annotations.push({ type: 'reduced-coverage', description: 'no PI profile slug resolved; PI profile page skipped' })
    }
    return paths
  }

  test('every resolved page fits the viewport width', async ({ page }, testInfo) => {
    const paths = await resolvedPaths(testInfo)
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
    await grantClipboardOrSkipWebkit(context, browserName)
    await page.goto('/publications')
    const firstRow = page.locator('[data-testid="pub-row"]').first()
    const copyButton = firstRow.getByRole('button', { name: 'Copy citation' })
    await copyButton.tap()
    await expect(copyButton).toHaveText(/Copied/)
  })
})

test.describe('copy citation, clipboard write fails', () => {
  test('shows a visible fallback message and citation block, selects the text, with no accessible duplicate', async ({
    page,
    browserName,
  }) => {
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
    const fallbackBlock = firstRow.getByTestId('copy-citation-fallback-text')

    // Absent before any copy attempt: an ordinary row never carries a
    // second copy of the citation for assistive technology to read on top
    // of the row's own title/authors/journal content.
    await expect(fallbackBlock).toHaveCount(0)

    const coarsePointer = await page.evaluate(() => matchMedia('(pointer: coarse)').matches)
    if (coarsePointer) {
      await copyButton.tap()
    } else {
      await copyButton.click()
    }

    const status = firstRow.getByRole('status')
    await expect(status).toBeVisible()
    await expect(status).toHaveText(coarsePointer ? "Use your device's copy action" : /Press (⌘C|Ctrl\+C) to copy/)

    await expect(fallbackBlock).toBeVisible()
    const citeText = (await fallbackBlock.textContent())!

    const selectedText = await page.evaluate(() => window.getSelection()?.toString() ?? '')
    expect(selectedText).toBe(citeText)

    // No accessible duplicate: the citation string appears exactly once in
    // the row's accessible text, not a second time from some other,
    // hidden copy of it.
    const occurrences = await firstRow.evaluate((el, text) => (el.textContent ?? '').split(text).length - 1, citeText)
    expect(occurrences).toBe(1)
  })
})
