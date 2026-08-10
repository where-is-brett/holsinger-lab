import { expect, type Page, test } from '@playwright/test'

// Mirrors e2e/routes.spec.ts's CONTENT_ROUTES — Organization JSON-LD ships
// from the root layout, so it must be present on every one of them, not
// just a subset. Kept as a separate local list per this codebase's
// established e2e convention of not sharing route arrays across spec files.
const CONTENT_ROUTES = [
  '/',
  '/contact',
  '/people',
  '/publications',
  '/tutorial',
  '/projects/publication-highlights',
]

async function readJsonLdPayloads(page: Page) {
  const raw = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents()
  return raw.map((text) => JSON.parse(text))
}

for (const path of CONTENT_ROUTES) {
  test(`${path} emits valid Organization JSON-LD`, async ({ page }) => {
    await page.goto(path)
    const payloads = await readJsonLdPayloads(page)
    const organization = payloads.find((p) => p['@type'] === 'Organization')

    expect(organization).toBeTruthy()
    expect(organization['@context']).toBe('https://schema.org')
    expect(typeof organization.name).toBe('string')
    expect(organization.name.length).toBeGreaterThan(0)
    expect(organization.url).toMatch(/^https?:\/\//)
    expect(organization.logo).toContain('/logo.svg')
  })
}

test('/people additionally emits a Person ItemList', async ({ page }) => {
  await page.goto('/people')
  const payloads = await readJsonLdPayloads(page)
  const itemList = payloads.find((p) => p['@type'] === 'ItemList')

  expect(itemList).toBeTruthy()
  expect(itemList['@context']).toBe('https://schema.org')
  expect(itemList.itemListElement.length).toBeGreaterThan(0)

  for (const [index, entry] of itemList.itemListElement.entries()) {
    expect(entry['@type']).toBe('ListItem')
    expect(entry.position).toBe(index + 1)
    expect(entry.item['@type']).toBe('Person')
    expect(typeof entry.item.name).toBe('string')
    expect(entry.item.name.length).toBeGreaterThan(0)
  }
})

test('/publications additionally emits a ScholarlyArticle ItemList', async ({
  page,
}) => {
  await page.goto('/publications')
  const payloads = await readJsonLdPayloads(page)
  const itemList = payloads.find((p) => p['@type'] === 'ItemList')

  expect(itemList).toBeTruthy()
  expect(itemList['@context']).toBe('https://schema.org')
  expect(itemList.itemListElement.length).toBeGreaterThan(0)

  for (const [index, entry] of itemList.itemListElement.entries()) {
    expect(entry['@type']).toBe('ListItem')
    expect(entry.position).toBe(index + 1)
    expect(entry.item['@type']).toBe('ScholarlyArticle')
    expect(typeof entry.item.headline).toBe('string')
    expect(entry.item.headline.length).toBeGreaterThan(0)
  }
})
