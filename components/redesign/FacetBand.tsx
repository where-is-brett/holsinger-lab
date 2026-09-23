'use client'

import { FacetChip, type FacetChipProps } from './FacetChip'

// Field-for-field identical to FacetChipProps -- aliased rather than
// redeclared so the two can't drift apart.
export type FacetChipSpec = FacetChipProps

export interface FacetBandProps {
  groups: { label: string; chips: FacetChipSpec[] }[]
  density?: { options: string[]; value: string; onChange: (d: string) => void }
  note?: string
}

// Presentational only -- the parent owns filter state and counts; this
// component just renders chips and forwards their onClick.
//
// Not sticky: the band renders inside `Section`'s content cell, which is
// exactly the band's own height, so a sticky element here has nowhere to
// scroll to. It stays in normal flow with no top-offset or z-index.
// `data-testid="facet-band"` is what `e2e/nav-logo.spec.ts`/
// `e2e/publications-interactive.spec.ts` locate this element by.
// Two variants, not one ROW plus an appended `items-center` override:
// Tailwind utilities of equal specificity win by generation order in the
// build's CSS, not by position in the className string, and `.items-center`
// is generated before `.items-start` -- so `${ROW} items-center` silently
// stayed top-aligned (Task 8a review finding). A second, fully-formed class
// string sidesteps the collision instead of relying on override order.
// `grid-cols-[72px_minmax(0,1fr)]` on both, not a bare `1fr`: the `1fr`
// track has an implicit `min-width: auto` and would otherwise refuse to
// shrink below the widest chip row's min-content width (the same blowout
// Section.tsx's content column guards against). A separate
// `min-w-0` utility on the row div would have been inert here -- `min-w-0`
// constrains a grid *item's* own min-width, not the width the grid formula
// assigns to a *track*, and it's the track's implicit `min-width: auto`
// that was blowing out at 320px. `minmax(0,1fr)` sets the track's own
// minimum directly, so this stays a real fix rather than a dead class.
const ROW = 'grid grid-cols-[72px_minmax(0,1fr)] gap-x-5 items-start'
const ROW_CENTER = 'grid grid-cols-[72px_minmax(0,1fr)] gap-x-5 items-center'
// Sentence-case Archivo, not uppercase mono (spec §1.5): "Year" / "Type" /
// "Topic" / "Density" are facet-group labels, not data column heads, so
// the micro-label budget rule applies to them too. `leading-[26px]` is a
// fixed pixel value, not a unitless multiplier, matching this row's own
// vertical rhythm -- unrelated to the wrapped chip rows' own
// vertical-clearance math below.
const ROW_LABEL = 'font-sans text-[0.8125rem] leading-[26px] font-medium text-text-faint'
// Density's label sits in a `items-center` row (no wrapped chip rows to
// vertically center against), so it doesn't need ROW_LABEL's own leading --
// but `${ROW_LABEL} leading-none` doesn't override that, it collides with
// it: both set `line-height` on the same element at the same (unprefixed)
// breakpoint, and Tailwind resolves the tie by generation order in the
// build's CSS, not by position in the className string, so ROW_LABEL's own
// leading was silently still winning. A separate constant with its own
// single `line-height` declaration sidesteps the collision instead of
// relying on override order (same fix shape as ROW/ROW_CENTER above it).
const DENSITY_ROW_LABEL = 'font-sans text-[0.8125rem] leading-none font-medium text-text-faint'

// This component owns no horizontal gutter -- it renders inside
// `PublicationsIndex.tsx`'s `Section label="Filter"`, which supplies it
// (the same way it does for the "Record" list below), lining the chip rows
// up with the ledger rows beneath them at `Section`'s own content column.
// `pt-8`/`pb-9` stay here: the vertical rhythm inside the band (chip-row
// spacing, the density row's own separator) is this component's own
// concern, not `Section`'s.
export function FacetBand({ groups = [], density, note }: FacetBandProps) {
  const visibleGroups = groups.filter((g) => g.chips.length > 0)
  return (
    <div
      data-testid="facet-band"
      className="bg-surface border-t border-b border-rule min-w-0 flex flex-col gap-5 pt-8 pb-9"
    >
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
          <span className={DENSITY_ROW_LABEL}>Density</span>
          {/* `flex-wrap` plus the same `gap-x-2 gap-y-5` hit-area clearance
              as the chip groups above (see that comment for the 44px hit
              area / 20px gap math) -- without it, COMPACT's options row
              had nowhere to wrap to and clipped at 320px. */}
          <div className="flex flex-wrap gap-x-2 gap-y-5">
            {density.options.map((d) => (
              <FacetChip key={d} label={d} on={density.value === d} onClick={() => density.onChange(d)} />
            ))}
          </div>
        </div>
      )}
      {/* Sentence-case Archivo, not uppercase mono -- `note` is a status
          line (the gallery's own "N of M publications" demo). */}
      {note && <div className="font-sans text-[13px] leading-[1.5] text-text-faint">{note}</div>}
    </div>
  )
}
