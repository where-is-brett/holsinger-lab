import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// `/` previously carried a `color-contrast` violation (ProjectListItem's
// overview text, gray-500 #727892 on #f8f8f8 = 4.10:1, below AA's 4.5).
// Phase 2C deferred it here as a design-token decision; Phase 3A Task 2
// resolved it by repointing that text to the muted token (6.64:1).
//
// `/tutorial`'s heading-order violation remains and is deliberately not
// fixed: it is authored Sanity content, not a component defect. Fixing it
// means editing live CMS content or making CustomPortableText enforce
// sequential heading order programmatically -- a distinct, larger change.
const KNOWN_VIOLATIONS: Record<string, string[]> = {
  '/': [],
  '/contact': [],
  '/people': [],
  '/publications': [],
  '/tutorial': ['heading-order'],
  '/projects/publication-highlights': [],
}

// Run against both the mobile and desktop nav render paths (Phase 2C's
// CSS-breakpoint split means the two can genuinely diverge), per this
// phase's design doc §5. color-contrast and heading-order are
// viewport-independent (CSS/content issues, not layout), so the same
// KNOWN_VIOLATIONS map is expected to hold at both — this loop verifies
// that rather than assuming it.
const VIEWPORTS: Record<string, { width: number; height: number }> = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 375, height: 812 },
}

for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`${viewportName} viewport`, () => {
    test.use({ viewport })

    for (const [path, knownIds] of Object.entries(KNOWN_VIOLATIONS)) {
      test(`${path} has no unexpected accessibility violations`, async ({
        page,
      }) => {
        await page.goto(path)
        const results = await new AxeBuilder({ page }).analyze()
        const observedIds = results.violations.map((v) => v.id)

        const unexpected = results.violations.filter(
          (v) => !knownIds.includes(v.id)
        )
        expect(unexpected, JSON.stringify(unexpected, null, 2)).toEqual([])

        const stale = knownIds.filter((id) => !observedIds.includes(id))
        expect(
          stale,
          `These KNOWN_VIOLATIONS entries no longer fire — delete them from the list: ${stale.join(', ')}`
        ).toEqual([])
      })
    }
  })
}
