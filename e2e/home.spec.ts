import { expect, test } from '@playwright/test'
import { currentMemberCount } from 'components/redesign/homeModel'
import { fallbackSiteName } from 'lib/site'

import { e2eClient } from './support/sanity'

// Every assertion here is derived from the live dataset at test time (spec
// §8 / constraints.md "every e2e assertion must hold for any valid
// dataset") -- production has no resource, no labHead, and (per the task
// brief) does carry the `maestro` project and a `support-our-research`
// page today. States live data genuinely can't show (labHead set, a
// resource present) are proven instead against the `gallery-home` fixture
// at /preview/components, per constraints.md's "states the live data
// can't show go on gallery fixtures".

type LiveHome = {
  title: string | null
  siteName: string | null
}

async function fetchLiveHome(): Promise<LiveHome> {
  const data = await e2eClient.fetch<LiveHome | null>(
    `{ "title": *[_type == "home"][0].title, "siteName": *[_type == "settings"][0].siteName }`
  )
  return data ?? { title: null, siteName: null }
}

type LivePublication = { title: string; slug: string | null; date: string | null }

async function fetchLivePublications(): Promise<LivePublication[]> {
  return e2eClient.fetch<LivePublication[]>(
    `*[_type == "publication"] | order(date desc) { title, "slug": slug.current, date }`
  )
}

type LiveResource = { _id: string } | null

async function fetchLiveResource(): Promise<LiveResource> {
  return e2eClient.fetch<LiveResource>(`*[_type == "resource"] | order(title asc) [0] { _id }`)
}

type LiveMaestro = { title: string } | null

async function fetchLiveMaestro(): Promise<LiveMaestro> {
  return e2eClient.fetch<LiveMaestro>(`*[_type == "project" && slug.current == "maestro"][0]{ title }`)
}

type LiveSettings = {
  labHeadId: string | null
  showLabHeadOnHome: boolean | null
  showPublications: boolean | null
  showPeople: boolean | null
}

async function fetchLiveSettings(): Promise<LiveSettings> {
  const settings = await e2eClient.fetch<LiveSettings | null>(
    `*[_type == "settings"][0]{ "labHeadId": labHead->_id, showLabHeadOnHome, showPublications, showPeople }`
  )
  return settings ?? { labHeadId: null, showLabHeadOnHome: null, showPublications: null, showPeople: null }
}

type LiveProfile = { _id: string; roleGroupId: string | null }
type LiveRoleGroup = { _id: string; title: string | null }

async function fetchLiveMembers(): Promise<{ profiles: LiveProfile[]; roleGroups: LiveRoleGroup[] }> {
  const [profiles, roleGroups] = await Promise.all([
    e2eClient.fetch<LiveProfile[]>(
      `*[_type == "profile"]{ _id, "roleGroupId": roleGroup->_id }`
    ),
    e2eClient.fetch<LiveRoleGroup[]>(`*[_type == "roleGroup"]{ _id, title }`),
  ])
  return { profiles, roleGroups }
}

