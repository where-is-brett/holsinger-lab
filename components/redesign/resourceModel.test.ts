import type { ResourcePayload } from 'types'
import { describe, expect, it } from 'vitest'

import { buildResourceMeta, formatSource, groupByKind, kindLabel } from './resourceModel'

describe('formatSource', () => {
  it('joins journal, ref and year with " · "', () => {
    expect(formatSource('Cell Death Discovery', '11(1) · 74', '2025')).toBe(
      'Cell Death Discovery 11(1) · 74 · 2025'
    )
  })

  it('drops a missing ref without leaving a dangling separator', () => {
    expect(formatSource('Cell Death Discovery', '', '2025')).toBe('Cell Death Discovery · 2025')
  })

  it('drops a missing year', () => {
    expect(formatSource('Cell Death Discovery', '11(1) · 74', '')).toBe('Cell Death Discovery 11(1) · 74')
  })

  it('returns "" when journal, ref and year are all missing', () => {
    expect(formatSource('', '', '')).toBe('')
  })
})

describe('kindLabel', () => {
  it('sentence-cases each known kind', () => {
    expect(kindLabel('hardware')).toBe('Hardware')
    expect(kindLabel('protocol')).toBe('Protocol')
    expect(kindLabel('software')).toBe('Software')
    expect(kindLabel('dataset')).toBe('Dataset')
  })

  it('starts with an upper-case letter for every known kind', () => {
    for (const kind of ['hardware', 'protocol', 'software', 'dataset']) {
      const label = kindLabel(kind)
      expect(label[0]).toBe(label[0].toUpperCase())
    }
  })

  it('falls back to "Resource" for null, undefined or an unrecognised kind', () => {
    expect(kindLabel(null)).toBe('Resource')
    expect(kindLabel(undefined)).toBe('Resource')
    expect(kindLabel('unknown-kind')).toBe('Resource')
    expect(kindLabel('')).toBe('Resource')
  })
})

function resource(overrides: Partial<ResourcePayload> = {}): ResourcePayload {
  return {
    _id: 'resource-1',
    title: 'A resource',
    kind: 'hardware',
    summary: null,
    howToObtain: null,
    publication: null,
    ...overrides,
  } as ResourcePayload
}

describe('buildResourceMeta', () => {
  it('always includes KIND', () => {
    expect(buildResourceMeta(resource({ kind: 'protocol' }))).toEqual([{ label: 'KIND', value: 'protocol' }])
  })

  it('KIND value is "" when kind is unset', () => {
    expect(buildResourceMeta(resource({ kind: null }))).toEqual([{ label: 'KIND', value: '' }])
  })

  it('adds a SOURCE row linking to the publication page when journal/ref/year resolve', () => {
    const meta = buildResourceMeta(
      resource({
        publication: {
          _id: 'pub-1',
          title: 'A paper',
          date: '2024-03-01',
          doi: null,
          url: null,
          journal: 'Journal of Neuroscience Methods',
          volume: 401,
          issue: 2,
          pages: '110-118',
          slug: 'a-paper',
        },
      })
    )
    expect(meta).toContainEqual({
      label: 'SOURCE',
      value: 'Journal of Neuroscience Methods 401(2) · 110-118 · 2024',
      href: '/publications/a-paper',
    })
  })

  it('falls back to the publication title when journal/ref/year are all missing', () => {
    const meta = buildResourceMeta(
      resource({
        publication: {
          _id: 'pub-1',
          title: '  A titled fallback  ',
          date: null,
          doi: null,
          url: null,
          journal: null,
          volume: null,
          issue: null,
          pages: null,
          slug: null,
        },
      })
    )
    expect(meta).toContainEqual({ label: 'SOURCE', value: 'A titled fallback', href: undefined })
  })

  it('drops the SOURCE row entirely when there is neither a formatted source nor a title', () => {
    const meta = buildResourceMeta(
      resource({
        publication: {
          _id: 'pub-1',
          title: null,
          date: null,
          doi: null,
          url: null,
          journal: null,
          volume: null,
          issue: null,
          pages: null,
          slug: null,
        },
      })
    )
    expect(meta.find((m) => m.label === 'SOURCE')).toBeUndefined()
  })

  it('adds a DOI row when the linked publication has a doi', () => {
    const meta = buildResourceMeta(
      resource({
        publication: {
          _id: 'pub-1',
          title: 'A paper',
          date: null,
          doi: '10.1038/s41420-024-00000-1',
          url: null,
          journal: null,
          volume: null,
          issue: null,
          pages: null,
          slug: null,
        },
      })
    )
    expect(meta).toContainEqual({
      label: 'DOI',
      value: '10.1038/s41420-024-00000-1',
      href: 'https://doi.org/10.1038/s41420-024-00000-1',
    })
  })

  it('adds no SOURCE/DOI/URL rows when there is no linked publication', () => {
    expect(buildResourceMeta(resource({ publication: null }))).toEqual([{ label: 'KIND', value: 'hardware' }])
  })
})

describe('groupByKind', () => {
  it('groups resources sharing a kind into one entry, in first-seen order', () => {
    const groups = groupByKind([
      resource({ _id: 'r1', kind: 'hardware' }),
      resource({ _id: 'r2', kind: 'protocol' }),
      resource({ _id: 'r3', kind: 'hardware' }),
    ])
    expect(groups.map((g) => g.kind)).toEqual(['hardware', 'protocol'])
    expect(groups[0].resources.map((r) => r._id)).toEqual(['r1', 'r3'])
    expect(groups[1].resources.map((r) => r._id)).toEqual(['r2'])
  })

  it("each group's label is the sentence-case kindLabel", () => {
    const groups = groupByKind([resource({ kind: 'dataset' })])
    expect(groups[0].label).toBe('Dataset')
  })

  it('groups a null kind under its own entry, labelled "Resource"', () => {
    const groups = groupByKind([resource({ kind: null }), resource({ kind: null })])
    expect(groups).toHaveLength(1)
    expect(groups[0].kind).toBeNull()
    expect(groups[0].label).toBe('Resource')
    expect(groups[0].resources).toHaveLength(2)
  })

  it('returns [] for an empty list', () => {
    expect(groupByKind([])).toEqual([])
  })
})
