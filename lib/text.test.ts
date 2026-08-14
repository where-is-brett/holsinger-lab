import { describe, expect, it } from 'vitest'

import { truncateAtWordBoundary } from './text'

describe('truncateAtWordBoundary', () => {
  it('returns the text unchanged when at or under the limit', () => {
    expect(truncateAtWordBoundary('short text', 155)).toBe('short text')
    expect(truncateAtWordBoundary('exactly ten', 11)).toBe('exactly ten')
  })

  it('cuts at the last space at or before the limit and appends an ellipsis', () => {
    const text = 'The quick brown fox jumps over the lazy dog'
    expect(truncateAtWordBoundary(text, 19)).toBe('The quick brown…')
  })

  it('hard-cuts when there is no space to break on', () => {
    expect(
      truncateAtWordBoundary('supercalifragilisticexpialidocious', 10)
    ).toBe('supercalif…')
  })

  it('trims surrounding whitespace before measuring', () => {
    expect(truncateAtWordBoundary('  short  ', 155)).toBe('short')
  })
})