test.describe('/', () => {
  test('never 404s', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
  })

  test('the h1 equals home.title, or the site name when unset', async ({ page }) => {
    const home = await fetchLiveHome()
    const expected = home.title || home.siteName?.trim() || fallbackSiteName

    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: expected, exact: true })).toBeVisible()
  })

  test('recent-work rows are the latest min(5, n) publications by date, each linking to its paper page, and the "All N publications" count matches the live total', async ({
    page,
  }) => {
    const [publications, settings] = await Promise.all([fetchLivePublications(), fetchLiveSettings()])
    const n = publications.length
    const expectedRows = publications.slice(0, 5)
    const showRecentWork = n > 0 && settings.showPublications !== false

    await page.goto('/')

    if (!showRecentWork) {
      await expect(page.getByTestId('home-recent-work')).toHaveCount(0)
      return
    }

    const section = page.getByTestId('home-recent-work')
    await expect(section).toBeVisible()

    const titles = await section.getByTestId('pub-title').allTextContents()
    expect(titles.map((t) => t.trim())).toEqual(expectedRows.map((p) => p.title.trim()))

    for (const pub of expectedRows) {
      if (!pub.slug) continue
      const link = section.getByTestId('pub-title').filter({ hasText: pub.title.trim() })
      await expect(link).toHaveAttribute('href', `/publications/${pub.slug}`)
    }

    await expect(section.getByRole('link', { name: `All ${n} publication${n === 1 ? '' : 's'} →` })).toHaveAttribute(
      'href',
      '/publications'
    )
  })

  test('the Resources block is present exactly when a resource exists', async ({ page }) => {
    const resource = await fetchLiveResource()

    await page.goto('/')
    await expect(page.getByTestId('home-resources')).toHaveCount(resource ? 1 : 0)
  })

  test('the MAESTRO block is present exactly when the maestro document exists, with its title verbatim', async ({
    page,
  }) => {
    const maestro = await fetchLiveMaestro()

    await page.goto('/')

    if (!maestro) {
      await expect(page.getByTestId('home-maestro')).toHaveCount(0)
      return
    }

    const block = page.getByTestId('home-maestro')
    await expect(block).toBeVisible()
    // Verbatim, including any CMS typo (constraints.md) -- never trimmed,
    // normalised or "corrected" for comparison.
    await expect(page.getByTestId('maestro-title')).toHaveText(maestro.title)
  })

  test('the current-member count equals currentMemberCount computed from live profiles, roleGroups and labHead', async ({
    page,
  }) => {
    const [{ profiles, roleGroups }, settings] = await Promise.all([
      fetchLiveMembers(),
      fetchLiveSettings(),
    ])
    const expected = currentMemberCount(
      profiles.map((p) => ({ _id: p._id, roleGroup: p.roleGroupId ? { _id: p.roleGroupId, title: null } : null })),
      roleGroups,
      settings.labHeadId
    )

    await page.goto('/')
    if (settings.showPeople === false) {
      await expect(page.getByTestId('home-member-count')).toHaveCount(0)
      return
    }
    const block = page.getByTestId('home-member-count')
    await expect(block).toBeVisible()
    await expect(block).toContainText(String(expected))
  })

  test('the PI panel is present exactly when labHead is set and showLabHeadOnHome !== false', async ({
    page,
  }) => {
    const settings = await fetchLiveSettings()
    const expected = Boolean(settings.labHeadId) && settings.showLabHeadOnHome !== false

    await page.goto('/')
    await expect(page.getByTestId('home-pi-panel')).toHaveCount(expected ? 1 : 0)
  })

  test.describe('no horizontal overflow', () => {
    for (const width of [320, 375, 768, 1024, 1280]) {
      test(`at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/')
        const fits = await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
        )
        expect(fits).toBe(true)
      })
    }
  })
})

test.describe('/preview/components gallery: home', () => {
  test('every block renders, and no overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 })
    await page.goto('/preview/components')

    const section = page.getByTestId('gallery-home')
    await expect(section).toBeVisible()

    // gallery-home's fixture (fixtures.ts's HOME_* constants) sets every
    // optional block: a labHead (no portrait), one resource, the maestro
    // project, and a support page -- so all five numbered blocks render at
    // once, which live data (no resource, no labHead) never does.
    await expect(section.getByTestId('home-pi-panel')).toBeVisible()
    await expect(section.getByTestId('home-recent-work')).toBeVisible()
    await expect(section.getByTestId('home-resources')).toBeVisible()
    await expect(section.getByTestId('home-maestro')).toBeVisible()
    await expect(section.getByTestId('home-member-count')).toBeVisible()
    await expect(section.getByTestId('home-support')).toBeVisible()

    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
    expect(fits).toBe(true)
  })
})
