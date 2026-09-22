import { describe, expect, it } from 'vitest'

import { PORTRAIT_IMAGE_CLASS } from './PersonCard'

describe('PORTRAIT_IMAGE_CLASS', () => {
  it('is exactly `object-cover` -- no grayscale/contrast/transition/hover-reveal classes', () => {
    // Brett's review (fix/research-description-fallback): portraits must
    // never render in black-and-white anywhere, not even briefly before a
    // hover/focus reveal. This used to be `IMAGE_FILTER`, carrying
    // `grayscale contrast-[1.04] transition-[filter] ...
    // group-hover:grayscale-0 group-hover:contrast-100
    // group-focus-visible:grayscale-0 group-focus-visible:contrast-100`.
    // An exact-string assertion (not a substring check) is deliberate: it
    // fails loudly if any of those classes -- or any new filter/reveal
    // class -- is ever reintroduced, rather than only catching the specific
    // strings this comment names.
    expect(PORTRAIT_IMAGE_CLASS).toBe('object-cover')
  })
})
