import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// Task 3 (spec §1.5): uppercase mono labels are for data column heads only
// (the publication ledger's Year/Title/Journal/Link heads, and any
// equivalent data table head -- marked with `data-testid="ledger-head"`).
// Everything else must be sentence case, or deleted, enforced here by
// measuring computed style and literal text, not by a visual read.
//
// This walks every text node in the scope (not just leaf elements, so a
// text node beside a sibling element is never skipped) and judges each one
// by its own parent's computed style plus the node's own literal text. A
// text node counts when its parent's computed font-size is <= 12px and at
// least one of:
//   - the parent's `text-transform` is `uppercase`;
//   - the parent's `font-variant-caps` includes `small-caps` (covers both
//     `small-caps` and `all-small-caps`);
//   - the node is outside `[data-cms-verbatim]`/`[data-identifier]`, and
//     its own text is "shouted caps" in the source (all-caps with no CSS
//     transform at all): at least two alphabetic words that are each
//     entirely upper-case, OR one alphabetic run of 4+ letters that's
//     entirely upper-case and not in `ACRONYM_ALLOWLIST` below.
//
// `[data-cms-verbatim]`/`[data-identifier]` exempt a node from the
// *source-caps* check only -- a real dataset can legitimately contain a
// journal called "PLOS ONE", a DOI with capital letters, or a `roleDetail`
// like "MD (UNSW)", none of which are a UI label. The CSS
// `uppercase`/`small-caps` checks still apply everywhere, marker or not: a
// component is never entitled to force-uppercase CMS text regardless of
// what the text says.
//
// `::before`/`::after` pseudo-element content is scanned too (see
// `findPseudoElementShouts` below), since a shouted label can be injected
// via CSS `content` as easily as rendered in the DOM.
//
// Nothing inside `[data-testid="ledger-head"]` counts (the one place
// tracked uppercase mono is allowed). Nav links and the footer count
// toward the budget like everything else -- if a route goes over budget
// because of the shared chrome, the chrome itself has to lose its
// uppercase treatment, not this test.

const LEDGER_HEAD_SELECTOR = '[data-testid="ledger-head"]'
// Either marker exempts a node from the *source-caps* check only (see the
// file-header comment above) -- `[data-identifier]` already means "this is
// case-sensitive data, never re-cased", so it doubles as a CMS-verbatim
// marker without needing every call site to carry both attributes, though
// most now do for clarity (see each site's own comment).
const CMS_VERBATIM_SELECTOR = '[data-cms-verbatim], [data-identifier]'

// The only exemption left in the single-run branch -- DOI/URL are
// `linkKind` values this repo renders directly, PMID and ORCID are named
// defensively for the same shape of future identifier. No length-based
// "short words are probably fine" rule: a real gene symbol or journal
// abbreviation is CMS data and gets `[data-cms-verbatim]` at its render
// site instead (see the file-header comment).
const ACRONYM_ALLOWLIST = ['DOI', 'URL', 'PMID', 'ORCID']

async function findShoutedText(page: Page, root?: string): Promise<string[]> {
  return page.evaluate(
    ({ ledgerHeadSelector, cmsVerbatimSelector, rootSelector, allowlist }) => {
      const scope = rootSelector ? document.querySelector(rootSelector) : document.body
      if (!scope) return []

      const isShoutedText = (text: string): boolean => {
        const words = text.match(/[A-Za-z]+/g) ?? []
        const upperWords = words.filter((w) => w === w.toUpperCase())
        if (upperWords.length >= 2) return true
        return upperWords.some((w) => w.length >= 4 && !allowlist.includes(w))
      }

      const isVisible = (el: Element, style: CSSStyleDeclaration): boolean =>
        style.display !== 'none' && style.visibility !== 'hidden' && el.getClientRects().length > 0

      const matches: string[] = []

      // -- Real text nodes ---------------------------------------------
      const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          return (node.textContent ?? '').trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
        },
      })
      let node: Node | null
      while ((node = walker.nextNode())) {
        const parent = node.parentElement
        if (!parent) continue
        if (parent.closest(ledgerHeadSelector)) continue
        const style = getComputedStyle(parent)
        if (!isVisible(parent, style)) continue
        const fontSize = parseFloat(style.fontSize)
        if (fontSize > 12) continue

        const text = (node.textContent ?? '').trim()
        const uppercaseTransform = style.textTransform === 'uppercase'
        const smallCaps = style.fontVariantCaps?.includes('small-caps') ?? false
        const isCmsVerbatim = Boolean(parent.closest(cmsVerbatimSelector))
        if (uppercaseTransform || smallCaps || (!isCmsVerbatim && isShoutedText(text))) {
          matches.push(text)
        }
      }

      // -- ::before / ::after pseudo-element content --
      // `content` computes to the CSS-quoted string (e.g. `"CITE NOW"`) or
      // the keyword `none` -- an element with no matching rule still
      // returns `none`, so this only ever inspects a pseudo-element a
      // stylesheet actually populates.
      const parseContent = (raw: string): string | null => {
        const trimmed = raw.trim()
        if (trimmed === '' || trimmed === 'none' || trimmed === 'normal') return null
        const quoted = trimmed.match(/^["'](.*)["']$/)
        const text = (quoted ? quoted[1] : trimmed).trim()
        return text === '' ? null : text
      }
      for (const el of [scope, ...Array.from(scope.querySelectorAll('*'))]) {
        if (el.closest(ledgerHeadSelector)) continue
        for (const pseudo of ['::before', '::after'] as const) {
          const style = getComputedStyle(el, pseudo)
          const text = parseContent(style.content)
          if (!text) continue
          if (!isVisible(el, getComputedStyle(el))) continue
          const fontSize = parseFloat(style.fontSize)
          if (fontSize > 12) continue
          const uppercaseTransform = style.textTransform === 'uppercase'
          const smallCaps = style.fontVariantCaps?.includes('small-caps') ?? false
          const isCmsVerbatim = Boolean(el.closest(cmsVerbatimSelector))
          if (uppercaseTransform || smallCaps || (!isCmsVerbatim && isShoutedText(text))) {
            matches.push(`${pseudo}:${text}`)
          }
        }
      }

      return matches
    },
    {
      ledgerHeadSelector: LEDGER_HEAD_SELECTOR,
      cmsVerbatimSelector: CMS_VERBATIM_SELECTOR,
      rootSelector: root,
      allowlist: ACRONYM_ALLOWLIST,
    }
  )
}

