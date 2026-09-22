import { describe, expect, it } from 'vitest'

import { placeRow } from './placeRow'

const row = (count: number) => Array.from({ length: count }, (_, i) => placeRow(count, i))

describe('placeRow', () => {
  it('1 item sits alone in column 3 (track 5)', () => {
    expect(row(1)).toEqual([5])
  })
  it('2 items sit in columns 2 and 4 (tracks 3 and 7), matching Wix row 3', () => {
    expect(row(2)).toEqual([3, 7])
  })
  it('3 items sit in columns 1, 3 and 5 (tracks 1, 5 and 9)', () => {
    expect(row(3)).toEqual([1, 5, 9])
  })
  it('4 items are contiguous and centred as closely as the grid allows', () => {
    expect(row(4)).toEqual([1, 3, 5, 7])
  })
  it('5 items fill every column (tracks 1, 3, 5, 7, 9)', () => {
    expect(row(5)).toEqual([1, 3, 5, 7, 9])
  })
  it('always returns an odd track number', () => {
    for (const count of [1, 2, 3, 4, 5]) {
      for (const n of row(count)) expect(n % 2).toBe(1)
    }
  })
  it('throws for an out-of-range index', () => {
    expect(() => placeRow(3, 3)).toThrow(RangeError)
    expect(() => placeRow(3, -1)).toThrow(RangeError)
    expect(() => placeRow(0, 0)).toThrow(RangeError)
  })
})
