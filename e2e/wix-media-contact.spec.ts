import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 900 } })

// The fixture's first media item ("Creatine for the brain", Channel 7) has no
// video and no url -- Wix's source mp4 is 403-blocked, so it was imported as
// a plain text row (Ruling R14). MediaRow still supports a video item; that
// branch is exercised once a real video exists in the dataset.
test('media', async ({ page }) => {
  await page.goto('/media')
  await expect(page.locator('[data-wix="media"]')).toHaveCount(3)
  await expect(page.locator('video')).toHaveCount(0)

  const channel7 = page.locator('[data-wix="media"]').first()
  await expect(channel7).toContainText('Creatine for the brain')
  await expect(channel7).toContainText('Channel 7')
  await expect(channel7.locator('a')).toHaveCount(0)

  const abc = page.getByRole('link', { name: /Slip-ups like Joe Biden/ })
  await expect(abc).toHaveAttribute('href', /abc\.net\.au/)
  await expect(page.getByText('14 Jul 2024')).toBeVisible()

  const smh = page.getByRole('link', { name: /pandemic stress/ })
  await expect(smh).toHaveAttribute('href', /smh\.com\.au/)
  await expect(page.getByText('22 Aug 2021')).toBeVisible()
})

test('contact', async ({ page }) => {
  await page.goto('/contact')
  await expect(page.getByText('If you wish to support our research efforts')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'CONTACT US' })).toBeVisible()
  await expect(page.locator('a[href^="tel:"]')).toHaveAttribute('href', /^tel:\+61/)
})
