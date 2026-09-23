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
// one grid row (Section.tsx's `[10rem_minmax(0,1fr)]` grid); below `lg`
// the label sits above the content as a stacked block, and the content's
// left edge lines up with the label's own left edge (both inset by the
// same page gutter -- Section.tsx's GUTTER_X, applied once to the whole
// section rather than separately to a rail column and a content column).
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
    if (personSlug) {
      await page.goto(`/people/${personSlug}`)
      expect(await findNumericLabels(page)).toEqual([])
    }
    if (pubSlug) {
      await page.goto(`/publications/${pubSlug}`)
      expect(await findNumericLabels(page)).toEqual([])
    }
    test.skip(!personSlug && !pubSlug, 'no profile with its own page and no publication with a slug in this dataset')
  })
})
