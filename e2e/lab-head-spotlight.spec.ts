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
