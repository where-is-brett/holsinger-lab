import { expect, test } from '@playwright/test'
import { isAlumniGroup } from 'components/redesign/peopleModel'

import { e2eClient } from './support/sanity'

// Every assertion here is derived from the live dataset at test time (spec
// §5, task 2 brief, constraints.md "every e2e assertion must hold for any
// valid dataset") -- today's production shape (20 profiles, 6 roleGroups,
// settings.labHead unset) and the upcoming ~42-profile Wix-import shape
// alike. Content-shaped states the live data can't show (a two-paragraph
// bio, 22 alumni, 10 photo-less interns with roleDetail) are covered instead
// by the gallery fixture in e2e/redesign-components.spec.ts.

type LiveProfile = {
  _id: string
  name: string | null
  hasPage: boolean | null
  slug: string | null
  roleGroupId: string | null
}
type LiveRoleGroup = { _id: string; title: string | null }
type LiveSettings = {
  labHeadId: string | null
  labHeadName: string | null
  showLabHeadOnPeople: boolean | null
}

async function fetchLiveData() {
  const [profiles, roleGroups, settings] = await Promise.all([
    e2eClient.fetch<LiveProfile[]>(
      // `order(orderRank)` matters: without it, Sanity's default document
      // order does not match the page's own `profileQuery`, which orders by
      // orderRank (lib/sanity.queries.ts) -- this bit both the Members grid
      // order and the Alumni paragraph order before this fix.
      `*[_type == "profile"] | order(orderRank) { _id, name, hasPage, "slug": slug.current, "roleGroupId": roleGroup->_id }`
    ),
    e2eClient.fetch<LiveRoleGroup[]>(`*[_type == "roleGroup"] | order(orderRank) { _id, title }`),
    e2eClient.fetch<LiveSettings | null>(
      `*[_type == "settings"][0]{ "labHeadId": labHead->_id, "labHeadName": labHead->name, showLabHeadOnPeople }`
    ),
  ])
  return { profiles, roleGroups, settings }
}

// Mirrors components/redesign/peopleModel.ts's groupByRoleGroup/splitAlumni
// exactly -- one bucket per roleGroup (orderRank order) plus a trailing
// "Other" catch-all, alumni buckets pulled out into a flat ordered list.
function computeSections(profiles: LiveProfile[], roleGroups: LiveRoleGroup[]) {
  type Bucket = { id: string; title: string | null; profiles: LiveProfile[] }
  const buckets: Bucket[] = roleGroups.map((g) => ({ id: g._id, title: g.title, profiles: [] }))
  const other: Bucket = { id: 'other', title: 'Other', profiles: [] }
  for (const profile of profiles) {
    const bucket = buckets.find((b) => b.id === profile.roleGroupId)
    ;(bucket ?? other).profiles.push(profile)
  }
  const nonEmpty = [...buckets, other].filter((b) => b.profiles.length > 0)
  const sections =
    nonEmpty.length === 1 && nonEmpty[0].id === 'other'
      ? [{ ...nonEmpty[0], title: null as string | null }]
      : nonEmpty

  const members = sections.filter((s) => !isAlumniGroup(s.title))
  const alumni = sections.filter((s) => isAlumniGroup(s.title)).flatMap((s) => s.profiles)
  return { members, alumni }
}

test.describe('/people', () => {
  test('every profile renders exactly once -- as a card, an alumni name, or the spotlight', async ({
    page,
  }) => {
    const { profiles, roleGroups, settings } = await fetchLiveData()
    const showSpotlight = Boolean(settings?.labHeadId) && settings?.showLabHeadOnPeople !== false
    const labHeadId = settings?.labHeadId ?? null

    const gridProfiles =
      showSpotlight && labHeadId ? profiles.filter((p) => p._id !== labHeadId) : profiles
    const { members, alumni } = computeSections(gridProfiles, roleGroups)

    await page.goto('/people')

    const cardNames = await page.getByTestId('person-card').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-name'))
    )
    const alumniSection = page.getByTestId('people-alumni')
    const alumniNames =
      (await alumniSection.count()) > 0
        ? (await alumniSection.locator('p').innerText()).split(', ').filter(Boolean)
        : []
    const spotlightName = (await page.getByTestId('people-spotlight').count()) > 0
      ? await page.getByTestId('people-spotlight').getAttribute('data-name')
      : null

    const expectedCardNames = members.flatMap((s) => s.profiles.map((p) => p.name))
    expect(cardNames.sort()).toEqual(expectedCardNames.sort())

    const expectedAlumniNames = alumni.map((p) => p.name)
    expect(alumniNames).toEqual(expectedAlumniNames)

    if (showSpotlight) {
      expect(spotlightName).toBe(settings!.labHeadName)
    } else {
      expect(spotlightName).toBeNull()
    }

    // Every profile the page is meant to show renders exactly once, across
    // the three surfaces combined.
    const allRendered = [...cardNames, ...alumniNames, ...(spotlightName ? [spotlightName] : [])]
    expect(allRendered.length).toBe(profiles.length)
  })

  test('member section headings appear in roleGroup orderRank order, alumni excluded', async ({
    page,
  }) => {
    const { profiles, roleGroups } = await fetchLiveData()
    const { members } = computeSections(profiles, roleGroups)
    const expectedTitles = members.map((s) => s.title).filter((t): t is string => Boolean(t))

    await page.goto('/people')
    const renderedTitles = await page.getByTestId('people-section-title').allTextContents()
    expect(renderedTitles).toEqual(expectedTitles)
  })

  test('alumni names appear in the alumni paragraph, in the group order', async ({ page }) => {
    const { profiles, roleGroups } = await fetchLiveData()
    const { alumni } = computeSections(profiles, roleGroups)
    test.skip(alumni.length === 0, 'no Lab Alumni group in this dataset')

    await page.goto('/people')
    const text = await page.getByTestId('people-alumni').locator('p').innerText()
    const names = text.split(', ').filter(Boolean)
    expect(names).toEqual(alumni.map((p) => p.name))
  })

  test('the spotlight is present exactly when labHead is set and showLabHeadOnPeople is not false', async ({
    page,
  }) => {
    const { settings } = await fetchLiveData()
    const showSpotlight = Boolean(settings?.labHeadId) && settings?.showLabHeadOnPeople !== false

    await page.goto('/people')
    const count = await page.getByTestId('people-spotlight').count()
    expect(count).toBe(showSpotlight ? 1 : 0)
  })

  test("the meta's member count equals the number of rendered cards", async ({ page }) => {
    await page.goto('/people')
    const cardCount = await page.getByTestId('person-card').count()
    const meta = await page.getByText(/CURRENT MEMBER/).innerText()
    const n = Number(meta.match(/(\d+)\s+CURRENT MEMBER/)![1])
    expect(n).toBe(cardCount)
  })

  test.describe('no horizontal overflow', () => {
    for (const width of [320, 375, 768, 1024, 1280]) {
      test(`at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/people')
        const fits = await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
        )
        expect(fits).toBe(true)
      })
    }
  })
})
