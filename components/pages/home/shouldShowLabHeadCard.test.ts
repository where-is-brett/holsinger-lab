import { describe, expect, it } from 'vitest'

import { shouldShowLabHeadCard } from './shouldShowLabHeadCard'

describe('shouldShowLabHeadCard', () => {
  it('is false when labHead is unset', () => {
    expect(
      shouldShowLabHeadCard({ labHead: null, showLabHeadOnHome: true })
    ).toBe(false)
  })

  it('is true when labHead is set and showLabHeadOnHome is unset', () => {
    expect(shouldShowLabHeadCard({ labHead: { _id: 'p1' } })).toBe(true)
    expect(
      shouldShowLabHeadCard({ labHead: { _id: 'p1' }, showLabHeadOnHome: null })
    ).toBe(true)
  })

  it('is false when showLabHeadOnHome is explicitly false, even with labHead set', () => {
    expect(
      shouldShowLabHeadCard({ labHead: { _id: 'p1' }, showLabHeadOnHome: false })
    ).toBe(false)
  })
})
