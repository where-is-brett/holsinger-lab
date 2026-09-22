import { expect, test } from '@playwright/test'

/** Routes that render at least one cover image. */
const ROUTES = ['/', '/people', '/projects/about-dr-damian-holsinger']

/** Widths that exercise both the flex-col and flex-row card layouts. */
const WIDTHS = [
  { label: 'mobile', width: 375, height: 812 },
  { label: 'desktop', width: 1280, height: 900 },
]

/**
 * Routes for the undefined-class sweep. Deliberately a superset of
 * ROUTES, with `/tutorial` added as defence-in-depth breadth rather than
 * because it currently reaches an interpolation site the other routes
 * miss: today, every call site that omits `paragraphClasses` (Header,
 * ProjectListItem) renders only `normal` paragraph blocks, and both
 * already appear on `/` and the project route, while `/tutorial`'s
 * richer blocks (lists, headings) come via Page.tsx, which always
 * passes a non-empty `paragraphClasses`. The extra route guards against
 * a future caller or future content that changes that, not a gap that
 * exists today.
 */
const CLASS_SWEEP_ROUTES = [...ROUTES, '/tutorial']

for (const { label, width, height } of WIDTHS) {
  for (const route of ROUTES) {
    test(`${route} renders undistorted images at ${label}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height })
      await page.goto(route)
      // next/image lazy-loads; scroll to the bottom so every image decodes.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForLoadState('networkidle')

      const rows = await page.evaluate(() =>
        [...document.querySelectorAll('img')]
          .filter((i) => i.naturalWidth > 0)
          .map((i) => {
            const r = i.getBoundingClientRect()
            return {
              alt: i.alt,
              width: r.width,
              height: r.height,
              boxAR: r.width / r.height,
              natAR: i.naturalWidth / i.naturalHeight,
              objectFit: getComputedStyle(i).objectFit,
            }
          })
      )

      expect(rows.length).toBeGreaterThan(0)

      for (const row of rows) {
        // `fill` is the browser default and the original defect: it
        // stretches the bitmap to the box instead of cropping.
        expect(
          row.objectFit,
          `${row.alt} must not use object-fit: fill`
        ).not.toBe('fill')

        // Non-zero rendered size. This is the assertion that catches a
        // collapsed containing block: during Task 4 every source-string
        // contract test passed while all four timeline thumbnails rendered
        // at 65x0 and were invisible, because ImageBox positions its own
        // wrapper and an absolutely-positioned child contributes no height.
        // Source inspection cannot see this; only a rendered measurement can.
        expect(
          row.width,
          `${row.alt} must have non-zero rendered width`
        ).toBeGreaterThan(0)
        expect(
          row.height,
          `${row.alt} must have non-zero rendered height`
        ).toBeGreaterThan(0)
      }
    })
  }
}

test('no element renders a literal "undefined" CSS class', async ({ page }) => {
  for (const route of CLASS_SWEEP_ROUTES) {
    await page.goto(route)
    const offenders = await page.evaluate(() =>
      [...document.querySelectorAll('*')]
        .filter(
          (el) =>
            typeof el.className === 'string' &&
            /\bundefined\b/.test(el.className)
        )
        .map((el) => el.tagName + '.' + el.className)
    )
    expect(offenders, `${route} has elements with an undefined class`).toEqual(
      []
    )
  }
})

test('image frames are dimmed in dark mode only', async ({ browser }) => {
  // Phase 3 PR B rebuilt /people on the redesign primitives (PersonCard's
  // own `next/image` + Tailwind filter, not ImageBox/ImageContainer), so it
  // no longer renders a `.media-frame` element at all -- this now targets
  // '/' (Home, still on the pre-redesign system via FeatureRow's ImageBox,
  // and explicitly out of this PR's scope per constraints.md) so the
  // dark-dim mechanism itself stays covered by a route that still uses it.
  const dark = await browser.newPage({ colorScheme: 'dark' })
  await dark.goto('/')
  const darkFilter = await dark
    .locator('.media-frame')
    .first()
    .evaluate((el) => getComputedStyle(el).filter)
  expect(darkFilter).toContain('brightness')
  await dark.close()

  const light = await browser.newPage({ colorScheme: 'light' })
  await light.goto('/')
  const lightFilter = await light
    .locator('.media-frame')
    .first()
    .evaluate((el) => getComputedStyle(el).filter)
  expect(lightFilter).toBe('none')
  await light.close()
})

// "the People grayscale treatment survives the dark-mode dim" (a regression
// guard for Profile.tsx's ImageBox `classesWrapper="... [&_img]:grayscale
// ..."` combined with ImageBox's own `.media-frame` dark-mode dim) is
// removed, not repointed: Phase 3 PR B deleted Profile.tsx, and PersonCard's
// replacement grayscale-on-hover treatment (PersonCard.tsx's IMAGE_FILTER)
// is a Tailwind utility on the `next/image` element itself, never combined
// with `.media-frame`/ImageBox at all -- the specific two-styles-on-one-
// `filter`-property collision this test guarded against can no longer
// happen anywhere in the codebase (grep confirms `grayscale` now only
// appears in PersonCard.tsx, and never alongside `media-frame`).
