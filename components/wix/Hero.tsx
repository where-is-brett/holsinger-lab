import { intrinsicImageWidth, urlForImage } from 'lib/sanity.image'
import type { HomeData } from 'lib/wix/types'
import Image from 'next/image'
import { stegaClean } from 'next-sanity'

// The largest width worth ever requesting for a full-bleed hero, for
// genuinely large sources. `.fit('max')` (in urlForImage) already refuses to
// upscale past the source's real size, but capping the request at the
// source's own intrinsic width too avoids generating srcSet entries (and
// cache entries) larger than the source could ever fill -- see
// lib/sanity.image.ts's intrinsicImageWidth.
const MAX_HERO_WIDTH = 2560

export function Hero({ hero }: { hero: NonNullable<HomeData['copy']>['hero'] }) {
  const assetRef = hero?.image?.asset?._ref
  const requestWidth = Math.min(MAX_HERO_WIDTH, intrinsicImageWidth(assetRef) ?? MAX_HERO_WIDTH)
  const src = hero?.image ? urlForImage(hero.image)?.width(requestWidth).url() : undefined
  const lqip = hero?.heroImageLqip
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
      <div className="absolute inset-x-0 top-[10px] px-[10px] md:top-[221px] md:left-[max(0px,calc(50%_-_497px))] md:right-0 md:h-[180px] md:rounded-[5px] md:bg-hero-panel md:px-[7px] md:shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
        {hero?.heading ? (
          <h1 data-wix="hero-heading" className="font-playfair text-[23px]/[40.25px] font-bold text-white md:text-[36px]/[63px]">
            {hero.heading}
          </h1>
        ) : null}
        {hero?.subheading ? (
          <p className="font-playfair text-[22px]/[38.5px] italic text-white md:text-[32px]/[56px]">{hero.subheading}</p>
        ) : null}
      </div>
    </section>
  )
}
