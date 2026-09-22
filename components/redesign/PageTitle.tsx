import { RAIL_GRID } from './tokens'

export interface PageTitleProps {
  title: string
  meta?: string
  accentMeta?: boolean
}

// Sits on the same [rail | content] grid as SectionRail (RAIL_GRID, from
// tokens.ts), with an empty rail cell that still carries the 1px right
// rule. Ported from
// docs/redesign-experiment/design-system/components/structure/PageTitle.jsx.
//
// Sharing RAIL_GRID rather than repeating the class string is not just
// tidiness: PageTitle's rail and every SectionRail's rail share one
// vertical rule running down the page, so their column widths must stay
// byte-identical or that rule jogs sideways at the PageTitle/SectionRail
// seam on mobile. One export is what makes that guarantee enforceable.
export function PageTitle({ title, meta, accentMeta = false }: PageTitleProps) {
  return (
    <div className={RAIL_GRID}>
      <div className="border-r border-rule" />
      {/* Fix round 2: this content column is RAIL_GRID's `1fr` track --
          same implicit `min-width: auto` blowout SectionRail.tsx's content
          div had before its own round-1 `min-w-0` fix, and this one was
          never given the same treatment. The `pr`/`pl` gutters were also
          hardcoded to the desktop-sized `--spacing-gutter-lg`/`-md` tokens
          at every width, so on a narrow phone there was very little room
          left for the `<h1>` + meta row before it forced this column wide.
          Fixed the same way `components/redesign/screens/PublicationsIndex.tsx`'s
          `RECORD_LIST_PADDING` already does it: `px-(--spacing-gutter)`
          (one token, both sides) below the breakpoint, overridden by the
          asymmetric `pr`/`pl` tokens from it -- `md`, not `lg`, to switch
          together with RAIL_GRID's own rail-width breakpoint (38px rail
          below `md`, 88px from `md`). `flex-wrap`/`md:flex-nowrap` lets the
          title and meta stack below `md` instead of forcing the row wide
          when both don't fit side by side; from `md` this is pixel-
          identical to before (same classes, just conditioned on the
          breakpoint they always ran at). Each property -- min-width,
          display's flex-wrap, padding-right, padding-left -- is set by
          exactly one class per breakpoint. */}
      <div className="min-w-0 flex flex-wrap items-end justify-between gap-6 pt-(--spacing-stack) px-(--spacing-gutter) pb-[30px] md:flex-nowrap md:pr-(--spacing-gutter-lg) md:pl-(--spacing-gutter-md)">
        {/* `min-w-0` here too, not just on the flex container above: a flex
            *item*'s automatic minimum width is its own content size by
            default (the well-known flexbox min-size gotcha), independent
            of the container's own `min-w-0` -- without it, this `<h1>`
            still refused to shrink to fit its row even with `break-words`
            set, because `min-width: auto` was still winning over the
            container's available space. */}
        <h1 className="m-0 min-w-0 text-title leading-none break-words">{title}</h1>
        {meta && (
          /* PageTitle.jsx specifies 400 12px/1 mono at 0.1em tracking in
             --sem-text-faint (or --sem-link when accentMeta) -- this
             disagrees with the brief's claim that PageTitle consumes META
             (font-mono text-meta text-text-muted, i.e. a different size,
             tracking and colour). The vendored source wins per the task's
             decision #3, so this is composed by hand rather than using the
             META token from tokens.ts. */
          <span
            className={`flex-shrink-0 font-mono text-[12px] leading-none font-normal tracking-[0.1em] uppercase ${
              accentMeta ? 'text-link' : 'text-text-faint'
            }`}
          >
            {meta}
          </span>
        )}
      </div>
    </div>
  )
}
