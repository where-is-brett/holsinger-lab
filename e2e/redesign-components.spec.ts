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
  'mobile-header',
  'site-footer',
  'form-field',
  'resource-block',
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
      // The rendered label must not have been case-transformed, and the href
      // must carry the full identifier even when the label is truncated.
      expect(href).toContain(text.replace(/^https?:\/\//, '').replace(/^www\./, ''))
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
    // The open instance is wrapped `md:hidden` (mirrors the production
    // Navbar's breakpoint split -- see the comment in Gallery.tsx's "Site
    // nav" section for why), so it's only actually visible below md.
    await page.setViewportSize({ width: 390, height: 844 })
    const section = page.getByTestId('gallery-mobile-header')
    // Closed: MENU toggle only, no nav rows.
    await expect(section.getByRole('button', { name: 'MENU' })).toBeVisible()
    // Open: the interactive instance defaults open and shows every nav row,
    // including the current item marked aria-current="page".
    await expect(section.getByRole('button', { name: 'CLOSE ✕' })).toBeVisible()
    await expect(section.locator('a[aria-current="page"]')).toHaveCount(1)
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

  test('SiteNav marks exactly the current item aria-current', async ({ page }) => {
    const nav = page.getByTestId('gallery-site-nav')
    await expect(nav.locator('a[aria-current="page"]')).toHaveText('Publications')
    await expect(nav.locator('a[aria-current="page"]')).toHaveCount(1)
  })

  test('SiteFooter renders both the default and compact density', async ({ page }) => {
    const footer = page.getByTestId('gallery-site-footer')
    await expect(footer.locator('footer')).toHaveCount(2)
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

  test('interactive Tag hit area clears the 44px accessibility floor', async ({ page }) => {
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

    // Surfaced in the task report, not left as debug noise.
    console.log('Tag hit-area measurement:', {
      visual: { width: visualBox!.width, height: visualBox!.height },
      hitArea: { width: measured.beforeWidth, height: measured.beforeHeight },
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
