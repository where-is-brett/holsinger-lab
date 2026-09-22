import { expect, test } from '@playwright/test'

import { e2eClient } from './support/sanity'

// Every assertion here is derived from the live dataset at test time (spec
// §5 / constraints.md "every e2e assertion must hold for any valid
// dataset") -- production has ZERO `resource` documents today (spec §2), so
// the live checks below only ever exercise the empty state against real
// data. The populated state (two resources, one with a linked publication,
// one with a portable-text `howToObtain` holding a link) is proven instead
// against the `gallery-resources` fixture at /preview/components, per
// constraints.md's "states the live data can't show go on gallery
// fixtures".

type LiveResource = {
  _id: string
  title: string | null
  kind: string | null
  publicationSlug: string | null
}

async function fetchLiveResources(): Promise<LiveResource[]> {
  return e2eClient.fetch<LiveResource[]>(
    `*[_type == "resource"] | order(title asc) { _id, title, kind, "publicationSlug": publication->slug.current }`
  )
}

test.describe('/resources', () => {
  test('never 404s', async ({ page }) => {
    const response = await page.goto('/resources')
    expect(response?.status()).toBe(200)
  })

  test('renders one block per resource document, or the empty line when there are none', async ({
    page,
  }) => {
    const resources = await fetchLiveResources()

    await page.goto('/resources')

    if (resources.length === 0) {
      await expect(page.getByText('No resources are listed yet.', { exact: true })).toBeVisible()
      await expect(page.getByTestId('resource-block-title')).toHaveCount(0)
    } else {
      const titles = await page.getByTestId('resource-block-title').allTextContents()
      expect(titles).toEqual(resources.map((r) => r.title))
    }
  })

  test("the meta's count matches what's rendered", async ({ page }) => {
    const resources = await fetchLiveResources()
    const n = resources.length

    await page.goto('/resources')
    const meta = await page.getByTestId('page-title-meta').innerText()
    expect(meta).toBe(`${n} RESOURCE${n === 1 ? '' : 'S'}`)
  })

  test('each linked publication SOURCE link goes to /publications/<slug>', async ({ page }) => {
    const resources = await fetchLiveResources()
    const linked = resources.filter((r) => r.publicationSlug)
    test.skip(linked.length === 0, 'no resource has a linked publication in this dataset')

    await page.goto('/resources')
    for (const resource of linked) {
      const block = page.locator('[data-testid="resource-block"]', {
        has: page.getByTestId('resource-block-title').getByText(resource.title ?? '', { exact: true }),
      })
      const sourceLink = block.locator('a[href^="/publications/"]')
      await expect(sourceLink).toHaveAttribute('href', `/publications/${resource.publicationSlug}`)
    }
  })

  test.describe('no horizontal overflow', () => {
    for (const width of [320, 375, 768, 1024, 1280]) {
      test(`at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/resources')
        const fits = await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
        )
        expect(fits).toBe(true)
      })
    }
  })
})

test.describe('/preview/components gallery: resources', () => {
  test('renders both fixture resources, with the portable-text link, and no overflow at 320px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 900 })
    await page.goto('/preview/components')

    const section = page.getByTestId('gallery-resources')
    await expect(section).toBeVisible()

    const titles = await section.getByTestId('resource-block-title').allTextContents()
    expect(titles.length).toBe(2)

    // The howToObtain portable-text link renders as a real anchor inside the
    // gallery's resource fixture, not just as its own plain-text run.
    const howToObtainLink = section.getByRole('link', { name: 'GitHub' })
    await expect(howToObtainLink).toBeVisible()
    await expect(howToObtainLink).toHaveAttribute('href', /^https?:\/\//)

    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
    expect(fits).toBe(true)
  })
})
