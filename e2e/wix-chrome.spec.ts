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
    const menuButton = page.getByRole('button', { name: 'Open menu' })
    // Once the dialog is open, HeadlessUI marks the rest of the page inert
    // for assistive tech, which drops the trigger button out of the
    // accessibility tree (and so out of getByRole) even though its DOM node
    // -- and its aria-expanded attribute -- are untouched. #mobile-menu-button
    // reads the attribute directly, bypassing that AX-tree filtering.
    const menuButtonNode = page.locator('#mobile-menu-button')
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    await menuButton.click()
    const dialog = page.getByRole('dialog', { name: 'Menu' })
    await expect(dialog).toBeVisible()
    await expect(menuButtonNode).toHaveAttribute('aria-expanded', 'true')
    expect(await dialog.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(191, 191, 191)')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await menuButton.click()
    await dialog.getByRole('link', { name: 'Team' }).click()
    await expect(page).toHaveURL(/\/team$/)
    await expect(dialog).toBeHidden()
  })

  test('menu traps focus (M8)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Open menu' }).click()
    const dialog = page.getByRole('dialog', { name: 'Menu' })
    await expect(dialog).toBeVisible()
    // Tab through every focusable element in the dialog, plus a few extra
    // presses -- focus must never land on anything outside it (the focus
    // trap keeps Tab cycling within the panel).
    const focusableCount = await dialog.locator('button, a[href]').count()
    for (let i = 0; i < focusableCount + 3; i++) {
      await page.keyboard.press('Tab')
      const active = await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null)
      expect(active).toBe(true)
    }
  })
})
