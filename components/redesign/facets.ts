import type { Publication } from './publicationRow'

export function countBy<T>(items: T[], pick: (item: T) => string | string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const item of items) {
    const picked = pick(item)
    for (const key of Array.isArray(picked) ? picked : [picked]) {
      out[key] = (out[key] ?? 0) + 1
    }
  }
  return out
}

/** Click selects; clicking the selected value again clears it. */
export function toggleFacet(current: string | null, value: string): string | null {
  return current === value ? null : value
}

export function applyFacets(
  pubs: Publication[],
  f: { year: string | null; type: string | null; topic: string | null },
): Publication[] {
  return pubs.filter(
    (p) =>
      (!f.year || p.year === f.year) &&
      (!f.type || p.type === f.type) &&
      (!f.topic || p.topics.includes(f.topic)),
  )
}
