import { expect, test } from '@playwright/test'

const css = (page: import('@playwright/test').Page, sel: string, prop: string) =>
  page.locator(sel).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)

for (const [w, h1, body] of [
  [1280, '36px', '20px'],
  [390, '23px', '15px'],
] as const) {
  test.describe(`home at ${w}`, () => {
    test.use({ viewport: { width: w, height: 900 } })
    test('blocks, order and tokens', async ({ page }) => {
      await page.goto('/')
      const order = await page.locator('[data-wix-block]').evaluateAll((els) => els.map((e) => e.getAttribute('data-wix-block')))
      expect(order).toEqual(['hero', 'about', 'news', 'contact'])
      expect(await css(page, '[data-wix="hero-heading"]', 'font-size')).toBe(h1)
      expect(await css(page, '[data-wix="hero-heading"]', 'color')).toBe('rgb(255, 255, 255)')
      expect(await css(page, '[data-wix="about-body"] p', 'font-size')).toBe(body)
      expect(await css(page, '[data-wix="about-body"] p', 'font-weight')).toBe('300')
      if (process.env.WIX_FIXTURE === '1') {
        // The home page shows up to 4 news items -- an exact count is a
        // snapshot fact of the fixture dataset, not true of every dataset.
        await expect(page.locator('[data-wix="news-item"]')).toHaveCount(4)
      }
      await expect(page.getByRole('heading', { name: 'CONTACT US' })).toBeVisible()
      const mail = page.locator('[data-wix-block="contact"] a[href^="mailto:"]')
      await expect(mail).toHaveAttribute('href', 'mailto:damian.holsinger@sydney.edu.au')

      // The hero image is the LCP element -- next/image's `priority` must
      // actually take effect (no lazy-loading, fetch prioritised), or the
      // browser defers it behind everything else on the page.
      const heroImg = page.locator('[data-wix-block="hero"] img')
      await expect(heroImg).not.toHaveAttribute('loading', 'lazy')
      await expect(heroImg).toHaveAttribute('fetchpriority', 'high')
    })
  })
}
