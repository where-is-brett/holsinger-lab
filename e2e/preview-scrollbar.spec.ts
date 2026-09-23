import { chromium, expect, test } from '@playwright/test'

// Playwright's default Chromium launch hides its scrollbar
// (`--hide-scrollbars`), so `scrollWidth <= clientWidth` reads true at
// every width regardless of whether layout genuinely exceeds the
// viewport -- a `100vw`-based width can overflow by a real scrollbar's
// width while still passing that check under the default launch.
//
// This file relaunches Chromium with `ignoreDefaultArgs: ['--hide-scrollbars']`
// to restore a real scrollbar (the project-wide `chromium` project in
// playwright.config.ts can't express that per-test), so it's the one place
// in this suite that can catch a `100vw`-based overflow the rest is blind to.
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
