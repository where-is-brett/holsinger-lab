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
      <div className="flex items-end justify-between gap-6 pt-(--spacing-stack) pr-(--spacing-gutter-lg) pb-[30px] pl-(--spacing-gutter-md)">
        <h1 className="m-0 text-title leading-none">{title}</h1>
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
