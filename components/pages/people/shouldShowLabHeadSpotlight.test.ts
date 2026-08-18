import { describe, expect, it } from 'vitest'

import { shouldShowLabHeadSpotlight } from './shouldShowLabHeadSpotlight'

describe('shouldShowLabHeadSpotlight', () => {
  it('is false when labHead is unset', () => {
    expect(
      shouldShowLabHeadSpotlight({ labHead: null, showLabHeadOnPeople: true })
    ).toBe(false)
  })

  it('is true when labHead is set and showLabHeadOnPeople is unset', () => {
    expect(shouldShowLabHeadSpotlight({ labHead: { _id: 'p1' } })).toBe(true)
    expect(
      shouldShowLabHeadSpotlight({
        labHead: { _id: 'p1' },
        showLabHeadOnPeople: null,
      })
    ).toBe(true)
  })

  it('is false when showLabHeadOnPeople is explicitly false, even with labHead set', () => {
    expect(
      shouldShowLabHeadSpotlight({
        labHead: { _id: 'p1' },
        showLabHeadOnPeople: false,
      })
    ).toBe(false)
  })
})
