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
          text block has no fixed height for a flat panel to match and its
          real content (heading + italic subheading) can wrap to a varying
          number of lines depending on viewport width and copy length.

          The gradient is on THIS element -- the text container itself --
          rather than a separate, fixed-height sibling div, precisely because
          a fixed height can't track that variation: an earlier version used
          a 260px-tall sibling with its fade starting at a guessed 85% (221px)
          mark, which held up at 390 (3 lines, ending ~206px down) but left
          320's 4-line wrap (ending ~244.5px down, inside the fade) at only a
          1.82:1 white-underlay contrast -- see the task report for the full
          before/after measurement. Self-sizing removes the guess: `pb-[40px]`
          (below `md:` only) adds 40px of the element's own padding AFTER the
          text, and `via-[calc(100%_-_40px)]` puts the fade's start at exactly
          that padding boundary (the escaped `_-_`: CSS `calc()` requires
          whitespace around a `-` operator per spec, and WebKit -- unlike
          Chromium, which tolerates the omission -- rejects the whole
          declaration without it; caught by running this branch's guard
          under `mobile-safari`, see the task report) -- solid black through
          the ENTIRE content box
          (however many lines it wraps to, at any width) and only fading out
          across the padding, past the last line, every time. Because this is
          padding on an absolutely-positioned, intrinsically-sized element (no
          `top`/`bottom` pair, so its height is content + padding, not
          stretched), adding it changes the element's own height without
          shifting where its content starts -- the heading/subheading keep the
          same position, verified in the browser. `md:bg-none` and `md:pb-0`
          restore this element to a plain, non-gradient box at `md:`, where
          the flat `bg-hero-panel` fill (below) is the only dimming, matching
          Wix's own rgba(0,0,0,0.3) panel with no gradient at all.

          The opacity (62%) is the smallest that held up against the real
          hero photo (live preview, 390 wide) with a comfortable margin, not
          just the bare minimum: 55% measured 4.99:1 / 5.10:1
          (heading/subheading) -- too close to the 4.5:1 bar to trust across
          a photo re-crop or a browser's own gradient rounding; 70% measured
          8.85:1 / 8.90:1 -- visibly heavier than it needs to be; 62% landed
          at 6.49:1 / 6.57:1, repeatable across runs. e2e/wix-home.spec.ts
          automates two checks: the composited measurement against the real
          photo/LQIP (the "clears 4.5:1" test, which is really a guard that
          the LQIP itself reaches the component -- see that test's own
          comment) and a direct guard on this element measured over a white
          underlay at both 390 and 320, which is the one that fails if the
          gradient is ever deleted, made transparent, or its fade point moved
          back within the text. */}
      <div
        data-wix="hero-scrim"
        className="absolute inset-x-0 top-[10px] bg-linear-to-b from-black/62 from-0% via-black/62 via-[calc(100%_-_40px)] to-transparent to-100% px-[10px] pb-[40px] md:top-[221px] md:left-[max(0px,calc(50%_-_497px))] md:right-0 md:h-[180px] md:rounded-[5px] md:bg-hero-panel md:bg-none md:px-[7px] md:pb-0 md:shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
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
