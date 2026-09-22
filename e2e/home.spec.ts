import { expect, type Locator, test } from '@playwright/test'
import { currentMemberCount } from 'components/redesign/homeModel'
import { resolveBranding } from 'lib/branding'

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
  showLabHeadOnPeople: boolean | null
  showPublications: boolean | null
  showPeople: boolean | null
}

async function fetchLiveSettings(): Promise<LiveSettings> {
  const settings = await e2eClient.fetch<LiveSettings | null>(
    `*[_type == "settings"][0]{
      "labHeadId": labHead->_id,
      showLabHeadOnHome,
      showLabHeadOnPeople,
      showPublications,
      showPeople
    }`
  )
  return (
    settings ?? {
      labHeadId: null,
      showLabHeadOnHome: null,
      showLabHeadOnPeople: null,
      showPublications: null,
      showPeople: null,
    }
  )
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

// Fix round 2, point 2: `toContainText(String(n))` is a substring check --
// "14" satisfies an expected "4", "23" satisfies an expected "3", and so
// on, which a live member count changing over time could silently start
// passing for the wrong reason. Reads the exact leading digit run out of
// the "N — PEOPLE →" link's own text and compares it numerically instead,
// the same approach the gallery test below (`countText`) already uses.
async function readMemberCount(block: Locator): Promise<number> {
  return block
    .locator('a')
    .first()
    .evaluate((node) => {
      const match = node.textContent?.match(/\d+/)
      if (!match) throw new Error('no digit found in member-count link text')
      return Number(match[0])
    })
}

test.describe('/', () => {
  test('never 404s', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
  })

  test('the h1 equals home.title, or the site name when unset', async ({ page }) => {
    const home = await fetchLiveHome()
    // `resolveBranding` (lib/branding.ts), not a re-implementation of its
    // own fallback chain -- the one function that owns "whitespace-only
    // counts as unset, fall back to fallbackSiteName" (fix round 1, point
    // 2). `home.title?.trim() || siteName` mirrors Home.tsx's own
    // `IdentityBlock` (fix round 1, point 3: a whitespace-only `home.title`
    // is also treated as unset).
    const { siteName } = resolveBranding({ siteName: home.siteName })
    const expected = home.title?.trim() || siteName

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

    const rows = section.getByTestId('pub-title')
    const titles = await rows.allTextContents()
    expect(titles.map((t) => t.trim())).toEqual(expectedRows.map((p) => p.title.trim()))

    // Fix round 1, point 1: `nth(i)` by index, not `.filter({ hasText })`
    // -- substring matching trips Playwright's strict mode whenever one
    // title is itself a substring of another (or of a longer title later
    // in the list), which a live 19-record dataset makes entirely
    // possible. Index order is already proven equal to `expectedRows`'
    // order by the `titles` assertion above.
    for (let i = 0; i < expectedRows.length; i++) {
      const pub = expectedRows[i]
      if (!pub.slug) continue
      await expect(rows.nth(i)).toHaveAttribute('href', `/publications/${pub.slug}`)
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

  test('the current-member count equals currentMemberCount computed from live profiles, roleGroups and labHead, excluding the PI only when the PI panel itself is showing', async ({
    page,
  }) => {
    const [{ profiles, roleGroups }, settings] = await Promise.all([
      fetchLiveMembers(),
      fetchLiveSettings(),
    ])
    // Mirrors Home.tsx's own `showPiPanel` gate exactly (fix round 1,
    // IMPORTANT 1) -- the PI is excluded from the count only when Home's
    // own PI panel is the reason she isn't double-counted, not merely
    // because `labHead` happens to be set.
    const showPiPanel = Boolean(settings.labHeadId) && settings.showLabHeadOnHome !== false
    const expected = currentMemberCount(
      profiles.map((p) => ({ _id: p._id, roleGroup: p.roleGroupId ? { _id: p.roleGroupId, title: null } : null })),
      roleGroups,
      showPiPanel ? settings.labHeadId : null
    )

    await page.goto('/')
    if (!(settings.showPeople !== false && expected > 0)) {
      await expect(page.getByTestId('home-member-count')).toHaveCount(0)
      return
    }
    const block = page.getByTestId('home-member-count')
    await expect(block).toBeVisible()
    expect(await readMemberCount(block)).toBe(expected)
  })

  // Fix round 1, IMPORTANT 1: cross-checks Home's own rendered count
  // against /people's own rendered "N CURRENT MEMBERS" meta, rather than
  // re-deriving the same rule a second time (which couldn't have caught
  // the original bug -- both implementations agreed with each other while
  // disagreeing with /people). Only compared when the two pages' lab-head
  // visibility flags agree (both pages then exclude, or both include, the
  // same person) and both member-count elements are actually rendered --
  // when the flags genuinely differ, the two pages are allowed to show
  // different numbers (one page's PI is visible there and not the other),
  // which is a valid configuration, not a bug.
  test("the current-member count equals /people's own rendered count, whenever the two pages' lab-head visibility agree and both blocks are visible", async ({
    page,
  }) => {
    const settings = await fetchLiveSettings()
    const homeShowsPi = Boolean(settings.labHeadId) && settings.showLabHeadOnHome !== false
    const peopleShowsSpotlight = Boolean(settings.labHeadId) && settings.showLabHeadOnPeople !== false
    test.skip(
      homeShowsPi !== peopleShowsSpotlight,
      'showLabHeadOnHome and showLabHeadOnPeople disagree in this dataset -- the two pages are allowed to differ'
    )

    const peopleResponse = await page.goto('/people')
    test.skip(peopleResponse?.status() !== 200, '/people 404s under current settings (showPeople is false)')
    const peopleMeta = await page.getByTestId('page-title-meta').innerText()
    const match = peopleMeta.match(/(\d+)\s+CURRENT MEMBERS?/)
    test.skip(!match, `/people's meta "${peopleMeta}" has no "N CURRENT MEMBER(S)" segment`)
    const peopleCount = Number(match![1])

    await page.goto('/')
    const homeBlock = page.getByTestId('home-member-count')
    test.skip((await homeBlock.count()) === 0, "Home's member-count block isn't rendered under current settings")
    expect(await readMemberCount(homeBlock)).toBe(peopleCount)
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

    // Instance (a): fixtures.ts's HOME_* constants set every optional
    // block: a labHead (no portrait), one resource, the maestro project,
    // and a support page -- so all five numbered blocks render at once,
    // which live data (no resource, no labHead) never does.
    const a = section.getByTestId('gallery-home-a')
    await expect(a.getByTestId('home-pi-panel')).toBeVisible()
    await expect(a.getByTestId('home-recent-work')).toBeVisible()
    await expect(a.getByTestId('home-resources')).toBeVisible()
    await expect(a.getByTestId('home-maestro')).toBeVisible()
    await expect(a.getByTestId('home-member-count')).toBeVisible()
    await expect(a.getByTestId('home-support')).toBeVisible()

    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
    expect(fits).toBe(true)
  })

  // Fix round 1, IMPORTANT 1: instance (b) is the exact shape of the bug
  // this fixes -- labHead set, showLabHeadOnHome false. No PI panel, and
  // the PI must now count as an ordinary member: (b)'s count is (a)'s
  // count plus exactly one.
  test('(b) labHead hidden (showLabHeadOnHome: false): no PI panel, and the member count includes the PI', async ({
    page,
  }) => {
    await page.goto('/preview/components')

    const a = page.getByTestId('gallery-home-a')
    const b = page.getByTestId('gallery-home-b')

    await expect(b.getByTestId('home-pi-panel')).toHaveCount(0)
    await expect(b.getByTestId('home-member-count')).toBeVisible()

    const countA = await readMemberCount(a.getByTestId('home-member-count'))
    const countB = await readMemberCount(b.getByTestId('home-member-count'))
    expect(countB).toBe(countA + 1)
  })
})
