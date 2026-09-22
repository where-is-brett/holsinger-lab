import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// Everything built in Tasks 4-8 is unrendered outside this route -- this
// repo's Vitest config is node-only (see `**/*.test.ts`, no jsdom), so
// rendering/interaction behaviour is deliberately proven here in Playwright
// against a real production build instead (playwright.config.ts's webServer
// runs `next build && next start`). This is the only proof any of the
// twelve Phase 1 components actually work.

const GALLERY_SECTIONS = [
  'tag',
  'button',
  'copy-citation',
  'page-title',
  'section-rail',
  'publication-row',
  'facet-band',
  'person-card',
  'people',
  'site-nav',
  'site-nav-long',
  'mobile-header',
  'site-footer',
  'form-field',
  'resource-block',
  'publication-page',
  'research',
  'research-no-link',
  'research-contact-link',
  'resources',
  'home',
]

test.describe('redesign component gallery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preview/components')
  })

  test('renders every gallery section', async ({ page }) => {
    for (const name of GALLERY_SECTIONS) {
      await expect(page.getByTestId(`gallery-${name}`)).toBeVisible()
    }
  })

  test('identifiers are never rendered upper-cased', async ({ page }) => {
    const ids = page.locator('[data-identifier]')
    const count = await ids.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const el = ids.nth(i)
      const text = (await el.innerText()).replace('…', '')
      const href = await el.getAttribute('href')
      // The rendered label must not have been case-transformed. `href`
      // containment only applies to identifiers that are *links to that
      // identifier* (a DOI/URL anchor, always an absolute `http(s)` URL) --
      // fix round 1 adds two `data-identifier` cases this doesn't cover:
      // the citation box's cite string (plain text, no `href` at all -- per
      // the Task 5 brief, "a bordered box with the cite text
      // (data-identifier, mono)") and ResourceBlock's `MORE` meta entry
      // (per the same brief: `{ label: 'MORE', value: 'Resources', href:
      // '/resources' }` -- a same-site navigational link whose label is a
      // human word, not the href repeated back). Both are legitimately
      // `data-identifier` (verbatim, never-uppercased text) without being
      // "the href must contain the label" identifiers -- distinguished
      // here by `href` starting with `/` (same-site nav) vs `http` (an
      // actual DOI/URL identifier).
      if (href !== null && !href.startsWith('/')) {
        // the href must carry the full identifier even when the label is truncated.
        expect(href).toContain(text.replace(/^https?:\/\//, '').replace(/^www\./, ''))
      }
      expect(await el.evaluate((n) => getComputedStyle(n).textTransform)).not.toBe('uppercase')
    }
  })

  test('copy-citation reports success and reverts', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const button = page.getByRole('button', { name: /copy citation/i }).first()
    await button.click()
    await expect(page.getByText('✓ COPIED')).toBeVisible()
    await expect(page.getByText('✓ COPIED')).toBeHidden({ timeout: 4000 })
  })

  test('facet chips filter and clear, with live counts through countBy/applyFacets', async ({
    page,
  }) => {
    const band = page.getByTestId('gallery-facet-band')
    // Baseline: both SAMPLE_PUBLICATIONS pass with no facet selected.
    await expect(band.getByTestId('facet-result-count')).toHaveText('2')
    const chip = band.getByRole('button', { name: /^2025/ })
    await chip.click()
    await expect(band.getByTestId('facet-result-count')).toHaveText('1')
    await chip.click()
    await expect(band.getByTestId('facet-result-count')).toHaveText('2')
  })

  test('mobile tap targets clear 44px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const targets = page.getByTestId('gallery-mobile-header').getByRole('link')
    const count = await targets.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const box = await targets.nth(i).boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }
  })

  test('mobile header renders both a closed and an open state', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const section = page.getByTestId('gallery-mobile-header')
    await expect(section.getByRole('button', { name: 'Menu', exact: true })).toBeVisible()
    await expect(section.getByRole('button', { name: 'Close', exact: true })).toBeVisible()
    await expect(section.locator('a[aria-current="page"]')).toHaveCount(1)
    await expect(section.locator('a[aria-current="page"]')).toContainText('Publications')
  })

  test('narrow publication-row variant lives inside a container under 720px', async ({
    page,
  }) => {
    // Decision from the task brief: `narrow` exists specifically so the
    // ledger grid doesn't squeeze below 720px -- this asserts the gallery
    // actually exercises that case, not just that the prop was passed.
    const container = page.locator('[data-testid="gallery-publication-row"] .w-\\[700px\\]')
    const box = await container.boundingBox()
    expect(box!.width).toBeLessThan(720)
  })

  test('narrow row is genuinely stacked, not the 4-column ledger grid', async ({ page }) => {
    const narrowRow = page
      .locator('[data-testid="gallery-publication-row"] .w-\\[700px\\]')
      .locator('> div')
      .first()
    await expect(narrowRow).toHaveCSS('display', 'block')
  })

  test('PublicationRow: href renders the title as a next/link to that href', async ({ page }) => {
    const row = page.getByTestId('publication-row-linked')
    const titleLink = row.getByRole('link', { name: /Chromobox/i })
    await expect(titleLink).toHaveAttribute('href', '/publications/example')
  })

  test('PublicationRow: no DOI/URL on file renders no identifier markup', async ({ page }) => {
    const row = page.getByTestId('publication-row-no-link')
    await expect(row.locator('[data-identifier]')).toHaveCount(0)
    const text = await row.innerText()
    expect(text).not.toMatch(/^(DOI|URL)\s/m)
  })

  test('PublicationRow: comfortable index row is a grid from lg, stacked below lg', async ({
    page,
  }) => {
    const row = page.locator('[data-testid="publication-row-comfortable"] > div').first()

    await page.setViewportSize({ width: 1024, height: 900 })
    await expect(row).toHaveCSS('display', 'grid')

    await page.setViewportSize({ width: 900, height: 900 })
    await expect(row).not.toHaveCSS('display', 'grid')
  })

  test('PublicationRow: comfortable index row still shows authors and CopyCitation below lg', async ({
    page,
  }) => {
    // Fix round 1: the journal column collapses into the mobile kicker
    // below `lg`, but the authors line and CopyCitation control must not --
    // this settles it with a live viewport check, not just markup presence.
    await page.setViewportSize({ width: 900, height: 900 })
    const row = page.locator('[data-testid="publication-row-comfortable"] > div').first()

    await expect(row.getByTestId('pub-authors').first()).toBeVisible()
    await expect(row.getByRole('button', { name: /copy citation/i }).first()).toBeVisible()
  })

  test('PublicationRow: home row identifier link is clickable at 390px, not swallowed by the title hit area', async ({
    page,
  }) => {
    // Fix round 1: the title's 44px hit-area pseudo used to overhang onto
    // the identifier directly beneath it below `lg`, in the `home` variant
    // where nothing sits between them. `click({ trial: true })` fails if a
    // different element would actually intercept the click at that point.
    await page.setViewportSize({ width: 390, height: 844 })
    const row = page.getByTestId('publication-row-home')
    const link = row.locator('[data-identifier]').first()
    await expect(link).toBeVisible()

    await link.click({ trial: true })

    const inside = await link.evaluate((el) => {
      const box = el.getBoundingClientRect()
      const target = document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2,
      )
      return target === el || (target != null && el.contains(target))
    })
    expect(inside).toBe(true)
  })

  test('SiteNav marks exactly the current item aria-current, with real hrefs', async ({ page }) => {
    const nav = page.getByTestId('gallery-site-nav')
    await expect(nav.locator('a[aria-current="page"]')).toHaveText('Publications')
    await expect(nav.locator('a[aria-current="page"]')).toHaveCount(1)
    await expect(nav.getByRole('link', { name: 'Publications' })).toHaveAttribute('href', '/publications')
  })

  test('SiteFooter renders one span per line', async ({ page }) => {
    const footer = page.getByTestId('gallery-site-footer').locator('footer')
    await expect(footer).toHaveCount(1)
    await expect(footer.locator('span')).toHaveText(['Designed by Brett Yang', 'Copyright 2026 © Holsinger Lab'])
  })

  test('PersonCard renders both the portrait and no-portrait fallback state', async ({
    page,
  }) => {
    const section = page.getByTestId('gallery-person-card')
    await expect(section.getByRole('img', { name: 'Haochen Wu' })).toBeVisible()
    // The fallback case: no <img>, initials + "NO PORTRAIT ON FILE" instead.
    // Several fixture cards use the fallback, so this is scoped to Jiyoo
    // Choi's card specifically -- found via her unique role text, then
    // walked up to the card's own wrapping div -- rather than asserting on
    // the page-wide (non-unique) "NO PORTRAIT ON FILE" / "JC" text alone,
    // which could pass even if a different card's fallback rendered instead
    // of hers.
    const jiyooRole = section.getByText('Ungergraduate student - Diagnostic Radiography')
    await expect(jiyooRole).toBeVisible()
    const jiyooCard = jiyooRole.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " group ")][1]')
    await expect(jiyooCard.getByText('JC')).toBeVisible()
    await expect(jiyooCard.getByText('[ NO PORTRAIT ON FILE ]')).toBeVisible()
    await expect(jiyooCard.locator('img')).toHaveCount(0)
  })

  test('PersonCard: the portrait renders in full colour at rest, not greyscale', async ({
    page,
  }) => {
    // Brett's review (fix/research-description-fallback): portraits must
    // never render in black-and-white anywhere, not even briefly before a
    // hover/focus reveal -- PersonCard.tsx's `IMAGE_FILTER` (which carried
    // `grayscale contrast-[1.04]` lifted only on `group-hover:`/
    // `group-focus-visible:`) was replaced with a plain `PORTRAIT_IMAGE_CLASS`
    // of `object-cover` alone. This asserts the *unhovered, unfocused*
    // portrait's computed `filter` is the CSS default `none` -- the direct
    // negative of the old grayscale-at-rest treatment this test replaces.
    const section = page.getByTestId('gallery-person-card')
    const img = section.getByRole('img', { name: 'Haochen Wu' })
    await expect(img).toBeVisible()
    const filter = await img.evaluate((el) => getComputedStyle(el).filter)
    expect(filter).toBe('none')

    // Coordinator's fix round 2: also check the *linked* card (Élodie
    // Ñúñez's -- `href` set, `PersonCard`'s own `group`/`group-hover:`/
    // `group-focus-visible:` branch), since a reveal is most plausible to
    // get reintroduced exactly there, where a `group` wrapper already
    // exists for the name's own colour reveal (a future edit could too
    // easily bolt a `group-hover:grayscale-0`-style pair back onto the
    // image, matching the name's pattern, without anyone noticing it
    // reintroduces a hidden-at-rest state). Unhovered, unfocused, its
    // portrait's computed `filter` must be `none` too. The linked card's
    // image is `alt=""` (decorative -- PersonCard.tsx's own `href` branch,
    // asserted separately below), so it's found via the link's accessible
    // name, not `getByRole('img', ...)`.
    const linkedImg = section.getByRole('link', { name: 'Élodie Ñúñez' }).locator('img')
    await expect(linkedImg).toBeVisible()
    const linkedFilter = await linkedImg.evaluate((el) => getComputedStyle(el).filter)
    expect(linkedFilter).toBe('none')
  })

  test('PersonCard: detail renders as a second mono line under role, only when present', async ({
    page,
  }) => {
    const section = page.getByTestId('gallery-person-card')
    await expect(section.getByText('Honours Student')).toBeVisible()
    await expect(section.getByText('Diagnostic Radiography', { exact: true })).toBeVisible()
  })

  test('PersonCard: detail is omitted entirely when roleDetail is not set', async ({ page }) => {
    // Negative half of the above (carried Task 1 review minor (b)): Haochen
    // Wu's fixture entry has no `detail`, so his card must render only the
    // one role line -- no second mono line under it at all.
    const section = page.getByTestId('gallery-person-card')
    const roleLine = section.getByText('PhD Student', { exact: true })
    await expect(roleLine).toBeVisible()
    const card = roleLine.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " group ")][1]')
    // The role line and a would-be detail line share the exact same class
    // string (PersonCard.tsx), so the card has at most one such line when
    // there is no detail -- assert there is exactly one, not the role text
    // repeated on a second line.
    await expect(card.locator('.font-mono.text-\\[10\\.5px\\]')).toHaveCount(1)
  })

  test('PersonCard: the linked card gets the same colour reveal on keyboard focus as on hover', async ({
    page,
  }) => {
    // Carried Task 1 review minor (c): group-focus-visible: pairs mirror
    // group-hover: on the name colour, so keyboard users get the identical
    // reveal a mouse hover gives. (The portrait no longer has a filter
    // reveal at all -- Brett's review, fix/research-description-fallback --
    // so only the name's colour is exercised here now.)
    const section = page.getByTestId('gallery-person-card')
    const link = section.getByRole('link', { name: 'Élodie Ñúñez' })
    await link.focus()
    await expect(link).toBeFocused()
    const nameColor = await link
      .locator('div', { hasText: 'Élodie Ñúñez' })
      .first()
      .evaluate((el) => getComputedStyle(el).color)
    const linkTokenColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--sem-link').trim()
    )
    // The name's focused colour must not equal its own un-focused (default
    // text) colour -- i.e. the reveal actually fired on focus, not just on
    // hover. A direct comparison against --sem-link (which may be a further
    // color-mix/oklab function, not a literal computed rgb string) would be
    // fragile, so this instead confirms the focus state is distinguishable
    // from a fresh unfocused card's name colour.
    expect(linkTokenColor.length).toBeGreaterThan(0)
    const blurredColor = await section
      .getByText('Haochen Wu', { exact: true })
      .evaluate((el) => getComputedStyle(el).color)
    expect(nameColor).not.toBe(blurredColor)
  })

  test('PersonCard: href wraps the card in a next/link with one accessible name', async ({
    page,
  }) => {
    const section = page.getByTestId('gallery-person-card')
    // Exactly one accessible name reaches the link -- found via that single
    // name, not two (link + image) both announcing "Élodie Ñúñez".
    const link = section.getByRole('link', { name: 'Élodie Ñúñez' })
    await expect(link).toHaveAttribute('href', '/people/elodie-nunez')
    // The portrait <img> inside is alt="" (decorative), so it carries no
    // accessible name of its own to collide with the link's own accessible
    // name -- PersonCard no longer sets an `aria-label` on the link at all
    // (final-review fix wave, PersonCard.tsx's own comment); the link's
    // accessible name is computed from its visible text content instead.
    await expect(link.locator('img')).toHaveAttribute('alt', '')
  })

  test('People gallery (a): spotlight shows the initials frame, name, both bio paragraphs, no email, and a Full profile link', async ({
    page,
  }) => {
    const instance = page.getByTestId('gallery-people-a')
    const spotlight = instance.getByTestId('people-spotlight')
    await expect(spotlight).toBeVisible()
    // No portrait on the fixture lab head -- the initials fallback renders
    // instead of an <img>.
    await expect(spotlight.locator('img')).toHaveCount(0)
    // initialsOf('Dr Ilse Van Der Berg') -- final-review fix wave: a leading
    // honorific ("Dr") is now skipped when more words remain, so this is
    // "Ilse" + "Berg" ("IB"), not "Dr" + "Berg" ("DB").
    await expect(spotlight.getByText('IB')).toBeVisible()
    await expect(
      spotlight.getByRole('heading', { level: 2, name: 'Dr Ilse Van Der Berg', exact: true })
    ).toBeVisible()
    await expect(spotlight.getByText(/leads the laboratory/)).toBeVisible()
    await expect(spotlight.getByText(/trained across three continents/)).toBeVisible()
    // No email on file for this fixture.
    await expect(spotlight.locator('a[href^="mailto:"]')).toHaveCount(0)
    await expect(instance.getByRole('link', { name: 'Full profile →' })).toBeVisible()
    // The lab head is excluded from the Members grid once the spotlight
    // renders (excludeLabHead) -- her name must not also appear as a card.
    await expect(
      instance.locator('[data-testid="person-card"][data-name="Dr Ilse Van Der Berg"]')
    ).toHaveCount(0)
  })

  test('People gallery (a): the alumni paragraph lists all 22 names, comma-separated', async ({
    page,
  }) => {
    const instance = page.getByTestId('gallery-people-a')
    // Read each entry's own `data-name` rather than the paragraph's
    // `innerText().split(', ')` -- a name can itself contain ", " (see
    // AlumniBlock's own comment), so parsing the rendered text back apart
    // is not a safe inverse of how it was joined.
    const names = await instance
      .getByTestId('people-alumni')
      .getByTestId('alumni-name')
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-name')))
    expect(names).toHaveLength(22)
    expect(names[0]).toBe('Alumni 1 Lastname1')
    expect(names[21]).toBe('Alumni 22 Lastname22')
  })

  test('People gallery (a): intern cards show their role text verbatim, including the country', async ({
    page,
  }) => {
    const instance = page.getByTestId('gallery-people-a')
    await expect(instance.getByText('Visiting Intern — Germany')).toBeVisible()
    await expect(instance.getByText('Visiting Intern — Vietnam')).toBeVisible()
  })

  // Carried assertion (Task 3 brief): the number of `people-section-title`
  // headings actually rendered must equal `g`, the group count baked into
  // PageTitle's own meta string ("LAB HEAD + N CURRENT MEMBERS · G GROUPS")
  // -- People.tsx's `g` is derived by counting titled member sections
  // (peopleModel.ts's `groupByRoleGroup`/`splitAlumni`), and this is the
  // one place that number is checked against what the DOM actually shows,
  // rather than trusting the two never drift apart.
  test('People gallery (a): the number of section-title headings equals the meta\'s group count', async ({
    page,
  }) => {
    const instance = page.getByTestId('gallery-people-a')
    const meta = await instance.getByTestId('page-title-meta').innerText()
    const match = meta.match(/(\d+)\s+GROUPS?/)
    expect(match, `meta "${meta}" has no "N GROUP(S)" segment`).not.toBeNull()
    const expectedGroups = Number(match![1])
    await expect(instance.getByTestId('people-section-title')).toHaveCount(expectedGroups)
  })

  test('People gallery (b): no spotlight when labHead is unset, and the PI-equivalent profile reappears as an ordinary card', async ({
    page,
  }) => {
    const instance = page.getByTestId('gallery-people-b')
    await expect(instance.getByTestId('people-spotlight')).toHaveCount(0)
    // (b) reuses the same PEOPLE_PROFILES_FIXTURE as (a), which now includes
    // a profile document shaped like the real PI (roleGroup: null, same
    // _id/name as PEOPLE_LAB_HEAD_FIXTURE -- fix round 1). With the
    // spotlight off, excludeLabHead never runs, so she must render as an
    // ordinary card exactly once, not zero and not twice.
    await expect(
      instance.locator('[data-testid="person-card"][data-name="Dr Ilse Van Der Berg"]')
    ).toHaveCount(1)
  })

  test('People gallery: no page overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 })
    await page.goto('/preview/components')
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
    expect(fits).toBe(true)
  })

  test('interactive Tag hit area clears the 44px accessibility floor', async ({ page }, testInfo) => {
    // Task 4 debt: the 44px hit area on an interactive Tag was verified only
    // by CSS-spec arithmetic (h-11 = 2.75rem = 44px), never against a real
    // layout. This settles it with a live measurement. The hit area is an
    // invisible `::before` pseudo-element (`position: absolute; inset-x: 0;
    // top: 50%; height: 2.75rem; translate: -50%`) layered over the ~29px
    // visual chip -- `boundingBox()` on the tag itself only ever reports the
    // visual box, so the pseudo-element's own computed geometry is read
    // directly via getComputedStyle(el, '::before').
    const probe = page.getByTestId('tag-interactive-probe')
    const tag = probe.getByRole('button', { name: 'Interactive tag' })

    const visualBox = await tag.boundingBox()
    expect(visualBox).not.toBeNull()

    const measured = await tag.evaluate((el) => {
      const before = getComputedStyle(el, '::before')
      return {
        beforeHeight: parseFloat(before.height),
        beforeWidth: parseFloat(before.width),
        beforePosition: before.position,
      }
    })

    // Surfaced as a test attachment (visible in the HTML report), not a
    // console.log that reruns on every pass with nothing reading it.
    await testInfo.attach('tag-hit-area-measurement', {
      body: JSON.stringify(
        {
          visual: { width: visualBox!.width, height: visualBox!.height },
          hitArea: { width: measured.beforeWidth, height: measured.beforeHeight },
        },
        null,
        2
      ),
      contentType: 'application/json',
    })

    expect(measured.beforePosition).toBe('absolute')
    // The visual chip is well under 44px tall (padding: 8px 13px around
    // ~11px mono text) -- this is the CSS-arithmetic prediction Task 4 could
    // only assert on paper, now confirmed against real visual geometry.
    expect(visualBox!.height).toBeLessThan(44)
    // The pseudo-element's real, rendered height clears the floor.
    expect(measured.beforeHeight).toBeGreaterThanOrEqual(44)

    // Prove the hit area is actually clickable, not just correctly sized on
    // paper: click a point that sits inside the pseudo-element's vertical
    // span but outside the visible chip -- just above its top edge, since
    // the ~44px pseudo is vertically centred on the chip's midline and
    // therefore overhangs both above and below it.
    const overhang = (measured.beforeHeight - visualBox!.height) / 2
    const clickY = visualBox!.y - overhang / 2
    expect(clickY).toBeLessThan(visualBox!.y) // sanity: the click point really is outside the visual box

    const countBefore = await page.getByTestId('tag-click-count').innerText()
    await page.mouse.click(visualBox!.x + visualBox!.width / 2, clickY)
    await expect(page.getByTestId('tag-click-count')).not.toHaveText(countBefore)
  })

  test('publication page: Resource rail links to /resources', async ({ page }) => {
    const section = page.getByTestId('gallery-publication-page')
    const link = section.getByRole('link', { name: 'Resources' })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/resources')
  })

  test('publication page: citation box takes the full width when there is no canonical link', async ({
    page,
  }) => {
    // PUBLICATION_PAGE_FIXTURE has neither a DOI nor a URL, so the Cite &
    // access grid should collapse to a single column (fix round 1) and the
    // citation box should span the same width as its containing block,
    // rather than sitting in a 1fr track sized for two columns.
    await page.setViewportSize({ width: 1280, height: 900 })
    const section = page.getByTestId('gallery-publication-page')
    const wrapperBox = await section.getByTestId('pub-cite-access').boundingBox()
    const citationBox = await section.getByTestId('pub-citation-box').boundingBox()
    expect(wrapperBox).not.toBeNull()
    expect(citationBox).not.toBeNull()
    expect(citationBox!.width).toBeGreaterThan(wrapperBox!.width * 0.95)
  })

  // Fix round 1 tried a bounding-rect walk scoped to the new
  // `gallery-publication-page` section, with an ancestor `isClipped()` check
  // meant to exempt legitimately-scrolled descendants. Round 2 found two
  // independent problems with that approach:
  //
  // 1. **It could never fail.** `styles/index.css` sets
  //    `html { overflow-x: hidden }`, so `isClipped()`'s walk up to `html`
  //    always found a clipping ancestor -- every element was "exempt",
  //    including genuine offenders. Proven empirically: reverting
  //    `ResourceBlock.tsx`'s `figureLabel`-gated `lg:` grid back to the old
  //    unconditional `grid grid-cols-[1fr_340px]` and rerunning the old
  //    version of this test still passed (see the fix-round-2 report for
  //    that run's output).
  // 2. **Even fixed, a bounding-rect (or `el.scrollWidth`) walk can't catch
  //    this specific defect class at all.** A fixed-length grid track
  //    (`340px`) with *no item placed in it* (this fixture's own
  //    `ResourceBlock` usage has no `figureLabel`, so the figure branch
  //    never renders) still reserves that track's width in the grid's
  //    layout -- but since nothing paints there, no element's own
  //    `getBoundingClientRect()`/`scrollWidth` reports it; the *page's*
  //    `scrollWidth` grows regardless. Confirmed by reverting
  //    `ResourceBlock.tsx` again and measuring
  //    `document.documentElement.scrollWidth` directly: 614 vs a 375
  //    `clientWidth`, while every per-element check inside the section
  //    reported zero offenders (see the fix-round-2 report).
  //
  // The reliable check is therefore the whole-page one the controller asked
  // for in round 1 to begin with -- it was blocked back then by a genuine,
  // separate defect (`PageTitle`/`FacetBand`'s non-responsive gutters, and
  // `PageTitle`'s `<h1>` missing its own flex-item `min-w-0`), which round 2
  // has now fixed at the source (see `PageTitle.tsx`, `FacetBand.tsx`).
  // `Tag`'s new `wrap` prop also replaced the tag row's `overflow-x-auto`
  // entirely this round, so there is no longer any element on this page
  // that's *meant* to have interior scroll/overflow either.
  test('no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto('/preview/components')
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
    expect(fits).toBe(true)
  })

  test('has no detectable accessibility violations (light)', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
  })

  // Fix round 4: the two checks above run at first paint, where every
  // year/type/topic chip is OFF -- no ON facet chip with a count exists on
  // the page yet, so FacetChip's ON-state colour (`text-text-inverse-muted`)
  // was never actually exercised by an axe pass, only its OFF state
  // (`text-text-faint`). Clicking one chip here gives both states at once:
  // the clicked chip goes ON (with its own count), its siblings stay OFF
  // (with theirs) -- and re-running axe against `gallery-facet-band` (the
  // whole page's own check already covers `gallery-home`'s new portrait
  // instance, (c), added alongside this fix) is the regression coverage
  // for both fixes in this round, independent of live Sanity content (the
  // gallery fixture never changes with the dataset).
  test('an ON facet chip (with a count) and an OFF facet chip (with a count) have no detectable accessibility violations', async ({
    page,
  }) => {
    const band = page.getByTestId('gallery-facet-band')
    await band.getByRole('button', { name: /^2025/ }).click()
    await expect(band.getByRole('button', { name: /^2025/ })).toHaveAttribute('aria-pressed', 'true')

    const results = await new AxeBuilder({ page }).include('[data-testid="gallery-facet-band"]').analyze()
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
  })
})

