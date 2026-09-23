'use client'

import { useMemo, useState } from 'react'
import { TOPIC_TITLES } from 'schemas/lib/topics'

import { Button } from '../Button'
import { FacetBand } from '../FacetBand'
import { applyFacets, countBy, toggleFacet } from '../facets'
import { PageTitle } from '../PageTitle'
import { formatFilteredPublicationsMeta, formatPublicationsMeta, type Publication } from '../publicationModel'
import { PublicationRow } from '../PublicationRow'
import { Section } from '../Section'
import { LABEL, PUBLICATION_GRID } from '../tokens'

// Fixed presentation order (spec §4.3 point 2) -- filtered to the values the
// facet is actually carrying, same pattern as the ui_kit's TYPES constant.
const TYPE_ORDER = ['Article', 'Review', 'Case report']

// The ui_kit's note text, verbatim (spec §4.3 point 2 / Task 4 brief).
const NOTE =
  'CLICK TO FILTER · CLICK AGAIN TO CLEAR — AN UNTAGGED PAPER STILL APPEARS UNDER YEAR AND TYPE · COMPACT TIGHTENS EACH ROW TO ONE SCANNING LINE'

// Column heads (Year · Title · Authors · Tags · Journal · Link · Cite),
// from `xl` only (moved from `lg` in Task 2 fix round 1 -- see
// `PUBLICATION_GRID`'s own comment in tokens.ts) -- the same 4-column
// ledger template PublicationRow's `GRID` uses, so the head row's cells
// line up with the rows underneath it. `hidden` (unprefixed) / `PUBLICATION_
// GRID`'s own `xl:grid` (prefixed) is the same paired-per-breakpoint
// `display` pattern PublicationRow's own KICKER/GRID split uses, so there is
// no same-property collision at either breakpoint.
const COLUMN_HEADS = `hidden ${PUBLICATION_GRID} pb-3`

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
        meta={
          filtered
            ? formatFilteredPublicationsMeta(rows.length, publications.length)
            : formatPublicationsMeta(publications)
        }
        accentMeta={filtered}
      />
      {/* Task 2 fix round 1 (controller ruling): the brief's own label
          table lists Publications' labels as "Filter" and "Record" -- the
          original fix round removed "Filter" along with the rail
          entirely, leaving no Filter label anywhere and a visible
          misalignment (the band's chips started at the page gutter while
          the Record rows started at the content column). Wrapping
          `FacetBand` in its own `Section` restores the label and lines the
          chips up with the rows below. `padTop`/`padBottom` "0px":
          `FacetBand` already owns its own vertical rhythm (border, chip-row
          spacing) -- `Section`'s own default padding would stack with it
          rather than replace it. `borderTop={false}`: `FacetBand` still
          renders its own top border (unchanged), so `Section` doesn't add
          a second one immediately above it. `labelHeading`: true --
          `FacetBand`'s content is chips, not headings, so "Filter" is this
          section's only one. PR 3 replaces the band's internals; this is
          purely the alignment/label fix this task's brief called for.

          Fix round 2 (controller ruling): re-review found this wrap had
          silently broken `FacetBand`'s own sticky positioning -- a sticky
          element can only travel as far as its parent's own height, and
          this `Section`'s content cell was exactly the band's height, so
          it had nowhere to scroll to. Resolved by removing the band's
          sticky behaviour entirely (PR 3 was already removing it; see
          FacetBand.tsx's own comment), not by un-wrapping it -- so this
          `Section` wrap, `padTop`/`padBottom`/`borderTop` all stay exactly
          as fix round 1 left them. */}
      <Section label="Filter" labelHeading borderTop={false} padTop="0px" padBottom="0px">
        <FacetBand
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
      </Section>
      {/* Task 2: `labelHeading` true -- the record list has no heading of
          its own (a column-head row and a list of rows), so `Record` is
          this section's only one. `padTop="32px"` matches the ui_kit's own
          `Record` block spacing (was `32px`, not the default
          `--spacing-stack`/44px) -- `Section` now supplies the whole
          gutter/padding box itself, so the old `RECORD_LIST_PADDING`
          wrapper (an exact duplicate of `Section`'s own default padding,
          just with a different top value) is gone. */}
      <Section label="Record" labelHeading borderTop={false} padTop="32px">
        <div className={`${COLUMN_HEADS} ${LABEL}`}>
          <span>Year</span>
          <span>Title · Authors · Tags</span>
          <span>Journal</span>
          <span>Link · Cite</span>
        </div>
        {rows.length === 0 ? (
          <div className="flex flex-col items-start gap-4 py-8">
            <p className="text-[14px] leading-[1.5] text-text-muted">No records match these filters.</p>
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
      </Section>
    </div>
  )
}
