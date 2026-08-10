import { expect, test } from '@playwright/test'

test.describe('publication Citation toggle', () => {
  test('is keyboard-focusable, operable via Enter, and exposes aria-expanded', async ({
    page,
  }) => {
    await page.goto('/publications')

    const toggle = page.getByRole('button', { name: 'Citation' }).first()
    await toggle.focus()
    await expect(toggle).toBeFocused()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await page.keyboard.press('Enter')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await page.keyboard.press('Enter')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  test('is operable via Space as well as Enter', async ({ page }) => {
    await page.goto('/publications')

    const toggle = page.getByRole('button', { name: 'Citation' }).first()
    await toggle.focus()
    await page.keyboard.press('Space')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })
})
