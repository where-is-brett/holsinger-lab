'use client'

import { useMemo, useState } from 'react'
import { TOPIC_TITLES } from 'schemas/lib/topics'

import { Button } from '../Button'
import { applyFacets } from '../facets'
import { FilterBar } from '../FilterBar'
import { filterOptions, type Filters, NO_FILTERS } from '../filterModel'
import { PageTitle } from '../PageTitle'
import { formatFilteredPublicationsMeta, formatPublicationsMeta, type Publication } from '../publicationModel'
import { PublicationRow } from '../PublicationRow'
import { Section } from '../Section'
import { LABEL, PUBLICATION_GRID } from '../tokens'

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
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)

  const options = useMemo(() => filterOptions(publications, TOPIC_TITLES), [publications])
  const rows = useMemo(() => applyFacets(publications, filters), [publications, filters])
  const filtered = Boolean(filters.year || filters.type || filters.topic)

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
      {/* `labelHeading` true -- the record list has no heading of its own
          (a filter row, a column-head row and a list of rows), so `Record`
          is this section's only one. `padTop="32px"` matches the ui_kit's
          own `Record` block spacing (not the default `--spacing-stack`/44px)
          -- `Section` supplies the whole gutter/padding box itself. The
          filters sit at the top of this section, under its own full-width
          top rule, rather than in a separate "Filter" section above it. */}
      <Section label="Record" labelHeading padTop="32px">
        <div className="mb-8">
          <FilterBar options={options} value={filters} onChange={setFilters} resultCount={rows.length} />
        </div>
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
            <Button onClick={() => setFilters(NO_FILTERS)}>Clear filters</Button>
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
              <PublicationRow pub={pub} href={pub.href} />
            </div>
          ))
        )}
      </Section>
    </div>
  )
}
