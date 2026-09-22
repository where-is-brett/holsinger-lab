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
  test('a DOI paper renders title, abstract, canonical link and citation', async ({ page }) => {
    await page.goto('/publications')
    const doiRow = page.locator('[data-testid="pub-row"][data-link-kind="DOI"]').first()
    const hasDoiRow = (await doiRow.count()) > 0
    test.skip(!hasDoiRow, 'no DOI publication in this dataset')

    const rowTitle = (await doiRow.getByTestId('pub-title').textContent())!.trim()
    const identifierHref = await doiRow.locator('[data-identifier]').first().getAttribute('href')
    const href = await doiRow.getByTestId('pub-title').getAttribute('href')
    expect(href).toBeTruthy()

    await page.goto(href!)

    await expect(page.locator('h1')).toHaveText(rowTitle)

    const abstractRail = page.getByText('Abstract', { exact: true })
    if (await hasAbstract(slugFromHref(href!))) {
      await expect(abstractRail).toBeVisible()
    } else {
      await expect(abstractRail).toHaveCount(0)
    }

    const canonicalLink = page.locator('a[data-identifier][href]').first()
    await expect(canonicalLink).toHaveAttribute('href', identifierHref!)
    await expect(canonicalLink).toHaveText(identifierHref!)

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

    const citationText = (await page.getByTestId('pub-cite-text').textContent())!.trim()

    const copyButton = page.getByRole('button', { name: 'COPY CITATION' })
    await copyButton.click()
    await expect(copyButton).toHaveText(/COPIED/)

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboardText).toBe(citationText)
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

  // Fix round 1: every live paper, not just one, because the defect this
  // guards against (a single long, unbreakable token -- a long topic title,
  // or the bare DOI/URL baked into the citation string -- blowing out the
  // page at a narrow width) is content-dependent, and the only way to catch
  // it for "any valid CMS content" (constraints.md) is to check every real
  // record rather than pick one.
  test('no publication detail page overflows horizontally at 375px', async ({ page }) => {
    const slugs = await e2eClient.fetch<string[]>(
      `*[_type == "publication" && defined(slug.current)].slug.current`
    )
    test.skip(slugs.length === 0, 'no publication has a slug in this dataset')

    await page.setViewportSize({ width: 375, height: 800 })
    for (const slug of slugs) {
      await page.goto(`/publications/${slug}`)
      const fits = await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
      )
      expect(fits, `/publications/${slug} overflows at 375px`).toBe(true)
    }
  })
})
