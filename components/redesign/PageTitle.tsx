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

// Task 2 fix round 1 (controller ruling): the rail column is gone, but the
// `<h1>` doesn't just sit at the page's own left gutter any more -- it sits
// in the exact same content column every `Section` below it uses
// (`SECTION_GRID`/`SECTION_GUTTER_X`, tokens.ts), with an empty label cell.
// Before this fix, `PageTitle` used the page gutter directly and Home's own
// Identity block (a labelless `Section`, pinned to `lg:col-start-2`) put
// its `<h1>` ~192px further right at `lg` -- every route's title jogged
// sideways relative to its own body copy immediately below it. Ported from
// docs/redesign-experiment/design-system/components/structure/PageTitle.jsx,
// minus that source's own rail column.
export function PageTitle({ title, meta, accentMeta = false, headingLevel = 'h1' }: PageTitleProps) {
  const Heading = headingLevel
  return (
    <div className={`${SECTION_GRID} ${SECTION_GUTTER_X} pt-(--spacing-stack) pb-[30px]`}>
      {/* Fix round 2 (Task 1): min-w-0 stops this row's own implicit
          `min-width: auto` blowout, same mechanism as every other
          unconstrained flex/grid item holding CMS text in this direction
          (Section.tsx's content column, PersonPage.tsx's PROFILE_GRID).
          `flex-wrap`/`md:flex-nowrap` lets the title and meta stack below
          `md` instead of forcing the row wide when both don't fit side by
          side; from `md` this is pixel-identical to before. `lg:col-start-2`
          (fix round 1): the empty first grid cell -- there is no label
          here, ever -- would otherwise auto-place this, the grid's only
          child, into the label's own 10rem track (same mechanism as
          Section.tsx's own `lg:col-start-2` comment). Each property --
          min-width, display's flex-wrap, grid-column-start -- is set by
          exactly one class per breakpoint (constraints.md). */}
      <div className="min-w-0 flex flex-wrap items-end justify-between gap-6 md:flex-nowrap lg:col-start-2">
        {/* `min-w-0` here too, not just on the flex container above: a flex
            *item*'s automatic minimum width is its own content size by
            default (the well-known flexbox min-size gotcha), independent
            of the container's own `min-w-0` -- without it, this `<h1>`
            still refused to shrink to fit its row even with `break-words`
            set, because `min-width: auto` was still winning over the
            container's available space. */}
        {/* Task 1 ("Fonts and type scale") fix round 2 (canonical note --
            other heading sites cross-reference this one, keep it here):
            `hyphens-auto` is declared, but Blink (Chromium) never
            hyphenates a word that starts with a capital letter
            (`hyphenate_capitalized_word_` defaults to false), so on
            title-case CMS text -- nearly every heading in this app --
            `hyphens-auto` is inert and `break-words` alone decides the
            outcome. `break-words` stays: overflow is worse than a raw
            mid-word split, and constraints.md's no-overflow floor is
            unconditional. Each heading level's clamp floor is sized so its
            budget word fits on one line in its real page column at 320px
            (task-1-report.md, "Word-fit budgets"); a word past that
            budget still splits raw as a documented last resort, never
            overflows. `hyphens`/`overflow-wrap` are different CSS
            properties, so this is additive, not a same-property
            collision. */}
        <Heading
          data-testid="page-title-heading"
          className="m-0 min-w-0 text-title leading-none break-words hyphens-auto"
        >
          {title}
        </Heading>
        {meta && (
          /* Task 2 (spec §1.3): "meta becomes one sentence-case muted line
             in Archivo, 15px. Drop the mono caps." -- was 12px mono,
             uppercased and tracked (PageTitle.jsx's own vendored spec);
             each screen's meta string itself moved to sentence case at the
             same time (Home.tsx/People.tsx/Research.tsx/Resources.tsx/
             PublicationsIndex.tsx's own formatters), so there is no longer
             any CSS transform doing the case work here.
             `min-w-0`/`md:flex-shrink-0`: a longer meta string (People's
             "Lab head + N current members · G groups", vs. Publications'
             shorter "N publications, Y") overflowed the viewport below
             `md` before this fix -- see the flexbox min-size note on the
             `<h1>` above; same mechanism, same fix, just on this span. */
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
