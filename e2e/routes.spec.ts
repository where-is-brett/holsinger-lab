import { expect, test } from '@playwright/test'

// Chosen because they're real, currently-published content (confirmed via
// `npm run build` during this plan's research on 2026-08-10) — /tutorial and
// /projects/publication-highlights represent the two dynamic route families
// ([slug] and projects/[slug]) alongside the four static content routes.
const CONTENT_ROUTES = [
  '/',
  '/contact',
  '/people',
  '/publications',
  '/tutorial',
  '/projects/publication-highlights',
]

for (const path of CONTENT_ROUTES) {
  test(`${path} loads with a title and visible navigation`, async ({ page }) => {
    const response = await page.goto(path)
    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(/.+/)
    await expect(
      page.getByRole('link', { name: 'Publications' })
    ).toBeVisible()
  })
}
