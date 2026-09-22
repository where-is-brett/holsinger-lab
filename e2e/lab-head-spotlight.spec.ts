import { expect, test } from '@playwright/test'

import { e2eClient } from './support/sanity'

test('/people renders, and the spotlight matches settings.labHead / showLabHeadOnPeople', async ({
  page,
}) => {
  // Derived from the live dataset rather than the "no lab head is set"
  // assumption this test previously hardcoded -- mirrors
  // components/redesign/peopleModel.ts's shouldShowLabHeadSpotlight, so it
  // holds whether or not the upcoming Studio migration has set
  // settings.labHead yet.
  const settings = await e2eClient.fetch<{
    labHeadId: string | null
    labHeadName: string | null
    showLabHeadOnPeople: boolean | null
  } | null>(
    `*[_type == "settings"][0]{
      "labHeadId": labHead->_id,
      "labHeadName": labHead->name,
      showLabHeadOnPeople
    }`
  )
  const showSpotlight = Boolean(settings?.labHeadId) && settings?.showLabHeadOnPeople !== false

  const response = await page.goto('/people')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'People', level: 1 })).toBeVisible()

  if (showSpotlight) {
    await expect(
      page.getByRole('heading', { level: 2, name: settings!.labHeadName as string, exact: true })
    ).toBeVisible()
  } else {
    await expect(page.getByText('Full profile →')).toHaveCount(0)
  }
})

// Hand-verify once settings.labHead is set and showLabHeadOnPeople is
// explicitly turned off in Studio: with it off, (unlike showLabHeadOnHome,
// which only ever affects the home page) the lab head disappears from
// /people entirely -- no spotlight, and no grid entry either. There is no
// write token or staging dataset in this environment (Global Constraints),
// so this specific off-state can't be exercised against the live dataset;
// the on-state (spotlight matches the live grouping-independent grid) is
// covered above and in e2e/people.spec.ts's own tests, all of which already
// run against whatever settings.labHead currently is.
test.skip('/people has no spotlight and no grid entry when showLabHeadOnPeople is off', async ({
  page,
}) => {
  await page.goto('/people')
})

test('an unknown person slug 404s', async ({ page }) => {
  const response = await page.goto('/people/not-a-real-person')
  expect(response?.status()).toBe(404)
})

test('every profile with hasPage enabled renders its name as the h1, with a back link to /people', async ({
  page,
}) => {
  // Task 3: derived from the live dataset -- every profile with hasPage ==
  // true, not just the first one -- so this holds whether the dataset has
  // Damian Holsinger alone (today) or a whole preview-dataset roster of
  // hasPage profiles (constraints.md, "every e2e assertion must hold for
  // any valid dataset").
  const withPages = await e2eClient.fetch<{ slug: string; name: string }[]>(
    `*[_type == "profile" && hasPage == true && defined(slug.current)]{ "slug": slug.current, name }`
  )

  test.skip(withPages.length === 0, 'no profile with hasPage=true exists in live data yet')

  for (const profile of withPages) {
    const response = await page.goto(`/people/${profile.slug}`)
    expect(response?.status()).toBe(200)
    await expect(
      page.getByRole('heading', { level: 1, name: profile.name, exact: true })
    ).toBeVisible()

    const backLink = page.getByRole('link', { name: '← All people' })
    await expect(backLink).toBeVisible()
    await expect(backLink).toHaveAttribute('href', '/people')
  }
})

test('a profile without hasPage enabled 404s', async ({ page }) => {
  // Derived from the live dataset: proves the negative -- a profile without
  // hasPage set does not get a page.
  const withoutPage = await e2eClient.fetch<{ slug: string } | null>(
    `*[_type == "profile" && hasPage != true && defined(slug.current)][0]{ "slug": slug.current }`
  )

  test.skip(!withoutPage, 'every profile in this dataset has hasPage set')

  const response = await page.goto(`/people/${withoutPage!.slug}`)
  expect(response?.status()).toBe(404)
})

test('no /people/[slug] page overflows horizontally at 320/375/768/1024/1280px', async ({
  page,
}) => {
  // Same "every real record, not just one" reasoning as
  // e2e/publication-page.spec.ts's own overflow test -- a content-dependent
  // defect (a long unbreakable token in the name or bio) can only be caught
  // by checking every live hasPage profile. Fix round 1: widths widened
  // from just 320/375 to the constraints.md standard set (320, 375, 768,
  // 1024, 1280) -- matching e2e/people.spec.ts's own overflow loop -- so
  // this covers the layout above `md`/`lg` too, not just the phone widths.
  const withPages = await e2eClient.fetch<{ slug: string }[]>(
    `*[_type == "profile" && hasPage == true && defined(slug.current)]{ "slug": slug.current }`
  )
  test.skip(withPages.length === 0, 'no profile with hasPage=true exists in live data yet')

  for (const width of [320, 375, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    for (const profile of withPages) {
      await page.goto(`/people/${profile.slug}`)
      const fits = await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
      )
      expect(fits, `/people/${profile.slug} overflows at ${width}px`).toBe(true)
    }
  }
})

test('the home page renders, and the lab-head card matches settings.labHead / showLabHeadOnHome', async ({
  page,
}) => {
  // Derived from the live dataset -- mirrors
  // components/pages/home/shouldShowLabHeadCard.ts -- rather than the
  // "no lab head is set" assumption this test previously hardcoded.
  const settings = await e2eClient.fetch<{
    labHeadId: string | null
    labHeadName: string | null
    showLabHeadOnHome: boolean | null
  } | null>(
    `*[_type == "settings"][0]{
      "labHeadId": labHead->_id,
      "labHeadName": labHead->name,
      showLabHeadOnHome
    }`
  )
  const showCard = Boolean(settings?.labHeadId) && settings?.showLabHeadOnHome !== false

  await page.goto('/')

  if (showCard) {
    await expect(
      page.getByRole('heading', {
        level: 2,
        name: `About ${settings!.labHeadName}`,
        exact: true,
      })
    ).toBeVisible()
  } else {
    // Scoped to level: 2 -- the lab-head card's own heading is an `<h2>`
    // ("About {name}"), distinct from showcase projects' `<h3>` titles. Live
    // data has previously had a showcase project literally titled "About Dr
    // Damian Holsinger" (the same project the design doc's future migration
    // deletes from home.showcaseProjects), whose `<h3>` would otherwise
    // false-match an unscoped /^About / heading query.
    await expect(
      page.getByRole('heading', { level: 2, name: /^About / })
    ).toHaveCount(0)
  }
})
