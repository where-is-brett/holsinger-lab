import { expect, test } from '@playwright/test'
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
