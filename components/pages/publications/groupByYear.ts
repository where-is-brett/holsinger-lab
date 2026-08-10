export interface YearGroup<T> {
  year: string
  publications: T[]
}

// Assumes `publications` is already sorted so same-year items are contiguous
// (lib/sanity.queries.ts's publicationsQuery sorts `order(date desc)`) —
// this walks the list once and clusters adjacent runs sharing a year, it
// does not re-sort or fully bucket a non-contiguous input.
export function groupByYear<T extends { date?: string | null }>(
  publications: T[]
): YearGroup<T>[] {
  const groups: YearGroup<T>[] = []

  for (const publication of publications) {
    const year = publication.date?.slice(0, 4) ?? 'Undated'
    const currentGroup = groups[groups.length - 1]

    if (currentGroup && currentGroup.year === year) {
      currentGroup.publications.push(publication)
    } else {
      groups.push({ year, publications: [publication] })
    }
  }

  return groups
}
