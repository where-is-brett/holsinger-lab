import { expect, test } from '@playwright/test'

import { e2eClient } from './support/sanity'

// The FacetBand root is the ancestor div carrying its `z-[5]` utility
// (unique to that one element -- see components/redesign/FacetBand.tsx),
// located from the always-present "Density" row label. Facet-group label
// lookups are scoped inside it, not the whole page: the column-head row
// (`hidden lg:grid`) also renders a plain "Year" span, and an unscoped
// `getByText('Year', { exact: true })` would match both.
function facetBand(page: import('@playwright/test').Page) {
  return page
    .getByText('Density', { exact: true })
    .locator('xpath=ancestor::div[contains(@class, "z-[5]")]')
    .first()
}

test.describe('publications index', () => {
  test('one row per record, and the meta reflects the row count', async ({ page }) => {
    await page.goto('/publications')
    const main = page.locator('main')
    const rows = main.locator('[data-testid="pub-row"]')
    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThan(0)

    const meta = page.getByText(/^\d+ RECORDS( · |$)/)
    await expect(meta).toBeVisible()
    const metaText = (await meta.textContent())!
    const n = Number(metaText.match(/^(\d+)/)![1])
    expect(n).toBe(rowCount)
  })

  test('clicking a Year chip filters the rows, and clicking it again restores the full list', async ({
    page,
  }) => {
    await page.goto('/publications')
    const main = page.locator('main')
    const rows = main.locator('[data-testid="pub-row"]')
    const fullCount = await rows.count()

    const yearLabel = facetBand(page).getByText('Year', { exact: true })
    const chipsContainer = yearLabel.locator('xpath=following-sibling::div[1]')
    const firstChip = chipsContainer.getByRole('button').first()
    const chipText = (await firstChip.textContent())!.trim()
    const chipYear = chipText.match(/^\d+/)![0]

    await firstChip.click()

    await expect(page.getByText(/ OF \d+ RECORDS SHOWN$/)).toBeVisible()
    const visibleCount = await rows.count()
    expect(visibleCount).toBeGreaterThan(0)
    expect(visibleCount).toBeLessThanOrEqual(fullCount)
    const years = await rows.evaluateAll((els) => els.map((el) => el.getAttribute('data-year')))
    for (const year of years) {
      expect(year).toBe(chipYear)
    }

    await firstChip.click()
    await expect(page.getByText(/^\d+ RECORDS( · |$)/)).toBeVisible()
    await expect(rows).toHaveCount(fullCount)
  })

  test('the Type group, when present, filters likewise', async ({ page }) => {
    await page.goto('/publications')
    const typeLabel = page.getByText('Type', { exact: true })
    const hasTypeGroup = (await typeLabel.count()) > 0
    test.skip(
      !hasTypeGroup,
      "the page renders no Type group because the Phase 3B type backfill hasn't run against this dataset"
    )

    const main = page.locator('main')
    const rows = main.locator('[data-testid="pub-row"]')
    const fullCount = await rows.count()

    const chipsContainer = typeLabel.locator('xpath=following-sibling::div[1]')
    const firstChip = chipsContainer.getByRole('button').first()
    const chipText = (await firstChip.textContent())!.trim()
    const chipType = chipText.replace(/\s*\d+$/, '')

    await firstChip.click()
    await expect(page.getByText(/ OF \d+ RECORDS SHOWN$/)).toBeVisible()
    const types = await rows.evaluateAll((els) => els.map((el) => el.getAttribute('data-type')))
    for (const type of types) {
      expect(type).toBe(chipType)
    }

    await firstChip.click()
    await expect(rows).toHaveCount(fullCount)
  })

  test('an impossible year+type combination shows the empty state, and Clear filters restores the list', async ({
    page,
  }) => {
    await page.goto('/publications')
    const typeLabel = page.getByText('Type', { exact: true })
    const hasTypeGroup = (await typeLabel.count()) > 0
    test.skip(
      !hasTypeGroup,
      "no Type group is rendered (type backfill hasn't run), so no year+type combination can be exercised"
    )

    const main = page.locator('main')
    const rows = main.locator('[data-testid="pub-row"]')
    const fullCount = await rows.count()
    const pairs = await rows.evaluateAll((els) =>
      els.map((el) => ({ year: el.getAttribute('data-year'), type: el.getAttribute('data-type') }))
    )
    const years = [...new Set(pairs.map((p) => p.year))]
    const types = [...new Set(pairs.map((p) => p.type).filter(Boolean))]

    let combo: { year: string; type: string } | null = null
    outer: for (const year of years) {
      for (const type of types) {
        if (!pairs.some((p) => p.year === year && p.type === type)) {
          combo = { year: year!, type: type! }
          break outer
        }
      }
    }
    test.skip(!combo, 'every year+type combination present in the data is occupied')

    const yearChip = facetBand(page)
      .getByText('Year', { exact: true })
      .locator('xpath=following-sibling::div[1]')
      .getByRole('button', { name: new RegExp(`^${combo!.year}\\b`) })
    const typeChip = typeLabel.locator('xpath=following-sibling::div[1]').getByRole('button', {
      name: new RegExp(`^${combo!.type}\\b`),
    })
    await yearChip.click()
    await typeChip.click()

    await expect(page.getByText('No records match these filters.')).toBeVisible()
    const clearButton = page.getByRole('button', { name: 'Clear filters' })
    await clearButton.click()
    await expect(rows).toHaveCount(fullCount)
  })

  test('the density toggle tightens rows so the title truncates on one line', async ({ page }) => {
    await page.goto('/publications')
    await page.getByRole('button', { name: 'COMPACT' }).click()

    const firstTitle = page.locator('[data-testid="pub-row"]').first().getByTestId('pub-title')
    await expect
      .poll(async () => {
        const className = (await firstTitle.getAttribute('class')) ?? ''
        const whiteSpace = await firstTitle.evaluate((el) => getComputedStyle(el).whiteSpace)
        return className.includes('truncate') || whiteSpace === 'nowrap'
      })
      .toBe(true)
  })

  test('copying the first row citation shows the copied state and puts the title on the clipboard', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/publications')

    const firstRow = page.locator('[data-testid="pub-row"]').first()
    const title = (await firstRow.getByTestId('pub-title').textContent())!.trim()
    const copyButton = firstRow.getByRole('button', { name: 'COPY CITATION' })
    await copyButton.click()
    await expect(copyButton).toHaveText(/COPIED/)

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboardText).toContain(title)
  })

  test('every DOI/URL identifier is mutually exclusive and the two counts cover every row', async ({
    page,
  }) => {
    await page.goto('/publications')
    const main = page.locator('main')
    const rows = main.locator('[data-testid="pub-row"]')
    const total = await rows.count()
    const doiCount = await main.locator('[data-testid="pub-row"][data-link-kind="DOI"]').count()
    const urlCount = await main.locator('[data-testid="pub-row"][data-link-kind="URL"]').count()
    expect(doiCount + urlCount).toBe(total)

    const doiHrefLinks = await page
      .locator('[data-identifier][href^="https://doi.org/"]')
      .count()
    expect(doiCount).toBe(doiHrefLinks)
  })

  test('a row title navigates to its detail page', async ({ page }) => {
    await page.goto('/publications')
    const firstRow = page.locator('[data-testid="pub-row"]').first()
    await firstRow.getByTestId('pub-title').click()
    await expect(page).toHaveURL(/\/publications\/[^/]+$/)
  })

  test.describe('no horizontal overflow', () => {
    for (const width of [768, 1023, 1024, 1280]) {
      test(`at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/publications')
        const fits = await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
        )
        expect(fits).toBe(true)
      })
    }
  })
})

test.describe('People role grouping', () => {
  test('every profile renders exactly once, under its own role-group heading (or the trailing unheaded section)', async ({
    page,
  }) => {
    // Derived from the live dataset (profiles, roleGroups in orderRank
    // order, and settings.labHead) rather than the count and "0 roleGroups"
    // assumption this test previously hardcoded -- mirrors
    // components/pages/people/groupByRoleGroup.ts and excludeLabHead.ts, so
    // it holds whether roleGroups are unset, partially set, or (as in
    // production today) fully populated, and once settings.labHead is set.
    const [profiles, roleGroups, settings] = await Promise.all([
      e2eClient.fetch<{ _id: string; name: string; roleGroupId: string | null }[]>(
        `*[_type == "profile"]{ _id, name, "roleGroupId": roleGroup->_id }`
      ),
      e2eClient.fetch<{ _id: string; title: string | null }[]>(
        `*[_type == "roleGroup"] | order(orderRank) { _id, title }`
      ),
      e2eClient.fetch<{ labHeadId: string | null } | null>(
        `*[_type == "settings"][0]{ "labHeadId": labHead->_id }`
      ),
    ])

    const labHeadId = settings?.labHeadId ?? null
    // Mirrors components/pages/people/excludeLabHead.ts: removes the
    // spotlighted lab head from the grid so they aren't double-counted.
    const gridProfiles = profiles.filter((profile) => profile._id !== labHeadId)

    // Mirrors components/pages/people/groupByRoleGroup.ts exactly: one
    // bucket per roleGroup (in orderRank order), plus a trailing "Other"
    // catch-all for unset/dangling roleGroup refs, sections with zero
    // members omitted, and the "Other" heading suppressed when it's the
    // only section left.
    type Bucket = { id: string; title: string | null; profiles: typeof gridProfiles }
    const buckets: Bucket[] = roleGroups.map((group) => ({
      id: group._id,
      title: group.title,
      profiles: [],
    }))
    const other: Bucket = { id: 'other', title: 'Other', profiles: [] }
    for (const profile of gridProfiles) {
      const bucket = buckets.find((b) => b.id === profile.roleGroupId)
      ;(bucket ?? other).profiles.push(profile)
    }
    const nonEmpty = [...buckets, other].filter((b) => b.profiles.length > 0)
    const expectedSections =
      nonEmpty.length === 1 && nonEmpty[0].id === 'other'
        ? [{ ...nonEmpty[0], title: null }]
        : nonEmpty

    await page.goto('/people')

    // Scoped to the People grid's own wrapper div (People.tsx:
    // `<div className="mb-16 space-y-12">`), which also excludes the
    // Spotlight's own bare `<section>` when a lab head is set.
    const sections = page.locator('div.mb-16.space-y-12 > section')
    await expect(sections).toHaveCount(expectedSections.length)

    let totalProfileHeadings = 0
    for (const [index, expected] of expectedSections.entries()) {
      const section = sections.nth(index)
      const sectionTitleHeading = section.locator('> h2')
      if (expected.title) {
        await expect(sectionTitleHeading).toHaveText(expected.title)
      } else {
        await expect(sectionTitleHeading).toHaveCount(0)
      }

      // All h2s in the section: the group title (if any) plus each
      // profile's name heading (Profile.tsx renders `<h2>{profile.name}</h2>`
      // nested inside the section, not as a direct child).
      const headings = await section.locator('h2').allTextContents()
      const profileNameHeadings = expected.title ? headings.slice(1) : headings
      expect(profileNameHeadings.sort()).toEqual(
        expected.profiles.map((profile) => profile.name).sort()
      )
      totalProfileHeadings += profileNameHeadings.length
    }

    // Every profile the page is meant to show (all profiles, minus the
    // spotlighted lab head) renders exactly once, in some section.
    expect(totalProfileHeadings).toBe(gridProfiles.length)
  })
})
