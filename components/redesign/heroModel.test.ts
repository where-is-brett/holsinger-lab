import type { HomeHeroQueryResult } from 'sanity.types'
import { HERO_MAX_SLIDES as SCHEMA_MAX } from 'schemas/objects/homeHero'
import { describe, expect, it, vi } from 'vitest'

// The real urlForImage, with fixed project/dataset strings in place of the
// NEXT_PUBLIC_SANITY_* env vars -- same approach as lib/sanity.image.test.ts.
vi.mock('lib/sanity.api', () => ({ dataset: 'production', projectId: 'test-project' }))

import { HERO_FALLBACK_ALT, HERO_MAX_SLIDES, hotspotPosition, resolveHomeHero } from './heroModel'

type Hero = NonNullable<HomeHeroQueryResult['hero']>
type Slide = NonNullable<Hero['slides']>[number]

const asset = (id: string) => ({
  _ref: `image-${id}-2394x1769-png`,
  _type: 'reference' as const,
})

const imageSlide = (key: string, extra: Partial<Extract<Slide, { _type: 'heroImageSlide' }>> = {}): Slide => ({
  _key: key,
  _type: 'heroImageSlide',
  image: { asset: asset(key), crop: null, hotspot: null },
  alt: `Alt ${key}`,
  caption: null,
  link: null,
  ...extra,
})

const projectSlide = (key: string, project: Partial<Extract<Slide, { _type: 'reference' }>['project']> | null): Slide =>
  ({
    _key: key,
    _type: 'reference',
    project:
      project === null
        ? null
        : {
            _id: `p-${key}`,
            title: `Project ${key}`,
            slug: `project-${key}`,
            coverImage: { asset: asset(key), crop: null, hotspot: null, alt: null },
            ...project,
          },
  }) as Slide

const data = (hero: Partial<Hero> | null, fallbackImage: HomeHeroQueryResult['fallbackImage'] = null) => ({
  hero: hero ? { layout: null, autoplay: null, slides: null, ...hero } : null,
  fallbackImage,
})