const BUDGET = 6

// Held at 375px as well as 1440px -- the two widths exercise different
// layouts (the ledger's own grid only activates from `xl`, so a
// mobile-only kicker like PublicationRow's `KICKER` is only ever visible
// to this check at 375px).
const WIDTHS = [1440, 375]

const ROUTES = ['/', '/publications', '/people', '/research', '/resources']

test.describe('Uppercase micro-label budget', () => {
  for (const width of WIDTHS) {
    for (const route of ROUTES) {
      test(`${route} carries at most ${BUDGET} uppercase micro-labels at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 })
        const response = await page.goto(route)
        // e.g. /people when showPeople is false -- a real skip shows in the
        // output, rather than an early return passing silently.
        test.skip(response !== null && response.status() === 404, `${route} 404s for this dataset`)
        // The budget's ≤12px gate is font-size sensitive -- waits for fonts
        // so an unloaded Archivo (fallback stack resolves wider) can't
        // shift what counts as ≤12px.
        await page.evaluate(() => document.fonts.ready)
        const found = await findShoutedText(page)
        console.log(`[label-budget] ${route} @ ${width}px: ${found.length} (${JSON.stringify(found)})`)
        expect(found.length, `${route} @ ${width}px: ${JSON.stringify(found)}`).toBeLessThanOrEqual(BUDGET)
      })
    }

    // The gallery's Home, People and Research instances render states the
    // live dataset can't guarantee (a PI panel, the lab-head spotlight,
    // populated research projects) -- checked here so the budget holds
    // regardless of what's actually in the dataset (constraints.md).
    const GALLERY_INSTANCES = ['gallery-home', 'gallery-people', 'gallery-research']

    for (const testId of GALLERY_INSTANCES) {
      test(`the gallery's ${testId} instance carries at most ${BUDGET} uppercase micro-labels at ${width}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 1000 })
        await page.goto('/preview/components')
        await page.evaluate(() => document.fonts.ready)
        const found = await findShoutedText(page, `[data-testid="${testId}"]`)
        console.log(
          `[label-budget] /preview/components ${testId} @ ${width}px: ${found.length} (${JSON.stringify(found)})`
        )
        expect(found.length, `${testId} @ ${width}px: ${JSON.stringify(found)}`).toBeLessThanOrEqual(BUDGET)
      })
    }
  }
})

// Proves the CMS-verbatim marker actually does its job, on fixture rows
// the live dataset can't guarantee carry a shouted-looking journal name or
// DOI at all. Scoped to the gallery's own `PublicationRow`/`PersonCard`
// demo sections, not a whole route, so this stays independent of whatever
// `/publications`/`/people` happen to render today.
test.describe('CMS-verbatim text never trips the source-caps check', () => {
  // Below `xl` the journal name renders through PublicationRow's mobile
  // kicker, but at 1440 it renders through the desktop `META` cell/spans
  // instead (both marked, but a different DOM path each) -- looping over
  // the same `WIDTHS` the budget itself runs at proves both paths.
  for (const width of WIDTHS) {
    test(`a journal called "PLOS ONE", a capitalised DOI and a "MD (UNSW)" roleDetail all count 0 at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 })
      await page.goto('/preview/components')
      await page.evaluate(() => document.fonts.ready)
      const found = await findShoutedText(page, '[data-testid="gallery-cms-verbatim-probe"]')
      expect(found, JSON.stringify(found)).toEqual([])
    })
  }
})

// Proves the spec catches a shouted UI word once it's typed into the
// source, not only when produced by `text-transform: uppercase`. The probe
// element (Gallery.tsx's `gallery-shouted-word-probe`) is a **permanent
// regression-guard fixture, not production copy -- do not remove it.**
// This test depends on it existing.
test.describe('A shouted UI word with no CSS transform still counts', () => {
  test('"CITE" and "VIEW" typed in caps in a non-verbatim element are caught', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/preview/components')
    await page.evaluate(() => document.fonts.ready)
    const found = await findShoutedText(page, '[data-testid="gallery-shouted-word-probe"]')
    expect(found).toContain('CITE')
    expect(found).toContain('VIEW')
  })
})
