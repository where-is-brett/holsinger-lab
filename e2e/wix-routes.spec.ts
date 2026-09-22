import { expect, test } from '@playwright/test'

const ROUTES = ['/', '/research', '/news', '/publications', '/team', '/media', '/contact']

for (const path of ROUTES) {
  test(`${path} renders`, async ({ page }) => {
    const res = await page.goto(path)
    expect(res?.status()).toBe(200)
    await expect(page.locator('main#main')).toBeVisible()
  })
}

test('old Wix paths redirect permanently', async ({ request }) => {
  for (const [from, to] of [['/blank-5', '/team'], ['/blank-4', '/contact']]) {
    const res = await request.get(from, { maxRedirects: 0 })
    expect(res.status()).toBe(308)
    expect(res.headers()['location']).toBe(to)
  }
})

test('legacy (pre-Wix redesign) paths redirect permanently (M5)', async ({ request }) => {
  for (const [from, to] of [
    ['/people', '/team'],
    ['/people/damian-holsinger', '/team'],
    ['/projects/some-project', '/research'],
  ]) {
    const res = await request.get(from, { maxRedirects: 0 })
    expect(res.status()).toBe(308)
    expect(res.headers()['location']).toBe(to)
  }
})

test('preview deploy is not indexable', async ({ page, request }) => {
  await page.goto('/')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /')
})

test('unknown routes 404 inside the site chrome (M5)', async ({ page, request }) => {
  // /preview/components: the old redesign's preview harness, removed on this
  // branch, but not a legacy path worth a redirect.
  const res = await request.get('/preview/components')
  expect(res.status()).toBe(404)

  await page.goto('/preview/components')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  // The 404 renders inside app/(site)/layout.tsx, not the bare root
  // not-found -- header and footer still show.
  await expect(page.locator('header')).toBeVisible()
  await expect(page.locator('footer')).toBeVisible()
})
