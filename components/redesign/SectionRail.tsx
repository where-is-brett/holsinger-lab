import type { ReactNode } from 'react'

import { RAIL_GRID } from './tokens'

export interface SectionRailProps {
  num?: string
  label?: string
  inverse?: boolean
  borderTop?: boolean
  pad?: boolean
  padTop?: string
  children?: ReactNode
}

// The direction's structural signature: every screen composes this as a
// [rail | content] grid. Ported from
// docs/redesign-experiment/design-system/components/structure/SectionRail.jsx,
// which is the authority for the markup/values below -- the brief only
// gives props and a partial stub.
export function SectionRail({
  num,
  label,
  inverse = false,
  borderTop = true,
  pad = true,
  padTop = 'var(--spacing-stack)',
  children,
}: SectionRailProps) {
  // An inverse band is separated by its own background, so a top rule would
  // read as a seam. This is why borderTop is ignored when inverse is set.
  const rule = !inverse && borderTop ? 'border-t border-rule' : ''
  const surface = inverse ? 'bg-surface-inverse text-text-inverse' : ''

  return (
    <section className={`${RAIL_GRID} ${surface} ${rule}`}>
      <div
        className={`flex flex-col items-center gap-[18px] border-r ${
          inverse ? 'border-rule-inverse' : 'border-rule'
        }`}
        style={{ paddingTop: padTop }}
      >
        {num && (
          <span
            className={`font-mono text-[13px] leading-none font-medium ${
              inverse ? 'text-link-inverse' : 'text-accent'
            }`}
          >
            {num}
          </span>
        )}
        {label && (
          <span
            className={`[writing-mode:vertical-rl] rotate-180 font-mono text-[10px] leading-none font-normal tracking-[0.22em] uppercase ${
              inverse ? 'text-text-inverse-muted' : 'text-text-faint'
            }`}
          >
            {label}
          </span>
        )}
      </div>
      {/* Fix round 1: this is the RAIL_GRID's `1fr` content track, and a `1fr`
          grid track has an implicit `min-width: auto` -- it refuses to
          shrink below its widest child's own min-content width. A long,
          unbreakable child (Task 5's Tag row, when a topic title is long
          enough) was blowing this track out past the viewport rather than
          being constrained to the space the grid actually allotted it,
          which propagated a full-page horizontal-scroll defect through
          every sibling in the column (the `<h1>`, paragraphs, etc. -- all
          `width: auto` elements that stretch to fill this box). `min-w-0`
          overrides that implicit minimum so the track is sized by the grid
          definition, not by its content; it's additive to (not merged
          with) the conditional padding classes below, so there's no
          same-property collision. */}
      <div
        className={`min-w-0 ${
          pad
            ? 'pt-(--spacing-stack) pr-(--spacing-gutter-lg) pb-(--spacing-stack-lg) pl-(--spacing-gutter-md)'
            : ''
        }`}
      >
        {children}
      </div>
    </section>
  )
}
