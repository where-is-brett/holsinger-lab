import { urlForImage } from 'lib/sanity.image'
import { resolveHref } from 'lib/sanity.links'
import type { Image as SanityImage } from 'sanity'
import type { HomeHeroQueryResult } from 'sanity.types'

// Pure helpers for Home's picture banner (`home.hero`,
// schemas/objects/homeHero.ts) -- same model/screen split as homeModel.ts,
// so every fallback branch is unit-testable without rendering.

export type HeroLayout = 'split' | 'fullBleed'

export interface HeroSlideView {
  key: string
  src: string
  alt: string
  /** Shown under (split) or over (full-bleed) the picture; `null` shows no caption. */
  caption: string | null
  /** The caption's link, when it has one. Never set without a caption. */
  href: string | null
  /** CSS `object-position` from the editor's hotspot, so a narrow box keeps the marked part. */
  objectPosition: string
}

export interface HomeHeroView {
  layout: HeroLayout
  /** Only ever `true` with two or more slides -- a single slide has nothing to rotate to. */
  autoplay: boolean
  slides: HeroSlideView[]
}

export const HERO_MAX_SLIDES = 6

/**
 * The alt text for `siteCopy.hero.image` when that image has none -- the
 * collage the lab uses there today is all fluorescence microscopy.
 */
export const HERO_FALLBACK_ALT = "Fluorescence microscopy of brain cells from the lab's research"

// Wide enough for a full-bleed band on a 2x screen. `urlForImage`'s own
// `fit('max')` never upscales past the (cropped) source, and next/image
// re-sizes it down to each `srcset` width.
const SOURCE_WIDTH = 2400

type Hero = NonNullable<HomeHeroQueryResult['hero']>
type Slide = NonNullable<Hero['slides']>[number]

interface HeroImage {
  asset?: { _ref?: string } | null
  crop?: { left?: number; right?: number; top?: number; bottom?: number } | null
  hotspot?: { x?: number; y?: number } | null
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const percent = (n: number) => `${Math.round(clamp01(n) * 1000) / 10}%`

/**
 * The hotspot, re-expressed relative to the cropped picture (the delivered
 * bytes are already cropped, so the hotspot's whole-image fractions would
 * otherwise point at the wrong place). Centre when there's no hotspot.
 */
export function hotspotPosition(image: HeroImage): string {
  const { hotspot, crop } = image
  if (hotspot?.x == null || hotspot?.y == null) return '50% 50%'
  const left = crop?.left ?? 0
  const top = crop?.top ?? 0
  const keptX = 1 - left - (crop?.right ?? 0)
  const keptY = 1 - top - (crop?.bottom ?? 0)
  const x = keptX > 0 ? (hotspot.x - left) / keptX : 0.5
  const y = keptY > 0 ? (hotspot.y - top) / keptY : 0.5
  return `${percent(x)} ${percent(y)}`
}

function imageSrc(image: HeroImage | null | undefined): string | null {
  if (!image?.asset?._ref) return null
  return urlForImage(image as unknown as SanityImage)?.width(SOURCE_WIDTH).url() ?? null
}

const trimmed = (s: string | null | undefined) => s?.trim() || null

function slideView(slide: Slide): HeroSlideView | null {
  if (slide._type === 'heroImageSlide') {
    const src = imageSrc(slide.image)
    if (!src || !slide.image) return null
    const caption = trimmed(slide.caption)
    const internal = slide.link?.internal
    const href = internal ? resolveHref(internal._type, internal.slug) : trimmed(slide.link?.external)
    return {
      key: slide._key,
      src,
      // `alt` is required in the Studio, so this fallback only covers an
      // unpublished draft seen in Presentation mode.
      alt: trimmed(slide.alt) ?? HERO_FALLBACK_ALT,
      caption,
      href: caption ? href ?? null : null,
      objectPosition: hotspotPosition(slide.image),
    }
  }
  // A project reference. A deleted project dereferences to `null`, and a
  // project with no cover has no picture to show -- both are skipped.
  const project = slide.project
  const title = trimmed(project?.title)
  const src = imageSrc(project?.coverImage)
  if (!project || !title || !src || !project.coverImage) return null
  return {
    key: slide._key,
    src,
    // Decorative by default: the caption right under it is the project's
    // own title, so an alt repeating it would be read out twice. An alt an
    // editor wrote on the cover (the Wix import carries some) is kept.
    alt: trimmed((project.coverImage as { alt?: string | null }).alt) ?? '',
    caption: title,
    href: resolveHref('project', project.slug) ?? null,
    objectPosition: hotspotPosition(project.coverImage),
  }
}

/**
 * Home's picture banner, or `null` for the text-only Home.
 *
 * Fallback chain: the editor's usable slides (at most six) -> the classic
 * layout's `siteCopy.hero.image` as one static picture -> `null`. The
 * layout choice applies to the fallback picture too.
 */
export function resolveHomeHero(data: HomeHeroQueryResult | null | undefined): HomeHeroView | null {
  const hero = data?.hero
  const layout: HeroLayout = hero?.layout === 'fullBleed' ? 'fullBleed' : 'split'
  const slides = (hero?.slides ?? [])
    .map(slideView)
    .filter((s): s is HeroSlideView => s !== null)
    .slice(0, HERO_MAX_SLIDES)

  if (slides.length > 0) {
    // Unset (an older `home` document, saved before this field existed)
    // means on, matching the field's own `initialValue`.
    return { layout, autoplay: slides.length > 1 && hero?.autoplay !== false, slides }
  }

  const fallback = data?.fallbackImage
  const src = imageSrc(fallback)
  if (!fallback || !src) return null
  return {
    layout,
    autoplay: false,
    slides: [
      {
        key: 'fallback',
        src,
        alt: trimmed(fallback.alt) ?? HERO_FALLBACK_ALT,
        caption: null,
        href: null,
        objectPosition: hotspotPosition(fallback),
      },
    ],
  }
}
