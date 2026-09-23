import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

import { e2eClient } from './support/sanity'

// Task 2 (spec §1.3): the numbered rail became `Section`, a sentence-case
// label with no `num`. This file proves the two structural claims the task
// brief's step 6 makes, against real routes wherever the live dataset can
// exercise them (constraints.md: "every e2e assertion must hold for any
// valid dataset") and the `/preview/components` gallery otherwise (states
// the live data can't guarantee -- e.g. a person/publication detail page
// existing at all -- go on fixtures, per constraints.md).

const LABEL = '[data-testid="section-label"]'

// (a) Layout: from `lg` (1024px) a label and its section's content share
// one grid row (tokens.ts's `SECTION_GRID`, `[10rem_minmax(0,1fr)]`); below
// `lg` the label sits above the content as a stacked block, and the
// content's left edge lines up with the label's own left edge (both inset
// by the same page gutter -- tokens.ts's `SECTION_GUTTER_X`, applied once
// to the whole section rather than separately to a rail column and a
// content column).
//
// The content wrapper isn't given its own `data-testid` (Section.tsx keeps
// its markup minimal) -- it's always the label's one sibling element inside
// the same `<section>` (the last element child, whether or not a label
// rendered before it), so `label.parentElement.lastElementChild` reaches
// it directly without assuming any class name.
async function checkLabelLayout(page: Page, width: number) {
  return page.evaluate(
    ({ width, labelSelector }) => {
      const isDesktop = width >= 1024
      const violations: { text: string; reason: string }[] = []
      const labels = Array.from(document.querySelectorAll(labelSelector))
      for (const label of labels) {
        const content = label.parentElement?.lastElementChild
        if (!content || content === label) continue
        const labelRect = label.getBoundingClientRect()
        const contentRect = content.getBoundingClientRect()
        const text = (label.textContent ?? '').trim()
        if (isDesktop) {
          // Same grid row: the two boxes' top edges align (a few px of
          // tolerance for line-height/baseline differences between the
          // label's own font and the content's first child).
          if (Math.abs(labelRect.top - contentRect.top) > 4) {
            violations.push({ text, reason: `desktop: label top ${labelRect.top} vs content top ${contentRect.top}` })
          }
          if (labelRect.left >= contentRect.left) {
            violations.push({ text, reason: `desktop: label left ${labelRect.left} not left of content ${contentRect.left}` })
          }
        } else {
          if (labelRect.bottom > contentRect.top + 1) {
            violations.push({
              text,
              reason: `narrow: label bottom ${labelRect.bottom} not above content top ${contentRect.top}`,
            })
          }
          if (Math.abs(labelRect.left - contentRect.left) > 1) {
            violations.push({
              text,
              reason: `narrow: label left ${labelRect.left} vs content left ${contentRect.left}`,
            })
          }
        }
      }
      return violations
    },
    { width, labelSelector: LABEL }
  )
}

// (b) No orphan two-digit section number: the whole point of this task is
// that a `Section` label is never a bare rendered number. Scoped to the
// label element itself (`data-testid="section-label"`), not headings in
// general -- a page could legitimately have an unrelated two-digit heading
// (a year, say) that this check has no business flagging.
async function findNumericLabels(page: Page): Promise<string[]> {
  return page.evaluate((labelSelector) => {
    return Array.from(document.querySelectorAll(labelSelector))
      .map((el) => (el.textContent ?? '').trim())
      .filter((text) => /^\d{2}$/.test(text))
  }, LABEL)
}

const ROUTES_WITH_SECTIONS = ['/', '/publications', '/people', '/research', '/resources']

