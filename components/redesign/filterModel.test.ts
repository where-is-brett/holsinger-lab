import { describe, expect, it } from 'vitest'

import { activeFilterCount, filterOptions, NO_FILTERS } from './filterModel'
import type { Publication } from './publicationModel'

const pub = (over: Partial<Publication>): Publication => ({
  id: 'p1', href: null, year: '2023', dateLabel: '', title: 't',
  authorsPre: '', authorsPI: '', authorsPost: '', journal: 'j', ref: 'r',
  linkKind: 'DOI', linkLabel: 'l', linkHref: 'h', type: 'Article', topics: [],
  cite: 'c', abstract: [], resources: [], ...over,
})
const TOPICS = ['Glia', 'Gut', 'Unused'] as const

describe('filterOptions', () => {
  it('lists years newest first, with counts', () => {
    const o = filterOptions([pub({ year: '2020' }), pub({ year: '2023' }), pub({ year: '2023' })], TOPICS)
    expect(o.year).toEqual([
      { value: '2023', label: '2023 (2)' },
      { value: '2020', label: '2020 (1)' },
    ])
  })

  it('orders types by TYPE_ORDER and drops types with no papers', () => {
    const o = filterOptions([pub({ type: 'Review' }), pub({ type: 'Article' })], TOPICS)
    expect(o.type.map((x) => x.value)).toEqual(['Article', 'Review'])
  })

  it('returns no type options when no paper has a type', () => {
    const o = filterOptions([pub({ type: '' }), pub({ type: '' })], TOPICS)
    expect(o.type).toEqual([])
  })

  it('orders topics by the given order and drops unused ones', () => {
    const o = filterOptions([pub({ topics: ['Gut', 'Glia'] }), pub({ topics: ['Gut'] })], TOPICS)
    expect(o.topic).toEqual([
      { value: 'Glia', label: 'Glia (1)' },
      { value: 'Gut', label: 'Gut (2)' },
    ])
  })

  it('ignores a blank year', () => {
    const o = filterOptions([pub({ year: '' })], TOPICS)
    expect(o.year).toEqual([])
  })
})

describe('activeFilterCount', () => {
  it('is 0 with no filters', () => expect(activeFilterCount(NO_FILTERS)).toBe(0))
  it('counts each set filter', () =>
    expect(activeFilterCount({ year: '2023', type: null, topic: 'Glia' })).toBe(2))
})
