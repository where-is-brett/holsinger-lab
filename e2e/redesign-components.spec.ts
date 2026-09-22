import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// Everything built in Tasks 4-8 is unrendered outside this route -- this
// repo's Vitest config is node-only (see `**/*.test.ts`, no jsdom), so
// rendering/interaction behaviour is deliberately proven here in Playwright
// against a real production build instead (playwright.config.ts's webServer
// runs `next build && next start`). This is the only proof any of the
// twelve Phase 1 components actually work.

const GALLERY_SECTIONS = [
  'tag',
  'button',
  'copy-citation',
  'page-title',
  'section-rail',
  'publication-row',
  'facet-band',
  'person-card',
  'site-nav',
  'site-nav-long',
  'mobile-header',
  'site-footer',
  'form-field',
  'resource-block',
  'publication-page',
]

test.describe('redesign component gallery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preview/components')
  })

  test('renders every gallery section', async ({ page }) => {
    for (const name of GALLERY_SECTIONS) {
      await expect(page.getByTestId(`gallery-${name}`)).toBeVisible()
    }
  })

  test('identifiers are never rendered upper-cased', async ({ page }) => {
    const ids = page.locator('[data-identifier]')
    const count = await ids.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const el = ids.nth(i)
      const text = (await el.innerText()).replace('…', '')
      const href = await el.getAttribute('href')
      // The rendered label must not have been case-transformed. `href`
      // containment only applies to identifiers that are *links to that
      // identifier* (a DOI/URL anchor, always an absolute `http(s)` URL) --
      // fix round 1 adds two `data-identifier` cases this doesn't cover:
      // the citation box's cite string (plain text, no `href` at all -- per
      // the Task 5 brief, "a bordered box with the cite text
      // (data-identifier, mono)") and ResourceBlock's `MORE` meta entry
      // (per the same brief: `{ label: 'MORE', value: 'Resources', href:
      // '/resources' }` -- a same-site navigational link whose label is a
      // human word, not the href repeated back). Both are legitimately
      // `data-identifier` (verbatim, never-uppercased text) without being
      // "the href must contain the label" identifiers -- distinguished
      // here by `href` starting with `/` (same-site nav) vs `http` (an
      // actual DOI/URL identifier).
      if (href !== null && !href.startsWith('/')) {
        // the href must carry the full identifier even when the label is truncated.
        expect(href).toContain(text.replace(/^https?:\/\//, '').replace(/^www\./, ''))
      }
      expect(await el.evaluate((n) => getComputedStyle(n).textTransform)).not.toBe('uppercase')
    }
  })

  test('copy-citation reports success and reverts', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const button = page.getByRole('button', { name: /copy citation/i }).first()
    await button.click()
    await expect(page.getByText('✓ COPIED')).toBeVisible()
    await expect(page.getByText('✓ COPIED')).toBeHidden({ timeout: 4000 })
  })

  test('facet chips filter and clear, with live counts through countBy/applyFacets', async ({
    page,
  }) => {
    const band = page.getByTestId('gallery-facet-band')
    // Baseline: both SAMPLE_PUBLICATIONS pass with no facet selected.
    await expect(band.getByTestId('facet-result-count')).toHaveText('2')
    const chip = band.getByRole('button', { name: /^2025/ })
    await chip.click()
    await expect(band.getByTestId('facet-result-count')).toHaveText('1')
    await chip.click()
    await expect(band.getByTestId('facet-result-count')).toHaveText('2')
  })

  test('mobile tap targets clear 44px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const targets = page.getByTestId('gallery-mobile-header').getByRole('link')
    const count = await targets.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const box = await targets.nth(i).boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }
  })

  test('mobile header renders both a closed and an open state', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const section = page.getByTestId('gallery-mobile-header')
    await expect(section.getByRole('button', { name: 'Menu', exact: true })).toBeVisible()
    await expect(section.getByRole('button', { name: 'Close', exact: true })).toBeVisible()
    await expect(section.locator('a[aria-current="page"]')).toHaveCount(1)
    await expect(section.locator('a[aria-current="page"]')).toContainText('Publications')
  })

  test('narrow publication-row variant lives inside a container under 720px', async ({
    page,
  }) => {
    // Decision from the task brief: `narrow` exists specifically so the
    // ledger grid doesn't squeeze below 720px -- this asserts the gallery
    // actually exercises that case, not just that the prop was passed.
    const container = page.locator('[data-testid="gallery-publication-row"] .w-\\[700px\\]')
    const box = await container.boundingBox()
    expect(box!.width).toBeLessThan(720)
  })

  test('narrow row is genuinely stacked, not the 4-column ledger grid', async ({ page }) => {
    const narrowRow = page
      .locator('[data-testid="gallery-publication-row"] .w-\\[700px\\]')
      .locator('> div')
      .first()
    await expect(narrowRow).toHaveCSS('display', 'block')
  })

  test('PublicationRow: href renders the title as a next/link to that href', async ({ page }) => {
    const row = page.getByTestId('publication-row-linked')
    const titleLink = row.getByRole('link', { name: /Chromobox/i })
    await expect(titleLink).toHaveAttribute('href', '/publications/example')
  })

  test('PublicationRow: no DOI/URL on file renders no identifier markup', async ({ page }) => {
    const row = page.getByTestId('publication-row-no-link')
    await expect(row.locator('[data-identifier]')).toHaveCount(0)
    const text = await row.innerText()
    expect(text).not.toMatch(/^(DOI|URL)\s/m)
  })

  test('PublicationRow: comfortable index row is a grid from lg, stacked below lg', async ({
    page,
  }) => {
    const row = page.locator('[data-testid="publication-row-comfortable"] > div').first()

    await page.setViewportSize({ width: 1024, height: 900 })
    await expect(row).toHaveCSS('display', 'grid')

    await page.setViewportSize({ width: 900, height: 900 })
    await expect(row).not.toHaveCSS('display', 'grid')
  })

  test('PublicationRow: comfortable index row still shows authors and CopyCitation below lg', async ({
    page,
  }) => {
    // Fix round 1: the journal column collapses into the mobile kicker
    // below `lg`, but the authors line and CopyCitation control must not --
    // this settles it with a live viewport check, not just markup presence.
    await page.setViewportSize({ width: 900, height: 900 })
    const row = page.locator('[data-testid="publication-row-comfortable"] > div').first()

    await expect(row.getByTestId('pub-authors').first()).toBeVisible()
    await expect(row.getByRole('button', { name: /copy citation/i }).first()).toBeVisible()
  })

  test('PublicationRow: home row identifier link is clickable at 390px, not swallowed by the title hit area', async ({
    page,
  }) => {
    // Fix round 1: the title's 44px hit-area pseudo used to overhang onto
    // the identifier directly beneath it below `lg`, in the `home` variant
    // where nothing sits between them. `click({ trial: true })` fails if a
    // different element would actually intercept the click at that point.
    await page.setViewportSize({ width: 390, height: 844 })
    const row = page.getByTestId('publication-row-home')
    const link = row.locator('[data-identifier]').first()
    await expect(link).toBeVisible()

    await link.click({ trial: true })

    const inside = await link.evaluate((el) => {
      const box = el.getBoundingClientRect()
      const target = document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2,
      )
      return target === el || (target != null && el.contains(target))
    })
    expect(inside).toBe(true)
  })

  test('SiteNav marks exactly the current item aria-current, with real hrefs', async ({ page }) => {
    const nav = page.getByTestId('gallery-site-nav')
    await expect(nav.locator('a[aria-current="page"]')).toHaveText('Publications')
    await expect(nav.locator('a[aria-current="page"]')).toHaveCount(1)
    await expect(nav.getByRole('link', { name: 'Publications' })).toHaveAttribute('href', '/publications')
  })

  test('SiteFooter renders one span per line', async ({ page }) => {
    const footer = page.getByTestId('gallery-site-footer').locator('footer')
    await expect(footer).toHaveCount(1)
    await expect(footer.locator('span')).toHaveText(['Designed by Brett Yang', 'Copyright 2026 © Holsinger Lab'])
  })

  test('PersonCard renders both the portrait and no-portrait fallback state', async ({
    page,
  }) => {
    const section = page.getByTestId('gallery-person-card')
    await expect(section.getByRole('img', { name: 'Haochen Wu' })).toBeVisible()
    // The fallback case: no <img>, initials + "NO PORTRAIT ON FILE" instead.
    await expect(section.getByText('JC')).toBeVisible()
    await expect(section.getByText('[ NO PORTRAIT ON FILE ]')).toBeVisible()
    // The misspelling in the source data ("Ungergraduate") is reproduced
    // verbatim -- never silently corrected.
    await expect(section.getByText('Ungergraduate student - Diagnostic Radiography')).toBeVisible()
  })

  test('interactive Tag hit area clears the 44px accessibility floor', async ({ page }, testInfo) => {
    // Task 4 debt: the 44px hit area on an interactive Tag was verified only
    // by CSS-spec arithmetic (h-11 = 2.75rem = 44px), never against a real
    // layout. This settles it with a live measurement. The hit area is an
    // invisible `::before` pseudo-element (`position: absolute; inset-x: 0;
    // top: 50%; height: 2.75rem; translate: -50%`) layered over the ~29px
    // visual chip -- `boundingBox()` on the tag itself only ever reports the
    // visual box, so the pseudo-element's own computed geometry is read
    // directly via getComputedStyle(el, '::before').
    const probe = page.getByTestId('tag-interactive-probe')
    const tag = probe.getByRole('button', { name: 'Interactive tag' })

    const visualBox = await tag.boundingBox()
    expect(visualBox).not.toBeNull()

    const measured = await tag.evaluate((el) => {
      const before = getComputedStyle(el, '::before')
      return {
        beforeHeight: parseFloat(before.height),
        beforeWidth: parseFloat(before.width),
        beforePosition: before.position,
      }
    })

    // Surfaced as a test attachment (visible in the HTML report), not a
    // console.log that reruns on every pass with nothing reading it.
    await testInfo.attach('tag-hit-area-measurement', {
      body: JSON.stringify(
        {
          visual: { width: visualBox!.width, height: visualBox!.height },
          hitArea: { width: measured.beforeWidth, height: measured.beforeHeight },
        },
        null,
        2
      ),
      contentType: 'application/json',
    })

    expect(measured.beforePosition).toBe('absolute')
    // The visual chip is well under 44px tall (padding: 8px 13px around
    // ~11px mono text) -- this is the CSS-arithmetic prediction Task 4 could
    // only assert on paper, now confirmed against real visual geometry.
    expect(visualBox!.height).toBeLessThan(44)
    // The pseudo-element's real, rendered height clears the floor.
    expect(measured.beforeHeight).toBeGreaterThanOrEqual(44)

    // Prove the hit area is actually clickable, not just correctly sized on
    // paper: click a point that sits inside the pseudo-element's vertical
    // span but outside the visible chip -- just above its top edge, since
    // the ~44px pseudo is vertically centred on the chip's midline and
    // therefore overhangs both above and below it.
    const overhang = (measured.beforeHeight - visualBox!.height) / 2
    const clickY = visualBox!.y - overhang / 2
    expect(clickY).toBeLessThan(visualBox!.y) // sanity: the click point really is outside the visual box

    const countBefore = await page.getByTestId('tag-click-count').innerText()
    await page.mouse.click(visualBox!.x + visualBox!.width / 2, clickY)
    await expect(page.getByTestId('tag-click-count')).not.toHaveText(countBefore)
  })

  test('publication page: Resource rail links to /resources', async ({ page }) => {
    const section = page.getByTestId('gallery-publication-page')
    const link = section.getByRole('link', { name: 'Resources' })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/resources')
  })

  test('publication page: citation box takes the full width when there is no canonical link', async ({
    page,
  }) => {
    // PUBLICATION_PAGE_FIXTURE has neither a DOI nor a URL, so the Cite &
    // access grid should collapse to a single column (fix round 1) and the
    // citation box should span the same width as its containing block,
    // rather than sitting in a 1fr track sized for two columns.
    await page.setViewportSize({ width: 1280, height: 900 })
    const section = page.getByTestId('gallery-publication-page')
    const wrapperBox = await section.getByTestId('pub-cite-access').boundingBox()
    const citationBox = await section.getByTestId('pub-citation-box').boundingBox()
    expect(wrapperBox).not.toBeNull()
    expect(citationBox).not.toBeNull()
    expect(citationBox!.width).toBeGreaterThan(wrapperBox!.width * 0.95)
  })

  // Fix round 1 note: this is scoped to the new `gallery-publication-page`
  // section rather than a whole-page `document.documentElement.scrollWidth`
  // check. Investigating the latter surfaced a genuine, *pre-existing*
  // horizontal-overflow defect in the gallery's own `PageTitle`/`FacetBand`
  // sections (from Task 4, unrelated to ResourceBlock or PublicationPage --
  // confirmed present on the real production `/publications` route too, not
  // just this gallery), which no test caught before because no prior test
  // checked 375px on this page. Fixing that is a separate, out-of-scope
  // change (touches two shared components used by production routes); it's
  // flagged as a follow-up rather than silently expanded into this fix
  // round. This test instead proves the actual thing under test: that
  // ResourceBlock/PublicationPage's own mobile fix holds, by checking that
  // no *unclipped* element inside the new section pushes past the
  // viewport (an `overflow-x-auto` descendant, like the Tag row fix below,
  // is expected to have interior overflow -- that's the point of giving it
  // a scrollbar instead of blowing out the page -- so only elements with no
  // clipping ancestor count as real page-overflow contributors). The real
  // `/publications/[slug]` production route gets its own whole-page 375px
  // check across every live paper in e2e/publication-page.spec.ts, which is
  // unaffected by the gallery-only PageTitle/FacetBand issue and does pass.
  test('publication page: no unclipped overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto('/preview/components')

    const overflowing = await page.evaluate(() => {
      const docWidth = document.documentElement.clientWidth
      const section = document.querySelector('[data-testid="gallery-publication-page"]')
      if (!section) return null
      function isClipped(el: Element) {
        let node = el.parentElement
        while (node) {
          const overflowX = getComputedStyle(node).overflowX
          if (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'hidden' || overflowX === 'clip') {
            return true
          }
          node = node.parentElement
        }
        return false
      }
      const offenders: string[] = []
      section.querySelectorAll('*').forEach((el) => {
        const rect = el.getBoundingClientRect()
        if (rect.right > docWidth + 1 && !isClipped(el)) {
          offenders.push(el.tagName)
        }
      })
      return offenders
    })

    expect(overflowing).toEqual([])
  })

  test('has no detectable accessibility violations (light)', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
  })
})

// The Phase 1 completion check requires /preview/components to render in
// both colour schemes -- Playwright's `colorScheme` option is the clean way
// to assert it, matching e2e/axe.spec.ts's own light/dark axis. Dark-mode
// contrast regressions are exactly what this repo's token guards can't
// catch, since they only read the CSS file, never a rendered page.
test.describe('redesign component gallery -- dark colour scheme', () => {
  test.use({ colorScheme: 'dark' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/preview/components')
  })

  test('renders every gallery section', async ({ page }) => {
    for (const name of GALLERY_SECTIONS) {
      await expect(page.getByTestId(`gallery-${name}`)).toBeVisible()
    }
  })

  test('has no detectable accessibility violations (dark)', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
  })
})
