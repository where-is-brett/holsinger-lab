import { expect, test } from '@playwright/test'
import { siteUrl } from 'lib/site'

test('manifest.webmanifest is served with CMS-resolved content', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest')
  expect(response.ok()).toBe(true)
  const manifest = await response.json()

  expect(typeof manifest.name).toBe('string')
  expect(manifest.name.length).toBeGreaterThan(0)
  expect(typeof manifest.short_name).toBe('string')
  expect(manifest.display).toBe('standalone')
  expect(manifest.icons.length).toBeGreaterThan(0)
  for (const icon of manifest.icons) {
    expect(icon.src).toMatch(/^(https:\/\/cdn\.sanity\.io\/|\/favicon\/)/)
  }
  expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i)
})

test('robots.txt is served with the real siteUrl, not a hardcoded deployment URL', async ({
  request,
}) => {
  const response = await request.get('/robots.txt')
  expect(response.ok()).toBe(true)
  const body = await response.text()

  expect(body).toContain('Allow: /')
  expect(body).toContain(`Sitemap: ${siteUrl}/sitemap.xml`)
})

test.describe('theme-color viewport meta', () => {
  test('emits distinct light and dark scheme entries', async ({ page }) => {
    await page.goto('/')
    const light = page.locator(
      'meta[name="theme-color"][media="(prefers-color-scheme: light)"]'
    )
    const dark = page.locator('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]')

    await expect(light).toHaveAttribute('content', /^#[0-9a-f]{6}$/i)
    await expect(dark).toHaveAttribute('content', /^#[0-9a-f]{6}$/i)

    const lightContent = await light.getAttribute('content')
    const darkContent = await dark.getAttribute('content')
    expect(lightContent).not.toBe(darkContent)
  })
})
