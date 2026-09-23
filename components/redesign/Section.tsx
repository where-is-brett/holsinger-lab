import type { ReactNode } from 'react'

export interface SectionProps {
  label?: string
  /**
   * Render the label as an `<h2>` instead of a `<p>`. Default `false`
   * (`<p>`): most call sites already have their own in-content heading (a
   * project's `<h2 data-testid="research-project-title">`, a paper's own
   * `<h1>`, a role-group's `<h2 data-testid="people-section-title">`), and
   * a second `<h2>` here would be a redundant, misleading heading rather
   * than a helpful landmark. Set `true` only where the section's content
   * has no heading of its own at all (Home's "Recent work"/"Resources"/
   * "Outreach"/"The lab" blocks, Publications' "Record" list,
   * PublicationPage's "Abstract"/"Cite and access"/"Resource" blocks,
   * Research's "Enquiries" band, Resources' per-item block, People's
   * "Alumni" paragraph, and PersonPage's "Profile" block) -- see
   * task-2-report.md's per-screen table for the full call-by-call
   * reasoning.
   */
  labelHeading?: boolean
  inverse?: boolean
  id?: string
  borderTop?: boolean
  padTop?: string
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
const GRID = 'grid grid-cols-1 gap-2 lg:grid-cols-[10rem_minmax(0,1fr)] lg:items-start lg:gap-x-8 lg:gap-y-0'
// Same asymmetric page gutter every other content column in this direction
// uses (PageTitle.tsx's content row, the former SectionRail content div,
// FacetBand's own content div, PublicationsIndex's now-removed
// RECORD_LIST_PADDING) -- `md`, not `lg`, is this scheme's own breakpoint,
// independent of the `lg` breakpoint that switches the label/content
// layout above. Applied once, to the whole section, since both the label
// and the content column now share one page-edge inset rather than the
// label sitting in its own unguttered rail track.
const GUTTER_X = 'px-(--spacing-gutter) md:pr-(--spacing-gutter-lg) md:pl-(--spacing-gutter-md)'
const LABEL_CLASS = 'font-sans text-[0.8125rem] leading-none font-medium lg:col-start-1'

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
  children,
}: SectionProps) {
  // An inverse band is separated by its own background, so a top rule would
  // read as a seam -- same reasoning `SectionRail` used, carried over
  // unchanged.
  const rule = !inverse && borderTop ? 'border-t border-rule' : ''
  const surface = inverse ? 'bg-surface-inverse text-text-inverse' : ''
  const LabelTag = labelHeading ? 'h2' : 'p'

  return (
    <section id={id} className={`${GRID} ${GUTTER_X} pb-(--spacing-stack-lg) ${surface} ${rule}`} style={{ paddingTop: padTop }}>
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
