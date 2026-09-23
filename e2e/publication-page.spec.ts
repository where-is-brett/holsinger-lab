import { expect, test } from '@playwright/test'

import { grantClipboardOrSkipWebkit, lastClipboardWrite, spyOnClipboardWrite } from './support/clipboard'
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

    const readPaper = page.getByRole('link', { name: /^Read paper/ })
    await expect(readPaper).toHaveAttribute('href', identifierHref!)
    await expect(readPaper).toHaveAttribute('target', '_blank')
    await expect(readPaper).toHaveAttribute('rel', 'noopener noreferrer')

    const doi = page.getByTestId('paper-doi')
    await expect(doi).toBeVisible()
    expect(identifierHref).toContain((await doi.locator('[data-identifier]').textContent())!.trim())
    expect(await doi.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/Plex Mono/i)

    // No stacked sub-labels above the citation box -- the section label
    // ("Citation") is the only label; the old "Canonical link" / "Formatted
    // citation" micro-labels are gone.
    await expect(page.getByText('Canonical link', { exact: false })).toHaveCount(0)
    await expect(page.getByText('Formatted citation', { exact: true })).toHaveCount(0)

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

    const readPaper = page.getByRole('link', { name: /^Read paper/ })
    await expect(readPaper).toHaveAttribute('href', identifierHref!)
    await expect(readPaper).toHaveAttribute('target', '_blank')
    await expect(readPaper).toHaveAttribute('rel', 'noopener noreferrer')
    await expect(page.getByTestId('paper-doi')).toHaveCount(0)

    const citationBox = page.locator('[data-identifier]', { hasText: rowTitle })
    await expect(citationBox).toContainText(rowTitle)
  })

  test('the abstract is Archivo at 17px / 1.6', async ({ page }) => {
    await page.goto('/publications')
    const rows = page.locator('[data-testid="pub-row"]')
    const count = await rows.count()
    let href: string | null = null
    for (let i = 0; i < count; i++) {
      const rowHref = await rows.nth(i).getByTestId('pub-title').getAttribute('href')
      if (rowHref && (await hasAbstract(slugFromHref(rowHref)))) {
        href = rowHref
        break
      }
    }
    test.skip(!href, 'no publication with an abstract in this dataset')

    await page.goto(href!)
    const p = page.getByTestId('paper-abstract').first()
    const s = await p.evaluate((el) => {
      const c = getComputedStyle(el)
      return { family: c.fontFamily, size: c.fontSize, lh: c.lineHeight }
    })
    expect(s.family).toMatch(/Archivo/i)
    expect(s.size).toBe('17px')
    expect(parseFloat(s.lh)).toBeCloseTo(27.2, 0)
  })

  test('copying the citation shows the copied state and puts the citation on the clipboard', async ({
    page,
    context,
    browserName,
  }) => {
    // WebKit has no Permissions API entry for clipboard-read, so
    // `navigator.clipboard.readText()` always rejects there regardless of
    // any grant (and `grantClipboardOrSkipWebkit` grants nothing on
    // webkit in the first place -- see its own comment). A `writeText` spy
    // still proves the clipboard claim on every engine: it wraps the real
    // implementation (so the write itself still happens, including on
    // WebKit, which succeeds without a grant) while recording the
    // argument, which this test can read back without ever calling
    // `readText()`.
    await spyOnClipboardWrite(page)
    await grantClipboardOrSkipWebkit(context, browserName)
    await page.goto('/publications')
    const firstRow = page.locator('[data-testid="pub-row"]').first()
    const href = await firstRow.getByTestId('pub-title').getAttribute('href')
    expect(href).toBeTruthy()

    await page.goto(href!)

    const citationText = (await page.getByTestId('pub-cite-text').textContent())!.trim()

    const copyButton = page.getByRole('button', { name: 'Copy citation' })
    await copyButton.click()
    await expect(copyButton).toHaveText(/Copied/)

    expect(await lastClipboardWrite(page)).toBe(citationText)

    // Chromium also supports reading the clipboard back directly (WebKit
    // does not -- no Permissions API entry for clipboard-read at all,
    // which is why the spy above is this test's only proof on that
    // engine). Where it's available, it's a stronger check than the spy
    // alone: it confirms the OS clipboard itself holds the string, not
    // just that `writeText` was called with it.
    if (browserName !== 'webkit') {
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
      expect(clipboardText).toBe(citationText)
    }
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
  test('no publication detail page overflows horizontally at 320/375px', async ({ page }) => {
    const slugs = await e2eClient.fetch<string[]>(
      `*[_type == "publication" && defined(slug.current)].slug.current`
    )
    test.skip(slugs.length === 0, 'no publication has a slug in this dataset')

    // 320px added alongside 375px (fix round 3), matching the /publications
    // width loop -- the narrowest viewport this site claims to support.
    for (const width of [320, 375]) {
      await page.setViewportSize({ width, height: 800 })
      for (const slug of slugs) {
        await page.goto(`/publications/${slug}`)
        const fits = await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
        )
        expect(fits, `/publications/${slug} overflows at ${width}px`).toBe(true)
      }
    }
  })
})
