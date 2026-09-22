import { expect, test } from '@playwright/test'
import { enquiryEmail } from 'components/redesign/researchModel'

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

type LiveCrop = { left?: number | null; right?: number | null; top?: number | null; bottom?: number | null }

type LiveProject = {
  _id: string
  title: string | null
  coverWidth: number | null
  coverHeight: number | null
  crop: LiveCrop | null
}

async function fetchLiveResearchProjects(): Promise<LiveProject[]> {
  return e2eClient.fetch<LiveProject[]>(
    `*[_type == "project" && defined(researchOrder)] | order(researchOrder asc) {
      _id,
      title,
      "coverWidth": coverImage.asset->metadata.dimensions.width,
      "coverHeight": coverImage.asset->metadata.dimensions.height,
      "crop": coverImage.crop
    }`
  )
}

// Same crop-scaling math as researchModel.ts's own `coverView` -- the
// expected aspect ratio a rendered cover's box should have, honouring
// whatever editorial crop the project's `coverImage` carries. `null` when
// the project has no cover (no `metadata.dimensions`) at all.
function expectedCoverAspectRatio(p: LiveProject): number | null {
  if (!p.coverWidth || !p.coverHeight) return null
  const scaleW = p.crop ? 1 - (p.crop.left ?? 0) - (p.crop.right ?? 0) : 1
  const scaleH = p.crop ? 1 - (p.crop.top ?? 0) - (p.crop.bottom ?? 0) : 1
  return (p.coverWidth * scaleW) / (p.coverHeight * scaleH)
}

type LiveSettings = {
  contactEmail: string | null
  labHeadEmail: string | null
  showContactForm: boolean | null
}

async function fetchLiveSettings(): Promise<LiveSettings> {
  const settings = await e2eClient.fetch<LiveSettings | null>(
    `*[_type == "settings"][0]{
      "contactEmail": contact.email,
      "labHeadEmail": labHead->email,
      showContactForm
    }`
  )
  return settings ?? { contactEmail: null, labHeadEmail: null, showContactForm: null }
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

  // Fix round 1 ruling 3: compares the rendered `<img>` box's own aspect
  // ratio against `metadata.dimensions.aspectRatio` fetched straight from
  // `e2eClient` (crop-adjusted when the project's cover carries an
  // editorial crop) -- not against the decoded bitmap's `naturalWidth`/
  // `naturalHeight`, which depends on the image actually finishing loading
  // over the network. A box mismatch here means the component requested a
  // shape that doesn't match what the CMS record (and the editor's own
  // crop choice, if any) actually describes -- "cropped" in the sense this
  // repo cares about, regardless of whether the bytes ever arrive.
  test('every rendered cover matches its metadata aspect ratio, crop-adjusted (never cropped by the page itself)', async ({
    page,
  }) => {
    const projects = await fetchLiveResearchProjects()
    const expectedRatios = projects
      .map(expectedCoverAspectRatio)
      .filter((r): r is number => r !== null)

    await page.goto('/research')
    const covers = page.getByTestId('research-cover')
    await expect(covers).toHaveCount(expectedRatios.length)

    for (let i = 0; i < expectedRatios.length; i++) {
      const boxAR = await covers.nth(i).evaluate((img: HTMLImageElement) => {
        const rect = img.getBoundingClientRect()
        return rect.width / rect.height
      })
      expect(boxAR, `cover ${i} box aspect ratio vs metadata (crop-adjusted)`).toBeGreaterThan(
        expectedRatios[i] * 0.98
      )
      expect(boxAR, `cover ${i} box aspect ratio vs metadata (crop-adjusted)`).toBeLessThan(
        expectedRatios[i] * 1.02
      )
    }
  })

  // IMPORTANT 2 (fix round 1): the previous version of this test assumed a
  // "get in touch" link always exists when there's no resolved email --
  // false on a valid dataset where `showContactForm === false` too, where
  // the sentence has no link at all. `enquiryEmail` is the real function
  // (components/redesign/researchModel), not reimplemented here, so this
  // test can never drift from what the page itself computes.
  test('the enquiry line links to the resolved email, links to /contact, or ends with no link', async ({
    page,
  }) => {
    const settings = await fetchLiveSettings()
    const email = enquiryEmail({
      contact: { email: settings.contactEmail },
      labHead: { email: settings.labHeadEmail },
    })

    await page.goto('/research')
    const enquiries = page.getByTestId('research-enquiries')

    if (email) {
      const mailLink = page.locator(`a[href="mailto:${email}"]`)
      await expect(mailLink).toBeVisible()
    } else if (settings.showContactForm !== false) {
      const contactLink = page.getByRole('link', { name: 'get in touch' })
      await expect(contactLink).toHaveAttribute('href', '/contact')
    } else {
      await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0)
      await expect(page.getByRole('link', { name: 'get in touch' })).toHaveCount(0)
      await expect(enquiries).toContainText('Student and collaboration enquiries are welcome.')
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
  // The fixture's four covers, in fixture order (fixtures.ts's
  // RESEARCH_PROJECTS_FIXTURE) -- task brief: "0.90, 1.05, 1.40 and 2.05".
  const GALLERY_COVER_RATIOS = [0.9, 1.05, 1.4, 2.05]

  test('renders all fixture projects, no cover cropped, no overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 })
    await page.goto('/preview/components')

    const section = page.getByTestId('gallery-research')
    await expect(section).toBeVisible()

    const titles = await section.getByTestId('research-project-title').allTextContents()
    expect(titles.length).toBe(5)

    const covers = section.getByTestId('research-cover')
    await expect(covers).toHaveCount(GALLERY_COVER_RATIOS.length)

    for (let i = 0; i < GALLERY_COVER_RATIOS.length; i++) {
      const boxAR = await covers.nth(i).evaluate((img: HTMLImageElement) => {
        const rect = img.getBoundingClientRect()
        return rect.width / rect.height
      })
      // Not cropped: the rendered box keeps the fixture's own known aspect
      // ratio, never squeezed or clipped into a different-shaped box.
      expect(boxAR, `cover ${i} box aspect ratio`).toBeGreaterThan(GALLERY_COVER_RATIOS[i] * 0.98)
      expect(boxAR, `cover ${i} box aspect ratio`).toBeLessThan(GALLERY_COVER_RATIOS[i] * 1.02)
    }

    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
    expect(fits).toBe(true)
  })
})
