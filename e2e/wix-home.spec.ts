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

    if (w === 390) {
      test('mobile hero text clears 4.5:1 contrast against its background', async ({ page }) => {
        await page.goto('/')

        // `img.complete` becomes true both when the photo finishes loading
        // AND when it errors out (WIX_FIXTURE=1's hero src points at a fake
        // asset id and 404s) -- so waiting for it, then checking
        // `naturalWidth`, tells us which case we're in without a fixed
        // sleep.
        const heroImg = page.locator('[data-wix-block="hero"] img')
        await page.waitForFunction(() => {
          const img = document.querySelector('[data-wix-block="hero"] img')
          return img instanceof HTMLImageElement && img.complete
        })
        const loaded = await heroImg.evaluate((img: HTMLImageElement) => img.naturalWidth > 0)

        const heading = page.locator('[data-wix="hero-heading"]')
        const subheading = page.locator('[data-wix="hero-subheading"]')
        const headingBox = await heading.boundingBox()
        const subheadingBox = await subheading.boundingBox()
        if (!headingBox || !subheadingBox) throw new Error('hero text did not render a bounding box')

        // Hide the glyphs themselves so they don't pollute the sample -- we
        // want the worst-case pixel of the scrim/photo behind them. When
        // `loaded` is false (WIX_FIXTURE=1: the hero src is a fake asset id
        // and 404s), this measures the scrim against the section's own
        // `bg-black` fallback instead of the real photo -- a real
        // measurement, just not the one that matters. The scrim was tuned
        // against the real photo, and that full measurement is the manual
        // wix-preview acceptance run (see the comment above the scrim div in
        // Hero.tsx). Either way this asserts something real rather than
        // silently passing with zero assertions (Phase 4C lesson).
        await page.addStyleTag({
          content: '[data-wix="hero-heading"], [data-wix="hero-subheading"] { visibility: hidden }',
        })

        // sRGB relative luminance + WCAG contrast ratio, per spec. Decoded
        // in-page via <canvas>/getImageData rather than a Node PNG library,
        // since nothing suitable is already in the dependency tree.
        const worstCaseRatioAgainstWhite = async (box: { x: number; y: number; width: number; height: number }) => {
          const png = await page.screenshot({ clip: box })
          return page.evaluate(async (dataUrl) => {
            const img = new Image()
            img.src = dataUrl
            await img.decode()
            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0)
            const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const channel = (c: number) => {
              const cs = c / 255
              return cs <= 0.03928 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4
            }
            let worstL = -1
            for (let i = 0; i < data.length; i += 4) {
              const l = 0.2126 * channel(data[i]) + 0.7152 * channel(data[i + 1]) + 0.0722 * channel(data[i + 2])
              if (l > worstL) worstL = l
            }
            const whiteL = 1 // sRGB white's relative luminance is exactly 1
            return (whiteL + 0.05) / (worstL + 0.05)
          }, `data:image/png;base64,${png.toString('base64')}`)
        }

        const headingRatio = await worstCaseRatioAgainstWhite(headingBox)
        const subheadingRatio = await worstCaseRatioAgainstWhite(subheadingBox)
        expect(headingRatio, `heading worst-case contrast (loaded=${loaded})`).toBeGreaterThanOrEqual(4.5)
        expect(subheadingRatio, `subheading worst-case contrast (loaded=${loaded})`).toBeGreaterThanOrEqual(4.5)
      })
    }
  })
}

test.describe('hero blur placeholder (LQIP)', () => {
  test('the hero <img> carries a background-image data URL before the real photo loads', async ({ page }) => {
    // Delay the optimized image response so the <img> is inspected before
    // Next removes the placeholder `background-image` on load.
    await page.route('**/_next/image**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await route.continue()
    })
    await page.goto('/')
    const heroImg = page.locator('[data-wix-block="hero"] img')
    const backgroundImage = await heroImg.evaluate((img) => getComputedStyle(img).backgroundImage)

    if (backgroundImage === 'none') {
      // WIX_FIXTURE=1's dataset has no `sanity.imageAsset` document for the
      // hero image (scripts/wix/build-fixture.ts only fabricates a
      // reference id, never a matching asset with `metadata.lqip`), so
      // `heroImageLqip` is always null here and there is no placeholder to
      // assert against. That's expected in fixture mode specifically --
      // assert it's the reason, so this doesn't silently pass for some
      // other reason too (Phase 4C lesson). The real regression guard for
      // stega-corrupting the LQIP is `cleanLqip`'s unit test in
      // lib/wix/format.test.ts; this assertion is the one that runs for
      // real against a live dataset (e.g. the local `npm run start` /
      // wix-preview acceptance run).
      expect(process.env.WIX_FIXTURE).toBe('1')
      return
    }

    expect(backgroundImage).toMatch(/^url\("data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/=]+"\)$/)
  })
})
