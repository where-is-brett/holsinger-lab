import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 900 } })

test('team structure', async ({ page }) => {
  await page.goto('/team')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Our Team')
  const current = page.locator('[data-wix="current"] [data-wix="person"]')
  expect(await current.count()).toBeGreaterThanOrEqual(12)
  await expect(current.first().locator('h3')).toHaveText('Haochen Wu')
  await expect(page.locator('[data-wix="current"]')).not.toContainText('Damian Holsinger') // Review Focus 1
  await expect(page.getByRole('heading', { name: 'Lab Alumni' })).toBeVisible()
  await expect(page.locator('[data-wix="alumni-cards"] [data-wix="person"]')).toHaveCount(6)
  await expect(page.locator('[data-wix="alumni-rows"] li')).toHaveCount(15) // 16 on Wix incl. the duplicate Rene Buxton
  await expect(page.locator('[data-wix="interns"] li')).toHaveCount(6)
  await expect(page.locator('[data-wix="interns"] li').first()).toHaveText('Mia Helveston USA')
})

test('portraits are rectangular and fixed-width', async ({ page }) => {
  await page.goto('/team')
  const img = page.locator('[data-wix="person"] img').first()
  const { w, radius } = await img.evaluate((el) => ({ w: el.getBoundingClientRect().width, radius: getComputedStyle(el).borderRadius }))
  expect(Math.round(w)).toBe(196)
  expect(radius).toBe('0px')
})

test('row 3 is a partial row centred in columns 2 and 4', async ({ page }) => {
  await page.goto('/team')
  const people = page.locator('[data-wix="current"] [data-wix="person"]')
  const xs = await people.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x)))
  // Rows of 5, 5, 2 -- the last two items are row 3.
  const row3 = xs.slice(-2)
  expect(row3[0]).toBeGreaterThanOrEqual(286 - 4)
  expect(row3[0]).toBeLessThanOrEqual(286 + 4)
  expect(row3[1]).toBeGreaterThanOrEqual(798 - 4)
  expect(row3[1]).toBeLessThanOrEqual(798 + 4)
})

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('single column', async ({ page }) => {
    await page.goto('/team')
    const xs = await page.locator('[data-wix="current"] [data-wix="person"]').evaluateAll((els) => els.slice(0, 3).map((e) => Math.round(e.getBoundingClientRect().x)))
    expect(new Set(xs).size).toBe(1)
  })
})
