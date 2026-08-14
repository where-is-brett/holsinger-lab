import { expect, test } from '@playwright/test'

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
  test('shows a DOI link for exactly the 10 publications with a recoverable DOI, none for the other 9', async ({
    page,
  }) => {
    // Backfilled 2026-08-12 via `scripts/backfill-publication-dois.ts --commit`
    // (see docs/superpowers/plans/2026-08-11-phase-3b-studio-doi-rolegroup.md's
    // dry-run output for the 10 recoverable DOIs). The other 9 publications'
    // `url` values don't encode a machine-recoverable DOI and stay unset --
    // this asserts that split, not just "some exist."
    await page.goto('/publications')
    await expect(page.getByText(/^DOI: /)).toHaveCount(10)
  })
})

test.describe('People role grouping', () => {
  test('renders every profile under an unheaded section, against the current unset-roleGroup dataset', async ({
    page,
  }) => {
    await page.goto('/people')
    // `groupByRoleGroup` suppresses the "Other" heading when it's the only
    // section (spec: docs/superpowers/specs/2026-08-12-lab-head-and-person-pages-design.md
    // D8) -- with 0 roleGroup documents in production, that's every profile
    // today, so no section heading renders at all.
    await expect(
      page.getByRole('heading', { level: 2, name: 'Other' })
    ).toHaveCount(0)
    // Scoped to direct children of <section>: Profile.tsx also renders each
    // profile's name in an <h2> (nested several levels inside the section),
    // so an unscoped `getByRole('heading', { level: 2 })` count conflates
    // role-group section titles with profile-name headings. A role-group
    // section title would be a direct `section > h2` child; there is none now.
    const sectionHeadings = await page.locator('section > h2').count()
    expect(sectionHeadings).toBe(0)
  })
})
