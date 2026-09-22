'use client'

import { FacetChip, type FacetChipProps } from './FacetChip'
import { RAIL_GRID } from './tokens'

// Field-for-field identical to FacetChipProps -- aliased rather than
// redeclared so the two can't drift apart.
export type FacetChipSpec = FacetChipProps

export interface FacetBandProps {
  groups: { label: string; chips: FacetChipSpec[] }[]
  density?: { options: string[]; value: string; onChange: (d: string) => void }
  note?: string
  sticky?: boolean
  num?: string
  label?: string
}

// Presentational only -- the parent owns filter state and counts; this
// component just renders chips and forwards their onClick.
//
// Sticky facet band, sticky only from `lg` (spec §4.2): below `lg` three
// wrapped chip groups plus density would pin half a phone screen, so the
// band stays `static` there. From `lg` it pins at `top: var(--nav-height)`
// -- this site's header IS sticky (unlike the vendored source's own
// assumption), so a hardcoded `top: 0` would tuck the band under the header
// instead of below it.
// Two variants, not one ROW plus an appended `items-center` override:
// Tailwind utilities of equal specificity win by generation order in the
// build's CSS, not by position in the className string, and `.items-center`
// is generated before `.items-start` -- so `${ROW} items-center` silently
// stayed top-aligned (Task 8a review finding). A second, fully-formed class
// string sidesteps the collision instead of relying on override order.
const ROW = 'grid grid-cols-[72px_1fr] gap-x-5 items-start'
const ROW_CENTER = 'grid grid-cols-[72px_1fr] gap-x-5 items-center'
const ROW_LABEL = 'font-mono text-[10px] leading-[2.6] tracking-[0.14em] text-text-faint uppercase'

// Duplicates SectionRail's rail-header block (accent num + vertical mono-
// caps label) with its own padding (32px, not --spacing-stack) and its own
// sticky/both-borders treatment, per the vendored source. Not extracted
// into a shared component here -- see the task report for the extraction
// recommendation; this port keeps the duplication rather than deciding
// unilaterally to factor it out.
export function FacetBand({
  groups = [],
  density,
  note,
  sticky = true,
  num = '01',
  label = 'Filter',
}: FacetBandProps) {
  const visibleGroups = groups.filter((g) => g.chips.length > 0)
  return (
    <div
      className={`${sticky ? 'static lg:sticky lg:top-(--nav-height)' : 'static'} z-[5] bg-surface ${RAIL_GRID} border-t border-b border-rule`}
    >
      <div className="flex flex-col items-center gap-[18px] border-r border-rule pt-8">
        <span className="font-mono text-[13px] leading-none font-medium text-accent">{num}</span>
        <span className="[writing-mode:vertical-rl] rotate-180 font-mono text-[10px] leading-none tracking-[0.22em] text-text-faint uppercase">
          {label}
        </span>
      </div>
      {/* Groups gap is 20px (gap-5), not the source's 14px: the same hit-area
          intrusion that forced gap-y-5 inside a group also applies across
          groups -- a chip's 44px hit area still overhangs 7.5px per edge, so
          the last chip row of one group and the first row of the next
          intrude 15px combined into this gap. 14px left them overlapping by
          ~1px, which is worse here than within a group: the ambiguous tap
          sits between chips belonging to *different* facets (e.g. a Year
          chip and a Type chip), so a mis-tap silently applies the wrong
          filter. 20px matches the same 5px-clearance policy as the
          intra-group gap (Task 8a review finding). The density row below
          doesn't need this: its border-t + pt-3 already add ~18.5px of real
          separation from the last group's chips. */}
      <div className="flex flex-col gap-5 pt-8 pr-(--spacing-gutter-lg) pb-9 pl-(--spacing-gutter-md)">
        {visibleGroups.map((g) => (
          <div key={g.label} className={ROW}>
            <span className={ROW_LABEL}>{g.label}</span>
            {/* Vertical gap is 20px (gap-y-5), not the source's 8px: a 44px hit
                area on a ~29px-tall chip overhangs 7.5px per edge, so two
                wrapped rows' hit areas intrude 15px combined into the gap
                between them. A 16px gap would leave only ~1px -- a rounding
                error, not a margin -- so this uses 20px for 5px of real
                clearance. Horizontal gap stays the source's 8px (gap-x-2):
                horizontal overhang is bounded by inset-x-0, so it was never
                at risk. See the task report for the full clearance math. */}
            <div className="flex flex-wrap gap-x-2 gap-y-5">
              {g.chips.map((c) => (
                <FacetChip key={c.label} {...c} />
              ))}
            </div>
          </div>
        ))}
        {density && (
          <div className={`${ROW_CENTER} border-t border-rule pt-3`}>
            <span className={`${ROW_LABEL} leading-none`}>Density</span>
            <div className="flex gap-2">
              {density.options.map((d) => (
                <FacetChip key={d} label={d} on={density.value === d} onClick={() => density.onChange(d)} />
              ))}
            </div>
          </div>
        )}
        {note && (
          <div className="font-mono text-[10px] leading-[1.5] tracking-[0.08em] text-text-faint uppercase">
            {note}
          </div>
        )}
      </div>
    </div>
  )
}
