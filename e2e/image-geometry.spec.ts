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
  const dark = await browser.newPage({ colorScheme: 'dark' })
  await dark.goto('/people')
  const darkFilter = await dark
    .locator('.media-frame')
    .first()
    .evaluate((el) => getComputedStyle(el).filter)
  expect(darkFilter).toContain('brightness')
  await dark.close()

  const light = await browser.newPage({ colorScheme: 'light' })
  await light.goto('/people')
  const lightFilter = await light
    .locator('.media-frame')
    .first()
    .evaluate((el) => getComputedStyle(el).filter)
  expect(lightFilter).toBe('none')
  await light.close()
})

test('the People grayscale treatment survives the dark-mode dim', async ({
  browser,
}) => {
  // Regression guard: applying the dim to the <img> instead of the wrapper
  // silently replaced this grayscale, because `filter` is one property.
  const page = await browser.newPage({ colorScheme: 'dark' })
  await page.goto('/people')
  const imgFilter = await page
    .locator('.media-frame img')
    .first()
    .evaluate((el) => getComputedStyle(el).filter)
  expect(imgFilter).toContain('grayscale')
  await page.close()
})
