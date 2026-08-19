import Image from 'next/image'

export interface PersonCardProps {
  name: string
  role: string
  img?: string
  initials?: string
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

export function PersonCard({ name, role, img, initials }: PersonCardProps) {
  return (
    <div className="group">
      {img ? (
        <div className={FOOTPRINT_IMAGE}>
          <Image
            src={img}
            alt={name}
            fill
            // Cards render at roughly a third of the content column on
            // desktop and half the viewport on mobile -- matching the
            // measured-not-guessed sizing convention Profile.tsx documents
            // for the same People grid (ImageBox's `size` prop there).
            sizes="(min-width: 768px) 25vw, 50vw"
            // Grayscale at rest, releasing to colour on hover over the
            // 160ms reveal token. `grayscale`/`contrast-[1.04]` are Tailwind
            // filter utilities: unlike `transition-*` utilities (which each
            // overwrite the *whole* transition-property/-duration/-easing
            // triad), every filter utility composes into ONE shared `filter`
            // declaration via CSS custom properties, so stacking
            // `grayscale` and `contrast-[1.04]` here is safe and not an
            // instance of the same-property trap documented in tokens.ts.
            // Only one transition-* utility (`filter`) sits on this
            // element, so it isn't at risk either.
            className="object-cover grayscale contrast-[1.04] transition-[filter] duration-(--sem-motion-reveal) ease-(--sem-ease) group-hover:grayscale-0 group-hover:contrast-100"
          />
        </div>
      ) : (
        <div className={FOOTPRINT_FALLBACK} style={{ backgroundImage: STRIPE_BG }}>
          <span className="font-mono text-[26px] leading-none font-medium text-text-muted">
            {initials}
          </span>
          <span className="font-mono text-[8.5px] leading-[1.4] tracking-[0.08em] text-text-faint">
            [ NO PORTRAIT ON FILE ]
          </span>
        </div>
      )}
      <div className="mt-2.5 text-[15px] leading-none font-semibold tracking-[-0.005em] transition-[color] duration-(--sem-motion-fast) ease-(--sem-ease) group-hover:text-link">
        {name}
      </div>
      {/* `role` is free text from the CMS -- printed verbatim, including any
          misspelling in the source data. Never corrected here. */}
      <div className="mt-[3px] font-mono text-[10.5px] leading-[1.5] text-text-faint">{role}</div>
    </div>
  )
}
