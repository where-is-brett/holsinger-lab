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
// Task 2 fix round 2 (controller ruling): the band is no longer sticky.
// It used to pin at `top: var(--nav-height)` from a combined
// `min-width:64rem`/`min-height:56rem` breakpoint (spec §4.2, fix round
// 3) -- removed because PR 3 was already going to remove sticky filtering
// entirely (Brett's own feedback), and fix round 1's `Section label=
// "Filter"` wrap (below) left the band's sticky positioning broken anyway:
// a sticky element can only travel as far as its parent's own height, and
// `Section`'s content cell is exactly the band's height, so it had nowhere
// to scroll to (re-review, "New Breakage 1"). No replacement top-offset or
// z-index is needed -- both existed only to support the sticky pin, never
// for anything else (the band was never meant to render above other
// content once it's back in normal flow). `data-testid="facet-band"`
// (new) is what `e2e/nav-logo.spec.ts`/`e2e/publications-interactive.spec.ts`
// now locate this element by, replacing the old `z-[5]`-ancestor lookup
// that existed purely because `z-[5]` was otherwise this element's only
// unique, stable class.
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
const ROW_LABEL = 'font-mono text-[10px] leading-[2.6] tracking-[0.14em] text-text-faint uppercase'
// Density's label sits in a `items-center` row (no wrapped chip rows to
// vertically center against), so it doesn't need ROW_LABEL's `leading-[2.6]`
// -- but `${ROW_LABEL} leading-none` doesn't override that, it collides
// with it: both set `line-height` on the same element at the same
// (unprefixed) breakpoint, and Tailwind resolves the tie by generation
// order in the build's CSS, not by position in the className string, so
// `leading-[2.6]` was silently still winning. A separate constant with its
// own single `line-height` declaration sidesteps the collision instead of
// relying on override order (same fix shape as ROW/ROW_CENTER above it).
const DENSITY_ROW_LABEL = 'font-mono text-[10px] leading-none tracking-[0.14em] text-text-faint uppercase'

// Task 2 (spec §1.3): the "01 / Filter" rail label and its column are gone
// -- PR 3 replaces this whole band; this task only removes the numbering
// and rail so no screen is left broken between PRs.
//
// Task 2 fix round 1 (controller ruling): the brief's own label table lists
// Publications' labels as "Filter" and "Record" -- `PublicationsIndex.tsx`
// now renders this component inside a `Section label="Filter"`, so the
// component itself no longer owns any horizontal gutter (`Section`
// supplies it, the same way it already does for the "Record" list below).
// This is what lines the chip rows up with the ledger rows beneath them,
// both starting at `Section`'s own content column. `pt-8`/`pb-9` stay: the
// vertical rhythm inside the band (chip-row spacing, the density row's own
// separator) is this component's own concern, not `Section`'s.
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
      {note && (
        <div className="font-mono text-[10px] leading-[1.5] tracking-[0.08em] text-text-faint uppercase">
          {note}
        </div>
      )}
    </div>
  )
}
