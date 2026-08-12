import { expect, test } from '@playwright/test'

// Chosen because they're real, currently-published content (confirmed via
// `npm run build` during this plan's research on 2026-08-10) — /tutorial and
// /projects/publication-highlights represent the two dynamic route families
// ([slug] and projects/[slug]) alongside the four static content routes.
const CONTENT_ROUTES = [
  '/',
  '/contact',
  '/people',
  '/publications',
  '/tutorial',
  '/projects/publication-highlights',
]

for (const path of CONTENT_ROUTES) {
  test(`${path} loads with a title and visible navigation`, async ({ page }) => {
    const response = await page.goto(path)
    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(/.+/)
    await expect(
      page.getByRole('link', { name: 'Publications' })
    ).toBeVisible()
  })
}

// Regression guard for the `timeline.hidden` toggle added in this branch
// (see the `timeline` case in components/shared/CustomPortableText.tsx).
// Every already-published timeline document has `hidden` unset, and unset
// MUST mean visible -- if that guard clause were ever inverted (e.g. from
// `if (hidden === true) return null` to `if (hidden !== true) return null`),
// every existing timeline would silently vanish from the live site. The unit
// test alone can't catch this (it only checks the source text for a
// forbidden pattern), so this was written to assert the actual rendered
// content on "the one live page that has a timeline",
// /projects/about-dr-damian-holsinger.
//
// SKIPPED as of 2026-08-12: that page's `description` field no longer
// contains any `timeline` block, confirmed directly against the live
// dataset --
// `*[_type=="project"]{slug, "timelineBlocks": description[_type=="timeline"]}`
// returns an empty (or null) `timelineBlocks` array for all five published
// projects, not just this one. This is content drift, not a code
// regression: nothing in this branch or since removed the timeline: the
// live content itself no longer has one for this guard to render. Since
// this repo's e2e suite only runs against the single live published
// dataset (no write token, no staging dataset -- see
// docs/superpowers/plans/2026-08-11-phase-3b-studio-doi-rolegroup.md's
// recorded lesson on this), there is currently no way to exercise this
// path without fabricating content.
//
// Re-enable once any project's `description` field has a published
// `timeline` block with `hidden` unset or `false`: point this test at that
// project's slug and swap in its actual milestone titles.
test.skip('the timeline on /projects/about-dr-damian-holsinger still renders when hidden is unset', async ({
  page,
}) => {
  await page.goto('/projects/about-dr-damian-holsinger')
  await expect(
    page.getByText('Project Launch', { exact: true })
  ).toBeVisible()
  await expect(
    page.getByText('Sample Collection', { exact: true })
  ).toBeVisible()
  await expect(
    page.getByText('Data Entry and Analysis', { exact: true })
  ).toBeVisible()
  await expect(
    page.getByText('Analysis and Report', { exact: true })
  ).toBeVisible()
})
