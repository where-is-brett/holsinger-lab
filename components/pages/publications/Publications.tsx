'use client'

import { useMemo, useState } from 'react'
import type { PublicationPayload } from 'types'

import { assignBibtexCiteKeys } from './citation'
import { filterPublications, getAvailableYears } from './filterPublications'
import { groupByYear } from './groupByYear'
import Publication from './Publication'

const Publications = ({
  publications,
}: {
  publications: PublicationPayload[]
}) => {
  const [query, setQuery] = useState('')
  const [year, setYear] = useState('')

  // Computed from the full, unfiltered list -- cite keys and the year option
  // list must stay stable as the user types a search query, not shrink/change
  // out from under them.
  const years = useMemo(() => getAvailableYears(publications), [publications])
  const citeKeys = useMemo(() => assignBibtexCiteKeys(publications), [publications])

  const filtered = useMemo(
    () => filterPublications(publications, { query, year }),
    [publications, query, year]
  )
  const groups = useMemo(() => groupByYear(filtered), [filtered])

  return (
    <>
      <h1 className="mb-8 text-3xl font-black md:text-5xl">Publications</h1>

      <div className="sticky top-[var(--nav-height)] z-0 mb-8 flex flex-col gap-4 border-b border-rule bg-surface/95 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, author, journal, or abstract"
          aria-label="Search publications"
          className="w-full rounded border border-field bg-surface px-3 py-2 md:max-w-sm"
        />
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="publication-year-filter" className="text-sm text-text-muted">
            Year
          </label>
          <select
            id="publication-year-filter"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="rounded border border-field bg-surface px-2 py-1"
          >
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {years.length > 1 && (
            <nav aria-label="Jump to year" className="flex flex-wrap gap-2 text-sm">
              {years.map((y) => (
                <a key={y} href={`#year-${y}`} className="text-link hover:underline">
                  {y}
                </a>
              ))}
            </nav>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mb-16 text-text-muted">No publications match your search.</p>
      ) : (
        <div className="mb-16 space-y-10">
          {groups.map(({ year: groupYear, publications: yearPublications }) => (
            <section
              key={groupYear}
              id={`year-${groupYear}`}
              // Anchor-jump targets need enough top offset to clear both
              // stacked sticky bars (site nav + this page's search/filter
              // bar), or the browser's default hash-scroll lands the year
              // heading directly under them, fully hidden.
              //
              // The nav portion is --nav-height rather than a literal, so
              // this tracks the header automatically -- that is the whole
              // point of the token, and what stops defect D8 recurring here
              // the next time the nav's height changes. The added constant is
              // this page's own filter bar, measured against production:
              // 151px on mobile (flex-col) and 75px at md+ (flex-row), each
              // plus a 5px buffer.
              //
              // Note the previous md+ value (145px) had NO buffer -- it was
              // exactly the measured stack height, and its comment claimed a
              // stale "~139px". Both are corrected here.
              className="scroll-mt-[calc(var(--nav-height)+156px)] md:scroll-mt-[calc(var(--nav-height)+80px)]"
            >
              <h2 className="mb-5 text-3xl font-bold lg:text-4xl">{groupYear}</h2>
              <ul className="ml-0 space-y-6">
                {yearPublications.map((publication) => (
                  <li key={publication._id}>
                    <Publication
                      publication={publication}
                      citeKey={citeKeys.get(publication._id) ?? 'unknown'}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  )
}

export default Publications
