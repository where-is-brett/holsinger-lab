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

      <div className="sticky top-16 z-0 mb-8 flex flex-col gap-4 border-b border-rule bg-surface/95 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
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
              // heading directly under them, fully hidden -- measured
              // combined sticky-stack height is ~215px on mobile (nav's
              // fixed h-16 + this bar's taller flex-col layout) and ~139px
              // at md+ (nav's shorter sticky bar + this bar's flex-row
              // layout), each rounded up with a small buffer.
              className="scroll-mt-[220px] md:scroll-mt-[145px]"
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