test.describe('Section label layout', () => {
  for (const width of [375, 1023, 1440]) {
    test(`at ${width}px, every section-label lines up with its content on every route`, async ({ page }) => {
      for (const route of ROUTES_WITH_SECTIONS) {
        await page.setViewportSize({ width, height: 900 })
        const response = await page.goto(route)
        if (response && response.status() === 404) continue // e.g. /people when showPeople is false
        const count = await page.locator(LABEL).count()
        if (count === 0) continue // e.g. no research projects, no resources -- a valid empty state
        const violations = await checkLabelLayout(page, width)
        expect(violations, `${route} at ${width}px: ${JSON.stringify(violations)}`).toEqual([])
      }
    })
  }

  test('at 1440px, the gallery Section demo and every populated screen fixture line up', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/preview/components')
    const violations = await checkLabelLayout(page, 1440)
    expect(violations).toEqual([])
  })

  test('at 375px, the gallery Section demo and every populated screen fixture stack correctly', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 900 })
    await page.goto('/preview/components')
    const violations = await checkLabelLayout(page, 375)
    expect(violations).toEqual([])
  })

  // Task 2 fix round 3 (re-review round 2 Minor 2): a `<p>` label and an
  // `<h2>` label used the same `LABEL_CLASS` string, but an unlayered base
  // rule in styles/index.css (`p:not(:last-child) { margin-bottom:
  // 0.875rem }`) only ever applied to the `<p>` case, giving it a visibly
  // larger gap to its content below `lg` (measured: 22px vs 8px at 375px)
  // -- `Section.tsx`'s `mb-0!` fix makes both equal. Checked against the
  // gallery's `gallery-home-a` instance, which is guaranteed to render at
  // least one of each (round 2 made "Resources" a `<p>`; "Recent work" /
  // "Outreach" / "The lab" stay `<h2>`s) -- unlike a live route, this
  // doesn't depend on the dataset actually populating every block.
  test('below lg, a <p> label and an <h2> label sit the same distance from their content', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 900 })
    await page.goto('/preview/components')
    const gaps = await page.evaluate((labelSelector) => {
      const instance = document.querySelector('[data-testid="gallery-home-a"]')
      if (!instance) return null
      const results: { tag: string; text: string; gap: number }[] = []
      for (const label of instance.querySelectorAll(labelSelector)) {
        const content = label.parentElement?.lastElementChild
        if (!content || content === label) continue
        results.push({
          tag: label.tagName,
          text: (label.textContent ?? '').trim(),
          gap: content.getBoundingClientRect().top - label.getBoundingClientRect().bottom,
        })
      }
      return results
    }, LABEL)
    expect(gaps).not.toBeNull()
    const pGap = gaps!.find((g) => g.tag === 'P')
    const h2Gap = gaps!.find((g) => g.tag === 'H2')
    expect(pGap, `no <p> section-label found: ${JSON.stringify(gaps)}`).toBeDefined()
    expect(h2Gap, `no <h2> section-label found: ${JSON.stringify(gaps)}`).toBeDefined()
    expect(
      Math.abs(pGap!.gap - h2Gap!.gap),
      `<p> "${pGap!.text}" gap ${pGap!.gap} vs <h2> "${h2Gap!.text}" gap ${h2Gap!.gap}`
    ).toBeLessThanOrEqual(1)
  })

  test('a real person profile page lines up too, when one exists', async ({ page }) => {
    const slug = await e2eClient.fetch<string | null>(
      `*[_type == "profile" && hasPage == true && defined(slug.current)][0].slug.current`
    )
    test.skip(!slug, 'no profile has its own page in this dataset')
    await page.goto(`/people/${slug}`)
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      const violations = await checkLabelLayout(page, width)
      expect(violations, `/people/${slug} at ${width}px`).toEqual([])
    }
  })

  test('a real publication page lines up too, when one exists', async ({ page }) => {
    const slug = await e2eClient.fetch<string | null>(
      `*[_type == "publication" && defined(slug.current)][0].slug.current`
    )
    test.skip(!slug, 'no publication has a slug in this dataset')
    await page.goto(`/publications/${slug}`)
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      const violations = await checkLabelLayout(page, width)
      expect(violations, `/publications/${slug} at ${width}px`).toEqual([])
    }
  })
})

test.describe('Section label never a bare number', () => {
  test('no route or gallery fixture renders a two-digit section-label', async ({ page }) => {
    const routes = [...ROUTES_WITH_SECTIONS, '/preview/components']
    for (const route of routes) {
      const response = await page.goto(route)
      if (response && response.status() === 404) continue
      const numeric = await findNumericLabels(page)
      expect(numeric, `${route}: found numeric section-label(s)`).toEqual([])
    }
  })

  test('a real person profile and publication page never render one either', async ({ page }) => {
    const [personSlug, pubSlug] = await Promise.all([
      e2eClient.fetch<string | null>(
        `*[_type == "profile" && hasPage == true && defined(slug.current)][0].slug.current`
      ),
      e2eClient.fetch<string | null>(`*[_type == "publication" && defined(slug.current)][0].slug.current`),
    ])
    // Minor 8 (Task 2 fix round 1 review): checked immediately after the
    // slug fetch, before any assertion -- an empty dataset then reports a
    // real skip, not a vacuous pass from two `if` blocks that never ran.
    test.skip(!personSlug && !pubSlug, 'no profile with its own page and no publication with a slug in this dataset')
    if (personSlug) {
      await page.goto(`/people/${personSlug}`)
      expect(await findNumericLabels(page)).toEqual([])
    }
    if (pubSlug) {
      await page.goto(`/publications/${pubSlug}`)
      expect(await findNumericLabels(page)).toEqual([])
    }
  })
})

// Task 2 fix round 1 (controller ruling 3): from `lg`, `PageTitle`'s `<h1>`
// and meta must sit in the same content column every `Section` below them
// uses -- before this fix `PageTitle` used the page's own left gutter
// directly (x=48 at 1440px) while a labelless `Section` (Home's Identity
// block) pinned its own content to `lg:col-start-2` (x=240), so the title
// visibly jogged sideways relative to the page's own body copy. `PageTitle`
// now shares `Section`'s `SECTION_GRID`/`SECTION_GUTTER_X` (tokens.ts) with
// an empty label cell, so this checks the fix holds on every route that
// renders both a `PageTitle` and at least one `Section` below it.
test.describe('PageTitle aligns with the content column', () => {
  const ROUTES = ['/publications', '/people', '/research', '/resources']

  test('at 1440px, page-title-heading and the first section content share a left edge', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    for (const route of ROUTES) {
      const response = await page.goto(route)
      if (response && response.status() === 404) continue // e.g. /people when showPeople is false
      const result = await page.evaluate(() => {
        const heading = document.querySelector('[data-testid="page-title-heading"]')
        const section = document.querySelector('section')
        const content = section?.querySelector(':scope > .lg\\:col-start-2')
        if (!heading || !content) return null
        return {
          headingLeft: heading.getBoundingClientRect().left,
          contentLeft: content.getBoundingClientRect().left,
        }
      })
      if (!result) continue // no Section on this route today (e.g. /resources with zero resources still has one -- see Section's empty-state call -- but guard anyway)
      expect(
        Math.abs(result.headingLeft - result.contentLeft),
        `${route}: heading left ${result.headingLeft} vs content left ${result.contentLeft}`
      ).toBeLessThanOrEqual(1)
    }
  })
})
