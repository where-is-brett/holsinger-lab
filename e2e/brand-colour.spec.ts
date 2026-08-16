import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { buildBrandStyle, deriveTheme } from 'lib/theme'

const BRAND = '#ff7a00'

/**
 * A custom property read back with `getPropertyValue` returns the value as
 * authored -- the literal `#rrggbb` this codebase injected -- so the expected
 * value can be compared directly against what `deriveTheme` computed. No rgb()
 * parsing is involved, and the assertion is an equality rather than a
 * "something changed", so it fails loudly if the cascade picks a third value
 * neither block authored.
 */
const readToken = (name: string) =>
  `getComputedStyle(document.documentElement).getPropertyValue(${JSON.stringify(name)}).trim()`

/**
 * React 19 renders the layout's own brand `<style>` as the first child of
 * `<body>`, after everything `page.addStyleTag` puts in `<head>`. Both blocks
 * share the same (0,3,0) `:root:root:root` specificity, so document order is
 * the tiebreaker. That's fine in production -- the layout's block is the only
 * one there -- but it means these tests only prove their cascade claim when
 * nothing from the live/shared dataset has already injected a competing
 * production block. Strip any such block, and reset `data-theme` to the
 * no-attribute baseline, so every test starts clean regardless of what
 * `brandColor`/`theme` happen to be set to right now.
 */
const resetInjectedBrandState = (page: Page) =>
  page.evaluate(() => {
    document.querySelectorAll('style').forEach((style) => {
      if (style.textContent?.includes(':root:root:root')) {
        style.remove()
      }
    })
    document.documentElement.removeAttribute('data-theme')
  })

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`injected brand colour, ${scheme} scheme`, () => {
    test.use({ colorScheme: scheme })

    test('outranks the base :root', async ({ page }) => {
      await page.goto('/')
      await resetInjectedBrandState(page)
      const before = await page.evaluate(readToken('--sem-accent'))
      expect(before).not.toBe('')

      await page.addStyleTag({ content: buildBrandStyle(BRAND, 'default')! })

      const expected = deriveTheme(BRAND, 'default')![scheme].accent
      expect(await page.evaluate(readToken('--sem-accent'))).toBe(expected)
      expect(expected).not.toBe(before)
    })

    test('outranks a preset block, which is the specificity this design depends on', async ({
      page,
    }) => {
      await page.goto('/')
      await resetInjectedBrandState(page)
      // Apply the preset the way the layout would.
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'warm'))
      const presetSurface = await page.evaluate(readToken('--sem-surface'))
      expect(presetSurface).not.toBe('')

      await page.addStyleTag({ content: buildBrandStyle(BRAND, 'warm')! })

      // The injected chromatic tokens won outright...
      const derived = deriveTheme(BRAND, 'warm')![scheme]
      expect(await page.evaluate(readToken('--sem-accent'))).toBe(derived.accent)
      expect(await page.evaluate(readToken('--sem-link'))).toBe(derived.link)
      // ...and the preset's neutrals are untouched by it.
      expect(await page.evaluate(readToken('--sem-surface'))).toBe(presetSurface)
    })
  })
}

test.describe('warm preset', () => {
  test('changes the page surface when data-theme is set', async ({ page }) => {
    await page.goto('/')
    await resetInjectedBrandState(page)
    const before = await page.evaluate(readToken('--sem-surface'))
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'warm'))
    const after = await page.evaluate(readToken('--sem-surface'))
    expect(after).not.toBe(before)
  })
})
