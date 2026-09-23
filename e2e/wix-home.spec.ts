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
        // WIX_FIXTURE=1's hero src is a fake asset id that always 404s, and
        // Next.js clears the blur `background-image` placeholder on ANY
        // settlement of that request -- success OR error (see
        // node_modules/next/dist/client/image-component.js's `onError`:
        // "If the real image fails to load, this will still remove the
        // placeholder") -- which happens almost immediately against a local
        // dev server. Waiting for `img.complete` (needed on the non-fixture
        // path, to know the real photo has actually painted) would race
        // straight past that and land after the placeholder is already gone,
        // measuring the section's bare `bg-black` instead of anything real.
        // So in fixture mode, delay the underlying image request via
        // page.route and read the still-painted placeholder before that
        // delayed request can resolve, instead of waiting for `complete`.
        const isFixture = process.env.WIX_FIXTURE === '1'
        if (isFixture) {
          await page.route('**/_next/image**', async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 5000))
            await route.continue()
          })
        }
        await page.goto('/', { waitUntil: isFixture ? 'domcontentloaded' : 'load' })

        const heroImg = page.locator('[data-wix-block="hero"] img')
        let loaded: boolean
        if (isFixture) {
          // The placeholder is rendered server-side (see the LQIP guard
          // test below), so it's already present in the DOM the instant
          // `domcontentloaded` fires -- no fixed sleep needed, and none
          // wanted: any wait here risks racing the 5s delayed request above.
          await expect(heroImg).toHaveCSS('background-image', /^url\("data:image\/svg\+xml/)
          loaded = false
        } else {
          await page.waitForFunction(() => {
            const img = document.querySelector('[data-wix-block="hero"] img')
            return img instanceof HTMLImageElement && img.complete
          })
          loaded = await heroImg.evaluate((img: HTMLImageElement) => img.naturalWidth > 0)
        }

        const heading = page.locator('[data-wix="hero-heading"]')
        const subheading = page.locator('[data-wix="hero-subheading"]')
        const headingBox = await heading.boundingBox()
        const subheadingBox = await subheading.boundingBox()
        if (!headingBox || !subheadingBox) throw new Error('hero text did not render a bounding box')

        // Hide the glyphs themselves so they don't pollute the sample -- we
        // want the worst-case pixel of the scrim/photo (or, in fixture mode,
        // scrim/placeholder) behind them. When `loaded` is false
        // (WIX_FIXTURE=1), this measures the scrim against the real hero
        // asset's LQIP placeholder (data/wix/fixture.ndjson's shared
        // `sanity.imageAsset.metadata.lqip`, itself extracted from the real
        // photo -- see build-fixture.ts) rather than the full-resolution
        // photo itself. That full-photo measurement is the manual
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
  test('the hero <img> carries a background-image data URL, in the server HTML', async ({ request }) => {
    // Asserted against the raw server-rendered HTML, not a browser page:
    // Next.js clears the placeholder `background-image` the moment the real
    // image request settles client-side -- on success (page load) AND on
    // error alike (see node_modules/next/dist/client/image-component.js's
    // `onError`: "If the real image fails to load, this will still remove
    // the placeholder"). WIX_FIXTURE=1's hero src is a fake asset id that
    // always 404s against the (real) Sanity CDN, and that 404 settles fast
    // enough locally that any browser-driven check -- even one delaying the
    // image response via page.route -- ends up racing the network and
    // losing (measured: `page.goto` with the default `waitUntil: 'load'`
    // always sees the placeholder already cleared, since `load` itself
    // waits for the delayed request to settle first). The server HTML has
    // no such race: it's what Next renders before any client-side load/error
    // event can fire, so it always carries the placeholder when
    // `heroImageLqip` resolved.
    const response = await request.get('/')
    const html = await response.text()
    const heroSection = html.match(/<section data-wix-block="hero"[\s\S]*?<\/section>/)?.[0]
    if (!heroSection) throw new Error('hero section not found in server HTML')
    const style = heroSection.match(/<img[^>]*\sstyle="([^"]*)"/)?.[1]

    if (!style || !style.includes('background-image')) {
      // No `heroImageLqip` reached the component at all (e.g. the hero has
      // no image configured), so there's no placeholder to assert on. Assert
      // that's genuinely why, so this doesn't silently pass for some other
      // reason too (Phase 4C lesson). The fixture dataset
      // (data/wix/fixture.ndjson, via scripts/wix/build-fixture.ts) always
      // gives the hero a real `sanity.imageAsset` with a real LQIP, so this
      // branch is not expected to be taken under WIX_FIXTURE=1 -- if it is,
      // that's itself a sign something upstream regressed.
      throw new Error(`hero <img> has no background-image in server HTML (style: ${style ?? '<none>'})`)
    }

    // Next always wraps a blur placeholder in an inline `data:image/svg+xml`
    // (a Gaussian-blur filter over the raw LQIP, never a bare base64 raster
    // background-image directly -- see node_modules/next/dist/shared/lib/
    // image-blur-svg.js's `getImageBlurSvg`), so assert that shape, then
    // decode the HTML entities and check the SVG actually wraps a real
    // base64 raster image (the LQIP itself), not just an empty scaffold.
    expect(style).toContain('background-image:url(&quot;data:image/svg+xml')
    const decoded = style.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
    expect(decoded).toMatch(/href='data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/=]+'/)
  })
})

