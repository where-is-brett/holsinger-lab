import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const ROUTES = ['/', '/research', '/news', '/publications', '/team', '/media', '/contact']

for (const path of ROUTES) {
  test(`${path}: axe clean`, async ({ page }) => {
    await page.goto(path)
    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([])
  })
  for (const width of [320, 390, 800, 1012]) {
    test(`${path}: no horizontal scroll at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(path)
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(over).toBeLessThanOrEqual(0)
    })
  }
}
