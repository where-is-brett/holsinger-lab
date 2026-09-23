import { SECTION_GRID, SECTION_GUTTER_X } from './tokens'

export interface PageTitleProps {
  title: string
  meta?: string
  accentMeta?: boolean
  /**
   * The route-level `PageTitle` is always a real page's `<h1>` -- the
   * default. `headingLevel="h2"` exists only for a page that renders more
   * than one `PageTitle` at once and isn't itself a route (the People
   * gallery fixture, /preview/components: axe's `landmark-unique` doesn't
   * apply to headings, but a page with three `<h1>`s -- the gallery's own,
   * plus one per People instance -- reads as three separate top-level
   * documents to assistive tech, which is exactly what the gallery, a single
   * preview page, is not (task 2 brief, "Headings ... must not collide for
   * axe"). Every real route still gets the semantically-correct `<h1>`.
   */
  headingLevel?: 'h1' | 'h2'
}

// Shares `Section`'s own grid (`SECTION_GRID`/`SECTION_GUTTER_X`, tokens.ts)
// with an empty label cell, so the `<h1>` lines up with every `Section`'s
// content column below it (spec §1.3). Ported from
// docs/redesign-experiment/design-system/components/structure/PageTitle.jsx.
export function PageTitle({ title, meta, accentMeta = false, headingLevel = 'h1' }: PageTitleProps) {
  const Heading = headingLevel
  return (
    <div className={`${SECTION_GRID} ${SECTION_GUTTER_X} pt-(--spacing-stack) pb-[30px]`}>
      {/* `min-w-0` stops this row's implicit `min-width: auto` blowout on
          CMS text. `flex-wrap`/`md:flex-nowrap` stacks the title and meta
          below `md` instead of forcing the row wide. `lg:col-start-2`: with
          no label here, this grid's only child would otherwise auto-place
          into the label's own 10rem track (see Section.tsx's own
          `lg:col-start-2`). Each property is set by exactly one class per
          breakpoint (constraints.md). */}
      <div className="min-w-0 flex flex-wrap items-end justify-between gap-6 md:flex-nowrap lg:col-start-2">
        {/* `min-w-0` here too, not just on the flex container above: a flex
            *item*'s automatic minimum width is its own content size by
            default (the well-known flexbox min-size gotcha), independent
            of the container's own `min-w-0` -- without it, this `<h1>`
            still refused to shrink to fit its row even with `break-words`
            set, because `min-width: auto` was still winning over the
            container's available space. */}
        {/* `break-words` (canonical note -- other heading sites cross-
            reference this one): the last-resort fallback for a word that
            doesn't fit its column. Blink never hyphenates a capitalised
            word, so `hyphens-auto` isn't used on headings here -- CMS
            titles are almost all title-case, and it only added
            platform-dependent hyphenation on the rare lowercase word with
            no benefit. Each heading level's clamp floor is sized so its
            budget word fits on one line at 320px; a longer word may still
            split raw rather than overflow -- a documented exception (see
            phase-3-decisions.md, "Word-fit budget"), not a defect. No
            `leading-none`: it would discard `--text-title`'s own 1.1
            line-height, which matters once a title wraps. */}
        <Heading data-testid="page-title-heading" className="m-0 min-w-0 text-title break-words">
          {title}
        </Heading>
        {meta && (
          /* A sentence-case muted line in Archivo, 15px (spec §1.3) --
             each screen's meta string is sentence case too, so no CSS
             transform is needed here. `min-w-0`/`md:flex-shrink-0`: same
             flexbox min-size fix as the `<h1>` above, so a long meta
             string (e.g. People's "Lab head + N current members · G
             groups") can shrink and wrap below `md` instead of
             overflowing. */
          <span
            data-testid="page-title-meta"
            className={`min-w-0 text-[15px] leading-none font-normal md:flex-shrink-0 ${
              accentMeta ? 'text-link' : 'text-text-muted'
            }`}
          >
            {meta}
          </span>
        )}
      </div>
    </div>
  )
}
