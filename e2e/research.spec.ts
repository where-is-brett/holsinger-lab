import { expect, test } from '@playwright/test'

import { e2eClient } from './support/sanity'

// Every assertion here is derived from the live dataset at test time (spec
// §5 / constraints.md "every e2e assertion must hold for any valid
// dataset") -- production has ZERO projects with `researchOrder` set today
// (task brief), so the live checks below only ever exercise the empty
// state against real data. The populated state (five projects: four covers
// at varying aspect ratios plus one with none, a long unbreakable overview
// token, one with no tags and one with no start date) is proven instead
// against the `gallery-research` fixture at /preview/components, per
// constraints.md's "states the live data can't show go on gallery
// fixtures".

type LiveProject = {
  _id: string
  title: string | null
}

async function fetchLiveResearchProjects(): Promise<LiveProject[]> {
  return e2eClient.fetch<LiveProject[]>(
    `*[_type == "project" && defined(researchOrder)] | order(researchOrder asc) { _id, title }`
  )
}

async function fetchLiveEnquiryEmail(): Promise<string | null> {
  const settings = await e2eClient.fetch<{
    contactEmail: string | null
    labHeadEmail: string | null
  } | null>(`*[_type == "settings"][0]{ "contactEmail": contact.email, "labHeadEmail": labHead->email }`)
  const contactEmail = settings?.contactEmail?.trim()
  if (contactEmail) return contactEmail
  const labHeadEmail = settings?.labHeadEmail?.trim()
  if (labHeadEmail) return labHeadEmail
  return null
}

test.describe('/research', () => {
  test('never 404s', async ({ page }) => {
    const response = await page.goto('/research')
    expect(response?.status()).toBe(200)
  })

  test('renders one h2 per researchOrder project in order, or the empty-state line', async ({
    page,
  }) => {
    const projects = await fetchLiveResearchProjects()

    await page.goto('/research')

    if (projects.length === 0) {
      await expect(
        page.getByText('Research projects will be listed here soon.', { exact: true })
      ).toBeVisible()
      await expect(page.getByTestId('research-project-title')).toHaveCount(0)
    } else {
      const titles = await page.getByTestId('research-project-title').allTextContents()
      expect(titles).toEqual(projects.map((p) => p.title ?? ''))
    }
  })

  test("the meta's count matches what's rendered", async ({ page }) => {
    const projects = await fetchLiveResearchProjects()
    const n = projects.length

    await page.goto('/research')
    const meta = await page.getByTestId('page-title-meta').innerText()
    expect(meta).toBe(`${n} ACTIVE PROJECT${n === 1 ? '' : 'S'}`)
  })

  test('every rendered cover keeps its natural aspect ratio (never cropped)', async ({ page }) => {
    await page.goto('/research')
    const covers = page.getByTestId('research-cover')
    const count = await covers.count()

    for (let i = 0; i < count; i++) {
      const cover = covers.nth(i)
      await cover.scrollIntoViewIfNeeded()
      const box = await cover.evaluate(async (img: HTMLImageElement) => {
        if (!img.complete) {
          await new Promise((resolve) => img.addEventListener('load', resolve, { once: true }))
        }
        await img.decode()
        const rect = img.getBoundingClientRect()
        return { boxAR: rect.width / rect.height, natAR: img.naturalWidth / img.naturalHeight }
      })
      expect(box.natAR, `cover ${i} box/natural aspect ratio`).toBeGreaterThan(box.boxAR * 0.98)
      expect(box.natAR, `cover ${i} box/natural aspect ratio`).toBeLessThan(box.boxAR * 1.02)
    }
  })

  test('the enquiry line links to the resolved email or /contact', async ({ page }) => {
    const email = await fetchLiveEnquiryEmail()

    await page.goto('/research')
    if (email) {
      const mailLink = page.locator(`a[href="mailto:${email}"]`)
      await expect(mailLink).toBeVisible()
    } else {
      const contactLink = page.getByRole('link', { name: 'get in touch' })
      await expect(contactLink).toHaveAttribute('href', '/contact')
    }
  })

  test.describe('no horizontal overflow', () => {
    for (const width of [320, 375, 768, 1024, 1280]) {
      test(`at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/research')
        const fits = await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
        )
        expect(fits).toBe(true)
      })
    }
  })
})

test.describe('/preview/components gallery: research', () => {
  test('renders all fixture projects, no cover cropped, no overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 })
    await page.goto('/preview/components')

    const section = page.getByTestId('gallery-research')
    await expect(section).toBeVisible()

    const titles = await section.getByTestId('research-project-title').allTextContents()
    expect(titles.length).toBe(5)

    const covers = section.getByTestId('research-cover')
    const coverCount = await covers.count()
    // 4 of the 5 fixture projects carry a cover.
    expect(coverCount).toBe(4)

    for (let i = 0; i < coverCount; i++) {
      const cover = covers.nth(i)
      await cover.scrollIntoViewIfNeeded()
      // next/image lazy-loads (image-geometry.spec.ts's own established
      // pattern) -- scrolling it into view triggers the fetch, but
      // `naturalWidth`/`naturalHeight` only populate once it has actually
      // decoded, so wait for that explicitly rather than racing it.
      const box = await cover.evaluate(async (img: HTMLImageElement) => {
        if (!img.complete) {
          await new Promise((resolve) => img.addEventListener('load', resolve, { once: true }))
        }
        await img.decode()
        const rect = img.getBoundingClientRect()
        return { boxAR: rect.width / rect.height, natAR: img.naturalWidth / img.naturalHeight }
      })
      // Not cropped: the rendered box keeps the image's real aspect ratio,
      // never squeezed or clipped into a different-shaped placeholder box.
      expect(box.natAR, `cover ${i} box/natural aspect ratio`).toBeGreaterThan(box.boxAR * 0.98)
      expect(box.natAR, `cover ${i} box/natural aspect ratio`).toBeLessThan(box.boxAR * 1.02)
    }

    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
    expect(fits).toBe(true)
  })
})
