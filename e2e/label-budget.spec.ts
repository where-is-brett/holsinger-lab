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
// A text node counts when its parent's computed font-size is <= 12px and
// at least one of:
//   - the parent's `text-transform` is `uppercase`;
//   - the parent's `font-variant-caps` includes `small-caps` (covers both
//     `small-caps` and `all-small-caps`);
//   - the node's own text is "shouted caps" in the source: at least two
//     alphabetic words that are each entirely upper-case, OR one
//     alphabetic run of 4+ letters that's entirely upper-case and isn't in
//     the small allowlist below.
//
// Nothing inside `[data-testid="ledger-head"]` counts (the one place
// tracked uppercase mono is still allowed). Nav links and the footer count
// toward the budget like everything else -- no exception is made for them
// here; if a route goes over budget because of the shared chrome, the
// chrome itself has to lose its uppercase treatment, not this test.

const LEDGER_HEAD_SELECTOR = '[data-testid="ledger-head"]'

// Kept deliberately small and named explicitly, not just "any short
// upper-case token" without documentation: DOI/URL/PMID/ORCID are the
// identifier abbreviations this repo actually renders (DOI/URL as a
// `linkKind` value, the other two named defensively for the same shape of
// future addition). The general "5 letters or fewer" rule below already
// covers all four -- they're named anyway so a future change to that
// length threshold doesn't silently stop treating them as safe, and so a
// reviewer doesn't have to reverse-engineer the threshold to see the
// intent.
const ACRONYM_ALLOWLIST = ['DOI', 'URL', 'PMID', 'ORCID']

async function findShoutedText(page: Page, root?: string): Promise<string[]> {
  return page.evaluate(
    ({ ledgerHeadSelector, rootSelector, allowlist }) => {
      const scope = rootSelector ? document.querySelector(rootSelector) : document.body
      if (!scope) return []

      const isAllowlistedAcronym = (word: string): boolean =>
        // Gene symbols and short acronyms (APOE, TREM, BRCA, ...) read
        // naturally in caps and aren't a "label" this budget targets --
        // treated the same as a named identifier abbreviation once they're
        // 5 letters or fewer.
        word.length <= 5 || allowlist.includes(word)

      const isShoutedText = (text: string): boolean => {
        const words = text.match(/[A-Za-z]+/g) ?? []
        const upperWords = words.filter((w) => w === w.toUpperCase())
        if (upperWords.length >= 2) return true
        return upperWords.some((w) => w.length >= 4 && !isAllowlistedAcronym(w))
      }

      const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          return (node.textContent ?? '').trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
        },
      })

      const matches: string[] = []
      let node: Node | null
      while ((node = walker.nextNode())) {
        const parent = node.parentElement
        if (!parent) continue
        if (parent.closest(ledgerHeadSelector)) continue
        const style = getComputedStyle(parent)
        if (style.display === 'none' || style.visibility === 'hidden') continue
        if (parent.getClientRects().length === 0) continue
        const fontSize = parseFloat(style.fontSize)
        if (fontSize > 12) continue

        const text = (node.textContent ?? '').trim()
        const uppercaseTransform = style.textTransform === 'uppercase'
        const smallCaps = style.fontVariantCaps?.includes('small-caps') ?? false
        if (uppercaseTransform || smallCaps || isShoutedText(text)) {
          matches.push(text)
        }
      }
      return matches
    },
    { ledgerHeadSelector: LEDGER_HEAD_SELECTOR, rootSelector: root, allowlist: ACRONYM_ALLOWLIST }
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
        const found = await findShoutedText(page, `[data-testid="${testId}"]`)
        console.log(
          `[label-budget] /preview/components ${testId} @ ${width}px: ${found.length} (${JSON.stringify(found)})`
        )
        expect(found.length, `${testId} @ ${width}px: ${JSON.stringify(found)}`).toBeLessThanOrEqual(BUDGET)
      })
    }
  }
})
