import Image from 'next/image'
import Link from 'next/link'

export interface PersonCardProps {
  name: string
  role: string
  /** Optional second mono line under `role`, verbatim, shown only when non-empty (spec §5, ruling 3). */
  detail?: string | null
  img?: string
  initials?: string
  /** Real route: when set, the whole card links to it (`/people/<slug>` when `hasPage`). */
  href?: string | null
}

// Ported from
// docs/redesign-experiment/design-system/components/people/PersonCard.jsx.
// No 'use client': the hover coupling below is pure CSS (`group`/
// `group-hover:`), and next/image works fine in a server component -- there
// is no state, no handler, nothing that needs the client runtime.

// Both states share the exact 4:5 footprint so the grid never reflows
// around a missing portrait (task brief decision #1). `relative` is
// required by next/image's `fill` mode; `aspect-[4/5]` (not a fixed height)
// keeps the box's height derived from its own width at every viewport,
// matching Profile.tsx's `aspect-[1/1]` precedent elsewhere in this repo.
// The two variants are separate, fully-formed strings rather than one base
// plus an appended override -- see tokens.ts's PRESS comment for why that
// matters whenever two utilities could touch the same property (here:
// `box-border`, only needed once the fallback's 1px border is in play, so
// giving the image variant the same class would be silently inert, not
// wrong -- but keeping them apart avoids the pattern entirely).
const FOOTPRINT_IMAGE = 'relative aspect-[4/5] w-full overflow-hidden bg-surface-raised'
const FOOTPRINT_FALLBACK =
  'relative aspect-[4/5] w-full box-border border border-rule flex flex-col items-center justify-center gap-2.5'

// Task brief decision #2: a static generated background is legitimate as an
// inline style -- Tailwind arbitrary values are fragile with nested parens
// and commas, and this repeating-gradient has both. Property-specific
// (`backgroundImage`, not the `background` shorthand the source uses) so it
// composes with a Tailwind `bg-*` utility if one is ever added alongside it
// without either silently overwriting the other.
const STRIPE_BG =
  'repeating-linear-gradient(45deg, transparent 0 12px, color-mix(in oklab, var(--sem-text) 4.5%, transparent) 12px 13px)'

// Carried Task 1 review minor (c): a linked card's colour reveal (grayscale
// portrait, name colour) is mouse-only without these -- `group-focus-visible:`
// pairs mirror each `group-hover:` one exactly, so keyboard focus (Tab onto
// the wrapping Link, PersonCard's `href` branch below) gets the identical
// reveal a mouse hover does. Each pair targets a distinct pseudo-class
// selector (`.group:hover &`, `.group:focus-visible &`), never the same
// selector twice, so this is additive, not a same-property collision.
const IMAGE_FILTER =
  'object-cover grayscale contrast-[1.04] transition-[filter] duration-(--sem-motion-reveal) ease-(--sem-ease) group-hover:grayscale-0 group-hover:contrast-100 group-focus-visible:grayscale-0 group-focus-visible:contrast-100'

/**
 * The image / initials-fallback footprint, extracted verbatim from
 * `PersonCard` so the lab-head spotlight (spec §5, ruling 2 -- "the initials
 * treatment") can reuse the exact same portrait anatomy at a different
 * `sizes`. `sizes` is a required prop rather than a default: the two known
 * call sites (this grid, the spotlight) render at different fractions of
 * the viewport, and there is no "usually correct" default worth guessing --
 * see PersonCard's own `sizes` comment for how this grid's value was
 * measured.
 */
export function PortraitFrame({
  name,
  img,
  initials,
  sizes,
  className,
}: {
  name: string
  img?: string
  initials?: string
  sizes: string
  className?: string
}) {
  return img ? (
    <div className={`${FOOTPRINT_IMAGE} ${className ?? ''}`}>
      <Image src={img} alt={name} fill sizes={sizes} className={IMAGE_FILTER} />
    </div>
  ) : (
    <div className={`${FOOTPRINT_FALLBACK} ${className ?? ''}`} style={{ backgroundImage: STRIPE_BG }}>
      <span className="font-mono text-[26px] leading-none font-medium text-text-muted">
        {initials}
      </span>
      <span className="font-mono text-[8.5px] leading-[1.4] tracking-[0.08em] text-text-faint">
        [ NO PORTRAIT ON FILE ]
      </span>
    </div>
  )
}

export function PersonCard({ name, role, detail, img, initials, href }: PersonCardProps) {
  // Cards render at roughly a third of the content column on desktop and
  // half the viewport on mobile -- matching the measured-not-guessed sizing
  // convention Profile.tsx documents for the same People grid (ImageBox's
  // `size` prop there).
  const sizes = '(min-width: 768px) 25vw, 50vw'

  // When `href` is set, the whole card is a link and needs exactly one
  // accessible name. The portrait <img>'s `alt={name}` and the link would
  // otherwise both announce the name, so the image's `alt` is emptied here
  // (decorative -- the name text below it already carries the content) and
  // the name moves onto the link itself via `aria-label`. Without `href`
  // there's no link to collide with, so the image keeps its own `alt=name`.
  const portraitName = href ? '' : name

  const body = (
    <>
      <PortraitFrame name={portraitName} img={img} initials={initials} sizes={sizes} />
      <div className="mt-2.5 text-[15px] leading-none font-semibold tracking-[-0.005em] transition-[color] duration-(--sem-motion-fast) ease-(--sem-ease) group-hover:text-link group-focus-visible:text-link">
        {name}
      </div>
      {/* `role` and `detail` are free text from the CMS -- printed verbatim,
          including any misspelling in the source data. Never corrected
          here. */}
      <div className="mt-[3px] font-mono text-[10.5px] leading-[1.5] text-text-faint">{role}</div>
      {detail && (
        <div className="mt-[3px] font-mono text-[10.5px] leading-[1.5] text-text-faint">
          {detail}
        </div>
      )}
    </>
  )

  if (href) {
    return (
      <Link href={href} aria-label={name} className="group block">
        {body}
      </Link>
    )
  }

  return <div className="group">{body}</div>
}
