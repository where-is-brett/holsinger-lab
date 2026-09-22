import { expect, test } from '@playwright/test'

import { e2eClient } from './support/sanity'

// Task 3 (Home): the rebuilt `/` no longer renders any cover image in the
// old `ImageBox`/`.media-frame` frames this file's tests exercise -- Home's
// only image is its own 64px PI portrait (Home.tsx's `PiPortrait64`, a
// plain next/image with no `.media-frame` wrapper at all), and production's
// PI has no portrait on file today besides (spec §2). `/` is removed from
// this list -- see the "image frames are dimmed" test below, which now
// resolves its own route instead of assuming `/` works, and
// CLASS_SWEEP_ROUTES below, which adds `/` back explicitly so the
// undefined-class sweep still covers it.
/** Routes that render at least one cover image. */
const ROUTES = ['/people', '/projects/about-dr-damian-holsinger']

/** Widths that exercise both the flex-col and flex-row card layouts. */
const WIDTHS = [
  { label: 'mobile', width: 375, height: 812 },
  { label: 'desktop', width: 1280, height: 900 },
]

/**
 * Routes for the undefined-class sweep. Deliberately a superset of
 * ROUTES, plus `/` and `/tutorial` as defence-in-depth breadth rather than
 * because either currently reaches an interpolation site the other routes
 * miss.
 *
 * `/tutorial`'s richer portable-text blocks (lists, headings) come via
 * Page.tsx (`CustomPortableText`), which always passes a non-empty
 * `paragraphClasses` -- `Header`'s own call site (Page.tsx, ProjectPage.tsx,
 * neither of them `/`) omits it and renders only `normal` blocks, already
 * covered by `/tutorial` and `/projects/about-dr-damian-holsinger` above.
 *
 * Task 3 update: `/` is kept in this sweep, but no longer for the
 * `Header`/`CustomPortableText` reason above -- the rebuilt Home
 * (Home.tsx) doesn't render `CustomPortableText` at all (its one portable-
 * text block, the MAESTRO overview, goes through `PortableBody`, which
 * always supplies its own paragraph class). `/` stays in the sweep because
 * it renders several other components that each interpolate a class string
 * from data (`PublicationRow`, `ResourceBlock`, `PersonCard`-style
 * portrait treatment) -- the same general breadth reasoning as
 * `/tutorial`'s own inclusion, not a specific known gap.
 */
const CLASS_SWEEP_ROUTES = ['/', ...ROUTES, '/tutorial']

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
  // no longer renders a `.media-frame` element at all. Task 3 (this PR)
  // rebuilt Home the same way (Home.tsx's `PiPortrait64`), so '/' no
  // longer renders one either. `/projects/[slug]` (ProjectPage.tsx, still
  // on ImageBox) is the one remaining route that does -- resolved from the
  // live dataset (the first `project` with a `coverImage`, per the task
  // brief) rather than hardcoded, so this holds for any valid dataset
  // (constraints.md), and skips with a reason if none exists.
  const withCover = await e2eClient.fetch<{ slug: string } | null>(
    `*[_type == "project" && defined(coverImage) && defined(slug.current)][0]{ "slug": slug.current }`
  )
  test.skip(!withCover, 'no project with a coverImage exists in live data yet')
  const route = `/projects/${withCover!.slug}`

  const dark = await browser.newPage({ colorScheme: 'dark' })
  await dark.goto(route)
  const darkFilter = await dark
    .locator('.media-frame')
    .first()
    .evaluate((el) => getComputedStyle(el).filter)
  expect(darkFilter).toContain('brightness')
  await dark.close()

  const light = await browser.newPage({ colorScheme: 'light' })
  await light.goto(route)
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
