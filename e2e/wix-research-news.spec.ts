import { expect, test } from '@playwright/test'

const css = (page: import('@playwright/test').Page, sel: string, prop: string) =>
  page.locator(sel).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)

test.use({ viewport: { width: 1280, height: 900 } })

test('research', async ({ page }) => {
  await page.goto('/research')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('RESEARCH PROJECTS')
  expect(await css(page, '[data-wix="strip"]', 'background-color')).toBe('rgb(247, 247, 247)')
  const titles = page.locator('[data-wix="project-title"]')
  if (process.env.WIX_FIXTURE === '1') {
    // Exact count is a snapshot fact of the committed fixture dataset.
    await expect(titles).toHaveCount(4)
  } else {
    expect(await titles.count()).toBeGreaterThan(0)
  }
  expect(await css(page, '[data-wix="project-title"]', 'font-weight')).toBe('700')
  expect(await css(page, '[data-wix="project-title"]', 'font-size')).toBe('22px')
})

test('research: first project title', async ({ page }) => {
  test.skip(process.env.WIX_FIXTURE !== '1', 'the first title in researchOrder is a snapshot fact')
  await page.goto('/research')
  await expect(page.locator('[data-wix="project-title"]').first()).toHaveText(
    "Fecal microbiota transplantation as a treatment for Alzheimer's disease"
  )
})

test('research project without an image renders without an empty figure (Review Focus 4)', async ({ page }) => {
  await page.goto('/research')
  const n = await page.locator('[data-wix="project"]').evaluateAll((els) =>
    els.filter((e) => e.querySelector('figure') && !e.querySelector('figure img')).length)
  expect(n).toBe(0)
})

test('news', async ({ page }) => {
  await page.goto('/news')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Latest news')
  expect(await css(page, '[data-wix="news-line"]', 'font-size')).toBe('22px')
})

test('news: exact count', async ({ page }) => {
  test.skip(process.env.WIX_FIXTURE !== '1', 'exact news-item count is a snapshot fact')
  await page.goto('/news')
  await expect(page.locator('[data-wix="news-line"]')).toHaveCount(3)
})
