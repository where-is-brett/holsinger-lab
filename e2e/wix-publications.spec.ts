import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'
import { plainCitation } from 'lib/wix/citationExport'
import { doiHref } from 'lib/wix/format'

import { expectedPublications } from './support/expected'

const css = (page: import('@playwright/test').Page, sel: string, prop: string) =>
  page.locator(sel).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)

test.use({ viewport: { width: 1280, height: 900 } })

test('publications list', async ({ page }) => {
  const pubs = await expectedPublications()
  await page.goto('/publications')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('PUBLICATIONS')
  const entries = page.locator('[data-wix="publication"]')
  // 17 in fixture mode (WIX_FIXTURE=1, the committed fixture dataset); 21 in
  // wix-preview/production (19 existing + 2 imported).
  expect(await entries.count()).toBeGreaterThanOrEqual(17)
  const firstTitle = await entries.first().locator('[data-wix="pub-title"]').textContent()
  expect(firstTitle?.trim()).toBe(pubs[0].title.trim())
  expect(await css(page, '[data-wix="pub-citation"]', 'font-style')).toBe('italic')
  expect(await css(page, '[data-wix="pub-citation"]', 'font-family')).toContain('Bodoni')
  const doiLink = entries.first().locator('a[href^="https://doi.org/"]')
  const expectedDoi = doiHref(pubs[0].doi)
  if (expectedDoi) {
    await expect(doiLink).toHaveAttribute('href', expectedDoi)
    expect(await doiLink.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('none')
  } else {
    await expect(doiLink).toHaveCount(0)
  }
})

test('no orphan punctuation in citation lines (Review Focus 4)', async ({ page }) => {
  await page.goto('/publications')
  const lines = await page.locator('[data-wix="pub-citation"]').allTextContents()
  for (const l of lines) expect(l).not.toMatch(/;\s*\.|^\s*[;.]|\(\)/)
})

test('copy citation writes the plain-text citation to the clipboard and announces it', async ({ page, context, browserName }) => {
  const pubs = await expectedPublications()
  await page.goto('/publications')
  const firstEntry = page.locator('[data-wix="publication"]').first()
  if (browserName === 'webkit') {
    // `context.grantPermissions` doesn't support clipboard-write on WebKit
    // (Playwright throws "Unknown permission: clipboard-write"), so this
    // engine can't grant clipboard permission and can't read the clipboard
    // back with navigator.clipboard.readText() either (WebKit also has no
    // Permissions API entry for it). Measured empirically instead: under
    // Playwright's synthetic .click() on WebKit, with no permission granted
    // at all, navigator.clipboard.writeText() still resolves successfully
    // and CitationActions shows "Copied" -- WebKit does not gate this write
    // behind the same permission WebKit's own grantPermissions rejects, so
    // (unlike Chromium) no explicit grant is needed for the write to
    // succeed here. Assert that measured outcome, not the fallback text.
    await firstEntry.getByRole('button', { name: 'Copy citation' }).click()
    await expect(firstEntry.getByRole('status')).toHaveText('Copied')
    return
  }
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await firstEntry.getByRole('button', { name: 'Copy citation' }).click()
  await expect(firstEntry.getByRole('status')).toHaveText('Copied')
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboardText).toBe(plainCitation(pubs[0]))
})

test('per-entry BibTeX download', async ({ page }) => {
  const pubs = await expectedPublications()
  await page.goto('/publications')
  const firstEntry = page.locator('[data-wix="publication"]').first()
  const [download] = await Promise.all([page.waitForEvent('download'), firstEntry.getByRole('button', { name: 'BibTeX' }).click()])
  const expectedName = `${pubs[0].slug || pubs[0]._id}.bib`
  expect(download.suggestedFilename()).toBe(expectedName)
  const path = await download.path()
  expect(path).toBeTruthy()
  const content = readFileSync(path!, 'utf8')
  expect(content).toMatch(/^@(article|misc)\{/)
  if (pubs[0].doi) expect(content).toContain(pubs[0].doi)
})

test('download all publications as RIS covers every listed entry', async ({ page }) => {
  const pubs = await expectedPublications()
  await page.goto('/publications')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-wix="publications-download-all"]').getByRole('button', { name: 'Download all publications as RIS' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('holsinger-lab-publications.ris')
  const path = await download.path()
  expect(path).toBeTruthy()
  const content = readFileSync(path!, 'utf8')
  expect(content.startsWith('TY  - JOUR')).toBe(true)
  expect(content.match(/TY {2}- JOUR/g)?.length).toBe(pubs.length)
  if (pubs[0].doi) expect(content).toContain(pubs[0].doi)
})
