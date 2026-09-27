import Image from 'next/image'
import Link from 'next/link'

export interface PersonCardProps {
  name: string
  /** The role group's CMS title, verbatim; `null`/unset for the ungrouped catch-all. */
  group?: string | null
  /** The person's role text, verbatim -- omitted from the card when unset (see `roleLine`). */
  role?: string | null
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
const FOOTPRINT_IMAGE = 'relative aspect-[4/5] w-full overflow-hidden bg-surface-raised'
// A quiet tile: raised surface, no stripe, no border -- just the initials
// in muted Archivo. `STRIPE_BG` stays in tokens.ts for
// ResourceBlock.tsx's figure placeholder and Home.tsx's `PiPortrait64`
// fallback, which this direction doesn't touch.
const FOOTPRINT_FALLBACK = 'relative aspect-[4/5] w-full flex items-center justify-center bg-surface-raised'

// Brett's review (fix/research-description-fallback): portraits must never
// render in black-and-white -- not even briefly, at rest, before a
// hover/focus reveal. This used to carry a `grayscale`/`contrast-[1.04]`
// treatment that only lifted on `group-hover:`/`group-focus-visible:`; that
// treatment is gone. The docs/redesign-experiment design system still
// specifies greyscale-at-rest portraits -- that vendored doc is read-only,
// so the deviation is recorded in
// docs/redesign-experiment/phase-3-decisions.md instead of edited there.
// The linked card's *name* still gets a colour reveal on hover/focus (see
// the `group-hover:text-link`/`group-focus-visible:text-link` classes on
// the name `div` in `PersonCard` below) -- that's a separate utility on the
// text, not this image, and Brett's instruction only covers the photo.
// Exported (PR C Task 3 fix round 1) so Home.tsx's `PiPortrait64` can give
// the PI's Home portrait the exact same treatment every other portrait in
// this direction gets, rather than a bare `object-cover`. Safe to compose
// onto a differently-sized image element: the one declaration here targets
// `object-fit`, never `width`/`height`/`aspect-ratio`, so it never collides
// with a call site's own sizing classes.
export const PORTRAIT_IMAGE_CLASS = 'object-cover'

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
      <Image src={img} alt={name} fill sizes={sizes} className={PORTRAIT_IMAGE_CLASS} />
    </div>
  ) : (
    // A quiet tile: raised surface, initials in muted Archivo, nothing else.
    // Named for the person when a name is given (the image branch's `alt`);
    // hidden from assistive tech when the name is already read nearby.
    <div
      data-testid="portrait-initials"
      className={`${FOOTPRINT_FALLBACK} ${className ?? ''}`}
      role={name ? 'img' : undefined}
      aria-label={name || undefined}
      aria-hidden={name ? undefined : true}
    >
      <span aria-hidden="true" className="font-sans text-[1.75rem] leading-none font-medium text-text-muted">
        {initials}
      </span>
    </div>
  )
}

export function PersonCard({ name, group, role, detail, img, initials, href }: PersonCardProps) {
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
      {/* The group label: the role group's CMS title, verbatim. */}
      {group && (
        <div
          data-testid="person-card-group"
          data-cms-verbatim
          className="mt-1 font-sans text-[12px] leading-[1.4] font-medium break-words text-text-muted"
        >
          {group}
        </div>
      )}
      {/* `role` and `detail` are free text from the CMS -- printed verbatim,
          including any misspelling in the source data. Never corrected
          here. `data-cms-verbatim` marks that for e2e/label-budget.spec.ts's
          source-caps check, so it never depends on whether a given lab's
          own role text ("MD (UNSW)") happens to read as shouted caps --
          the budget is about labels this repo writes, not the shape of a
          real dataset. Omitted (not just blank) when there's nothing to
          show -- see `roleLine`, which drops a role that just repeats the
          group label above it. */}
      {role && (
        <div className="mt-[3px] font-mono text-[10.5px] leading-[1.5] break-words text-text-faint" data-cms-verbatim>
          {role}
        </div>
      )}
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
