import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page, test } from '@playwright/test'
import { HERO_FALLBACK_ALT, resolveHomeHero } from 'components/redesign/heroModel'
import type { HomeHeroQueryResult } from 'sanity.types'

import { e2eClient } from './support/sanity'

// Home's picture banner. The live `/` is checked against whatever the
// dataset holds (production has no `home.hero` and no `siteCopy` today, so
// in CI it proves the text-only fallback); every other state is proven on
// the fixture route /preview/home-hero/[state] (heroFixtures.ts), which
// renders the real Layout + Home at real viewport sizes.

const DESKTOP = { width: 1280, height: 800 }
const PHONE = { width: 375, height: 812 }
const SCHEMES = ['light', 'dark'] as const
const INTERVAL = 6000

const preview = (state: string) => `/preview/home-hero/${state}`

const hero = (page: Page) => page.getByTestId('home-hero')
const media = (page: Page) => page.getByTestId('home-hero-media')
const carousel = (page: Page) => page.getByTestId('home-hero-carousel')
const activeSlide = (page: Page) => page.locator('[data-testid="home-hero-slide"][data-active="true"]')

async function box(locator: Locator) {
  const b = await locator.boundingBox()
  expect(b, 'element has a layout box').not.toBeNull()
  return b!
}

// Hydrated once the neighbours of slide 1 have mounted their <img> (the
// server HTML carries the first picture only) -- until then no timer runs.
async function gotoHydrated(page: Page, state: string) {
  await page.goto(preview(state))
  await expect(page.getByTestId('home-hero-slide').nth(1).locator('img')).toHaveCount(1)
}

// Park the mouse over the header, away from the banner, so hover-pause
// never interferes with a timing assertion.
async function mouseAway(page: Page) {
  await page.mouse.move(4, 4)
}

async function expectPictureLoaded(locator: Locator) {
  const img = locator.locator('img').first()
  await expect(img).toBeVisible()
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)
}

test.describe('live /', () => {
  test('shows the picture banner exactly when the dataset resolves one, else the text-only Home', async ({
    page,
  }) => {
    // Same query shape as lib/sanity.queries.ts's homeHeroQuery, through
    // the same resolver the page uses.
    const data = await e2eClient.fetch<HomeHeroQueryResult>(`{
      "hero": *[_type == "home"][0].hero{
        layout, autoplay,
        slides[]{
          _key, _type,
          _type == "heroImageSlide" => {
            image{ asset, crop, hotspot }, alt, caption,
            link{ external, "internal": internal->{ _type, "slug": slug.current } },
          },
          _type == "reference" => {
            "project": @->{ _id, title, "slug": slug.current, coverImage{ asset, crop, hotspot, alt } },
          },
        },
      },
      "fallbackImage": *[_type == "siteCopy"][0].hero.image{ asset, crop, hotspot, alt },
    }`)
    const expected = resolveHomeHero(data)
    await page.goto('/')
    await expect(page.getByTestId('home-identity-title')).toBeVisible()
    if (!expected) {
      await expect(hero(page)).toHaveCount(0)
      // No empty picture box either.
      await expect(media(page)).toHaveCount(0)
      return
    }
    await expect(hero(page)).toHaveAttribute('data-layout', expected.layout)
    await expect(page.getByTestId('home-hero-slide')).toHaveCount(expected.slides.length)
    await expectPictureLoaded(activeSlide(page))
  })
})

for (const layout of ['split', 'full-bleed'] as const) {
  test.describe(`${layout}: above the fold`, () => {
    for (const viewport of [DESKTOP, PHONE]) {
      for (const colorScheme of SCHEMES) {
        test(`the picture is on screen without scrolling at ${viewport.width}x${viewport.height}, ${colorScheme}`, async ({
          page,
        }) => {
          await page.setViewportSize(viewport)
          await page.emulateMedia({ colorScheme })
          await page.goto(preview(layout))
          const frame = await box(media(page))
          // At least 150px of the picture is visible in the first screen.
          expect(frame.y).toBeGreaterThanOrEqual(0)
          expect(frame.y + 150).toBeLessThanOrEqual(viewport.height)
          await expectPictureLoaded(activeSlide(page))
          expect(await page.evaluate(() => window.scrollY)).toBe(0)
        })
      }
    }
  })
}

