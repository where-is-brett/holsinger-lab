'use client'

import { useMemo, useState } from 'react'
import { TOPIC_TITLES } from 'schemas/lib/topics'

import { Button } from '../Button'
import { FacetBand } from '../FacetBand'
import { applyFacets, countBy, toggleFacet } from '../facets'
import { PageTitle } from '../PageTitle'
import type { Publication } from '../publicationModel'
import { PublicationRow } from '../PublicationRow'
import { SectionRail } from '../SectionRail'
import { LABEL, PUBLICATION_GRID } from '../tokens'

// Fixed presentation order (spec §4.3 point 2) -- filtered to the values the
// facet is actually carrying, same pattern as the ui_kit's TYPES constant.
const TYPE_ORDER = ['Article', 'Review', 'Case report']

// The ui_kit's note text, verbatim (spec §4.3 point 2 / Task 4 brief).
const NOTE =
  'CLICK TO FILTER · CLICK AGAIN TO CLEAR — AN UNTAGGED PAPER STILL APPEARS UNDER YEAR AND TYPE · COMPACT TIGHTENS EACH ROW TO ONE SCANNING LINE'

// Column heads (Year · Title · Authors · Tags · Journal · Link · Cite), from
// `lg` only -- the same 4-column ledger template PublicationRow's `GRID`
// uses, so the head row's cells line up with the rows underneath it. `hidden`
// (unprefixed) / `lg:grid` (prefixed) is the same paired-per-breakpoint
// `display` pattern PublicationRow's own KICKER/GRID split uses, so there is
// no same-property collision at either breakpoint.
const COLUMN_HEADS = `hidden ${PUBLICATION_GRID} pb-3`

// ui_kit: `padding: "32px var(--spacing-gutter-lg) var(--spacing-stack-lg) var(--spacing-gutter-md)"`.
// `pt`/`pb` don't vary by breakpoint in the source, so they're set once,
// unprefixed. `pr`/`pl` do -- `px-(--spacing-gutter)` below `md` (a single
// token for both sides, the same shorthand SiteFooter/MobileHeader already
// use), overridden from `md` by the ui_kit's asymmetric `pr`/`pl` tokens.
// Fix round 3: this switched at `lg`, while PageTitle and FacetBand switch
// their matching gutters at `md` -- RAIL_GRID's own rail-width breakpoint
// (38px rail below `md`, 88px from `md`) -- so from 768-1023px this list's
// left edge sat at a different gutter than the page title and facet band
// above it. Now `md`, so all three align through that range; COLUMN_HEADS
// and the row grid itself still switch at `lg` (unchanged -- that's a
// layout breakpoint, not a gutter one). Each of `padding-right` and
// `padding-left` still gets exactly one unprefixed declaration and one
// `md:` declaration -- a responsive pair per property, never two utilities
// fighting for the same property at the same breakpoint (constraints.md).
const RECORD_LIST_PADDING =
  'pt-8 pb-(--spacing-stack-lg) px-(--spacing-gutter) md:pr-(--spacing-gutter-lg) md:pl-(--spacing-gutter-md)'

function formatMeta(pubs: Publication[]): string {
  const years = pubs.map((p) => p.year).filter(Boolean)
  const n = pubs.length
  if (years.length === 0) return `${n} RECORDS`
  const min = years.reduce((a, b) => (b < a ? b : a))
  const max = years.reduce((a, b) => (b > a ? b : a))
  return min === max ? `${n} RECORDS · ${min}` : `${n} RECORDS · ${min}–${max}`
}

export function PublicationsIndex({ publications }: { publications: Publication[] }) {
  const [year, setYear] = useState<string | null>(null)
  const [type, setType] = useState<string | null>(null)
  const [topic, setTopic] = useState<string | null>(null)
  const [density, setDensity] = useState<'COMFORTABLE' | 'COMPACT'>('COMFORTABLE')

  const yearCounts = useMemo(() => countBy(publications, (p) => p.year), [publications])
  const typeCounts = useMemo(() => countBy(publications, (p) => p.type), [publications])
  const topicCounts = useMemo(() => countBy(publications, (p) => p.topics), [publications])

  const years = useMemo(
    () => Object.keys(yearCounts).filter(Boolean).sort((a, b) => (a < b ? 1 : -1)),
    [yearCounts]
  )
  const types = useMemo(() => TYPE_ORDER.filter((t) => typeCounts[t] > 0), [typeCounts])
  const topics = useMemo(() => TOPIC_TITLES.filter((t) => topicCounts[t] > 0), [topicCounts])

  const rows = useMemo(
    () => applyFacets(publications, { year, type, topic }),
    [publications, year, type, topic]
  )
  const filtered = Boolean(year || type || topic)

  const clearAll = () => {
    setYear(null)
    setType(null)
    setTopic(null)
  }

  return (
    <div>
      <PageTitle
        title="Publications"
        meta={filtered ? `${rows.length} OF ${publications.length} RECORDS SHOWN` : formatMeta(publications)}
        accentMeta={filtered}
      />
      <FacetBand
        num="01"
        label="Filter"
        groups={[
          {
            label: 'Year',
            chips: years.map((y) => ({
              label: y,
              count: yearCounts[y],
              on: year === y,
              onClick: () => setYear(toggleFacet(year, y)),
            })),
          },
          {
            label: 'Type',
            chips: types.map((t) => ({
              label: t,
              count: typeCounts[t],
              on: type === t,
              onClick: () => setType(toggleFacet(type, t)),
            })),
          },
          {
            label: 'Topic',
            chips: topics.map((t) => ({
              label: t,
              count: topicCounts[t],
              on: topic === t,
              onClick: () => setTopic(toggleFacet(topic, t)),
            })),
          },
        ]}
        density={{
          options: ['COMFORTABLE', 'COMPACT'],
          value: density,
          onChange: (d) => setDensity(d as 'COMFORTABLE' | 'COMPACT'),
        }}
        note={NOTE}
      />
      <SectionRail num="02" label="Record" borderTop={false} pad={false} padTop="32px">
        <div className={RECORD_LIST_PADDING}>
          <div className={`${COLUMN_HEADS} ${LABEL}`}>
            <span>Year</span>
            <span>Title · Authors · Tags</span>
            <span>Journal</span>
            <span>Link · Cite</span>
          </div>
          {rows.length === 0 ? (
            <div className="flex flex-col items-start gap-4 py-8">
              <p className="text-[14px] leading-[1.5] text-text-muted">
                No records match these filters.
              </p>
              <Button onClick={clearAll}>Clear filters</Button>
            </div>
          ) : (
            rows.map((pub) => (
              <div
                key={pub.id}
                data-testid="pub-row"
                data-year={pub.year}
                data-type={pub.type}
                data-link-kind={pub.linkKind}
              >
                <PublicationRow
                  pub={pub}
                  density={density === 'COMPACT' ? 'compact' : 'comfortable'}
                  href={pub.href}
                />
              </div>
            ))
          )}
        </div>
      </SectionRail>
    </div>
  )
}
