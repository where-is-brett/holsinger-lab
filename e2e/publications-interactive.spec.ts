import { expect, test } from '@playwright/test'

import { grantClipboardOrSkipWebkit, lastClipboardWrite, spyOnClipboardWrite } from './support/clipboard'
import { e2eClient } from './support/sanity'

// Located via `data-testid="facet-band"` (FacetBand.tsx). Facet-group label
// lookups are scoped inside it, not the whole page: the column-head row
// (`hidden xl:grid`) also renders a plain "Year" span, and an unscoped
// `getByText('Year', { exact: true })` would match both.
function facetBand(page: import('@playwright/test').Page) {
  return page.getByTestId('facet-band')
}

test.describe('publications index', () => {
  test('one row per record, and the meta reflects the row count', async ({ page }) => {
    await page.goto('/publications')
    const main = page.locator('main')
    const rows = main.locator('[data-testid="pub-row"]')
    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThan(0)

    const meta = page.getByText(/^\d+ publications?(, |$)/)
    await expect(meta).toBeVisible()
    const metaText = (await meta.textContent())!
    const n = Number(metaText.match(/^(\d+)/)![1])
    expect(n).toBe(rowCount)
  })

  test('clicking a Year chip filters the rows, and clicking it again restores the full list', async ({
    page,
  }) => {
    await page.goto('/publications')
    const main = page.locator('main')
    const rows = main.locator('[data-testid="pub-row"]')
    const fullCount = await rows.count()

    const yearLabel = facetBand(page).getByText('Year', { exact: true })
    const chipsContainer = yearLabel.locator('xpath=following-sibling::div[1]')
    const firstChip = chipsContainer.getByRole('button').first()
    const chipText = (await firstChip.textContent())!.trim()
    const chipYear = chipText.match(/^\d+/)![0]

    await firstChip.click()

    await expect(page.getByText(/ of \d+ publications shown$/)).toBeVisible()
    const visibleCount = await rows.count()
    expect(visibleCount).toBeGreaterThan(0)
    expect(visibleCount).toBeLessThanOrEqual(fullCount)
    const years = await rows.evaluateAll((els) => els.map((el) => el.getAttribute('data-year')))
    for (const year of years) {
      expect(year).toBe(chipYear)
    }

    await firstChip.click()
    await expect(page.getByText(/^\d+ publications?(, |$)/)).toBeVisible()
    await expect(rows).toHaveCount(fullCount)
  })

  test('the Type group, when present, filters likewise', async ({ page }) => {
    await page.goto('/publications')
    const typeLabel = page.getByText('Type', { exact: true })
    const hasTypeGroup = (await typeLabel.count()) > 0
    test.skip(
      !hasTypeGroup,
      "the page renders no Type group because the Phase 3B type backfill hasn't run against this dataset"
    )

    const main = page.locator('main')
    const rows = main.locator('[data-testid="pub-row"]')
    const fullCount = await rows.count()

    const chipsContainer = typeLabel.locator('xpath=following-sibling::div[1]')
    const firstChip = chipsContainer.getByRole('button').first()
    const chipText = (await firstChip.textContent())!.trim()
    const chipType = chipText.replace(/\s*\d+$/, '')

    await firstChip.click()
    await expect(page.getByText(/ of \d+ publications shown$/)).toBeVisible()
    const types = await rows.evaluateAll((els) => els.map((el) => el.getAttribute('data-type')))
    for (const type of types) {
      expect(type).toBe(chipType)
    }

    await firstChip.click()
    await expect(rows).toHaveCount(fullCount)
  })

  test('an impossible year+type combination shows the empty state, and Clear filters restores the list', async ({
    page,
  }) => {
    await page.goto('/publications')
    const typeLabel = page.getByText('Type', { exact: true })
    const hasTypeGroup = (await typeLabel.count()) > 0
    test.skip(
      !hasTypeGroup,
      "no Type group is rendered (type backfill hasn't run), so no year+type combination can be exercised"
    )

    const main = page.locator('main')
    const rows = main.locator('[data-testid="pub-row"]')
    const fullCount = await rows.count()
    const pairs = await rows.evaluateAll((els) =>
      els.map((el) => ({ year: el.getAttribute('data-year'), type: el.getAttribute('data-type') }))
    )
    const years = [...new Set(pairs.map((p) => p.year))]
    const types = [...new Set(pairs.map((p) => p.type).filter(Boolean))]

    let combo: { year: string; type: string } | null = null
    outer: for (const year of years) {
      for (const type of types) {
        if (!pairs.some((p) => p.year === year && p.type === type)) {
          combo = { year: year!, type: type! }
          break outer
        }
      }
    }
    test.skip(!combo, 'every year+type combination present in the data is occupied')

    const yearChip = facetBand(page)
      .getByText('Year', { exact: true })
      .locator('xpath=following-sibling::div[1]')
      .getByRole('button', { name: new RegExp(`^${combo!.year}\\b`) })
    const typeChip = typeLabel.locator('xpath=following-sibling::div[1]').getByRole('button', {
      name: new RegExp(`^${combo!.type}\\b`),
    })
    await yearChip.click()
    await typeChip.click()

    await expect(page.getByText('No records match these filters.')).toBeVisible()
    const clearButton = page.getByRole('button', { name: 'Clear filters' })
    await clearButton.click()
    await expect(rows).toHaveCount(fullCount)
  })

  test('the density toggle tightens rows so the title truncates on one line', async ({ page }) => {
    await page.goto('/publications')
    await page.getByRole('button', { name: 'Compact' }).click()

    const firstTitle = page.locator('[data-testid="pub-row"]').first().getByTestId('pub-title')
    await expect
      .poll(async () => {
        const className = (await firstTitle.getAttribute('class')) ?? ''
        const whiteSpace = await firstTitle.evaluate((el) => getComputedStyle(el).whiteSpace)
        return className.includes('truncate') || whiteSpace === 'nowrap'
      })
      .toBe(true)
  })

  test('copying the first row citation shows the copied state and puts the title on the clipboard', async ({
    page,
    context,
    browserName,
  }) => {
    // Spying on `writeText` (rather than reading the clipboard back with
    // `readText()`) proves the clipboard claim on every engine, including
    // WebKit, which has no Permissions API entry for clipboard-read at all
    // -- see e2e/support/clipboard.ts's own comment.
    await spyOnClipboardWrite(page)
    await grantClipboardOrSkipWebkit(context, browserName)
    await page.goto('/publications')

    const firstRow = page.locator('[data-testid="pub-row"]').first()
    const title = (await firstRow.getByTestId('pub-title').textContent())!.trim()
    const copyButton = firstRow.getByRole('button', { name: 'Copy citation' })
    await copyButton.click()
    await expect(copyButton).toHaveText(/Copied/)

    expect(await lastClipboardWrite(page)).toContain(title)
  })

  test("every row is partitioned by link kind, and each kind's identifier matches its data", async ({
    page,
  }) => {
    // DOI and URL are both optional on a publication (publicationModel.ts:
    // `linkKind: 'DOI' | 'URL' | ''`), so a row with neither is valid
    // content, not an omission. This no longer assumes every row has a
    // link -- it partitions rows into the three possible kinds and checks
    // each partition's own invariant, instead of comparing a page-wide href
    // count against a row count that silently assumed DOI + URL == total.
    const records = await e2eClient.fetch<{ slug: string | null; url: string | null }[]>(
      `*[_type == "publication" && defined(slug.current)]{ "slug": slug.current, url }`
    )
    const urlBySlug = new Map(records.map((r) => [r.slug, r.url]))

    await page.goto('/publications')
    const main = page.locator('main')
    const rows = main.locator('[data-testid="pub-row"]')
    const total = await rows.count()
    const doiRows = main.locator('[data-testid="pub-row"][data-link-kind="DOI"]')
    const urlRows = main.locator('[data-testid="pub-row"][data-link-kind="URL"]')
    const noneRows = main.locator('[data-testid="pub-row"][data-link-kind=""]')
    const doiCount = await doiRows.count()
    const urlCount = await urlRows.count()
    const noneCount = await noneRows.count()
    expect(doiCount + urlCount + noneCount).toBe(total)

    const doiHrefs = await doiRows.locator('[data-identifier]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('href'))
    )
    // Carried PR A fix: every DOI row has exactly one identifier link -- not
    // zero (a row silently missing its link) and not more than one (a
    // duplicate). Without this, a row-level omission would pass unnoticed as
    // long as some other DOI row's href still matched the pattern below.
    expect(doiHrefs.length).toBe(doiCount)
    for (const href of doiHrefs) {
      expect(href).toMatch(/^https:\/\/doi\.org\//)
    }

    // A URL identifier's href must equal the row's own recorded URL -- it
    // must not be assumed to *not* start with doi.org, since a paper's URL
    // field can itself point at a doi.org address.
    const urlHrefBySlug = await urlRows.evaluateAll((els) =>
      els.map((el) => {
        const titleHref = el.querySelector('a[href^="/publications/"]')?.getAttribute('href') ?? ''
        const slug = titleHref.replace(/^\/publications\//, '')
        const identifierHref = el.querySelector('[data-identifier]')?.getAttribute('href') ?? null
        return { slug, identifierHref }
      })
    )
    expect(urlHrefBySlug.length).toBe(urlCount)
    for (const { slug, identifierHref } of urlHrefBySlug) {
      expect(identifierHref).toBe(urlBySlug.get(slug))
    }

    // A row with neither DOI nor URL has no identifier link at all.
    const noneIdentifierCount = await noneRows.locator('[data-identifier]').count()
    expect(noneIdentifierCount).toBe(0)
  })

  test('a row title navigates to its detail page', async ({ page }) => {
    await page.goto('/publications')
    const firstRow = page.locator('[data-testid="pub-row"]').first()
    await firstRow.getByTestId('pub-title').click()
    await expect(page).toHaveURL(/\/publications\/[^/]+$/)
  })

  test.describe('no horizontal overflow', () => {
    // Includes real phone widths (320/375/390), not just >=768px, since
    // narrow-viewport overflow is its own failure mode independent of
    // desktop layout.
    for (const width of [320, 375, 390, 768, 1023, 1024, 1280]) {
      test(`at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/publications')
        const fits = await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
        )
        expect(fits).toBe(true)
      })
    }
  })

  // The document-level check above cannot see a title that overflows its
  // own ledger cell without ever growing the page past the viewport, so
  // this checks each row's cells directly. Density defaults to Comfortable
  // on load, which is the shape this check targets; Compact truncates by
  // design, so an ellipsis cell there is not a defect.
  test.describe('publication ledger cells never overflow their own track', () => {
    for (const width of [1024, 1280, 1440]) {
      test(`at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/publications')
        const overflowing = await page.evaluate(() => {
          const rows = document.querySelectorAll('[data-testid="pub-row"]')
          const found: { tag: string; text: string; overflowPx: number }[] = []
          for (const row of rows) {
            for (const el of row.querySelectorAll('*')) {
              // Skip visually-hidden (`sr-only`-pattern) elements: CopyCitation
              // keeps an off-screen, 1px, `white-space: nowrap` span holding
              // the full citation text as a manual-copy selection target
              // (components/redesign/CopyCitation.tsx) -- its `scrollWidth`
              // is deliberately far larger than its `clientWidth` (the whole
              // point is that it never wraps, so Range/selectNodeContents
              // selects the exact citation string), and it is clipped out of
              // the visible page regardless, so it can never contribute to
              // this row's visible overflow. A rect this small only ever
              // matches an intentionally hidden node -- real overflow bugs
              // are on elements that actually render at a visible size.
              const rect = el.getBoundingClientRect()
              if (rect.width <= 1 && rect.height <= 1) continue
              const overflowPx = el.scrollWidth - el.clientWidth
              if (overflowPx > 1) {
                found.push({ tag: el.tagName, text: (el.textContent ?? '').slice(0, 60), overflowPx })
              }
            }
          }
          return found
        })
        expect(overflowing, JSON.stringify(overflowing)).toEqual([])
      })
    }
  })
})