test.describe('split layout', () => {
  test('desktop: a tall panel right of the heading, controls underneath', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto(preview('split'))
    const heading = await box(page.getByTestId('home-identity-title'))
    const frame = await box(media(page))
    expect(Math.round(frame.height)).toBe(520)
    expect(frame.x).toBeGreaterThanOrEqual(heading.x + heading.width)
    const controls = await box(page.getByTestId('home-hero-controls'))
    expect(controls.y).toBeGreaterThanOrEqual(frame.y + frame.height)
  })

  test('phone: a full-width band between the heading and the statement', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto(preview('split'))
    const heading = await box(page.getByTestId('home-identity-title'))
    const frame = await box(media(page))
    const statement = await box(page.getByTestId('home-statement'))
    expect(Math.round(frame.height)).toBe(210)
    expect(frame.x).toBe(0)
    expect(Math.round(frame.width)).toBe(PHONE.width)
    expect(frame.y).toBeGreaterThanOrEqual(heading.y + heading.height)
    expect(statement.y).toBeGreaterThanOrEqual(frame.y + frame.height)
    await expect(page.getByTestId('home-hero-caption')).toBeVisible()
    await expect(page.getByTestId('home-hero-next')).toBeVisible()
  })
})

test.describe('full-bleed layout', () => {
  for (const [viewport, height] of [
    [DESKTOP, 540],
    [PHONE, 470],
  ] as const) {
    test(`at ${viewport.width}px: a full-width band right under the header, heading overlaid in white`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport)
      await page.goto(preview('full-bleed'))
      const header = await box(page.getByTestId('site-header'))
      const band = await box(page.getByTestId('home-hero-band'))
      expect(Math.abs(band.y - (header.y + header.height))).toBeLessThanOrEqual(1)
      expect(band.x).toBe(0)
      expect(Math.round(band.width)).toBe(viewport.width)
      expect(Math.round(band.height)).toBe(height)

      const heading = page.getByTestId('home-identity-title')
      const h = await box(heading)
      expect(h.y).toBeGreaterThanOrEqual(band.y)
      expect(h.y + h.height).toBeLessThanOrEqual(band.y + band.height)
      await expect(heading).toHaveCSS('color', 'rgb(245, 247, 249)')
      // The heading reads before the carousel, outside it.
      await expect(carousel(page).getByTestId('home-identity-title')).toHaveCount(0)

      const statement = await box(page.getByTestId('home-statement'))
      expect(statement.y).toBeGreaterThanOrEqual(band.y + band.height)
    })
  }
})

test.describe('carousel semantics and controls', () => {
  test('region, slide labels, and labelled buttons', async ({ page }) => {
    await page.goto(preview('split'))
    await expect(carousel(page)).toHaveAttribute('role', 'region')
    await expect(carousel(page)).toHaveAttribute('aria-roledescription', 'carousel')
    await expect(carousel(page)).toHaveAttribute('aria-label', /.+/)
    const slides = page.getByTestId('home-hero-slide')
    // Five slides in the fixture; the project with no cover is skipped.
    await expect(slides).toHaveCount(4)
    for (let i = 0; i < 4; i++) {
      await expect(slides.nth(i)).toHaveAttribute('role', 'group')
      await expect(slides.nth(i)).toHaveAttribute('aria-roledescription', 'slide')
      await expect(slides.nth(i)).toHaveAttribute('aria-label', `${i + 1} of 4`)
    }
    await expect(page.getByRole('button', { name: 'Previous slide' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Next slide' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pause slideshow' })).toBeVisible()
    // Only the showing slide is exposed.
    await expect(slides.nth(1)).toHaveAttribute('aria-hidden', 'true')
    await expect(slides.nth(0)).not.toHaveAttribute('aria-hidden', /.*/)
  })

  test('next and previous move the slide, update the caption and announce politely', async ({ page }) => {
    await page.goto(preview('split'))
    const live = page.getByTestId('home-hero-live')
    await expect(live).toHaveAttribute('aria-live', 'polite')
    await expect(live).toHaveText('')

    await page.getByTestId('home-hero-next').click()
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '2 of 4')
    await expect(page.getByTestId('home-hero-caption')).toHaveText(
      "Fecal microbiota transplantation as a treatment for Alzheimer's disease →"
    )
    await expect(page.getByTestId('home-hero-caption')).toHaveAttribute('href', '/projects/involvement-of-gut-microbiota-in-ad')
    await expect(live).toHaveText("Slide 2 of 4: Fecal microbiota transplantation as a treatment for Alzheimer's disease")

    await page.getByTestId('home-hero-prev').click()
    await page.getByTestId('home-hero-prev').click()
    // Wraps to the last slide, which has no caption.
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '4 of 4')
    await expect(page.getByTestId('home-hero-caption')).toHaveCount(0)
    await expect(live).toHaveText('Slide 4 of 4')
    await expectPictureLoaded(activeSlide(page))
  })

  test('a caption with a link on an image slide goes to that page', async ({ page }) => {
    await page.goto(preview('split'))
    await expect(page.getByTestId('home-hero-caption')).toHaveAttribute('href', '/projects/glial-activity-as-a-marker-of-disease')
  })

  test('a horizontal swipe changes slide', async ({ page }) => {
    await page.goto(preview('split'))
    const frame = await box(media(page))
    const y = frame.y + frame.height / 2
    const swipe = async (from: number, to: number) => {
      const init = { pointerType: 'touch', isPrimary: true, pointerId: 7, bubbles: true, clientY: y }
      await media(page).dispatchEvent('pointerdown', { ...init, clientX: frame.x + from })
      await media(page).dispatchEvent('pointerup', { ...init, clientX: frame.x + to })
    }
    await swipe(frame.width * 0.8, frame.width * 0.2)
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '2 of 4')
    await swipe(frame.width * 0.2, frame.width * 0.8)
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '1 of 4')
    // A short drag is not a swipe.
    await swipe(100, 80)
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '1 of 4')
  })

  test('changing slide never shifts the page below the banner', async ({ page }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await page.setViewportSize(viewport)
      await page.goto(preview('split'))
      const before = await box(page.getByTestId('home-statement'))
      const sectionBefore = await box(page.getByTestId('section-label').first())
      for (let i = 0; i < 3; i++) {
        await page.getByTestId('home-hero-next').click()
        await expectPictureLoaded(activeSlide(page))
      }
      expect(await box(page.getByTestId('home-statement'))).toEqual(before)
      expect(await box(page.getByTestId('section-label').first())).toEqual(sectionBefore)
    }
  })

  test('the first picture loads eagerly, the others lazily', async ({ page }) => {
    await gotoHydrated(page, 'split')
    await expect(page.getByTestId('home-hero-slide').nth(0).locator('img')).not.toHaveAttribute('loading', 'lazy')
    await expect(page.getByTestId('home-hero-slide').nth(1).locator('img')).toHaveAttribute('loading', 'lazy')
    // Slide 3 is two steps away from slide 1: not mounted yet.
    await expect(page.getByTestId('home-hero-slide').nth(2).locator('img')).toHaveCount(0)
  })
})

