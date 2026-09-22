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

test('preview deploy is not indexable', async ({ page, request }) => {
  await page.goto('/')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /')
})

test('redesign routes are gone', async ({ request }) => {
  for (const path of ['/people', '/preview/components']) {
    expect((await request.get(path)).status()).toBe(404)
  }
})