describe('resolveHomeHero', () => {
  it('is null (text-only Home) with no hero and no siteCopy image -- production today', () => {
    expect(resolveHomeHero(data(null))).toBeNull()
    expect(resolveHomeHero(null)).toBeNull()
    expect(resolveHomeHero(data({ slides: [] }))).toBeNull()
  })

  it('falls back to one static siteCopy picture with a neutral alt when no slide is usable', () => {
    const hero = resolveHomeHero(
      data({ layout: 'fullBleed', autoplay: true, slides: [projectSlide('a', { coverImage: null })] }, {
        asset: asset('collage'),
        crop: null,
        hotspot: null,
        alt: null,
      })
    )
    expect(hero?.layout).toBe('fullBleed')
    expect(hero?.autoplay).toBe(false)
    expect(hero?.slides).toHaveLength(1)
    expect(hero?.slides[0]).toMatchObject({ alt: HERO_FALLBACK_ALT, caption: null, href: null })
    expect(hero?.slides[0].src).toContain('collage')
  })

  it("keeps the siteCopy image's own alt, and shows the whole picture (no crop applied here)", () => {
    const hero = resolveHomeHero(data(null, { asset: asset('collage'), crop: null, hotspot: null, alt: ' Mouse cortex ' }))
    expect(hero?.layout).toBe('split')
    expect(hero?.slides[0].alt).toBe('Mouse cortex')
    expect(hero?.slides[0].src).not.toContain('rect=')
  })

  it('defaults to split and to autoplay on when both are unset', () => {
    const hero = resolveHomeHero(data({ slides: [imageSlide('a'), imageSlide('b')] }))
    expect(hero).toMatchObject({ layout: 'split', autoplay: true })
  })

  it('respects autoplay off, and never autoplays a single slide', () => {
    expect(resolveHomeHero(data({ autoplay: false, slides: [imageSlide('a'), imageSlide('b')] }))?.autoplay).toBe(false)
    expect(resolveHomeHero(data({ autoplay: true, slides: [imageSlide('a')] }))?.autoplay).toBe(false)
  })

  it('applies the slide crop to the delivered picture', () => {
    const hero = resolveHomeHero(
      data({
        slides: [imageSlide('a', { image: { asset: asset('a'), crop: { _type: 'sanity.imageCrop', left: 0.44, top: 0.49, right: 0, bottom: 0 }, hotspot: null } })],
      })
    )
    expect(hero?.slides[0].src).toMatch(/rect=\d+,\d+,\d+,\d+/)
  })

  it('links an image slide caption to an internal page or an external URL', () => {
    const hero = resolveHomeHero(
      data({
        slides: [
          imageSlide('a', { caption: 'Glia', link: { internal: { _type: 'project', slug: 'glia' }, external: null } }),
          imageSlide('b', { caption: 'Paper', link: { internal: { _type: 'publication', slug: 'p1' }, external: null } }),
          imageSlide('c', { caption: 'Support', link: { internal: { _type: 'page', slug: 'support' }, external: null } }),
          imageSlide('d', { caption: 'Elsewhere', link: { internal: null, external: ' https://example.org ' } }),
          imageSlide('e', { caption: '  ', link: { internal: null, external: 'https://example.org' } }),
          imageSlide('f', { caption: 'Plain' }),
        ],
      })
    )
    expect(hero?.slides.map((s) => [s.caption, s.href])).toEqual([
      ['Glia', '/projects/glia'],
      ['Paper', '/publications/p1'],
      ['Support', '/support'],
      ['Elsewhere', 'https://example.org'],
      // No caption, nothing to click: a link is never rendered without text.
      [null, null],
      ['Plain', null],
    ])
  })

  it('renders a project slide from its cover, titled and linked to the project', () => {
    const [slide] = resolveHomeHero(data({ slides: [projectSlide('a', { title: ' MAESTRO ' })] }))!.slides
    expect(slide).toMatchObject({ caption: 'MAESTRO', href: '/projects/project-a', alt: '' })
  })

  it('skips project slides with no cover, a deleted project, or no title, and image slides with no picture', () => {
    const hero = resolveHomeHero(
      data({
        slides: [
          projectSlide('a', { coverImage: null }),
          projectSlide('b', null),
          projectSlide('c', { title: ' ' }),
          imageSlide('d', { image: null }),
          imageSlide('e', { image: { asset: null, crop: null, hotspot: null } }),
          imageSlide('keep'),
        ],
      })
    )
    expect(hero?.slides.map((s) => s.key)).toEqual(['keep'])
  })

  it(`keeps at most ${HERO_MAX_SLIDES} slides, in order`, () => {
    const slides = Array.from({ length: 8 }, (_, i) => imageSlide(`s${i}`))
    expect(resolveHomeHero(data({ slides }))?.slides.map((s) => s.key)).toEqual(['s0', 's1', 's2', 's3', 's4', 's5'])
  })

  it('agrees with the Studio limit', () => {
    expect(HERO_MAX_SLIDES).toBe(SCHEMA_MAX)
  })
})

describe('hotspotPosition', () => {
  it('centres with no hotspot', () => {
    expect(hotspotPosition({})).toBe('50% 50%')
  })

  it('uses the hotspot directly with no crop', () => {
    expect(hotspotPosition({ hotspot: { x: 0.25, y: 0.8 } })).toBe('25% 80%')
  })

  it('re-expresses the hotspot relative to the cropped picture', () => {
    // Crop keeps x 0.5..1 and y 0..0.5; a hotspot at (0.75, 0.25) is the
    // middle of what's left.
    expect(hotspotPosition({ hotspot: { x: 0.75, y: 0.25 }, crop: { left: 0.5, right: 0, top: 0, bottom: 0.5 } })).toBe(
      '50% 50%'
    )
  })

  it('clamps a hotspot outside the crop to its edge', () => {
    expect(hotspotPosition({ hotspot: { x: 0.1, y: 0.9 }, crop: { left: 0.5, right: 0, top: 0, bottom: 0.5 } })).toBe(
      '0% 100%'
    )
  })
})