test('two quick clicks never unmount the picture still fading out', async ({ page }) => {
  await gotoHydrated(page, 'split')
  const next = page.getByTestId('home-hero-next')
  await next.click()
  await next.click()
  await expect(activeSlide(page)).toHaveAttribute('aria-label', '3 of 4')
  // Slide 1 is two steps behind now, but it was showing moments ago.
  await expect(page.getByTestId('home-hero-slide').nth(0).locator('img')).toHaveCount(1)
})

test.describe('autoplay', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install()
  })

  test(`advances every ${INTERVAL / 1000}s without announcing, and Pause/Play stops and restarts it`, async ({
    page,
  }) => {
    await gotoHydrated(page, 'split')
    await mouseAway(page)
    await page.clock.runFor(INTERVAL + 100)
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '2 of 4')
    await expect(page.getByTestId('home-hero-live')).toHaveText('')

    await page.getByRole('button', { name: 'Pause slideshow' }).click()
    await expect(page.getByRole('button', { name: 'Play slideshow' })).toBeVisible()
    await mouseAway(page)
    await page.clock.runFor(INTERVAL * 3)
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '2 of 4')

    await page.getByRole('button', { name: 'Play slideshow' }).click()
    await mouseAway(page)
    await page.clock.runFor(INTERVAL + 100)
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '3 of 4')
  })

  test('pauses while the mouse is over it', async ({ page }) => {
    await gotoHydrated(page, 'split')
    await media(page).hover()
    await page.clock.runFor(INTERVAL * 3)
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '1 of 4')
    await mouseAway(page)
    await page.clock.runFor(INTERVAL + 100)
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '2 of 4')
  })

  test('a mouse click on an arrow does not stop it', async ({ page }) => {
    await gotoHydrated(page, 'split')
    await page.getByTestId('home-hero-next').click()
    await mouseAway(page)
    await page.clock.runFor(INTERVAL + 100)
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '3 of 4')
  })

  test('pauses while keyboard focus is inside it', async ({ page }) => {
    await gotoHydrated(page, 'split')
    await mouseAway(page)
    // Keyboard-origin focus: after a key press, a scripted focus() matches
    // :focus-visible in every engine. (Tab itself can't be used to reach a
    // button here -- WebKit's default Tab order skips buttons and links.)
    const pause = page.getByRole('button', { name: 'Pause slideshow' })
    await page.keyboard.press('Shift')
    await pause.focus()
    await expect(pause).toBeFocused()
    expect(await pause.evaluate((el) => el.matches(':focus-visible'))).toBe(true)
    await page.clock.runFor(INTERVAL * 3)
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '1 of 4')
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await page.clock.runFor(INTERVAL + 100)
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '2 of 4')
  })

  test('pauses while the tab is hidden', async ({ page }) => {
    await gotoHydrated(page, 'split')
    await mouseAway(page)
    const setHidden = (hidden: boolean) =>
      page.evaluate((h) => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') })
        document.dispatchEvent(new Event('visibilitychange'))
      }, hidden)
    await setHidden(true)
    await page.clock.runFor(INTERVAL * 3)
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '1 of 4')
    await setHidden(false)
    await page.clock.runFor(INTERVAL + 100)
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '2 of 4')
  })

  test('pauses while scrolled off-screen', async ({ page }) => {
    await gotoHydrated(page, 'split')
    await mouseAway(page)
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await expect.poll(async () => (await media(page).boundingBox())!.y + (await media(page).boundingBox())!.height).toBeLessThan(0)
    // Let the IntersectionObserver report before time moves on.
    await page.waitForTimeout(200)
    await page.clock.runFor(INTERVAL * 3)
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '1 of 4')
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(200)
    await page.clock.runFor(INTERVAL + 100)
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '2 of 4')
  })

  test('never rotates under prefers-reduced-motion, and shows no Pause button', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await gotoHydrated(page, 'split')
    await mouseAway(page)
    await expect(page.getByTestId('home-hero-pause')).toHaveCount(0)
    await page.clock.runFor(INTERVAL * 4)
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '1 of 4')
    // Manual navigation still works.
    await page.getByTestId('home-hero-next').click()
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '2 of 4')
  })

  test('with autoplay off: arrows, no Pause button, never rotates', async ({ page }) => {
    await gotoHydrated(page, 'no-autoplay')
    await mouseAway(page)
    await expect(page.getByTestId('home-hero-pause')).toHaveCount(0)
    await expect(page.getByTestId('home-hero-next')).toBeVisible()
    await page.clock.runFor(INTERVAL * 4)
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '1 of 4')
  })
})

