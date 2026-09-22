import { expect, test } from '@playwright/test'
import { permanentRedirects } from 'lib/redirects.mjs'
import { siteUrl } from 'lib/site'

for (const { source, destination } of permanentRedirects) {
  test(`${source} permanently redirects to ${destination}`, async ({
    request,
  }) => {
    const response = await request.get(source, { maxRedirects: 0 })
    expect(response.status()).toBe(308)
    expect(response.headers()['location']).toBe(destination)
  })

  test(`${source} lands on a working ${destination}`, async ({ page }) => {
    const response = await page.goto(source)
    expect(response?.status()).toBe(200)
    expect(new URL(page.url()).pathname).toBe(destination)
  })

  test(`sitemap.xml lists ${destination} but not ${source}`, async ({
    request,
  }) => {
    const body = await (await request.get('/sitemap.xml')).text()
    expect(body).toContain(`<loc>${siteUrl}${destination}</loc>`)
    expect(body).not.toContain(`<loc>${siteUrl}${source}</loc>`)
  })
}
