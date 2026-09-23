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

// The ui_kit's instructional note ("CLICK TO FILTER · CLICK AGAIN TO CLEAR
// -- AN UNTAGGED PAPER STILL APPEARS UNDER YEAR AND TYPE · COMPACT TIGHTENS
// EACH ROW TO ONE SCANNING LINE") is developer-facing copy explaining the
// system to whoever's looking, not content for a visitor -- omitted here
// rather than rendered. `FacetBand`'s `note` prop stays (the gallery still
// uses it for its own "N of M publications" demo line); this screen just
// doesn't pass one.

// Column heads (Year · Title · Authors · Tags · Journal · Link · Cite),
// from `xl` only (see `PUBLICATION_GRID`'s own comment in tokens.ts) --
// the same 4-column ledger template PublicationRow's `GRID` uses, so the
// head row's cells
// line up with the rows underneath it. `hidden` (unprefixed) / `PUBLICATION_
// GRID`'s own `xl:grid` (prefixed) is the same paired-per-breakpoint
// `display` pattern PublicationRow's own KICKER/GRID split uses, so there is
// no same-property collision at either breakpoint.
const COLUMN_HEADS = `hidden ${PUBLICATION_GRID} pb-3`

export function PublicationsIndex({ publications }: { publications: Publication[] }) {
  const [year, setYear] = useState<string | null>(null)
  const [type, setType] = useState<string | null>(null)
  const [topic, setTopic] = useState<string | null>(null)
  // The density chip labels are sentence case ('Comfortable'/'Compact'),
  // not shouted caps -- these are the state's own values (FacetBand
  // renders each option label verbatim as its chip text), so the state
  // type itself carries the display text.
  const [density, setDensity] = useState<'Comfortable' | 'Compact'>('Comfortable')

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
      {/* `FacetBand` wrapped in its own `Section` so the "Filter" label
          renders and the chips line up with the Record rows below.
          `padTop`/`padBottom` "0px": `FacetBand` already owns its own
          vertical rhythm (border, chip-row spacing) -- `Section`'s own
          default padding would stack with it rather than replace it.
          `borderTop={false}`: `FacetBand` renders its own top border, so
          `Section` doesn't add a second one immediately above it.
          `labelHeading`: true -- `FacetBand`'s content is chips, not
          headings, so "Filter" is this section's only one.

          Not sticky: `FacetBand` doesn't stick, because a sticky element
          can only travel as far as its parent's own height, and this
          `Section`'s content cell is exactly the band's height -- see
          FacetBand.tsx's own comment. */}
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
            options: ['Comfortable', 'Compact'],
            value: density,
            onChange: (d) => setDensity(d as 'Comfortable' | 'Compact'),
          }}
        />
      </Section>
      {/* `labelHeading` true -- the record list has no heading of its own
          (a column-head row and a list of rows), so `Record` is this
          section's only one. `padTop="32px"` matches the ui_kit's own
          `Record` block spacing (not the default `--spacing-stack`/44px)
          -- `Section` supplies the whole gutter/padding box itself. */}
      <Section label="Record" labelHeading borderTop={false} padTop="32px">
        {/* `data-testid="ledger-head"`: the one place this route's
            uppercase mono is allowed -- e2e/label-budget.spec.ts excludes
            anything inside it from the micro-label budget. */}
        <div data-testid="ledger-head" className={`${COLUMN_HEADS} ${LABEL}`}>
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
                density={density === 'Compact' ? 'compact' : 'comfortable'}
                href={pub.href}
              />
            </div>
          ))
        )}
      </Section>
    </div>
  )
}
