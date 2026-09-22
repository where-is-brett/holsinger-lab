import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const ROUTES = ['/', '/research', '/news', '/publications', '/team', '/media', '/contact']

// AxeBuilder scans into iframes, including cross-origin ones (via CDP), so it
// reaches the real DOM a youtube-nocookie.com embed renders on /media (the
// Channel 7 item -- components/wix/MediaRow.tsx). That's Google's own player
// chrome, not ours: `aria-level="2"` on the title <a> (aria-allowed-attr,
// critical) and `aria-label` on the controls <div>, which has no role
// (aria-prohibited-attr, serious) -- confirmed by printing the violations'
// `target`/`html` locally, both rooted at `["iframe", ...]` (Fix round 4).
// We have no ability to fix a third party's markup, and disabling either
// rule site-wide would stop catching a genuine violation of it in OUR OWN
// markup anywhere else -- so this excludes just that iframe's subtree from
// the scan (a narrower, more targeted exclusion than a {route, ruleId}
// allowlist entry would be), leaving every route, and the rest of /media,
// fully enforced.
const AXE_EXCLUDE: Record<string, string[]> = {
  '/media': ['iframe[src*="youtube-nocookie.com"]'],
}

for (const path of ROUTES) {
  test(`${path}: axe clean`, async ({ page }) => {
    await page.goto(path)
    const builder = new AxeBuilder({ page })
    for (const selector of AXE_EXCLUDE[path] ?? []) builder.exclude(selector)
    const { violations } = await builder.analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([])
  })
  for (const width of [320, 390, 800, 1012]) {
    test(`${path}: no horizontal scroll at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(path)
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(over).toBeLessThanOrEqual(0)
    })
  }
}
