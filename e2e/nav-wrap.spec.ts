import { expect, type Page, test } from '@playwright/test'

// The 768-1024px wrap check carried from Phase 1 (phase-3-start-here.md,
// "Also outstanding"). axe and the token guards cannot see a wrap, so this
// measures it. Two halves:
//  - the real header on `/`, with whatever the CMS holds today;
//  - a gallery fixture with the longest realistic siteName and all six IA
//    items, so a future Settings edit cannot reintroduce the wrap unnoticed.
//    The gallery container is narrower than the viewport, so the fixture is
//    judged by arithmetic -- intrinsic content widths against the viewport,
//    which is what the real full-bleed header gets.

const WIDTHS = [768, 900, 1023, 1024, 1280]

async function navHeightPx(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement('div')
    probe.style.height = 'var(--nav-height)'
    document.body.appendChild(probe)
    const h = probe.getBoundingClientRect().height
    probe.remove()
    return h
  })
}

for (const width of WIDTHS) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } })

    test('the live header is one row, nav-height tall, wordmark unclipped', async ({ page }) => {
      await page.goto('/')
      const expected = await navHeightPx(page)
      const m = await page.evaluate(() => {
        const header = document.querySelector('[data-testid="site-header"] [data-testid="site-nav"]')!
        const links = [...header.querySelectorAll('nav a')]
        const spans = [...header.querySelectorAll('[data-testid^="site-wordmark-"]')].filter(
          (s) => getComputedStyle(s).display !== 'none'
        )
        return {
          height: header.getBoundingClientRect().height,
          tops: [...new Set(links.map((a) => Math.round(a.getBoundingClientRect().top)))],
          clipped: spans.some((s) => s.scrollWidth > s.clientWidth),
        }
      })
      expect(m.height).toBeCloseTo(expected, 0)
      expect(m.tops).toHaveLength(1)
      expect(m.clipped).toBe(false)
    })

    test('the long-siteName fixture fits the viewport', async ({ page }) => {
      await page.goto('/preview/components')
      const m = await page.evaluate(() => {
        const header = document.querySelector('[data-testid="gallery-site-nav-long"] [data-testid="site-nav"]')!
        const cs = getComputedStyle(header)
        const span = [...header.querySelectorAll('[data-testid^="site-wordmark-"]')].find(
          (s) => getComputedStyle(s).display !== 'none'
        )!
        const nav = header.querySelector('nav')!
        return {
          which: span.getAttribute('data-testid'),
          needed:
            span.scrollWidth +
            nav.scrollWidth +
            parseFloat(cs.columnGap) +
            parseFloat(cs.paddingLeft) +
            parseFloat(cs.paddingRight),
          tops: [...new Set([...nav.querySelectorAll('a')].map((a) => Math.round(a.getBoundingClientRect().top)))],
        }
      })
      expect(m.which).toBe(width >= 1024 ? 'site-wordmark-long' : 'site-wordmark-short')
      expect(m.needed).toBeLessThanOrEqual(width)
      expect(m.tops).toHaveLength(1)
    })
  })
}
