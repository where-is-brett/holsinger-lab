import { expect, test } from '@playwright/test'
import { placeRow } from 'lib/wix/placeRow'

test.use({ viewport: { width: 1280, height: 900 } })

// The 1280px desktop grid's pitch: 5 "real" columns of 196px, 60px gaps, a
// 30px left inset -- see lib/wix/placeRow.ts and PersonGrid's grid-cols.
const GUTTER = 30
const PITCH = 256

/** The x position (left edge, at 1280px) of the "real" 1-5 column that
 *  `placeRow` places item `index` of a `count`-item row into -- same pitch
 *  math PersonGrid itself uses, recomputed here instead of hardcoded so this
 *  holds for whatever the last row's count actually is on any dataset. */
function expectedX(count: number, index: number): number {
  const track = placeRow(count, index) // 1-9, always odd
  const column = (track + 1) / 2 // 1-5
  return GUTTER + (column - 1) * PITCH
}

test('team structure', async ({ page }) => {
  await page.goto('/team')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Our Team')
  const current = page.locator('[data-wix="current"] [data-wix="person"]')
  expect(await current.count()).toBeGreaterThanOrEqual(12)
  // Current members' names are h2 (no heading sits between the page's h1 and
  // this grid); alumni/intern cards nest under a visible h2 section heading
  // and so stay h3 -- see PersonCard's headingLevel prop (axe heading-order).
  await expect(current.first().locator('h2')).toHaveText('Haochen Wu')
  // The PI (Damian Holsinger) is never on the Team page -- see groupTeam and
  // its labHeadId / "role === Lab Head" fallback (I1). The fixture now
  // includes a PI profile (fixture-pi, with settings.labHead pointing at
  // it), so this is a meaningful assertion in fixture mode; on real data,
  // Damian Holsinger's profile is likewise excluded once labHead is set (or,
  // until then, by the role-based fallback).
  await expect(page.locator('[data-wix="current"]')).not.toContainText('Damian Holsinger')
  await expect(page.getByRole('heading', { name: 'Lab Alumni' })).toBeVisible()
})

test.describe('fixture-only exact counts and positions (snapshot facts)', () => {
  test.skip(process.env.WIX_FIXTURE !== '1', 'exact counts are snapshot facts, only true of the committed fixture dataset')

  test('exact group counts', async ({ page }) => {
    await page.goto('/team')
    const current = page.locator('[data-wix="current"] [data-wix="person"]')
    await expect(current).toHaveCount(12)
    await expect(page.locator('[data-wix="alumni-cards"] [data-wix="person"]')).toHaveCount(6)
    await expect(page.locator('[data-wix="alumni-rows"] li')).toHaveCount(15) // 16 on Wix incl. the duplicate Rene Buxton
    await expect(page.locator('[data-wix="interns"] li')).toHaveCount(6)
    await expect(page.locator('[data-wix="interns"] li').first()).toHaveText('Mia Helveston USA')
  })

  test('row 3 is a partial row centred in columns 2 and 4', async ({ page }) => {
    await page.goto('/team')
    const people = page.locator('[data-wix="current"] [data-wix="person"]')
    const xs = await people.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x)))
    // Rows of 5, 5, 2 -- the last two items are row 3.
    const row3 = xs.slice(-2)
    expect(row3[0]).toBeGreaterThanOrEqual(286 - 4)
    expect(row3[0]).toBeLessThanOrEqual(286 + 4)
    expect(row3[1]).toBeGreaterThanOrEqual(798 - 4)
    expect(row3[1]).toBeLessThanOrEqual(798 + 4)
  })
})

