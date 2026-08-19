'use client'

import { FacetChip } from './FacetChip'
import { RAIL_GRID } from './tokens'

export interface FacetChipSpec {
  label: string
  count?: number | string
  on?: boolean
  onClick?: () => void
}

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
// Sticky facet band. In this direction the header is NOT sticky, so the
// band pins at top: 0 and the record scrolls beneath it. If this is ever
// placed under a sticky header, the offset MUST become var(--nav-height) --
// never a hardcoded pixel value (app token contract; see SiteNav's
// --nav-height usage).
const ROW = 'grid grid-cols-[72px_1fr] gap-x-5 items-start'
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
  return (
    <div
      className={`${sticky ? 'sticky' : 'static'} top-0 z-[5] bg-surface ${RAIL_GRID} border-t border-b border-rule`}
    >
      <div className="flex flex-col items-center gap-[18px] border-r border-rule pt-8">
        <span className="font-mono text-[13px] leading-none font-medium text-accent">{num}</span>
        <span className="[writing-mode:vertical-rl] rotate-180 font-mono text-[10px] leading-none tracking-[0.22em] text-text-faint uppercase">
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-3.5 pt-8 pr-(--spacing-gutter-lg) pb-9 pl-(--spacing-gutter-md)">
        {groups.map((g) => (
          <div key={g.label} className={ROW}>
            <span className={ROW_LABEL}>{g.label}</span>
            {/* Vertical gap is 16px (gap-y-4), not the source's 8px, because a
                44px hit area on a ~29px-tall chip overhangs ~7.5px per edge --
                against an 8px row gap that leaves almost no clearance between
                wrapped rows before their hit areas would touch. Horizontal
                gap stays the source's 8px (gap-x-2); only vertical needed
                widening. See the task report for the exact clearance math. */}
            <div className="flex flex-wrap gap-x-2 gap-y-4">
              {g.chips.map((c) => (
                <FacetChip key={c.label} {...c} />
              ))}
            </div>
          </div>
        ))}
        {density && (
          <div className={`${ROW} items-center border-t border-rule pt-3`}>
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
