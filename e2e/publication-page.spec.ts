import { expect, test } from '@playwright/test'

import { e2eClient } from './support/sanity'

// Each assertion here is derived from the page's own data (a row's own
// href/title/identifier, a fetched Sanity fact, or a fetched JSON-LD blob),
// never a hardcoded dataset fact -- so this holds for any valid CMS
// content, not just today's 19 records (constraints.md).

async function hasAbstract(slug: string): Promise<boolean> {
  const abstract = await e2eClient.fetch<string | null>(
    `*[_type == "publication" && slug.current == $slug][0].abstract`,
    { slug }
  )
  return Boolean(abstract && abstract.trim().length > 0)
}

function slugFromHref(href: string): string {
  return href.replace(/^\/publications\//, '')
}

test.describe('/publications/[slug]', () => {
  test('the first row navigates to a paper that renders title, abstract, canonical link and citation', async ({
    page,
  }) => {
    await page.goto('/publications')
    const firstRow = page.locator('[data-testid="pub-row"]').first()
    const rowTitle = (await firstRow.getByTestId('pub-title').textContent())!.trim()
    const identifierLink = firstRow.locator('[data-identifier]').first()
    const identifierHref = await identifierLink.getAttribute('href')
    const href = await firstRow.getByTestId('pub-title').getAttribute('href')
    expect(href).toBeTruthy()

    await page.goto(href!)

    await expect(page.locator('h1')).toHaveText(rowTitle)

    const abstractRail = page.getByText('Abstract', { exact: true })
    if (await hasAbstract(slugFromHref(href!))) {
      await expect(abstractRail).toBeVisible()
    } else {
      await expect(abstractRail).toHaveCount(0)
    }

    if (identifierHref) {
      const canonicalLink = page.locator('a[data-identifier][href]').first()
      await expect(canonicalLink).toHaveAttribute('href', identifierHref)
      await expect(canonicalLink).toHaveText(identifierHref)
    }

    const citationBox = page.locator('[data-identifier]', { hasText: rowTitle })
    await expect(citationBox).toContainText(rowTitle)
  })

  test('a URL-fallback paper renders the same, with its own identifier', async ({ page }) => {
    await page.goto('/publications')
    const urlRow = page.locator('[data-testid="pub-row"][data-link-kind="URL"]').first()
    const hasUrlRow = (await urlRow.count()) > 0
    test.skip(!hasUrlRow, 'no URL-fallback publication in this dataset')

    const rowTitle = (await urlRow.getByTestId('pub-title').textContent())!.trim()
    const identifierHref = await urlRow.locator('[data-identifier]').first().getAttribute('href')
    const href = await urlRow.getByTestId('pub-title').getAttribute('href')
    expect(href).toBeTruthy()

    await page.goto(href!)

    await expect(page.locator('h1')).toHaveText(rowTitle)

    const canonicalLink = page.locator('a[data-identifier][href]').first()
    await expect(canonicalLink).toHaveAttribute('href', identifierHref!)
    await expect(canonicalLink).toHaveText(identifierHref!)

    const citationBox = page.locator('[data-identifier]', { hasText: rowTitle })
    await expect(citationBox).toContainText(rowTitle)
  })

  test('copying the citation shows the copied state and puts the citation on the clipboard', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/publications')
    const firstRow = page.locator('[data-testid="pub-row"]').first()
    const href = await firstRow.getByTestId('pub-title').getAttribute('href')
    expect(href).toBeTruthy()

    await page.goto(href!)

    const copyButton = page.getByRole('button', { name: 'COPY CITATION' })
    await copyButton.click()
    await expect(copyButton).toHaveText(/COPIED/)

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboardText.length).toBeGreaterThan(0)
  })

  test('an unknown slug 404s', async ({ page }) => {
    const response = await page.goto('/publications/definitely-not-a-real-slug')
    expect(response?.status()).toBe(404)
  })

  test('the ScholarlyArticle JSON-LD is valid and its headline matches the h1', async ({
    page,
  }) => {
    await page.goto('/publications')
    const href = await page
      .locator('[data-testid="pub-row"]')
      .first()
      .getByTestId('pub-title')
      .getAttribute('href')
    expect(href).toBeTruthy()

    await page.goto(href!)

    const h1Text = (await page.locator('h1').textContent())!.trim()
    // The layout also emits an Organization JSON-LD blob, so every
    // `application/ld+json` script has to be parsed and filtered by
    // `@type` rather than assuming the ScholarlyArticle one is first.
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents()
    const scholarlyArticle = scripts
      .map((text) => JSON.parse(text))
      .find((data) => data['@type'] === 'ScholarlyArticle')
    expect(scholarlyArticle).toBeTruthy()

    expect(scholarlyArticle['@context']).toBe('https://schema.org')
    expect(scholarlyArticle.headline).toBe(h1Text)
  })
})
