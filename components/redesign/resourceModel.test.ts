import type { ResourcePayload } from 'types'
import { describe, expect, it } from 'vitest'

import { buildResourceMeta, formatSource, kindLabel } from './resourceModel'

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
  // KIND's value goes through `kindLabel` (sentence case, "Hardware"),
  // matching the same resource's own `Section` label instead of printing
  // the raw lower-case enum.
  it('always includes KIND, sentence-cased via kindLabel', () => {
    expect(buildResourceMeta(resource({ kind: 'protocol' }))).toEqual([{ label: 'Kind', value: 'Protocol' }])
  })

  it('KIND value is "Resource" (kindLabel\'s own fallback) when kind is unset', () => {
    expect(buildResourceMeta(resource({ kind: null }))).toEqual([{ label: 'Kind', value: 'Resource' }])
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
      label: 'Source',
      value: 'Journal of Neuroscience Methods 401(2) · 110-118 · 2024',
      href: '/publications/a-paper',
      identifier: true,
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
    expect(meta).toContainEqual({ label: 'Source', value: 'A titled fallback', href: undefined, identifier: true })
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
    expect(meta.find((m) => m.label === 'Source')).toBeUndefined()
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
      identifier: true,
    })
  })

  it('adds no SOURCE/DOI/URL rows when there is no linked publication', () => {
    expect(buildResourceMeta(resource({ publication: null }))).toEqual([{ label: 'Kind', value: 'Hardware' }])
  })
})
