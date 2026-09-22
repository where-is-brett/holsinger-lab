import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('interactive-elements contract: no onClick anchors without href', () => {
  it('Profile.tsx uses a real button, not an anchor, for the bio toggle', () => {
    const source = readFileSync('components/pages/people/Profile.tsx', 'utf8')
    expect(source).not.toMatch(/<a\b[^>]*onClick/)
    expect(source).toMatch(/<button\b[^>]*type="button"/)
    expect(source).toMatch(/aria-expanded={showBio}/)
    expect(source).toMatch(/aria-label={showBio/)
  })
})
