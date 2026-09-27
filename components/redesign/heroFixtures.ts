import type { HomeHeroQueryResult } from 'sanity.types'

// `homeHeroQuery`-shaped fixtures for the /preview/home-hero/[state] route
// (e2e/home-hero.spec.ts). CI builds against production, which has no
// `home.hero` and no `siteCopy` today, so these are the only place the
// picture banner's states are exercised. They go through the real
// `resolveHomeHero`, so crops, captions, links and the fallback chain are
// the production code path, not a hand-built view.
//
// Every asset is a real image in the production dataset (the one CI and
// `.env.local` build against), so `urlForImage` resolves each to a live
// cdn.sanity.io URL.

type Hero = NonNullable<HomeHeroQueryResult['hero']>
type Slide = NonNullable<Hero['slides']>[number]

const ref = (id: string) => ({ _ref: id, _type: 'reference' as const })
const crop = (left: number, top: number, right: number, bottom: number) => ({
  _type: 'sanity.imageCrop' as const,
  left,
  top,
  right,
  bottom,
})

// Astrocytes.png, two microscopy panels side by side.
const ASTROCYTES = 'image-0e2d7720e33113626f1a7b6baf103321cbc4c64c-1960x900-png'
// Astro.png, a four-panel collage with white borders -- the seam case.
const ASTRO_COLLAGE = 'image-cc4d0305c7508f2801f7e948fbab63588db3046a-2094x1724-png'
const GUT_MICROBIOTA_COVER = 'image-45518c36ea6bb7226b7bccde2f771569e1833b34-1222x596-png'
const MAESTRO_COVER = 'image-f7173a5eacc731565b57490cede743f30e50e6f5-2245x1587-png'

const GLIA_SLIDE: Slide = {
  _key: 'glia',
  _type: 'heroImageSlide',
  // The left panel only, its white edge rows trimmed.
  image: { asset: ref(ASTROCYTES), crop: crop(0.003, 0.004, 0.513, 0.012), hotspot: null },
  alt: 'Fluorescence microscopy of astrocytes in mouse brain tissue',
  caption: 'Glial activity as a marker of disease',
  link: { internal: { _type: 'project', slug: 'glial-activity-as-a-marker-of-disease' }, external: null },
}

const GUT_SLIDE: Slide = {
  _key: 'gut',
  _type: 'reference',
  project: {
    _id: 'fixture-gut-microbiota',
    title: "Fecal microbiota transplantation as a treatment for Alzheimer's disease",
    slug: 'involvement-of-gut-microbiota-in-ad',
    coverImage: { asset: ref(GUT_MICROBIOTA_COVER), crop: null, hotspot: null, alt: null },
  },
}

const MAESTRO_SLIDE: Slide = {
  _key: 'maestro',
  _type: 'reference',
  project: {
    _id: 'fixture-maestro',
    title: 'MAESTRO: dreaMers And doErs, the Scientists of TomorROw',
    slug: 'maestro',
    coverImage: { asset: ref(MAESTRO_COVER), crop: null, hotspot: null, alt: null },
  },
}

// An uncaptioned picture, cropped to one panel of the collage (the white
// borders trimmed off) -- proves a slide with no caption still shows the
// arrows, and that a crop removes the seams.
const COLLAGE_PANEL_SLIDE: Slide = {
  _key: 'collage-panel',
  _type: 'heroImageSlide',
  image: { asset: ref(ASTRO_COLLAGE), crop: crop(0.022, 0.461, 0.523, 0.027), hotspot: null },
  alt: 'Astrocytes labelled green in a section of mouse cortex',
  caption: null,
  link: null,
}

// A project with no cover: always skipped.
const NO_COVER_SLIDE: Slide = {
  _key: 'no-cover',
  _type: 'reference',
  project: { _id: 'fixture-no-cover', title: 'A project with no cover image', slug: 'no-cover', coverImage: null },
}

const SLIDES = [GLIA_SLIDE, GUT_SLIDE, NO_COVER_SLIDE, MAESTRO_SLIDE, COLLAGE_PANEL_SLIDE]

const FALLBACK_IMAGE: HomeHeroQueryResult['fallbackImage'] = {
  asset: ref(ASTROCYTES),
  crop: null,
  hotspot: null,
  // No alt, as in the classic layout's own field today: the neutral
  // fallback alt applies.
  alt: null,
}

export const HERO_FIXTURES = {
  // Four usable slides (the no-cover project is skipped), autoplay on.
  split: { hero: { layout: 'split', autoplay: true, slides: SLIDES }, fallbackImage: FALLBACK_IMAGE },
  'full-bleed': { hero: { layout: 'fullBleed', autoplay: true, slides: SLIDES }, fallbackImage: FALLBACK_IMAGE },
  'no-autoplay': { hero: { layout: 'split', autoplay: false, slides: SLIDES }, fallbackImage: null },
  'one-slide': { hero: { layout: 'split', autoplay: true, slides: [GLIA_SLIDE] }, fallbackImage: FALLBACK_IMAGE },
  // No usable slide -> one static siteCopy picture.
  fallback: { hero: { layout: 'split', autoplay: true, slides: [NO_COVER_SLIDE] }, fallbackImage: FALLBACK_IMAGE },
  'fallback-full-bleed': { hero: { layout: 'fullBleed', autoplay: null, slides: null }, fallbackImage: FALLBACK_IMAGE },
  // Production today: no hero, no siteCopy -> the text-only Home.
  empty: { hero: null, fallbackImage: null },
} satisfies Record<string, HomeHeroQueryResult>

export type HeroFixtureState = keyof typeof HERO_FIXTURES
