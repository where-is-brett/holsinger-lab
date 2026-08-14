import { expect, test } from '@playwright/test'

test('/people renders without a spotlight when no lab head is set (current live data)', async ({
  page,
}) => {
  const response = await page.goto('/people')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'People', level: 1 })).toBeVisible()
  await expect(page.getByText('Full profile →')).toHaveCount(0)
})

// `settings.labHead` is unset in live data until the spec's §4 Studio
// migration happens -- there is no write token or staging dataset in this
// environment (Global Constraints). Hand-verify the spotlight's portrait,
// bio, grid exclusion, and "Full profile" link once that content lands,
// then replace this skip with a real assertion against the lab head's
// actual name/slug. Mirrors the existing skipped-test precedent in
// e2e/routes.spec.ts.
test.skip('/people spotlights the lab head above the grid once settings.labHead is set', async ({
  page,
}) => {
  await page.goto('/people')
})

test('an unknown person slug 404s', async ({ page }) => {
  const response = await page.goto('/people/not-a-real-person')
  expect(response?.status()).toBe(404)
})

// No profile with hasPage=true exists in live data yet (same limitation as
// above). Hand-verify a 200 render, its title/description/JSON-LD, and the
// hasPage=false / showPeople=false 404 paths once one does.
test.skip('a person page renders for a profile with hasPage enabled', async ({
  page,
}) => {
  await page.goto('/people/damian-holsinger')
})