test.describe('fallbacks', () => {
  test('one slide: the picture and caption, no carousel, controls or timer', async ({ page }) => {
    await page.clock.install()
    await page.goto(preview('one-slide'))
    await expectPictureLoaded(media(page))
    await expect(page.getByTestId('home-hero-caption')).toHaveText('Glial activity as a marker of disease →')
    await expect(carousel(page)).not.toHaveAttribute('role', /.*/)
    await expect(page.getByTestId('home-hero-slide')).not.toHaveAttribute('aria-roledescription', /.*/)
    await expect(page.getByRole('button', { name: /slide|slideshow/i })).toHaveCount(0)
    await expect(page.getByTestId('home-hero-live')).toHaveCount(0)
    await page.clock.runFor(INTERVAL * 3)
    await expect(page.getByTestId('home-hero-slide')).toHaveCount(1)
  })

  for (const [state, layout] of [
    ['fallback', 'split'],
    ['fallback-full-bleed', 'fullBleed'],
  ] as const) {
    test(`${state}: no usable slide shows the siteCopy picture alone, with the neutral alt`, async ({ page }) => {
      await page.goto(preview(state))
      await expect(hero(page)).toHaveAttribute('data-layout', layout)
      await expect(page.getByTestId('home-hero-slide')).toHaveCount(1)
      await expect(media(page).locator('img')).toHaveAttribute('alt', HERO_FALLBACK_ALT)
      await expectPictureLoaded(media(page))
      await expect(page.getByTestId('home-hero-controls')).toHaveCount(0)
      await expect(page.getByTestId('home-identity-title')).toBeVisible()
    })
  }

  test('empty: no hero and no siteCopy picture is the finished text-only Home, with no picture box', async ({
    page,
  }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await page.setViewportSize(viewport)
      await page.goto(preview('empty'))
      await expect(hero(page)).toHaveCount(0)
      await expect(media(page)).toHaveCount(0)
      await expect(page.getByTestId('home-identity-title')).toBeVisible()
      await expect(page.getByTestId('home-statement')).toBeVisible()
      await expect(page.getByTestId('home-lab-head-card')).toBeVisible()
    }
  })
})

test.describe('no horizontal overflow', () => {
  for (const state of ['split', 'full-bleed', 'fallback', 'empty']) {
    for (const width of [320, 375, 768, 1024, 1280]) {
      test(`${state} at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 })
        await page.goto(preview(state))
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        expect(overflow).toBeLessThanOrEqual(0)
      })
    }
  }
})

test.describe('accessibility (axe)', () => {
  for (const state of ['split', 'full-bleed', 'one-slide', 'fallback-full-bleed']) {
    for (const viewport of [DESKTOP, PHONE]) {
      for (const colorScheme of SCHEMES) {
        test(`${state} at ${viewport.width}px, ${colorScheme}`, async ({ page }) => {
          await page.setViewportSize(viewport)
          await page.emulateMedia({ colorScheme })
          await page.goto(preview(state))
          await expectPictureLoaded(media(page))
          const results = await new AxeBuilder({ page }).analyze()
          expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([])
        })
      }
    }
  }
})
