import { urlForImage } from 'lib/sanity.image'
import type { HomeData } from 'lib/wix/types'
import Image from 'next/image'
import { stegaClean } from 'next-sanity'

export function Hero({ hero }: { hero: NonNullable<HomeData['copy']>['hero'] }) {
  const src = hero?.image ? urlForImage(hero.image)?.width(2560).url() : undefined
  return (
    <section data-wix-block="hero" className="relative h-[410px] overflow-hidden bg-black md:h-[429px]">
      {src ? (
        <Image src={src} alt={stegaClean(hero?.image?.alt) ?? ''} fill priority sizes="100vw" className="object-cover" />
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