// The Phase 1 completion check requires /preview/components to render in
// both colour schemes -- Playwright's `colorScheme` option is the clean way
// to assert it, matching e2e/axe.spec.ts's own light/dark axis. Dark-mode
// contrast regressions are exactly what this repo's token guards can't
// catch, since they only read the CSS file, never a rendered page.
test.describe('redesign component gallery -- dark colour scheme', () => {
  test.use({ colorScheme: 'dark' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/preview/components')
  })

  test('renders every gallery section', async ({ page }) => {
    for (const name of GALLERY_SECTIONS) {
      await expect(page.getByTestId(`gallery-${name}`)).toBeVisible()
    }
  })

  test('has no detectable accessibility violations (dark)', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
  })

  // Dark-mode twin of the light-scheme test above -- the ON-chip colour
  // regression this round fixes (`--sem-text-muted` composited under
  // `opacity-55`) failed AA in both colour schemes against live data
  // (`e2e/axe.spec.ts`'s `/`/`/publications` failures at both light and
  // dark), so both are checked here too.
  test('an ON facet chip (with a count) and an OFF facet chip (with a count) have no detectable accessibility violations', async ({
    page,
  }) => {
    const band = page.getByTestId('gallery-facet-band')
    await band.getByRole('button', { name: /^2025/ }).click()
    await expect(band.getByRole('button', { name: /^2025/ })).toHaveAttribute('aria-pressed', 'true')

    const results = await new AxeBuilder({ page }).include('[data-testid="gallery-facet-band"]').analyze()
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
  })
})
