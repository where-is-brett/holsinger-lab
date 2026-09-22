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

// Fix round 1 (IMPORTANT 1): whether the spotlight renders, and which
// profiles the grid/alumni computation should even see, must be derived
// together -- once settings.labHead is set, the PI (the only `roleGroup:
// null` profile in production today) is excluded from `gridProfiles` before
// grouping, which can turn a populated "Other" section into an empty one
// that the page correctly omits. Computing `showSpotlight` in one test and
// feeding ALL profiles (lab head included) into computeSections in another
// produced a mismatch. Every test below goes through this one helper.
function deriveGridProfiles(profiles: LiveProfile[], settings: LiveSettings | null) {
  const showSpotlight = Boolean(settings?.labHeadId) && settings?.showLabHeadOnPeople !== false
  const labHeadId = settings?.labHeadId ?? null
  const gridProfiles =
    showSpotlight && labHeadId ? profiles.filter((p) => p._id !== labHeadId) : profiles
  return { showSpotlight, gridProfiles }
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

// Reads each alumni entry's own `data-name` rather than the paragraph's
// rendered text -- a name can itself contain ", " (e.g. a "Smith, Jr."
// suffix), so splitting `innerText()` on ", " is not a safe inverse of how
// AlumniBlock joins names for display.
async function alumniNames(page: import('@playwright/test').Page) {
  return page
    .getByTestId('people-alumni')
    .getByTestId('alumni-name')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-name')))
}

test.describe('/people', () => {
  test('every profile renders exactly once -- as a card, an alumni name, or the spotlight', async ({
    page,
  }) => {
    const { profiles, roleGroups, settings } = await fetchLiveData()
    const { showSpotlight, gridProfiles } = deriveGridProfiles(profiles, settings)
    const { members, alumni } = computeSections(gridProfiles, roleGroups)

    await page.goto('/people')

    const cardNames = await page.getByTestId('person-card').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-name'))
    )
    const renderedAlumniNames = await alumniNames(page)
    const spotlightName = (await page.getByTestId('people-spotlight').count()) > 0
      ? await page.getByTestId('people-spotlight').getAttribute('data-name')
      : null

    const expectedCardNames = members.flatMap((s) => s.profiles.map((p) => p.name))
    expect(cardNames.sort()).toEqual(expectedCardNames.sort())

    const expectedAlumniNames = alumni.map((p) => p.name)
    expect(renderedAlumniNames).toEqual(expectedAlumniNames)

    if (showSpotlight) {
      expect(spotlightName).toBe(settings!.labHeadName)
    } else {
      expect(spotlightName).toBeNull()
    }

    // Every profile the page is meant to show renders exactly once, across
    // the three surfaces combined.
    const allRendered = [
      ...cardNames,
      ...renderedAlumniNames,
      ...(spotlightName ? [spotlightName] : []),
    ]
    expect(allRendered.length).toBe(profiles.length)
  })

  test('member section headings appear in roleGroup orderRank order, alumni excluded', async ({
    page,
  }) => {
    const { profiles, roleGroups, settings } = await fetchLiveData()
    const { gridProfiles } = deriveGridProfiles(profiles, settings)
    const { members } = computeSections(gridProfiles, roleGroups)
    const expectedTitles = members.map((s) => s.title).filter((t): t is string => Boolean(t))

    await page.goto('/people')
    const renderedTitles = await page.getByTestId('people-section-title').allTextContents()
    expect(renderedTitles).toEqual(expectedTitles)
  })

  test('alumni names appear in the alumni paragraph, in the group order', async ({ page }) => {
    const { profiles, roleGroups, settings } = await fetchLiveData()
    const { gridProfiles } = deriveGridProfiles(profiles, settings)
    const { alumni } = computeSections(gridProfiles, roleGroups)
    test.skip(alumni.length === 0, 'no Lab Alumni group in this dataset')

    await page.goto('/people')
    const names = await alumniNames(page)
    expect(names).toEqual(alumni.map((p) => p.name))
  })

  test('the spotlight is present exactly when labHead is set and showLabHeadOnPeople is not false', async ({
    page,
  }) => {
    const { profiles, settings } = await fetchLiveData()
    const { showSpotlight } = deriveGridProfiles(profiles, settings)

    await page.goto('/people')
    const count = await page.getByTestId('people-spotlight').count()
    expect(count).toBe(showSpotlight ? 1 : 0)
  })

  test("the meta's member count and group count match what's rendered", async ({ page }) => {
    const { profiles, roleGroups, settings } = await fetchLiveData()
    const { showSpotlight, gridProfiles } = deriveGridProfiles(profiles, settings)
    const { members } = computeSections(gridProfiles, roleGroups)
    const expectedN = members.reduce((total, s) => total + s.profiles.length, 0)
    // The untitled-section rule (People.tsx's own `g` comment): a trailing
    // ungrouped section counts as a group only when it has a title --
    // computeSections already nulls the catch-all's title when it's the
    // only section left, so counting titled sections handles both cases.
    const expectedG = members.filter((s) => s.title).length

    await page.goto('/people')
    const cardCount = await page.getByTestId('person-card').count()
    const meta = await page.getByText(/CURRENT MEMBER/).innerText()
    const n = Number(meta.match(/(\d+)\s+CURRENT MEMBER/)![1])
    const g = Number(meta.match(/(\d+)\s+GROUPS?/)![1])
    expect(n).toBe(cardCount)
    expect(n).toBe(expectedN)
    expect(g).toBe(expectedG)
    expect(meta.startsWith('LAB HEAD + ')).toBe(showSpotlight)
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
