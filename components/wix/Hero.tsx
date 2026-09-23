import { intrinsicImageWidth, urlForImage } from 'lib/sanity.image'
import { cleanLqip } from 'lib/wix/format'
import type { HomeData } from 'lib/wix/types'
import Image from 'next/image'
import { stegaClean } from 'next-sanity'

// The largest width worth ever requesting for a full-bleed hero, for
// genuinely large sources. `.fit('max')` (in urlForImage) already refuses to
// upscale past the source's real size, so this is defense in depth, not a
// fix for an observed bug: it caps only the ORIGIN (Sanity CDN) url's own
// `w=` parameter via lib/sanity.image.ts's intrinsicImageWidth. It does NOT
// reduce next/image's srcSet -- that list of widths comes from next.config's
// `deviceSizes`, unrelated to this value -- and for the current hero asset
// (2394px wide) it's a no-op: capping at 2394 instead of MAX_HERO_WIDTH
// produces a byte-identical response, since `fit=max` already refused to
// upscale to the larger, uncapped width.
const MAX_HERO_WIDTH = 2560

export function Hero({ hero }: { hero: NonNullable<HomeData['copy']>['hero'] }) {
  const assetRef = hero?.image?.asset?._ref
  const requestWidth = Math.min(MAX_HERO_WIDTH, intrinsicImageWidth(assetRef) ?? MAX_HERO_WIDTH)
  const src = hero?.image ? urlForImage(hero.image)?.width(requestWidth).url() : undefined
  const lqip = cleanLqip(hero?.heroImageLqip)
  return (
    <section data-wix-block="hero" className="relative h-[410px] overflow-hidden bg-black md:mt-[20px] md:h-[429px]">
      {src ? (
        <Image
          src={src}
          alt={stegaClean(hero?.image?.alt) ?? ''}
          fill
          priority
          // `priority` alone drives `<link rel="preload">` (via the
          // component's internal `preload: preload || priority`) but no
          // longer sets `fetchpriority` on the rendered <img> itself in this
          // Next.js version -- that prop is now taken from the caller
          // verbatim rather than derived from `priority`. The LCP element
          // needs both.
          fetchPriority="high"
          sizes="100vw"
          className="object-cover"
          {...(lqip ? { placeholder: 'blur' as const, blurDataURL: lqip } : {})}
        />
      ) : null}
      {/* Below `md:` the text has no panel to sit on (see the `md:bg-hero-panel`
          box below) and parts of it sit directly on a bright, busy photo.
          Wix's own desktop treatment is a flat rgba(0,0,0,0.3) panel; this is
          the same idea -- "the image, dimmed behind the words" -- but as a
          vertical gradient rather than a hard-edged card, since the mobile
          text block has no fixed height for a flat panel to match, and its
          real content (heading + italic subheading) wraps to as many as 2
          and 3 lines respectively at this width, reaching ~206px down from
          the top of the section (measured against both the fixture heading/
          subheading and the live preview's real copy -- see the task
          report). The gradient holds a constant black through 0-85% of its
          own height (covering that whole text zone with margin -- the 85%
          mark is 221px down, past the subheading's actual end at 206px) and
          only fades out over its last 15%, well after the text ends, so it
          reads as "the image, dimmed behind the words" rather than a
          hard-edged bar.

          The opacity (62%) is the smallest that held up against the real
          hero photo (live preview, 390 wide) with a comfortable margin, not
          just the bare minimum: 55% measured 4.99:1 / 5.10:1
          (heading/subheading) -- too close to the 4.5:1 bar to trust across
          a photo re-crop or a browser's own gradient rounding; 70% measured
          8.85:1 / 8.90:1 -- visibly heavier than it needs to be; 62% landed
          at 6.49:1 / 6.57:1, repeatable across runs. See
          e2e/wix-home.spec.ts for the automated measurement (against the
          fixture's flat fallback, not the photo -- see that file's own
          comment). */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[260px] bg-linear-to-b from-black/62 from-0% via-black/62 via-85% to-transparent to-100% md:hidden"
      />
      <div className="absolute inset-x-0 top-[10px] px-[10px] md:top-[221px] md:left-[max(0px,calc(50%_-_497px))] md:right-0 md:h-[180px] md:rounded-[5px] md:bg-hero-panel md:px-[7px] md:shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
        {hero?.heading ? (
          <h1 data-wix="hero-heading" className="font-playfair text-[23px]/[40.25px] font-bold text-white md:text-[36px]/[63px]">
            {hero.heading}
          </h1>
        ) : null}
        {hero?.subheading ? (
          <p data-wix="hero-subheading" className="font-playfair text-[22px]/[38.5px] italic text-white md:text-[32px]/[56px]">
            {hero.subheading}
          </p>
        ) : null}
      </div>
    </section>
  )
}
