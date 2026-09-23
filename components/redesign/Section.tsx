import type { ReactNode } from 'react'

import { SECTION_GRID, SECTION_GUTTER_X } from './tokens'

export interface SectionProps {
  label?: string
  /**
   * Render the label as an `<h2>` instead of a `<p>`. Default `false`
   * (`<p>`): most call sites already have their own in-content heading (a
   * project's, a paper's `<h1>`, a role-group's), so a second `<h2>` here
   * would be redundant. Set `true` only where the section's content has no
   * heading of its own at all -- see phase-3-decisions.md for the
   * per-screen breakdown.
   */
  labelHeading?: boolean
  inverse?: boolean
  id?: string
  borderTop?: boolean
  padTop?: string
  /**
   * Lets a caller with its own vertical rhythm (e.g. `FacetBand`, which
   * has its own padding and border) suppress `Section`'s default (`"0px"`)
   * so the two don't stack into an unwanted gap. Every other call site
   * keeps the default.
   */
  padBottom?: string
  children: ReactNode
}

// From `lg` (1024px): a `[label | content]` grid with a narrow ~10rem
// label column, top-aligned, no vertical rule between the two (spec
// §1.3). Below `lg`: a single column, label above content.
//
// `lg:col-start-2` on the content wrapper matters when there's no label
// (e.g. Home's Identity block): with only one grid child, CSS
// auto-placement would otherwise drop it into the label's own 10rem
// track, narrowing it. Pinning it to column 2 keeps its width constant
// either way.
//
// `SECTION_GRID`/`SECTION_GUTTER_X` live in tokens.ts so `PageTitle.tsx`
// can share the exact same grid.
//
// `mb-0!`: `styles/index.css` has an unlayered base rule,
// `p:not(:last-child) { margin-bottom: 0.875rem }`, that beats Tailwind's
// layered utilities regardless of source order and only affects the `<p>`
// label case -- the trailing-bang `!important` form is what beats it. An
// `<h2>` label is never affected by that rule, so this is a no-op there.
const LABEL_CLASS = 'font-sans text-[0.8125rem] leading-none font-medium mb-0! lg:col-start-1'

/**
 * A sentence-case section label (spec §1.3): no numbering, no uppercase,
 * no tracking, no vertical writing mode. Ported from
 * docs/redesign-experiment/design-system/components/structure/SectionRail.jsx.
 */
export function Section({
  label,
  labelHeading = false,
  inverse = false,
  id,
  borderTop = true,
  padTop = 'var(--spacing-stack)',
  padBottom = 'var(--spacing-stack-lg)',
  children,
}: SectionProps) {
  // An inverse band is separated by its own background, so a top rule
  // would read as a seam.
  const rule = !inverse && borderTop ? 'border-t border-rule' : ''
  const surface = inverse ? 'bg-surface-inverse text-text-inverse' : ''
  const LabelTag = labelHeading ? 'h2' : 'p'
  // Only a section with an `id` is ever a same-page anchor target
  // (Research.tsx's `id={project.slug}`) -- `scroll-mt-(--nav-height)`
  // keeps the sticky header (SiteChrome.tsx, `--nav-height` tall) from
  // covering it after an in-page jump or a `/research#slug` navigation.
  const anchorOffset = id ? 'scroll-mt-(--nav-height)' : ''

  return (
    <section
      id={id}
      className={`${SECTION_GRID} ${SECTION_GUTTER_X} ${surface} ${rule} ${anchorOffset}`}
      style={{ paddingTop: padTop, paddingBottom: padBottom }}
    >
      {label && (
        <LabelTag
          data-testid="section-label"
          className={`${LABEL_CLASS} ${inverse ? 'text-text-inverse-muted' : 'text-text-muted'}`}
        >
          {label}
        </LabelTag>
      )}
      {/* `min-w-0`: this is a grid item on a `minmax(0,1fr)` track, which
          already zeroes its own min-content floor -- belt-and-braces, same
          convention every other grid/flex item holding CMS text in this
          direction already follows (PageTitle.tsx, PersonPage.tsx's
          PROFILE_GRID, Research.tsx's NARRATIVE_GRID, ...). */}
      <div className="min-w-0 lg:col-start-2">{children}</div>
    </section>
  )
}
