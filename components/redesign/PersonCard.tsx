import Image from 'next/image'
import Link from 'next/link'

import { STRIPE_BG } from './tokens'

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

// `STRIPE_BG` (task brief decision #2: a static generated background is
// legitimate as an inline style -- Tailwind arbitrary values are fragile
// with nested parens and commas, and this repeating-gradient has both) now
// lives in tokens.ts (PR C Task 3 fix round 1) -- ResourceBlock.tsx and
// Home.tsx's `PiPortrait64` fallback use the identical value, and it was a
// verbatim triplicate before this hoist.

// Carried Task 1 review minor (c): a linked card's colour reveal (grayscale
// portrait, name colour) is mouse-only without these -- `group-focus-visible:`
// pairs mirror each `group-hover:` one exactly, so keyboard focus (Tab onto
// the wrapping Link, PersonCard's `href` branch below) gets the identical
// reveal a mouse hover does. Each pair targets a distinct pseudo-class
// selector (`.group:hover &`, `.group:focus-visible &`), never the same
// selector twice, so this is additive, not a same-property collision.
// Exported (PR C Task 3 fix round 1) so Home.tsx's `PiPortrait64` can give
// the PI's Home portrait the exact same treatment every other portrait in
// this direction gets, rather than a bare `object-cover`. Safe to compose
// onto a differently-sized image element: every declaration here targets
// `object-fit`/filter/transition, never `width`/`height`/`aspect-ratio`, so
// it never collides with a call site's own sizing classes.
export const IMAGE_FILTER =
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
    // Task 3 fix round 1: the "[ NO PORTRAIT ON FILE ]" line is deleted --
    // it's system-explaining copy (the kind item 1 of the brief removes),
    // and it rendered on live `/people` any time a profile has no image.
    // The initials plus the quiet striped background are enough; PR 4 adds
    // a real initials tile.
    <div className={`${FOOTPRINT_FALLBACK} ${className ?? ''}`} style={{ backgroundImage: STRIPE_BG }}>
      <span className="font-mono text-[26px] leading-none font-medium text-text-muted">
        {initials}
      </span>
    </div>
  )
}

export function PersonCard({ name, role, detail, img, initials, href }: PersonCardProps) {
  // Matches CARD_GRID's own breakpoints (components/redesign/screens/People.tsx):
  // grid-cols-2 below md (each card ~50vw of the viewport), md:grid-cols-3
  // (~30vw, not the naive 33vw -- the grid sits inside the page's own side
  // gutters, same reasoning Profile.tsx's `size` prop documented for the old
  // People grid), lg:grid-cols-6 (~15vw, not 16.6vw, for the same reason).
  const sizes = '(min-width: 1024px) 15vw, (min-width: 768px) 30vw, 50vw'

  // When `href` is set, the whole card is a link. The portrait <img>'s
  // `alt={name}` would otherwise duplicate the name text rendered right
  // below it inside the same link, so the image's `alt` is emptied here
  // (decorative -- the name text below it already carries the content).
  // Final-review fix wave: the link no longer carries `aria-label={name}`
  // -- that collapsed the link's accessible name to just the name, hiding
  // the role and detail text from screen-reader users navigating by link.
  // With `alt=""` on the image and no `aria-label`, the link's accessible
  // name is computed from its own visible text content (name, role, and
  // detail when present) -- exactly what a sighted user sees, with no
  // double announcement of the name. Without `href` there's no link to
  // collide with, so the image keeps its own `alt=name`.
  const portraitName = href ? '' : name

  const body = (
    <>
      <PortraitFrame name={portraitName} img={img} initials={initials} sizes={sizes} />
      {/* `break-words` on all three lines (final-review fix wave): none of
          them wrapped before, and a long unhyphenated token -- a surname
          ("Priya Balasubramaniam") or a parenthesised roleDetail
          ("(Neuroscience/Pharmacology)") -- overflows the ~111px card
          width the base 2-column grid gives each card at 320px. The
          gallery fixture now carries both shapes in the grid's rightmost
          column (fixtures.ts) so the /preview/components 320px overflow
          check actually exercises this. */}
      <div className="mt-2.5 text-[15px] leading-none font-semibold tracking-[-0.005em] break-words transition-[color] duration-(--sem-motion-fast) ease-(--sem-ease) group-hover:text-link group-focus-visible:text-link">
        {name}
      </div>
      {/* `role` and `detail` are free text from the CMS -- printed verbatim,
          including any misspelling in the source data. Never corrected
          here. `data-cms-verbatim` (Task 3 fix round 2, re-review N1):
          e2e/label-budget.spec.ts's source-caps check must never depend on
          whether a given lab's own role text ("MD (UNSW)") happens to read
          as shouted caps -- the budget is about labels this repo writes,
          not about the shape of a real dataset. */}
      <div className="mt-[3px] font-mono text-[10.5px] leading-[1.5] break-words text-text-faint" data-cms-verbatim>
        {role}
      </div>
      {detail && (
        <div
          className="mt-[3px] font-mono text-[10.5px] leading-[1.5] break-words text-text-faint"
          data-cms-verbatim
        >
          {detail}
        </div>
      )}
    </>
  )

  if (href) {
    return (
      <Link href={href} className="group block">
        {body}
      </Link>
    )
  }

  return <div className="group">{body}</div>
}