test('every current member in a visual row shares a name baseline within 2px', async ({ page }) => {
  await page.goto('/team')
  const cards = page.locator('[data-wix="current"] [data-wix="person"]')
  const n = await cards.count()
  if (n === 0) {
    // A dataset could in principle have no non-alumni, non-intern profiles
    // at all -- vacuously true.
    return
  }
  // Rows are chunked 5-per-row, full rows first, the remainder last (see
  // PersonGrid's chunkRows with partialFirst=false) -- so grouping by
  // floor(index / 5) reproduces the same rows the grid itself renders,
  // regardless of how many current members exist.
  //
  // The heading's *top* edge, not its bottom: every card's portrait box is a
  // fixed height (PersonCard, BOX_DESKTOP_H), so a name's first line always
  // starts at the same y within a row -- that's the shared baseline. A
  // longer name (e.g. "Sreevadana (Sree) Venkitachalam") can wrap to a
  // second line at the narrow card width, which would push its bottom edge
  // down by a full line-height without moving anyone's baseline at all.
  const baselines = await cards.evaluateAll((els) =>
    els.map((e) => {
      const heading = e.querySelector('h2, h3')
      return heading ? heading.getBoundingClientRect().top : null
    })
  )
  const rows = new Map<number, number[]>()
  baselines.forEach((y, i) => {
    if (y === null) return
    const row = Math.floor(i / 5)
    const list = rows.get(row) ?? []
    list.push(y)
    rows.set(row, list)
  })
  for (const [, ys] of rows) {
    const min = Math.min(...ys)
    const max = Math.max(...ys)
    expect(max - min).toBeLessThanOrEqual(2)
  }
})

test("the last partial row sits at the x columns placeRow prescribes for its count", async ({ page }) => {
  await page.goto('/team')
  const cards = page.locator('[data-wix="current"] [data-wix="person"]')
  const n = await cards.count()
  const remainder = n % 5
  if (remainder === 0) {
    // No partial row on this dataset (an exact multiple of 5, or zero) --
    // vacuously true.
    return
  }
  const xs = await cards.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x)))
  const lastRow = xs.slice(-remainder)
  lastRow.forEach((x, i) => {
    const expected = expectedX(remainder, i)
    expect(x).toBeGreaterThanOrEqual(expected - 4)
    expect(x).toBeLessThanOrEqual(expected + 4)
  })
})

test('no empty portrait boxes: every current-member card has an img, or no box at all (I2)', async ({ page }) => {
  await page.goto('/team')
  const cards = page.locator('[data-wix="current"] [data-wix="person"]')
  const n = await cards.count()
  if (n === 0) return // vacuously true
  const boxes = await cards.evaluateAll((els) =>
    els.map((e) => {
      const box = e.firstElementChild as HTMLElement | null
      if (!box) return { hasImg: false, background: 'none', borderWidth: '0px' }
      const cs = getComputedStyle(box)
      return {
        hasImg: box.querySelector('img') !== null,
        background: cs.backgroundColor,
        borderWidth: cs.borderTopWidth,
      }
    })
  )
  for (const b of boxes) {
    if (b.hasImg) continue
    // An image-less member's box (PersonCard's portrait wrapper) draws
    // nothing visible -- no background fill, no border -- so it never
    // appears as an empty frame, even though it still occupies the same
    // fixed height as every other card in its row (keeping baselines
    // aligned; see the baseline test above).
    expect(b.background).toMatch(/^(rgba\(0, 0, 0, 0\)|transparent)$/)
    expect(b.borderWidth).toBe('0px')
  }
})

test('portraits are rectangular and fixed-width', async ({ page }) => {
  await page.goto('/team')
  const img = page.locator('[data-wix="person"] img').first()
  const { w, radius } = await img.evaluate((el) => ({ w: el.getBoundingClientRect().width, radius: getComputedStyle(el).borderRadius }))
  expect(Math.round(w)).toBe(196)
  expect(radius).toBe('0px')
})

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('single column', async ({ page }) => {
    await page.goto('/team')
    const xs = await page.locator('[data-wix="current"] [data-wix="person"]').evaluateAll((els) => els.slice(0, 3).map((e) => Math.round(e.getBoundingClientRect().x)))
    expect(new Set(xs).size).toBe(1)
  })
})