// The contrast test above measures the scrim *composited over the hero
// image*, which is the thing that actually matters -- but it can only fail
// when what is behind the text is bright. Against the real photo's LQIP
// (what CI sees) that background is dark enough on its own that deleting
// the scrim entirely still clears 4.5:1, so on its own it would not notice
// the scrim disappearing. These two tests guard the scrim directly instead:
// that it exists and covers the text below `md:`, that it is strong enough
// to matter (measured over a white underlay, where a missing or transparent
// scrim scores exactly 1.0), and that it stays off desktop, where Wix's own
// rgba(0,0,0,.3) panel is the only dimming and adding more would be a
// visible departure from the site we are copying.
test.describe('mobile hero scrim', () => {
  test.use({ viewport: { width: 390, height: 900 } })
  test('covers the hero text and is strong enough to matter', async ({ page }) => {
    await page.goto('/')
    const scrim = page.locator('[data-wix="hero-scrim"]')
    await expect(scrim).toBeVisible()

    const [scrimBox, headingBox, subheadingBox] = await Promise.all([
      scrim.boundingBox(),
      page.locator('[data-wix="hero-heading"]').boundingBox(),
      page.locator('[data-wix="hero-subheading"]').boundingBox(),
    ])
    if (!scrimBox || !headingBox || !subheadingBox) throw new Error('hero scrim or text did not render a bounding box')
    expect(scrimBox.y).toBeLessThanOrEqual(headingBox.y)
    expect(scrimBox.y + scrimBox.height).toBeGreaterThanOrEqual(subheadingBox.y + subheadingBox.height)

    // Replace everything behind the scrim with white and hide the glyphs, so
    // the only thing left in the sample is the scrim's own paint. White is
    // the worst case any photo could present, so a scrim that clears 4.5:1
    // here clears it over any image; a deleted or fully transparent scrim
    // measures exactly 1.0 and fails.
    await page.addStyleTag({
      content: `
        [data-wix-block="hero"] { background: #fff !important }
        [data-wix-block="hero"] img { visibility: hidden !important }
        [data-wix="hero-heading"], [data-wix="hero-subheading"] { visibility: hidden !important }
      `,
    })
    const png = await page.screenshot({ clip: headingBox })
    const ratio = await page.evaluate(async (dataUrl) => {
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
      return (1 + 0.05) / (worstL + 0.05)
    }, `data:image/png;base64,${png.toString('base64')}`)
    expect(ratio, 'scrim over a white underlay').toBeGreaterThanOrEqual(4.5)
  })
})

test.describe('desktop hero has no scrim', () => {
  test.use({ viewport: { width: 1280, height: 900 } })
  test('the scrim stays off desktop, where Wix has its own panel', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-wix="hero-scrim"]')).toBeHidden()
    // The Wix panel itself is still there and still rgba(0,0,0,.3).
    const panel = page.locator('[data-wix="hero-heading"]').locator('..')
    expect(await panel.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0.3)')
  })
})
