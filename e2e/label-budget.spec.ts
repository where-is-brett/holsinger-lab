import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// Task 3 (spec §1.5): uppercase mono labels are for data column heads only
// (the publication ledger's Year/Title/Journal/Link heads, and any
// equivalent data table head -- marked with `data-testid="ledger-head"`).
// Everything else must be sentence case, or deleted. This is enforced here
// by measuring, not by trusting a visual read.
//
// Fix round 1 (review Important 1): the first version of this file only
// caught a leaf *element* whose own computed `text-transform` was
// `uppercase`. That missed two whole classes of violation live routes were
// still shipping:
//   - a shouted string baked into the source ("REGISTER — …", "COMFORTABLE"/
//     "COMPACT", "[ NO PORTRAIT ON FILE ]") renders with no CSS transform
//     at all -- the text is just already all-caps -- so `textTransform !==
//     'uppercase'` let it straight through.
//   - `el.children.length > 0` skipped any element that had *any* element
//     child, which drops a text node that sits beside a sibling element
//     (e.g. a kicker's own text next to a `<span>` inside it) even though
//     that text node is exactly as visible and exactly as capitalised.
//
// This version walks every text node in the scope (`document.
// createTreeWalker(scope, NodeFilter.SHOW_TEXT)`), not just leaf elements,
// and judges each node by its own parent's computed style plus the node's
// own literal text -- so a shouted source string is caught even with zero
// CSS transform involved, and a text node beside a sibling element is
// never skipped.
//
// Fix round 2 (re-review N1): a text node's parent's computed style and
// font-size alone can't tell CMS/identifier data from a hand-written UI
// label -- a real dataset can legitimately contain a journal called "PLOS
// ONE", a DOI with capital letters, or a `roleDetail` like "MD (UNSW)", and
// none of those are a label this task exists to cut. `[data-cms-verbatim]`
// is the marker every such site now carries (PublicationRow.tsx's journal/
// kicker text and DOI/URL identifier, PersonCard.tsx's role/detail lines,
// every element that already carried `[data-identifier]` -- see each
// site's own comment). A node inside either marker is skipped by the
// *source-caps* check below entirely; the CSS `uppercase`/`small-caps`
// checks still apply everywhere, marker or not, because a component this
// repo styles is never entitled to force-uppercase CMS text regardless of
// what the text says.
//
// A text node counts when its parent's computed font-size is <= 12px and
// at least one of:
//   - the parent's `text-transform` is `uppercase`;
//   - the parent's `font-variant-caps` includes `small-caps` (covers both
//     `small-caps` and `all-small-caps`);
//   - the node is outside `[data-cms-verbatim]`/`[data-identifier]`, and
//     its own text is "shouted caps" in the source: at least two
//     alphabetic words that are each entirely upper-case, OR one
//     alphabetic run of 4+ letters that's entirely upper-case and is in
//     neither the CMS-verbatim marker nor the small explicit allowlist
//     below.
//
// Fix round 2 (re-review N2): the single-run branch used to also exempt
// any upper-case run of 5 letters or fewer, on the theory that a short run
// "reads like an acronym". That let a genuine shouted label through
// ("CITE", "VIEW", "MORE", "KIND", ...) the instant someone typed it in
// caps instead of relying on a `text-transform` this repo could catch --
// exactly the regression this task removed. Now that CMS content
// (including real short acronyms, gene symbols, journal abbreviations) has
// its own marker, the length-based exemption is gone: the single-run
// branch exempts only the four identifiers in `ACRONYM_ALLOWLIST` below,
// nothing else.
//
// Fix round 2 (re-review N3): `::before`/`::after` pseudo-element content
// is scanned too -- see `findPseudoElementShouts` below. No redesign
// component renders text through a pseudo-element today (the only
// `content` in this codebase is `HIT_AREA`'s empty `content-['']`), but a
// budget spec that only ever looked at real DOM text would have the same
// blind spot Important 1 found, just one property over -- so this is
// covered rather than left as a documented gap.
//
// Nothing inside `[data-testid="ledger-head"]` counts (the one place
// tracked uppercase mono is still allowed). Nav links and the footer count
// toward the budget like everything else -- no exception is made for them
// here; if a route goes over budget because of the shared chrome, the
// chrome itself has to lose its uppercase treatment, not this test.

const LEDGER_HEAD_SELECTOR = '[data-testid="ledger-head"]'
// Fix round 2: either marker exempts a node from the *source-caps* check
// only (see the file-header comment above) -- `[data-identifier]` already
// meant "this is case-sensitive data, never re-cased" before this task
// existed, so it doubles as a CMS-verbatim marker without needing every
// call site to carry both attributes, though most now do for clarity (see
// each site's own comment).
const CMS_VERBATIM_SELECTOR = '[data-cms-verbatim], [data-identifier]'

// Fix round 2 (re-review N2): the *only* exemption left in the single-run
// branch -- DOI/URL are `linkKind` values this repo renders directly, PMID
// and ORCID are named defensively for the same shape of future identifier.
// No length-based "short words are probably fine" rule any more: a real
// gene symbol or journal abbreviation is CMS data and gets `[data-cms-
// verbatim]` at its render site instead (see the file-header comment).
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

      // -- ::before / ::after pseudo-element content (fix round 2, N3) --
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

// Fix round 1 (controller ruling): held at 375px as well as 1440px --
// Brett's original feedback was largely about mobile, and the two widths
// exercise different layouts (the ledger's own grid only activates from
// `xl`, so a mobile-only kicker like PublicationRow's `KICKER` is only
// ever visible to this check at 375px).
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
        // Final review, finding 10: the budget's ≤12px gate is font-size
        // sensitive -- on a runner where Archivo hasn't finished loading yet,
        // the fallback stack resolves wider, which could shift what counts
        // as ≤12px. `load` normally covers preloaded next/font files, so
        // this is cheap insurance, not a fix for an observed flake.
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

// Fix round 2 (re-review N1): proves the CMS-verbatim marker actually does
// its job, on fixture rows the live dataset can't guarantee carry a
// shouted-looking journal name or DOI at all. Scoped to the gallery's own
// `PublicationRow`/`PersonCard` demo sections, not a whole route, so this
// stays independent of whatever `/publications`/`/people` happen to render
// today.
test.describe('CMS-verbatim text never trips the source-caps check', () => {
  // Re-review round 2 (R2-3): 375 alone missed the desktop path -- below
  // `xl` the journal name renders through PublicationRow's mobile kicker,
  // but at 1440 it renders through the desktop `META` cell/spans instead
  // (both marked, but a different DOM path each). Looping over the same
  // `WIDTHS` the budget itself runs at proves both paths, not just one.
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

// Fix round 2 (re-review N2): proves the spec actually catches a shouted
// UI word once it's typed into the source instead of produced by
// `text-transform: uppercase` -- this is exactly the regression the old
// "<=5 letters is an acronym" exemption would have let through silently.
// The probe element (Gallery.tsx's `gallery-shouted-word-probe`) is a
// **permanent regression-guard fixture, not production copy -- do not
// remove it.** This test depends on it existing; removing the fixture
// would break this test, not "clean up" a stale one (final review,
// finding 3 -- an earlier version of this comment called it "temporary,"
// which was wrong and self-contradicting with Gallery.tsx's own comment).
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
