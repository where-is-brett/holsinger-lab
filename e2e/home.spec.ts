import { expect, type Locator, test } from '@playwright/test'
import { HOME_SITE_COPY_THEMES_FIXTURE, MIXED_COVERS_RESEARCH_PROJECTS_FIXTURE } from 'components/redesign/fixtures'
import { currentMemberCount, homeStatement, IA_TAGLINE, shouldShowLabHeadCard } from 'components/redesign/homeModel'
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
  labHeadName: string | null
  showLabHeadOnHome: boolean | null
  showLabHeadOnPeople: boolean | null
  showPublications: boolean | null
  showPeople: boolean | null
}

async function fetchLiveSettings(): Promise<LiveSettings> {
  const settings = await e2eClient.fetch<LiveSettings | null>(
    `*[_type == "settings"][0]{
      "labHeadId": labHead->_id,
      "labHeadName": labHead->name,
      showLabHeadOnHome,
      showLabHeadOnPeople,
      showPublications,
      showPeople
    }`
  )
  return (
    settings ?? {
      labHeadId: null,
      labHeadName: null,
      showLabHeadOnHome: null,
      showLabHeadOnPeople: null,
      showPublications: null,
      showPeople: null,
    }
  )
}

// The single shared gate (`shouldShowLabHeadCard`, homeModel.ts), fed from
// the live `labHead->{_id, name}` reference -- every e2e mirror of "is the
// lab-head card showing" goes through this one call instead of
// re-deriving the `labHeadId`-only rule.
function liveShowsLabHeadCard(settings: LiveSettings): boolean {
  return shouldShowLabHeadCard({
    labHead: settings.labHeadId ? { _id: settings.labHeadId, name: settings.labHeadName } : null,
    showLabHeadOnHome: settings.showLabHeadOnHome,
  })
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

  test('recent papers: newest is the lead; the next four are rows; unslugged lead is unlinked', async ({
    page,
  }) => {
    const publications = await fetchLivePublications()
    const settings = await fetchLiveSettings()
    const n = publications.length
    const showRecentWork = n > 0 && settings.showPublications !== false
    const pubs = publications.slice(0, 5)

    await page.goto('/')

    if (!showRecentWork) {
      await expect(page.getByTestId('home-recent-work')).toHaveCount(0)
      await expect(page.getByTestId('home-lead-paper')).toHaveCount(0)
      return
    }

    const section = page.getByTestId('home-recent-work')
    await expect(section).toBeVisible()

    const lead = page.getByTestId('home-lead-paper')
    await expect(lead.locator('h3')).toContainText(pubs[0].title.trim().slice(0, 40))
    await expect(lead.locator('h3 a')).toHaveCount(pubs[0].slug ? 1 : 0)
    if (pubs[0].slug) {
      await expect(lead.locator('h3 a')).toHaveAttribute('href', `/publications/${pubs[0].slug}`)
    }

    const restRows = section.getByTestId('pub-row')
    await expect(restRows).toHaveCount(pubs.length - 1)

    const rows = restRows.getByTestId('pub-title')
    const titles = await rows.allTextContents()
    expect(titles.map((t) => t.trim())).toEqual(pubs.slice(1).map((p) => p.title.trim()))

    // Index by `nth(i)`, not `.filter({ hasText })` -- substring matching
    // trips strict mode when one title is a substring of another. Order is
    // already proven by the `titles` assertion above.
    for (let i = 0; i < pubs.length - 1; i++) {
      const pub = pubs[i + 1]
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

  test('the current-member count equals currentMemberCount computed from live profiles, roleGroups and labHead, excluding the PI only when the lab-head card itself is showing', async ({
    page,
  }) => {
    const [{ profiles, roleGroups }, settings] = await Promise.all([
      fetchLiveMembers(),
      fetchLiveSettings(),
    ])
    // Mirrors Home.tsx's own gate exactly -- the PI is excluded from the
    // count only when the hero's own lab-head card is the reason she
    // isn't double-counted, not merely because `labHead` happens to be
    // set.
    const showLabHeadCard = liveShowsLabHeadCard(settings)
    const expected = currentMemberCount(
      profiles.map((p) => ({ _id: p._id, roleGroup: p.roleGroupId ? { _id: p.roleGroupId, title: null } : null })),
      roleGroups,
      showLabHeadCard ? settings.labHeadId : null
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

  // Cross-checks Home's own rendered count against /people's own rendered
  // "N current members" meta, rather than re-deriving the same rule a
  // second time -- two independent implementations agreeing is a stronger
  // signal than one re-derivation agreeing with itself. Only compared when
  // the two pages' lab-head visibility flags agree; when they genuinely
  // differ, the pages are allowed to show different numbers.
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
    const match = peopleMeta.match(/(\d+)\s+current members?/i)
    test.skip(!match, `/people's meta "${peopleMeta}" has no "N CURRENT MEMBER(S)" segment`)
    const peopleCount = Number(match![1])

    await page.goto('/')
    const homeBlock = page.getByTestId('home-member-count')
    test.skip((await homeBlock.count()) === 0, "Home's member-count block isn't rendered under current settings")
    expect(await readMemberCount(homeBlock)).toBe(peopleCount)
  })

  test('the lab-head card is present exactly when shouldShowLabHeadCard says so', async ({
    page,
  }) => {
    const settings = await fetchLiveSettings()
    const expected = liveShowsLabHeadCard(settings)

    await page.goto('/')
    await expect(page.getByTestId('home-lab-head-card')).toHaveCount(expected ? 1 : 0)
  })

  test('hero: statement comes from siteCopy → hero.subheading → home.overview → IA tagline', async ({ page }) => {
    const siteCopy = await e2eClient.fetch(`*[_type=="siteCopy"][0]{hero{subheading}, about{body}}`)
    const home = await e2eClient.fetch(`*[_type=="home"][0]{overview}`)
    await page.goto('/')
    const text = (await page.getByTestId('home-statement').innerText()).replace(/\s+/g, ' ').trim()
    expect(text.length).toBeGreaterThan(0)
    // Recompute the expected chain with the same pure function the screen
    // uses, normalising its whitespace the same way the rendered text is
    // normalised above -- `homeStatement` only `.trim()`s a bare
    // `hero.subheading`, so a subheading with a double space or a newline
    // would otherwise still differ from what the browser renders.
    const expected = homeStatement(siteCopy, home?.overview).replace(/\s+/g, ' ').trim()
    expect(text).toBe(expected)
  })

  test('hero: lab-head card shows only the parts that are set, with the PI named exactly once in <main>', async ({
    page,
  }) => {
    const s = await e2eClient.fetch(`*[_type=="settings"][0]{showLabHeadOnHome, labHead->{name, role, email, image}}`)
    await page.goto('/')
    const card = page.getByTestId('home-lab-head-card')
    const shown = shouldShowLabHeadCard({
      labHead: s?.labHead ? { _id: 'live', name: s.labHead.name } : null,
      showLabHeadOnHome: s?.showLabHeadOnHome,
    })
    await expect(card).toHaveCount(shown ? 1 : 0)
    if (!shown) return
    const name = s.labHead.name.trim()
    await expect(card.getByTestId('home-lab-head-link')).toContainText(name)
    if (s.labHead.role?.trim()) await expect(card).toContainText(s.labHead.role.trim())
    const email = s.labHead.email?.trim()
    await expect(card.locator('a[href^="mailto:"]')).toHaveCount(email ? 1 : 0)
    await expect(card.locator('a[href="mailto:undefined"], a[href="mailto:null"]')).toHaveCount(0)

    const mainText = await page.locator('main').innerText()
    expect(mainText.split(name).length - 1).toBe(1)
  })

  test('research cards come from researchOrder projects, else siteCopy themes, else no block', async ({
    page,
  }) => {
    const rawProjects = await e2eClient.fetch<{ title: string | null; slug: string | null }[]>(
      `*[_type=="project" && defined(researchOrder)]|order(researchOrder asc){title, "slug": slug.current}`
    )
    const rawThemes = await e2eClient.fetch<{ title: string | null }[] | null>(
      `*[_type=="siteCopy"][0].about.themes[defined(title) && title != ""]{title}`
    )
    // `researchCards` (homeModel.ts) drops a project or a theme whose title
    // is blank (or unset) after trimming -- there's nothing for its card
    // to say -- so this filters the same way the function does to avoid a
    // count mismatch on that edge case. Per `toResearchView`'s
    // `title: p.title ?? ''` (researchModel.ts), a project's title is
    // never actually `null` by the time it reaches `researchCards`, but
    // the live query itself can return one, so the filter still guards it.
    const projects = rawProjects.filter((p) => p.title?.trim())
    const themes = (rawThemes ?? []).filter((t) => t.title?.trim())
    await page.goto('/')
    const cards = page.getByTestId('home-research-card')
    if (rawProjects.length > 0) {
      // `researchCards` picks the projects branch whenever there's at
      // least one researchOrder project, even if every one of them is
      // untitled -- themes are never consulted in that case. `cards`
      // reflects the *filtered* (titled) list, since an untitled project
      // renders no card at all.
      await expect(cards).toHaveCount(projects.length)
      for (const [i, p] of projects.entries()) {
        await expect(cards.nth(i).locator('h3')).toContainText(p.title!.trim())
        if (p.slug) await expect(cards.nth(i).locator(`h3 a[href="/research#${p.slug}"]`)).toHaveCount(1)
      }
    } else if (themes.length > 0) {
      await expect(cards).toHaveCount(themes.length)
      await expect(cards.locator('h3 a')).toHaveCount(0)
    } else {
      await expect(page.getByTestId('home-research')).toHaveCount(0)
    }
  })

  test('/research#<slug> targets land at the sticky header edge, at 1280 and 375px', async ({ page }) => {
    await page.goto('/')
    const hrefs = await page
      .getByTestId('home-research-card')
      .locator('h3 a')
      .evaluateAll((as) => as.map((a) => a.getAttribute('href')))
    const anchors = hrefs.filter((h): h is string => Boolean(h?.includes('#')))
    // Holds for any valid dataset: one with no researchOrder projects has
    // no slugged card links to check.
    test.skip(anchors.length === 0, 'no /research#<slug> card links in this dataset')

    for (const width of [1280, 375]) {
      await page.setViewportSize({ width, height: 900 })
      for (const href of anchors) {
        await page.goto(href)
        const id = href.split('#')[1]
        // Asserted on the anchor target itself (the `Section` carrying
        // `id`), not the heading inside it -- the heading sits a further
        // `padTop` below the section's own top, which is taller than the
        // header on every breakpoint here, so a heading-based assertion
        // would still pass with the section's `scroll-margin-top` removed
        // entirely. The target's own top landing at the header's bottom
        // edge (within a few px) is what actually proves the
        // scroll-margin took effect.
        const target = page.locator(`[id="${id}"]`)
        await expect(target).toHaveCount(1)
        const [headerBox, targetBox, scroll] = await Promise.all([
          page.getByTestId('site-header').boundingBox(),
          target.boundingBox(),
          page.evaluate(() => ({
            y: window.scrollY,
            max: document.documentElement.scrollHeight - window.innerHeight,
          })),
        ])
        if (!headerBox || !targetBox) throw new Error('missing bounding box for header or anchor target')
        const headerBottom = headerBox.y + headerBox.height
        expect(targetBox.y).toBeGreaterThanOrEqual(headerBottom - 1)
        // The upper bound only holds when the browser could actually
        // scroll the target all the way to the header's edge -- the last
        // anchor on a short page can be within one viewport of the
        // document's bottom, where the page has already hit its maximum
        // scroll position before the target reaches the header. The lower
        // bound above still holds unconditionally: the header never
        // covers the target either way.
        if (scroll.y < scroll.max - 1) {
          expect(targetBox.y).toBeLessThanOrEqual(headerBottom + 4)
        }
      }
    }
  })

  // Dataset-independent: the anchor test above skips whenever there are no
  // researchOrder projects (production/CI today), so it never actually
  // runs there -- this always does, since `/preview/components` renders
  // `Research`'s `id="fixture-research-*"` Sections
  // (`RESEARCH_PROJECTS_FIXTURE`) regardless of live content. That route
  // has no sticky header of its own (confirmed: no `site-header` testid
  // renders there), so a fragment navigation there lands the section at
  // its own `scroll-margin-top` value, not at a real header's bottom
  // edge -- this measures the live header's height on `/` only to get
  // that value, then checks the gallery section's top against it. In
  // other words, this asserts "top ≈ --nav-height", not "top is below a
  // header" (the anchor test above is what proves the latter, whenever it
  // can run).
  test('an id-bearing Section lands at --nav-height on anchor navigation, measured against the live header height (dataset-independent)', async ({
    page,
  }) => {
    for (const width of [1280, 375]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')
      const header = await page.getByTestId('site-header').boundingBox()
      if (!header) throw new Error('missing site-header box')
      await page.goto('/preview/components#fixture-research-1')
      const box = await page.locator('#fixture-research-1').boundingBox()
      if (!box) throw new Error('missing anchor target box')
      expect(box.y).toBeGreaterThanOrEqual(header.height - 1)
      expect(box.y).toBeLessThanOrEqual(header.height + 4)
    }
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

  // The document-level `scrollWidth`-vs-`clientWidth` check above cannot
  // see a cell that overflows its own grid track without ever growing the
  // page past the viewport, so this checks each publication row's cells
  // directly. Home only ever renders the comfortable-density `home`
  // variant, so there's no need to exempt a truncating compact mode here.
  test.describe('publication ledger cells never overflow their own track', () => {
    for (const width of [1024, 1280, 1440]) {
      test(`at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/')
        const overflowing = await page.evaluate(() => {
          const rows = document.querySelectorAll('[data-testid="pub-row"]')
          const found: { tag: string; text: string; overflowPx: number }[] = []
          for (const row of rows) {
            for (const el of row.querySelectorAll('*')) {
              const overflowPx = el.scrollWidth - el.clientWidth
              if (overflowPx > 1) {
                found.push({ tag: el.tagName, text: (el.textContent ?? '').slice(0, 60), overflowPx })
              }
            }
          }
          return found
        })
        expect(overflowing, JSON.stringify(overflowing)).toEqual([])
      })
    }
  })
})

test.describe('/preview/components gallery: home', () => {
  test('gallery: an unslugged lead paper renders an unlinked title', async ({ page }) => {
    await page.goto('/preview/components')
    const lead = page.getByTestId('gallery-home-unslugged').getByTestId('home-lead-paper')
    await expect(lead.locator('h3')).toBeVisible()
    await expect(lead.locator('h3 a')).toHaveCount(0)
    await expect(lead.locator('a[href="null"], a[href=""]')).toHaveCount(0)
  })

  test('every block renders, and no overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 })
    await page.goto('/preview/components')

    const section = page.getByTestId('gallery-home')
    await expect(section).toBeVisible()

    // Instance (a): fixtures.ts's HOME_* constants set every optional
    // block: a labHead (no portrait), one resource, the maestro project,
    // and a support page -- so all five `Section` blocks render at once,
    // which live data (no resource, no labHead) never does.
    const a = section.getByTestId('gallery-home-a')
    await expect(a.getByTestId('home-lab-head-card')).toBeVisible()
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

  // The publication ledger's `xl:` grid activates on *viewport* width, not
  // the gallery's own demo-frame width, so this applies the same per-row
  // overflow check used against the live `/` route above to the gallery
  // fixtures at the same breakpoints.
  test.describe('publication ledger cells never overflow their own track', () => {
    for (const width of [1280, 1440]) {
      test(`at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/preview/components')
        const overflowing = await page.evaluate(() => {
          const section = document.querySelector('[data-testid="gallery-home"]')
          const found: { tag: string; text: string; overflowPx: number }[] = []
          if (!section) return found
          for (const row of section.querySelectorAll('[data-testid="pub-row"]')) {
            for (const el of row.querySelectorAll('*')) {
              const overflowPx = el.scrollWidth - el.clientWidth
              if (overflowPx > 1) {
                found.push({ tag: el.tagName, text: (el.textContent ?? '').slice(0, 60), overflowPx })
              }
            }
          }
          return found
        })
        expect(overflowing, JSON.stringify(overflowing)).toEqual([])
      })
    }
  })

  test('hero lab-head card: the name gets a colour reveal on hover and keyboard focus', async ({
    page,
  }) => {
    // The name span carries its own `group-hover:text-link`/
    // `group-focus-visible:text-link` reveal, matching PersonCard.tsx's
    // own name `div`; this proves it actually fires, on both pointer and
    // keyboard. `npm run css:proof` (grep for `group-hover\:text-link` and
    // `group-focus-visible\:text-link` in the generated stylesheet)
    // confirms those utilities are emitted.
    await page.goto('/preview/components')
    const a = page.getByTestId('gallery-home-a')
    const link = a.getByTestId('home-lab-head-link')
    const name = link.getByText('Dr Ilse Van Der Berg')

    const restColor = await name.evaluate((el) => getComputedStyle(el).color)

    await link.hover()
    const hoverColor = await name.evaluate((el) => getComputedStyle(el).color)
    expect(hoverColor).not.toBe(restColor)

    // Blur first (hover alone can leave :focus-visible unset, but a fresh
    // page load's own initial state is the real "at rest" baseline above --
    // this just confirms the hover-triggered colour reverts before focus is
    // tested, so the two states aren't confused with each other).
    await page.mouse.move(0, 0)

    await link.focus()
    await expect(link).toBeFocused()
    const focusColor = await name.evaluate((el) => getComputedStyle(el).color)
    expect(focusColor).not.toBe(restColor)
  })

  // Instance (b): labHead set, showLabHeadOnHome false. No lab-head card,
  // and the PI counts as an ordinary member: (b)'s count is (a)'s count
  // plus exactly one.
  test('(b) labHead hidden (showLabHeadOnHome: false): no lab-head card, and the member count includes the PI', async ({
    page,
  }) => {
    await page.goto('/preview/components')

    const a = page.getByTestId('gallery-home-a')
    const b = page.getByTestId('gallery-home-b')

    await expect(b.getByTestId('home-lab-head-card')).toHaveCount(0)
    await expect(b.getByTestId('home-member-count')).toBeVisible()

    const countA = await readMemberCount(a.getByTestId('home-member-count'))
    const countB = await readMemberCount(b.getByTestId('home-member-count'))
    expect(countB).toBe(countA + 1)
  })

  // Production's siteCopy is empty today -- this is the only place the "no
  // siteCopy at all" leg of the fallback chain actually renders
  // (home.overview is also unset on this instance), and the lab head here
  // has a name only, so the card's optional role/email lines must both be
  // absent.
  test('gallery-home-no-sitecopy: statement falls back to the IA tagline, and the card has no role line and no mailto', async ({
    page,
  }) => {
    await page.goto('/preview/components')
    const instance = page.getByTestId('gallery-home-no-sitecopy')

    const text = (await instance.getByTestId('home-statement').innerText()).replace(/\s+/g, ' ').trim()
    expect(text).toBe(IA_TAGLINE)

    const card = instance.getByTestId('home-lab-head-card')
    await expect(card).toBeVisible()
    await expect(card.locator('a[href^="mailto:"]')).toHaveCount(0)
    await expect(card.getByTestId('home-lab-head-role')).toHaveCount(0)
  })

  // Instance (a): three researchOrder project cards, reusing the Research
  // gallery fixture views, at least one with a cover.
  test('gallery-home-a: three research cards, linked, with at least one cover', async ({ page }) => {
    await page.goto('/preview/components')
    const cards = page.getByTestId('gallery-home-a').getByTestId('home-research-card')
    await expect(cards).toHaveCount(3)
    await expect(cards.locator('h3 a')).toHaveCount(3)
    await expect(page.getByTestId('gallery-home-a').getByTestId('home-research').locator('img')).not.toHaveCount(0)
  })

  // Instance (g): one project in the set has no cover -- `researchCards`
  // drops every card's cover, not just the bare one, so the row rhythm
  // stays even instead of pairing a tall cover next to an empty void.
  test('gallery-home-mixed-covers: no card renders a cover when one in the set has none', async ({ page }) => {
    await page.goto('/preview/components')
    const instance = page.getByTestId('gallery-home-mixed-covers')
    const cards = instance.getByTestId('home-research-card')
    await expect(cards).toHaveCount(MIXED_COVERS_RESEARCH_PROJECTS_FIXTURE.length)
    await expect(instance.getByTestId('home-research').locator('img')).toHaveCount(0)
  })

  // Instance (b): no researchOrder projects, so the cards fall back to
  // siteCopy.about.themes -- `researchCards` (homeModel.ts) strips a
  // theme summary's leading "- " marker, and the card is unlinked (plain
  // text, not an `<a>`).
  test('gallery-home-b: research cards fall back to themes, with no leading "- " and no link', async ({
    page,
  }) => {
    await page.goto('/preview/components')
    const cards = page.getByTestId('gallery-home-b').getByTestId('home-research-card')
    // The exact fixture count, not merely "some" -- a dropped theme would
    // still satisfy `toBeGreaterThan(0)`.
    await expect(cards).toHaveCount(HOME_SITE_COPY_THEMES_FIXTURE.about!.themes!.length)
    await expect(cards.locator('h3 a')).toHaveCount(0)
    const excerpts = await cards.locator('p').allTextContents()
    for (const excerpt of excerpts) {
      expect(excerpt.trim().startsWith('-')).toBe(false)
    }
  })

  // An unbroken role long enough to overflow the card's column without its
  // own `break-words`.
  test('gallery-home-long-role: the role line does not overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 })
    await page.goto('/preview/components')
    const instance = page.getByTestId('gallery-home-long-role')

    await expect(instance.getByTestId('home-lab-head-role')).toBeVisible()

    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
    expect(fits).toBe(true)
  })
})
