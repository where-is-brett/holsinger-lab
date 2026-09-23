import { expect, test } from '@playwright/test'

// The old Citation aria-expanded toggle (components/pages/publications/Toggle.tsx)
// is deleted in Task 4 -- PublicationRow's CopyCitation control is its
// replacement on /publications, and needs the same keyboard-operability
// proof: focusable, and triggerable via both Enter and Space.
test.describe('publication copy-citation control', () => {
  test('is keyboard-focusable and operable via Enter', async ({ page, context, browserName }) => {
    // `context.grantPermissions` doesn't support clipboard-write on WebKit
    // (Playwright throws "Unknown permission: clipboard-write") -- measured
    // (see the next test file's comment) that `navigator.clipboard
    // .writeText()` still resolves under WebKit with no permission granted
    // at all, for both a click and a synthetic keyboard Enter/Space, so no
    // grant is needed there for the write itself to succeed.
    if (browserName !== 'webkit') {
      await context.grantPermissions(['clipboard-write'])
    }
    await page.goto('/publications')

    const control = page.getByRole('button', { name: 'Copy citation' }).first()
    await control.focus()
    await expect(control).toBeFocused()
    await expect(control).toHaveText('Copy citation')

    await page.keyboard.press('Enter')
    await expect(control).toHaveText(/Copied/)
  })

  test('is operable via Space as well as Enter', async ({ page, context, browserName }) => {
    if (browserName !== 'webkit') {
      await context.grantPermissions(['clipboard-write'])
    }
    await page.goto('/publications')

    const control = page.getByRole('button', { name: 'Copy citation' }).first()
    await control.focus()
    await page.keyboard.press('Space')
    await expect(control).toHaveText(/Copied/)
  })
})
