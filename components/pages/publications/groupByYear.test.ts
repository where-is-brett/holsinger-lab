import { describe, expect, it } from 'vitest'

import { groupByYear } from './groupByYear'

describe('groupByYear', () => {
  it('groups consecutive publications sharing a year into one bucket, preserving order', () => {
    const result = groupByYear([
      { _id: '1', date: '2024-05-01' },
      { _id: '2', date: '2024-01-01' },
      { _id: '3', date: '2023-11-01' },
    ])

    expect(result).toEqual([
      {
        year: '2024',
        publications: [
          { _id: '1', date: '2024-05-01' },
          { _id: '2', date: '2024-01-01' },
        ],
      },
      { year: '2023', publications: [{ _id: '3', date: '2023-11-01' }] },
    ])
  })

  it('buckets a null date under "Undated"', () => {
    const result = groupByYear([{ _id: '1', date: null }])
    expect(result).toEqual([
      { year: 'Undated', publications: [{ _id: '1', date: null }] },
    ])
  })

  it('starts a new bucket if the same year appears non-consecutively', () => {
    const result = groupByYear([
      { _id: '1', date: '2024-01-01' },
      { _id: '2', date: '2023-01-01' },
      { _id: '3', date: '2024-06-01' },
    ])
    expect(result).toHaveLength(3)
    expect(result.map((g) => g.year)).toEqual(['2024', '2023', '2024'])
  })

  it('returns an empty array for an empty input', () => {
    expect(groupByYear([])).toEqual([])
  })
})
