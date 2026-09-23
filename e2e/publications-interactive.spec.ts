import { expect, test } from '@playwright/test'

import { grantClipboardOrSkipWebkit, lastClipboardWrite, spyOnClipboardWrite } from './support/clipboard'
import { e2eClient } from './support/sanity'

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

  test('selecting a Year filters the rows, and clearing it restores the full list', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/publications')
    const main = page.locator('main')
    const rows = main.locator('[data-testid="pub-row"]')
    const fullCount = await rows.count()

    const year = page.getByTestId('filter-row').getByLabel('Year')
    const value = await year.locator('option').nth(1).getAttribute('value')
    await year.selectOption(value!)

    await expect(page.getByText(/ of \d+ publications shown$/)).toBeVisible()
    const visibleCount = await rows.count()
    expect(visibleCount).toBeGreaterThan(0)
    expect(visibleCount).toBeLessThanOrEqual(fullCount)
    const years = await rows.evaluateAll((els) => els.map((el) => el.getAttribute('data-year')))
    for (const y of years) {
      expect(y).toBe(value)
    }

    await year.selectOption('')
    await expect(page.getByText(/^\d+ publications?(, |$)/)).toBeVisible()
    await expect(rows).toHaveCount(fullCount)
  })

  test('the Type select, when present, filters likewise', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/publications')
    const typeSelect = page.getByTestId('filter-row').getByLabel('Type')
    const hasTypeGroup = (await typeSelect.count()) > 0
    test.skip(
      !hasTypeGroup,
      "the page renders no Type select because the Phase 3B type backfill hasn't run against this dataset"
    )

    const main = page.locator('main')
    const rows = main.locator('[data-testid="pub-row"]')
    const fullCount = await rows.count()

    const value = await typeSelect.locator('option').nth(1).getAttribute('value')
    await typeSelect.selectOption(value!)
    await expect(page.getByText(/ of \d+ publications shown$/)).toBeVisible()
    const types = await rows.evaluateAll((els) => els.map((el) => el.getAttribute('data-type')))
    for (const t of types) {
      expect(t).toBe(value)
    }

    await typeSelect.selectOption('')
    await expect(rows).toHaveCount(fullCount)
  })

  test('an impossible year+type combination shows the empty state, and Clear filters restores the list', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/publications')
    const row = page.getByTestId('filter-row')
    const typeSelect = row.getByLabel('Type')
    const hasTypeGroup = (await typeSelect.count()) > 0
    test.skip(
      !hasTypeGroup,
      "no Type select is rendered (type backfill hasn't run), so no year+type combination can be exercised"
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

    await row.getByLabel('Year').selectOption(combo!.year)
    await typeSelect.selectOption(combo!.type)

    await expect(page.getByText('No records match these filters.')).toBeVisible()
    const clearButton = page.getByRole('button', { name: 'Clear filters' })
    await clearButton.click()
    await expect(rows).toHaveCount(fullCount)
  })

  test('the first paper is visible without scrolling at 375x812', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/publications')
    const title = page.locator('[data-testid="pub-row"]').first().getByTestId('pub-title')
    const box = await title.boundingBox()
    expect(box).not.toBeNull()
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    expect(box!.y + box!.height).toBeLessThanOrEqual(812)
  })

  test('filter state is shared between the desktop row and the mobile sheet', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/publications')
    const year = page.getByTestId('filter-row').getByLabel('Year')
    const value = await year.locator('option').nth(1).getAttribute('value')
    await year.selectOption(value!)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.getByRole('button', { name: 'Filter (1)' }).click()
    await expect(page.getByRole('dialog', { name: 'Filter publications' }).getByLabel('Year')).toHaveValue(value!)
  })

  test('the filters sit at the top of the Record section, under its full-width rule', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/publications')
    const section = page.locator('section', { has: page.getByTestId('filter-bar') })
    await expect(section.getByTestId('section-label')).toHaveText('Record')
    const [sectionBox, rowBox, labelBox] = await Promise.all([
      section.boundingBox(),
      page.getByTestId('filter-row').boundingBox(),
      section.getByTestId('section-label').boundingBox(),
    ])
    // The label lines up with the filter row, not floating above it.
    expect(Math.abs(labelBox!.y - rowBox!.y)).toBeLessThanOrEqual(4)
    // The top rule belongs to the section, which spans the page width.
    expect(await section.evaluate((el) => getComputedStyle(el).borderTopWidth)).not.toBe('0px')
    expect(sectionBox!.width).toBeGreaterThanOrEqual(1440 - 20)
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

    // Chromium also supports reading the clipboard back directly (WebKit
    // does not -- see e2e/support/clipboard.ts's comment) -- a stronger
    // check than the spy alone where it's available, since it confirms the
    // OS clipboard itself holds the string.
    if (browserName !== 'webkit') {
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
      expect(clipboardText).toContain(title)
    }
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
  // this checks each row's cells directly.
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
