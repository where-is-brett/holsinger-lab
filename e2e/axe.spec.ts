import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// Violations already known to exist today, each tracked to the Phase 2C task
// that fixes it. Delete an entry (not just an id inside it) once its fix
// lands — this test then starts enforcing zero violations of that kind on
// that route again, with no further change needed here.
//
// - landmark-one-main / region: components/shared/Layout.tsx wraps every
//   route's content in a plain <div>, not a <main> element. Fixed by 2C's
//   Layout.tsx landmark task.
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
  '/': ['landmark-one-main', 'region', 'color-contrast'],
  '/contact': ['landmark-one-main', 'region'],
  '/people': ['landmark-one-main', 'region'],
  '/publications': ['landmark-one-main', 'region'],
  '/tutorial': ['landmark-one-main', 'region', 'heading-order'],
  '/projects/publication-highlights': ['landmark-one-main', 'region'],
}

for (const [path, knownIds] of Object.entries(KNOWN_VIOLATIONS)) {
  test(`${path} has no unexpected accessibility violations`, async ({ page }) => {
    await page.goto(path)
    const results = await new AxeBuilder({ page }).analyze()
    const observedIds = results.violations.map((v) => v.id)

    const unexpected = results.violations.filter((v) => !knownIds.includes(v.id))
    expect(unexpected, JSON.stringify(unexpected, null, 2)).toEqual([])

    const stale = knownIds.filter((id) => !observedIds.includes(id))
    expect(
      stale,
      `These KNOWN_VIOLATIONS entries no longer fire — delete them from the list: ${stale.join(', ')}`
    ).toEqual([])
  })
}
