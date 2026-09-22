import { expect, test } from '@playwright/test'

const css = (page: import('@playwright/test').Page, sel: string, prop: string) =>
  page.locator(sel).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)

test.describe('desktop 1280', () => {
  test.use({ viewport: { width: 1280, height: 900 } })
  test('header matches Wix tokens', async ({ page }) => {
    await page.goto('/')
    expect(await css(page, '[data-wix="site-title"]', 'font-family')).toContain('Playfair')
    expect(await css(page, '[data-wix="site-title"]', 'font-size')).toBe('32px')
    expect(await css(page, '[data-wix="nav"] a', 'font-family')).toContain('Raleway')
    expect(await css(page, '[data-wix="nav"] a', 'font-size')).toBe('14px')
    expect(await css(page, '[data-wix="rule"]', 'border-top-color')).toBe('rgba(0, 0, 0, 0.85)')
    await expect(page.locator('[data-wix="nav"] a')).toHaveText(['Home', 'Research', 'News', 'Publications', 'Team', 'Media', 'Contact'])
    await expect(page.locator('[data-wix="nav"] a[aria-current="page"]')).toHaveText('Home')
  })
  test('footer', async ({ page }) => {
    await page.goto('/news')
    await expect(page.locator('footer')).toHaveText('©2026 by Damian Holsinger')
    expect(await css(page, 'footer p', 'font-size')).toBe('14px')
  })
})

test.describe('mobile 390', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('menu opens, is modal, navigates, closes', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-wix="nav"]')).toBeHidden()
    expect(await css(page, '[data-wix="site-title-mobile"]', 'font-size')).toBe('19px')
    await page.getByRole('button', { name: 'Open menu' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    expect(await dialog.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(191, 191, 191)')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await page.getByRole('button', { name: 'Open menu' }).click()
    await dialog.getByRole('link', { name: 'Team' }).click()
    await expect(page).toHaveURL(/\/team$/)
    await expect(dialog).toBeHidden()
  })
})
