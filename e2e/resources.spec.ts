import { expect, test } from '@playwright/test'

import { e2eClient } from './support/sanity'

// Every assertion here is derived from the live dataset at test time (spec
// §5 / constraints.md "every e2e assertion must hold for any valid
// dataset") -- production has ZERO `resource` documents today (spec §2), so
// the live checks below only ever exercise the empty state against real
// data. The populated state (four resources -- linked publications with a
// DOI, a long DOI, a URL only, and one resource with no linked publication
// at all -- plus a portable-text `howToObtain` holding a link) is proven
// instead against the `gallery-resources` fixture at /preview/components,
// per constraints.md's "states the live data can't show go on gallery
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
      expect(titles).toEqual(resources.map((r) => r.title ?? ''))
    }
  })

  test("the meta's count matches what's rendered", async ({ page }) => {
    const resources = await fetchLiveResources()
    const n = resources.length

    await page.goto('/resources')
    const meta = await page.getByTestId('page-title-meta').innerText()
    expect(meta).toBe(`${n} resource${n === 1 ? '' : 's'}`)
  })

  // Task 2 fix round 1 (review Important 2): `kind` is a lower-case schema
  // enum (`schemas/documents/resource.ts`'s `RESOURCE_KINDS`); the section
  // label must render it through `kindLabel` (resourceModel.ts), sentence
  // case, never the raw enum value.
  test('each section-label starts with an upper-case letter', async ({ page }) => {
    const resources = await fetchLiveResources()
    test.skip(resources.length === 0, 'no resource documents in this dataset')

    await page.goto('/resources')
    const labels = await page.getByTestId('section-label').allTextContents()
    expect(labels.length).toBeGreaterThan(0)
    for (const label of labels) {
      expect(label[0], `"${label}" doesn't start with an upper-case letter`).toBe(label[0].toUpperCase())
    }
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
  test('renders all fixture resources, with the portable-text link, and no overflow at 320px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 900 })
    await page.goto('/preview/components')

    const section = page.getByTestId('gallery-resources')
    await expect(section).toBeVisible()

    const titles = await section.getByTestId('resource-block-title').allTextContents()
    expect(titles.length).toBe(4)

    // Production has zero resources today, so this fixture is the only
    // guaranteed place the sentence-case kind label actually renders --
    // see the live `/resources` test's identical check above.
    const labels = await section.getByTestId('section-label').allTextContents()
    expect(labels.length).toBeGreaterThan(0)
    for (const label of labels) {
      expect(label[0], `"${label}" doesn't start with an upper-case letter`).toBe(label[0].toUpperCase())
    }

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
