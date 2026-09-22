import { placeRow } from 'lib/wix/placeRow'
import type { TeamProfile } from 'lib/wix/types'

import { PersonCard } from './PersonCard'

// Static lookup so Tailwind's build-time scanner sees every literal
// `col-start-*` class this component can emit (dynamic template strings like
// `col-start-${n}` are invisible to it). placeRow always returns an odd
// track number 1-9.
const COL_START: Record<number, string> = {
  1: 'md:col-start-1',
  3: 'md:col-start-3',
  5: 'md:col-start-5',
  7: 'md:col-start-7',
  9: 'md:col-start-9',
}

/** Splits a flat, ordered list into rows of 5, with any partial (< 5) row
 *  either first or last (Controller ruling #4: alumni photo cards put the
 *  partial row first; current members put it last). */
function chunkRows<T>(items: T[], partialFirst: boolean): T[][] {
  const rows: T[][] = []
  const remainder = items.length % 5
  const fullRowCount = Math.floor(items.length / 5)
  let i = 0
  if (remainder > 0 && partialFirst) {
    rows.push(items.slice(i, i + remainder))
    i += remainder
  }
  for (let r = 0; r < fullRowCount; r++) {
    rows.push(items.slice(i, i + 5))
    i += 5
  }
  if (remainder > 0 && !partialFirst) {
    rows.push(items.slice(i, i + remainder))
  }
  return rows
}

/** A grid of PersonCards: 5 columns at a 256px pitch (196 + 60 gap) on
 *  desktop, one centred column on mobile. Desktop widths below 1280 scale
 *  the whole grid down (via `fr` tracks) rather than scroll, per the
 *  Controller ruling on partial-width desktop viewports. */
export function PersonGrid({
  people,
  partialFirst = false,
  bigGap = false,
  headingLevel,
}: {
  people: TeamProfile[]
  partialFirst?: boolean
  /** The alumni photo grid's lone opening row (a single short-captioned
   *  card) needs a bigger row-to-row gap than current members' rows to
   *  reach the measured Wix row 2 position -- see the C7 report. */
  bigGap?: boolean
  /** Forwarded to each PersonCard -- see its doc comment. */
  headingLevel?: 'h2' | 'h3'
}) {
  const rows = chunkRows(people, partialFirst)
  return (
    <div className={`flex flex-col items-center gap-y-[40px] ${bigGap ? 'md:gap-y-[147px]' : 'md:gap-y-[75px]'}`}>
      {rows.map((row, ri) => (
        <ul
          key={ri}
          className="mx-auto flex w-full max-w-[1220px] flex-col items-center gap-y-[40px] md:grid md:grid-cols-[196fr_60fr_196fr_60fr_196fr_60fr_196fr_60fr_196fr] md:items-start md:gap-y-[60px]"
        >
          {row.map((p, i) => (
            <PersonCard
              key={p._id}
              person={p}
              className={COL_START[placeRow(row.length, i)]}
              headingLevel={headingLevel}
            />
          ))}
        </ul>
      ))}
    </div>
  )
}
