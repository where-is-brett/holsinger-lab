import { expect, test } from '@playwright/test'

const ROUTES = ['/', '/people', '/publications', '/contact', '/tutorial']

/** Parses `rgb(r, g, b)` / `rgba(r, g, b, a)` into a 0-255 triple. */
function rgb(value: string): [number, number, number] {
  const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) throw new Error(`unparseable colour: ${value}`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

const mean = (c: [number, number, number]) => (c[0] + c[1] + c[2]) / 3

test.describe('dark colour scheme', () => {
  test.use({ colorScheme: 'dark' })

  for (const route of ROUTES) {
    test(`${route} renders dark, with no light surface painting over it`, async ({ page }) => {
      await page.goto(route)

      // The Layout wrapper is the element that masked the dark body before
      // Phase 3A -- it is the specific regression this asserts against.
      //
      // `body > div` alone is ambiguous: `<body>` also carries a hidden RSC
      // placeholder div (the compiled false-branch of
      // `{isDraftMode && <PreviewBanner />}` in app/layout.tsx) as its
      // *first* child, ahead of the real Layout wrapper, plus a
      // `#headlessui-portal-root` div appended after it. `:has(main)`
      // isolates the one body-level div that actually wraps the page's
      // landmark content -- the real wrapper, every route, unambiguously.
      const wrapper = page.locator('body > div:has(main)').first()
      const wrapperBg = await wrapper.evaluate((el) => getComputedStyle(el).backgroundColor)
      const wrapperText = await wrapper.evaluate((el) => getComputedStyle(el).color)

      expect(mean(rgb(wrapperBg)), `${route} wrapper background should be dark`).toBeLessThan(60)
      expect(mean(rgb(wrapperText)), `${route} wrapper text should be light`).toBeGreaterThan(180)

      const headingColor = await page
        .locator('h1')
        .first()
        .evaluate((el) => getComputedStyle(el).color)
      expect(mean(rgb(headingColor)), `${route} h1 should be light`).toBeGreaterThan(180)
    })
  }
})

test.describe('light colour scheme', () => {
  test.use({ colorScheme: 'light' })

  test('/ renders light', async ({ page }) => {
    await page.goto('/')
    const wrapper = page.locator('body > div:has(main)').first()
    const bg = await wrapper.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(mean(rgb(bg))).toBeGreaterThan(200)
  })
})
