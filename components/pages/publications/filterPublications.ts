export interface FilterablePublication {
  _id: string
  title: string | null
  author: string | null
  journal: string | null
  abstract: string | null
  date: string | null
}

export interface PublicationFilter {
  query?: string
  year?: string
}

/** Case-insensitive substring match across title, author, journal, and abstract. */
function matchesQuery(pub: FilterablePublication, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const haystack = [pub.title, pub.author, pub.journal, pub.abstract]
    .filter((field): field is string => field !== null)
    .join(' \n ')
    .toLowerCase()
  return haystack.includes(needle)
}

function matchesYear(pub: FilterablePublication, year: string): boolean {
  if (!year) return true
  return (pub.date?.slice(0, 4) ?? 'Undated') === year
}

/** Filters `publications` by a free-text query (title/author/journal/abstract, case-insensitive substring) and/or an exact year, combined as AND. Either filter alone matches everything when empty. */
export function filterPublications<T extends FilterablePublication>(
  publications: T[],
  filter: PublicationFilter
): T[] {
  const query = filter.query ?? ''
  const year = filter.year ?? ''
  return publications.filter(
    (pub) => matchesQuery(pub, query) && matchesYear(pub, year)
  )
}

/**
 * Distinct years present in `publications`, in input order (descending, since
 * publicationsQuery sorts date desc) -- the year filter's option list. Single
 * pass assuming same-year entries are already contiguous, same assumption
 * groupByYear.ts documents and relies on.
 */
export function getAvailableYears(
  publications: FilterablePublication[]
): string[] {
  const years: string[] = []
  for (const pub of publications) {
    const year = pub.date?.slice(0, 4) ?? 'Undated'
    if (years[years.length - 1] !== year) years.push(year)
  }
  return years
}
