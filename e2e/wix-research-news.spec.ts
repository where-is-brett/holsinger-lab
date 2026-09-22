import { expect, test } from '@playwright/test'

const css = (page: import('@playwright/test').Page, sel: string, prop: string) =>
  page.locator(sel).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)

test.use({ viewport: { width: 1280, height: 900 } })

test('research', async ({ page }) => {
  await page.goto('/research')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('RESEARCH PROJECTS')
  expect(await css(page, '[data-wix="strip"]', 'background-color')).toBe('rgb(247, 247, 247)')
  const titles = page.locator('[data-wix="project-title"]')
  await expect(titles).toHaveCount(4)
  await expect(titles.first()).toHaveText("Fecal microbiota transplantation as a treatment for Alzheimer's disease")
  expect(await css(page, '[data-wix="project-title"]', 'font-weight')).toBe('700')
  expect(await css(page, '[data-wix="project-title"]', 'font-size')).toBe('22px')
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
  await expect(page.locator('[data-wix="news-line"]')).toHaveCount(3)
  expect(await css(page, '[data-wix="news-line"]', 'font-size')).toBe('22px')
})
