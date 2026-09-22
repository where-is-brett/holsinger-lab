import { urlForImage } from 'lib/sanity.image'
import type { TeamProfile } from 'lib/wix/types'
import Image from 'next/image'

// Wix's rows bottom-align portraits of different natural heights so every
// name in a row sits on the same baseline (Controller ruling #1). Each
// portrait lives in a fixed-height box -- 235px desktop, proportionate on
// mobile (235 * 140/196, rounded) -- with the image anchored to the bottom
// (`items-end`) and any excess above the box clipped (`overflow-hidden`), so
// every card in a row is the same height regardless of the source image's
// aspect ratio.
const BOX_DESKTOP_H = 235

export function PersonCard({
  person,
  className,
  headingLevel: Heading = 'h3',
}: {
  person: TeamProfile
  className?: string
  /** The DOM heading level for the person's name. Defaults to `h3` (a card
   *  nested under a visible section heading, e.g. "Lab Alumni"). The team
   *  page's leading "current members" grid has no such heading above it, so
   *  it passes `h2` there to avoid skipping a level (axe `heading-order`) --
   *  visual size is set entirely by the class list below, so the tag change
   *  doesn't alter appearance. */
  headingLevel?: 'h2' | 'h3'
}) {
  const img = person.image
  const src = img ? urlForImage(img)?.width(392).url() : undefined
  const dims = img?.asset?._ref?.match(/-(\d+)x(\d+)-/)
  const h = dims ? Math.round((196 * Number(dims[2])) / Number(dims[1])) : BOX_DESKTOP_H

  return (
    <li
      data-wix="person"
      className={`flex w-[140px] min-w-0 flex-col items-center text-center md:w-full ${className ?? ''}`}
    >
      {/* md:w-full (not a fixed 196px) lets the grid track's own `fr` sizing
          determine the rendered width -- it lands on exactly 196px once the
          row is >=1220px wide, but must be free to shrink below that so a
          768-1279px viewport scales the whole grid instead of overflowing
          (Controller ruling #2). No visible frame here -- `overflow-hidden`
          with no background or border -- so an image-less current member
          (e.g. Jiyoo Choi in the real dataset) gets the same box height as
          everyone else in the row, with nothing drawn inside it (I2). That
          keeps every name's baseline in a row aligned without ever showing
          an empty portrait box. */}
      <div className="flex h-[168px] w-[140px] items-end justify-center overflow-hidden md:h-[235px] md:w-full">
        {src ? (
          <Image
            src={src}
            // Decorative: the name renders as a heading directly below the
            // portrait (M11), so screen readers would announce it twice.
            alt=""
            width={196}
            height={h}
            sizes="(min-width: 768px) 196px, 140px"
            className="h-auto w-[140px] shrink-0 md:w-full"
          />
        ) : null}
      </div>
      <Heading className="mt-[24px] font-playfair text-[20px]/[27.5px]">{person.name}</Heading>
      {person.role ? <p className="mt-[12px] font-didot text-[16px]/[28px] italic">{person.role}</p> : null}
      {person.roleDetail ? <p className="font-didot text-[16px]/[28px] italic">{person.roleDetail}</p> : null}
    </li>
  )
}
