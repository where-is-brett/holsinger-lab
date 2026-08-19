import { describe, expect, it } from 'vitest'

import { applyFacets, countBy, toggleFacet } from './facets'
import type { Publication } from './publicationRow'

const pub = (over: Partial<Publication>): Publication => ({
  year: '2023',
  title: 't',
  authorsPre: '',
  authorsPI: '',
  authorsPost: '',
  journal: 'j',
  ref: 'r',
  linkKind: 'DOI',
  linkLabel: 'l',
  linkHref: 'h',
  type: 'Article',
  topics: [],
  cite: 'c',
  ...over,
})

describe('countBy', () => {
  it('counts a single-valued key', () => {
    const out = countBy([pub({ year: '2023' }), pub({ year: '2023' }), pub({ year: '2020' })], (p) => p.year)
    expect(out).toEqual({ '2023': 2, '2020': 1 })
  })

  it('counts every value of a multi-valued key', () => {
    const out = countBy([pub({ topics: ['Glia', 'Gut'] }), pub({ topics: ['Glia'] })], (p) => p.topics)
    expect(out).toEqual({ Glia: 2, Gut: 1 })
  })
})

describe('toggleFacet', () => {
  it('selects when nothing is selected', () => {
    expect(toggleFacet(null, '2023')).toBe('2023')
  })

  it('clears when the same value is clicked again', () => {
    expect(toggleFacet('2023', '2023')).toBeNull()
  })

  it('replaces when a different value is clicked', () => {
    expect(toggleFacet('2023', '2020')).toBe('2020')
  })
})

describe('applyFacets', () => {
  const pubs = [
    pub({ year: '2023', type: 'Review', topics: ['Glia'] }),
    pub({ year: '2023', type: 'Article', topics: ['Gut'] }),
    pub({ year: '2020', type: 'Article', topics: [] }),
  ]

  it('returns everything when no facet is active', () => {
    expect(applyFacets(pubs, { year: null, type: null, topic: null })).toHaveLength(3)
  })

  it('ANDs the active facets', () => {
    const out = applyFacets(pubs, { year: '2023', type: 'Article', topic: null })
    expect(out).toHaveLength(1)
    expect(out[0].topics).toEqual(['Gut'])
  })

  it('keeps an untagged paper reachable under year and type', () => {
    // agreed-ia.md §4: an untagged paper still appears under year and type,
    // so the record never hides anything.
    const out = applyFacets(pubs, { year: '2020', type: 'Article', topic: null })
    expect(out).toHaveLength(1)
    expect(out[0].topics).toEqual([])
  })

  it('excludes an untagged paper only when a topic filter is active', () => {
    expect(applyFacets(pubs, { year: null, type: null, topic: 'Glia' })).toHaveLength(1)
  })
})
