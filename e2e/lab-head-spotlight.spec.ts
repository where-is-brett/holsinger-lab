import { expect, test } from '@playwright/test'

import { e2eClient } from './support/sanity'

test('/people renders, and the spotlight matches settings.labHead / showLabHeadOnPeople', async ({
  page,
}) => {
  // Derived from the live dataset rather than the "no lab head is set"
  // assumption this test previously hardcoded -- mirrors
  // components/pages/people/shouldShowLabHeadSpotlight.ts, so it holds
  // whether or not the upcoming Studio migration has set settings.labHead
  // yet.
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
// covered above and in the "People role grouping" test in
// e2e/publications-interactive.spec.ts, both of which already run against
// whatever settings.labHead currently is.
test.skip('/people has no spotlight and no grid entry when showLabHeadOnPeople is off', async ({
  page,
}) => {
  await page.goto('/people')
})

test('an unknown person slug 404s', async ({ page }) => {
  const response = await page.goto('/people/not-a-real-person')
  expect(response?.status()).toBe(404)
})

test('a profile with hasPage enabled renders a 200 page; otherwise its slug 404s', async ({
  page,
}) => {
  // Derived from the live dataset: finds any published profile with
  // hasPage == true and a slug, and proves it renders. If none exist yet
  // (as in live data at the time this test was written), this instead
  // proves the negative -- that a profile without hasPage set does not get
  // a page -- so the test always exercises real, current data rather than
  // skipping outright.
  // app/people/[slug]/page.tsx also 404s every person page when
  // settings.showPeople is explicitly false, so fold that in too.
  const [withPage, withoutPage, showPeople] = await Promise.all([
    e2eClient.fetch<{ slug: string; name: string } | null>(
      `*[_type == "profile" && hasPage == true && defined(slug.current)][0]{ "slug": slug.current, name }`
    ),
    e2eClient.fetch<{ slug: string } | null>(
      `*[_type == "profile" && hasPage != true && defined(slug.current)][0]{ "slug": slug.current }`
    ),
    e2eClient.fetch<boolean | null>(`*[_type == "settings"][0].showPeople`),
  ])

  if (withPage && showPeople === false) {
    const response = await page.goto(`/people/${withPage.slug}`)
    expect(response?.status()).toBe(404)
  } else if (withPage) {
    const response = await page.goto(`/people/${withPage.slug}`)
    expect(response?.status()).toBe(200)
    await expect(
      page.getByRole('heading', { level: 1, name: withPage.name, exact: true })
    ).toBeVisible()
  } else {
    test.info().annotations.push({
      type: 'skip-reason',
      description:
        'No profile with hasPage=true exists in live data yet -- asserting the negative instead.',
    })
  }

  if (withoutPage) {
    const response = await page.goto(`/people/${withoutPage.slug}`)
    expect(response?.status()).toBe(404)
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
