import { chromium, expect, test } from '@playwright/test'

// Task 2 fix round 3 (re-review round 2, new Important 1): Playwright's
// default Chromium launch hides its scrollbar (`--hide-scrollbars`), so
// `document.documentElement.scrollWidth <= clientWidth` reads true at every
// width regardless of whether a fixture's own width genuinely exceeds the
// viewport -- fix round 2's `FULL_BLEED` (`w-screen`/`-mx-[50vw]`, both
// resolved against `100vw`) passed every existing overflow check for
// exactly this reason, while actually overflowing by ~8px per side under a
// real scrollbar (measured by the re-review, relaunching Chromium with
// `ignoreDefaultArgs: ['--hide-scrollbars']` removed to restore one).
// `BLEED_GRID` (Gallery.tsx) replaced the whole vw-based approach with a
// pure CSS Grid pattern instead, which resolves its tracks against the
// grid's own content box -- ordinary block layout, not `100vw`, so it
// never includes scrollbar space in the first place.
//
// This file reproduces the re-review's own launch configuration directly
// (the default project-wide `chromium` in `playwright.config.ts` cannot
// express `ignoreDefaultArgs` per-test), so it's the one place in this
// suite that can actually fail on a `100vw`-based overflow the rest of the
// suite is blind to.
const WIDTHS = [320, 1280, 1440]
const ROUTES = ['/preview/components', '/', '/publications']

test.describe('no horizontal overflow under a real (non-hidden) scrollbar', () => {
  for (const route of ROUTES) {
    for (const width of WIDTHS) {
      test(`${route} at ${width}px`, async ({ baseURL }) => {
        const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] })
        try {
          const page = await browser.newPage({ viewport: { width, height: 900 } })
          await page.goto(`${baseURL}${route}`)
          const { scrollWidth, clientWidth } = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
          }))
          expect(scrollWidth, `scrollWidth ${scrollWidth} vs clientWidth ${clientWidth}`).toBeLessThanOrEqual(
            clientWidth
          )
        } finally {
          await browser.close()
        }
      })
    }
  }
})
