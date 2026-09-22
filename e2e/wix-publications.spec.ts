import { expect, test } from '@playwright/test'

const css = (page: import('@playwright/test').Page, sel: string, prop: string) =>
  page.locator(sel).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)

test.use({ viewport: { width: 1280, height: 900 } })

test('publications list', async ({ page }) => {
  await page.goto('/publications')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('PUBLICATIONS')
  const entries = page.locator('[data-wix="publication"]')
  // 17 in fixture mode (WIX_FIXTURE=1, the committed fixture dataset); 21 in
  // wix-preview/production (19 existing + 2 imported).
  expect(await entries.count()).toBeGreaterThanOrEqual(17)
  await expect(entries.first().locator('[data-wix="pub-title"]')).toContainText('Bdnf mRNA')
  expect(await css(page, '[data-wix="pub-citation"]', 'font-style')).toBe('italic')
  expect(await css(page, '[data-wix="pub-citation"]', 'font-family')).toContain('Bodoni')
  const doi = entries.first().locator('a[href^="https://doi.org/"]')
  await expect(doi).toHaveAttribute('href', 'https://doi.org/10.64898/2026.04.19.719519')
  expect(await doi.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('none')
})

test('no orphan punctuation in citation lines (Review Focus 4)', async ({ page }) => {
  await page.goto('/publications')
  const lines = await page.locator('[data-wix="pub-citation"]').allTextContents()
  for (const l of lines) expect(l).not.toMatch(/;\s*\.|^\s*[;.]|\(\)/)
})
