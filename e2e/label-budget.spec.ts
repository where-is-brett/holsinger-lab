import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// Task 3 (spec §1.5): uppercase mono labels are for data column heads only
// (the publication ledger's Year/Title/Journal/Link heads, and any
// equivalent data table head -- marked with `data-testid="ledger-head"`).
// Everything else must be sentence case, or deleted. This is enforced here
// by measuring, not by trusting a visual read: on each route at 1440px,
// count every *visible* element with no element children and non-empty
// text whose computed `text-transform` is `uppercase` and whose computed
// `font-size` is <= 12px, excluding anything inside a
// `[data-testid="ledger-head"]` row. The budget is <= 6 per page.
//
// Nav links and the footer count toward the budget (task brief step 3) --
// this file makes no exception for them; if a route goes over budget
// because of the shared chrome, the chrome itself must lose its uppercase
// treatment, not this test.

const SELECTOR = '[data-testid="ledger-head"]'

async function findUppercaseMicroLabels(page: Page, root?: string): Promise<string[]> {
  return page.evaluate(
    ({ ledgerHeadSelector, rootSelector }) => {
      const scope = rootSelector ? document.querySelector(rootSelector) : document.body
      if (!scope) return []
      const all = Array.from(scope.querySelectorAll('*'))
      const matches: string[] = []
      for (const el of all) {
        // Leaf elements only: no element children (an ancestor's own
        // matching text would otherwise be counted once per ancestor level
        // too, since textContent is inherited down the tree).
        if (el.children.length > 0) continue
        const text = (el.textContent ?? '').trim()
        if (!text) continue
        if (el.closest(ledgerHeadSelector)) continue
        const style = getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden') continue
        if (el.getClientRects().length === 0) continue
        const fontSize = parseFloat(style.fontSize)
        if (style.textTransform === 'uppercase' && fontSize <= 12) {
          matches.push(text)
        }
      }
      return matches
    },
    { ledgerHeadSelector: SELECTOR, rootSelector: root }
  )
}

const BUDGET = 6

const ROUTES = ['/', '/publications', '/people', '/research', '/resources']

test.describe('Uppercase micro-label budget', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
  })

  for (const route of ROUTES) {
    test(`${route} carries at most ${BUDGET} uppercase micro-labels at 1440px`, async ({ page }) => {
      const response = await page.goto(route)
      if (response && response.status() === 404) return // e.g. /people when showPeople is false
      const found = await findUppercaseMicroLabels(page)
      console.log(`[label-budget] ${route}: ${found.length} (${JSON.stringify(found)})`)
      expect(found.length, `${route}: ${JSON.stringify(found)}`).toBeLessThanOrEqual(BUDGET)
    })
  }

  // The gallery's Home, People and Research instances render states the
  // live dataset can't guarantee (a PI panel, the lab-head spotlight,
  // populated research projects) -- checked here so the budget holds
  // regardless of what's actually in the dataset (constraints.md).
  const GALLERY_INSTANCES = ['gallery-home', 'gallery-people', 'gallery-research']

  for (const testId of GALLERY_INSTANCES) {
    test(`the gallery's ${testId} instance carries at most ${BUDGET} uppercase micro-labels at 1440px`, async ({
      page,
    }) => {
      await page.goto('/preview/components')
      const found = await findUppercaseMicroLabels(page, `[data-testid="${testId}"]`)
      console.log(`[label-budget] /preview/components ${testId}: ${found.length} (${JSON.stringify(found)})`)
      expect(found.length, `${testId}: ${JSON.stringify(found)}`).toBeLessThanOrEqual(BUDGET)
    })
  }
})
