import { expect, test } from '@playwright/test'

import { e2eClient } from './support/sanity'

test.describe('publications search and filter', () => {
  test('search narrows the list to matching publications', async ({ page }) => {
    await page.goto('/publications')
    const initialCount = await page.locator('h2.font-ariana').count()
    expect(initialCount).toBeGreaterThan(0)

    await page.getByLabel('Search publications').fill('amyloid')
    await expect(async () => {
      const filteredCount = await page.locator('h2.font-ariana').count()
      expect(filteredCount).toBeGreaterThan(0)
      expect(filteredCount).toBeLessThan(initialCount)
    }).toPass()
  })

  test('a query matching nothing shows the empty-state message', async ({ page }) => {
    await page.goto('/publications')
    await page.getByLabel('Search publications').fill('zzzzznomatch')
    await expect(page.getByText('No publications match your search.')).toBeVisible()
  })

  test('the year filter narrows the list to one year', async ({ page }) => {
    await page.goto('/publications')
    // Exact match: the page also has a `<nav aria-label="Jump to year">`
    // landmark, and Playwright's default getByLabel matching is a
    // case-insensitive substring match, so a plain getByLabel('Year') is a
    // strict-mode violation (it resolves both the <select>'s "Year" label
    // and the nav's "Jump to year" aria-label, since "year" ⊂ "Jump to
    // year"). Exact matching disambiguates to just the <select>.
    const select = page.getByLabel('Year', { exact: true })
    const options = await select.locator('option').allTextContents()
    const aYear = options.find((o) => o !== 'All years')
    expect(aYear).toBeTruthy()

    await select.selectOption({ label: aYear as string })
    await expect(page.getByRole('heading', { level: 2, name: aYear as string })).toBeVisible()
  })

  test('a jump-nav link points at the matching year section id', async ({ page }) => {
    await page.goto('/publications')
    const jumpNav = page.getByRole('navigation', { name: 'Jump to year' })
    const firstLink = jumpNav.getByRole('link').first()
    const href = await firstLink.getAttribute('href')
    expect(href).toMatch(/^#year-/)
    const targetId = (href as string).slice(1)
    await expect(page.locator(`#${targetId}`)).toBeAttached()
  })
})

test.describe('citation copy', () => {
  test('Copy APA shows a confirmation after click', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-write'])
    await page.goto('/publications')
    await page.getByRole('button', { name: 'Citation' }).first().click()
    const copyButton = page.getByRole('button', { name: 'Copy APA' }).first()
    await copyButton.click()
    await expect(copyButton).toHaveText('Copied!')
  })
})

test.describe('DOI links degrade gracefully', () => {
  test('every publication with a doi renders its DOI link, and every publication without one renders none', async ({
    page,
  }) => {
    // Derived from the live dataset rather than a hardcoded split (see
    // components/pages/publications/Publication.tsx: `{doi && <a
    // href={\`https://doi.org/${doi}\`}>DOI: {doi}</a>}`), so this keeps
    // holding as an upcoming import adds DOIs and papers.
    const publications = await e2eClient.fetch<{ _id: string; doi: string | null }[]>(
      `*[_type == "publication"]{ _id, doi }`
    )
    const withDoi = publications.filter(
      (publication) => typeof publication.doi === 'string' && publication.doi.length > 0
    )

    await page.goto('/publications')

    await expect(page.getByText(/^DOI: /)).toHaveCount(withDoi.length)
    for (const publication of withDoi) {
      await expect(
        page.locator(`a[href="https://doi.org/${publication.doi}"]`, {
          hasText: `DOI: ${publication.doi}`,
        })
      ).toHaveCount(1)
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
