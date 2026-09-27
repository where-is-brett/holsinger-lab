import { countBy } from './facets'
import type { Publication } from './publicationModel'

export type Filters = { year: string | null; type: string | null; topic: string | null }
export type FilterKey = keyof Filters
export interface FilterOption { value: string; label: string }
export type FilterOptions = Record<FilterKey, FilterOption[]>

export const NO_FILTERS: Filters = { year: null, type: null, topic: null }

// Fixed presentation order for publication types.
export const TYPE_ORDER: readonly string[] = ['Article', 'Review', 'Case report']

function withCounts(values: readonly string[], counts: Record<string, number>): FilterOption[] {
  return values
    .filter((v) => v && (counts[v] ?? 0) > 0)
    .map((v) => ({ value: v, label: `${v} (${counts[v]})` }))
}

export function filterOptions(pubs: Publication[], topicOrder: readonly string[]): FilterOptions {
  const years = countBy(pubs, (p) => p.year)
  const types = countBy(pubs, (p) => p.type)
  const topics = countBy(pubs, (p) => p.topics)
  const yearValues = Object.keys(years).sort((a, b) => (a < b ? 1 : -1))
  return {
    year: withCounts(yearValues, years),
    type: withCounts(TYPE_ORDER, types),
    topic: withCounts(topicOrder, topics),
  }
}

export function activeFilterCount(f: Filters): number {
  return [f.year, f.type, f.topic].filter(Boolean).length
}
