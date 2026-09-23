import { expect, test } from '@playwright/test'

const css = (page: import('@playwright/test').Page, sel: string, prop: string) =>
  page.locator(sel).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)

// sRGB relative luminance + WCAG contrast ratio, per spec. Decoded in-page
// via <canvas>/getImageData rather than a Node PNG library, since nothing
// suitable is already in the dependency tree. Shared by the "background
// reaches 4.5:1" test below (which screenshots whatever is actually behind
// the text -- photo, LQIP placeholder, or the scrim over either) and the
// "mobile hero scrim" describe block (which screenshots the scrim alone,
// over a forced white underlay).
async function worstCaseRatioAgainstWhite(
  page: import('@playwright/test').Page,
  box: { x: number; y: number; width: number; height: number }
) {
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

// The union of two boxes -- used to clip a contrast measurement to
// "wherever the text actually is" rather than just one of the two lines,
// since the heading and subheading can wrap independently and neither box
// alone is guaranteed to reach the worst part of what's behind them.
function unionBox(a: { x: number; y: number; width: number; height: number }, b: typeof a) {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  const right = Math.max(a.x + a.width, b.x + b.width)
  const bottom = Math.max(a.y + a.height, b.y + b.height)
  return { x, y, width: right - x, height: bottom - y }
}

// `page.screenshot({ clip })` in `mobile-safari` (WebKit) paints a spurious
// fully-opaque near-white row along the TOP edge of the clipped PNG when the
// clip's top-left sits at a fractional CSS pixel -- verified directly: same
// box, same page, same forced-white styling, `chromium` and `mobile-chrome`
// both paint it correctly (dark) at every pixel including row 0, WebKit
// alone paints row 0 as ~253,253,253 regardless of what's actually there.
// It reproduces on a single-element clip (`headingBox` alone) too, not just
// the union box -- what changed between the pre-existing single-box test
// (which never hit this) and this one is unrelated to the union itself.
// Since `worstCaseRatioAgainstWhite` deliberately takes the MAX (brightest,
// i.e. worst-contrast) pixel over the whole clip, one bad edge row is enough
// to sink an otherwise-correct measurement to ~1.0. Insetting the sampled
// box by a couple of CSS pixels on every side keeps well clear of that edge
// while still sampling the real interior fill (the glyphs themselves are
// hidden before this runs, so there's no meaningful content being excluded).
function insetBox(box: { x: number; y: number; width: number; height: number }, px: number) {
  return { x: box.x + px, y: box.y + px, width: box.width - 2 * px, height: box.height - 2 * px }
}

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
      // Despite the name this once had ("...clears 4.5:1 contrast against
      // its background"), this test cannot catch a scrim regression under
      // WIX_FIXTURE=1 (verified: with the scrim made fully transparent it
      // still passes here, because the fixture's LQIP placeholder is dark
      // enough on its own). What it actually guards, in CI, is that
      // `heroImageLqip` reaches the component at all and decodes to
      // something dark -- e.g. a broken/empty LQIP would show a bright
      // placeholder and fail this. Outside fixture mode (a manual run
      // against the real photo) it does also exercise the scrim, composited
      // over the real image -- but the scrim's own guard, run in CI at both
      // 320 and 390 over a forced white underlay, is the "mobile hero scrim"
      // describe block below.
      test('mobile hero background (LQIP placeholder in CI) clears 4.5:1 contrast', async ({ page }) => {
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

        const headingRatio = await worstCaseRatioAgainstWhite(page, headingBox)
        const subheadingRatio = await worstCaseRatioAgainstWhite(page, subheadingBox)
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

// The contrast test above measures whatever's behind the text -- but it can
// only fail when that's bright. Against the real photo's LQIP (what CI sees)
// that background is dark enough on its own that deleting the scrim
// entirely still clears 4.5:1, so on its own it would not notice the scrim
// disappearing (nor would it notice the scrim's fade point creeping back
// into the text at some width it doesn't check). This is the scrim's own
// guard: it exists and covers the text below `md:` at both 320 and 390 (the
// two widths where the text wraps most and least -- see e2e/wix-a11y.spec.ts
// for 320 as an already-asserted width elsewhere), it is strong enough to
// matter (measured over a white underlay, where a missing or transparent
// scrim scores exactly 1.0) across the FULL area the text actually occupies
// (the union of the heading and subheading boxes -- clipping to only one of
// them, as an earlier version of this test did, missed a fade point that had
// crept inside the other one's box), and it stays off desktop, where Wix's
// own rgba(0,0,0,.3) panel is the only dimming and adding more would be a
// visible departure from the site we are copying.
for (const w of [390, 320]) {
  test.describe(`mobile hero scrim at ${w}`, () => {
    test.use({ viewport: { width: w, height: 900 } })
    test('covers the hero text and is strong enough to matter, across the full text area', async ({ page }) => {
      await page.goto('/')
      const scrim = page.locator('[data-wix="hero-scrim"]')
      await expect(scrim).toBeVisible()

      const [scrimBox, headingBox, subheadingBox] = await Promise.all([
        scrim.boundingBox(),
        page.locator('[data-wix="hero-heading"]').boundingBox(),
        page.locator('[data-wix="hero-subheading"]').boundingBox(),
      ])
      if (!scrimBox || !headingBox || !subheadingBox) throw new Error('hero scrim or text did not render a bounding box')
      // Geometric coverage: worth having on its own, but not sufficient --
      // it says nothing about the gradient's opacity at any given point,
      // which is what actually determines legibility (see this describe
      // block's comment above).
      expect(scrimBox.y).toBeLessThanOrEqual(headingBox.y)
      expect(scrimBox.y + scrimBox.height).toBeGreaterThanOrEqual(subheadingBox.y + subheadingBox.height)

      // Replace everything behind the scrim with white and hide the glyphs,
      // so the only thing left in the sample is the scrim's own paint.
      // White is the worst case any photo could present, so a scrim that
      // clears 4.5:1 here clears it over any image; a deleted or fully
      // transparent scrim measures exactly 1.0 and fails.
      await page.addStyleTag({
        content: `
          [data-wix-block="hero"] { background: #fff !important }
          [data-wix-block="hero"] img { visibility: hidden !important }
          [data-wix="hero-heading"], [data-wix="hero-subheading"] { visibility: hidden !important }
        `,
      })
      const ratio = await worstCaseRatioAgainstWhite(page, insetBox(unionBox(headingBox, subheadingBox), 2))
      expect(ratio, `scrim over a white underlay, union of heading+subheading boxes, at ${w}`).toBeGreaterThanOrEqual(4.5)
    })
  })
}

test.describe('desktop hero has no scrim', () => {
  test.use({ viewport: { width: 1280, height: 900 } })
  test('the scrim stays off desktop, where Wix has its own panel', async ({ page }) => {
    await page.goto('/')
    // The scrim and the text container are now the same element (it
    // self-sizes to the text below `md:` -- see the comment above the
    // element in Hero.tsx), so it's always present in the DOM, including at
    // desktop. `toBeHidden()` would pass here even if the selector matched
    // nothing at all, which is no longer the case and wouldn't be the right
    // check anyway -- assert directly that its gradient is switched off.
    const scrim = page.locator('[data-wix="hero-scrim"]')
    await expect(scrim).toBeVisible()
    expect(await scrim.evaluate((el) => getComputedStyle(el).backgroundImage)).toBe('none')
    // The Wix panel itself is still there and still rgba(0,0,0,.3).
    const panel = page.locator('[data-wix="hero-heading"]').locator('..')
    expect(await panel.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0.3)')
  })
})
