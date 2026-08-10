import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// Violations already known to exist today, each tracked to the Phase 2C task
// that fixes it. Delete an entry (not just an id inside it) once its fix
// lands — this test then starts enforcing zero violations of that kind on
// that route again, with no further change needed here.
//
// - color-contrast (serious on / only): components/pages/home/ProjectListItem.tsx
//   renders each showcase project's overview text (live Sanity content) in
//   `text-gray-500` against the page's light background — measured at a
//   4.1:1 contrast ratio, below the 4.5:1 WCAG AA minimum. Not present in
//   this plan's original research pass (production Sanity content is live
//   and can change independent of code); found when this task's Step 3 was
//   actually run on 2026-08-10. Fixed by a future 2C color-contrast task.
// - heading-order (moderate on /tutorial only): the page's Sanity portable-
//   text body content contains a heading block rendered as a literal <h4>
//   (components/shared/CustomPortableText.tsx maps each CMS heading style
//   straight to its HTML tag) without an intervening <h2>/<h3>, so heading
//   levels jump. A content-authoring issue in the /tutorial page's body,
//   not a component bug. Found while confirming this route's entry in this
//   task's Step 4. Fixed by a future 2C task correcting that page's content
//   heading levels (or CustomPortableText enforcing sequential order).
const KNOWN_VIOLATIONS: Record<string, string[]> = {
  '/': ['color-contrast'],
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
