import type { ReactNode } from 'react'

import { SECTION_GRID, SECTION_GUTTER_X } from './tokens'

export interface SectionProps {
  label?: string
  /**
   * Render the label as an `<h2>` instead of a `<p>`. Default `false`
   * (`<p>`): most call sites already have their own in-content heading (a
   * project's `<h2 data-testid="research-project-title">`, a paper's own
   * `<h1>`, a role-group's `<h2 data-testid="people-section-title">`), and
   * a second `<h2>` here would be a redundant, misleading heading rather
   * than a helpful landmark. Set `true` only where the section's content
   * has no heading of its own at all (Home's "Recent work"/"Outreach"/
   * "The lab" blocks, Publications' "Record" list, PublicationPage's
   * "Abstract"/"Cite and access" blocks, Research's "Enquiries" band,
   * People's "Alumni" paragraph, and PersonPage's "Profile" block). Leave
   * it `false` (the default) for Home's/PublicationPage's/Resources' own
   * resource blocks -- `ResourceBlock`'s own title is a real `<h2>` (fix
   * round 2), so a second `<h2>` label there would be a redundant sibling
   * heading -- see task-2-report.md's per-screen table for the full
   * call-by-call reasoning.
   */
  labelHeading?: boolean
  inverse?: boolean
  id?: string
  borderTop?: boolean
  padTop?: string
  /**
   * Task 2 fix round 1: added so `FacetBand` (wrapped in a `Section
   * label="Filter"`, per the controller's ruling on the brief's Filter
   * label) can suppress `Section`'s own vertical rhythm (`"0px"`) and keep
   * owning its own -- `FacetBand` already has real internal padding
   * (chip-row spacing, its own border) that would otherwise stack with
   * `Section`'s, inserting an unwanted gap between it and the "Record"
   * list directly below it. Every other call site keeps the default.
   */
  padBottom?: string
  children: ReactNode
}

// Section's structural signature: from `lg` (1024px), a `[label |
// content]` grid with a narrow ~10rem label column, top-aligned, no
// vertical rule between the two (spec §1.3 -- the numbered rail's own
// vertical divider is gone along with the numbering). Below `lg`, a single
// column: the label sits above the content as a plain block, separated by
// a small gap, with no rail column and no vertical rule at any width.
//
// `lg:col-start-2` on the content wrapper (not just a bare second grid
// child) matters when there is no label at all (`label` unset, e.g. Home's
// Identity block, or the "no records yet" empty states): with only one
// grid child, CSS auto-placement would otherwise drop it into the grid's
// *first* column (the label's own 10rem track) rather than the wider
// content track, visibly narrowing it. Explicitly pinning the content to
// column 2 keeps its width the same whether or not a label renders.
//
// `SECTION_GRID`/`SECTION_GUTTER_X` live in tokens.ts, not here, so
// `PageTitle.tsx` can share the exact same grid (Task 2 fix round 1 --
// see tokens.ts's own comment on `SECTION_GRID`).
// `mb-0!` (Task 2 fix round 3, re-review round 2 Minor 2): `styles/index.css`
// has an unlayered base rule, `p:not(:last-child) { margin-bottom:
// 0.875rem }`, that beats Tailwind's own layered utilities regardless of
// source order -- it applied to every `<p>` label (this component's
// default), giving it a 14px larger gap to its content than an `<h2>`
// label got (measured: 22px vs 8px below `lg`), even though both cases use
// this identical `LABEL_CLASS` string. The trailing-bang form emits
// `margin-bottom: … !important`, which is what actually beats the
// unlayered base rule; an `<h2>` label was never affected by that rule in
// the first place, so this is a no-op there.
const LABEL_CLASS = 'font-sans text-[0.8125rem] leading-none font-medium mb-0! lg:col-start-1'

/**
 * Ported from `SectionRail` (docs/redesign-experiment/design-system/
 * components/structure/SectionRail.jsx originally), replacing the numbered,
 * vertically-rotated rail label with a sentence-case one (spec §1.3, task
 * brief "Numbered rail → sentence-case `Section`"): no `num`, no uppercase,
 * no tracking, no vertical writing mode.
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
  // An inverse band is separated by its own background, so a top rule would
  // read as a seam -- same reasoning `SectionRail` used, carried over
  // unchanged.
  const rule = !inverse && borderTop ? 'border-t border-rule' : ''
  const surface = inverse ? 'bg-surface-inverse text-text-inverse' : ''
  const LabelTag = labelHeading ? 'h2' : 'p'

  return (
    <section
      id={id}
      className={`${SECTION_GRID} ${SECTION_GUTTER_X} ${surface} ${rule}`}
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
