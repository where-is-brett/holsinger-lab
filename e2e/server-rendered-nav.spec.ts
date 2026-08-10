import { expect, test } from '@playwright/test'

test.describe('navigation renders without client-side JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('desktop viewport shows the desktop nav links with JS disabled', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    await expect(
      page.getByRole('link', { name: 'Publications' })
    ).toBeVisible()
  })

  test('mobile viewport shows the mobile nav bar with JS disabled', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await expect(page.getByAltText('logo')).toBeVisible()
  })
})
