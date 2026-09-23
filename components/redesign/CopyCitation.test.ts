import { describe, expect, it } from 'vitest'

import { copyFallbackMessage } from './CopyCitation'

// Pure-function tests only -- `copyFallbackMessage` takes the two device
// facts it branches on as plain arguments, so its behaviour is provable
// without mounting React or mocking `navigator`/`matchMedia`. Mirrors
// `redesign/wix`'s `CitationActions.test.ts` coverage for the same idea.
describe('copyFallbackMessage', () => {
  it('points a coarse (touch) pointer at the device copy action, not an invented keystroke', () => {
    expect(copyFallbackMessage({ coarsePointer: true, mac: true })).toBe("Use your device's copy action")
    expect(copyFallbackMessage({ coarsePointer: true, mac: false })).toBe("Use your device's copy action")
  })

  it('tells a Mac keyboard user to press Cmd+C', () => {
    expect(copyFallbackMessage({ coarsePointer: false, mac: true })).toBe('Press ⌘C to copy')
  })

  it('tells a non-Mac keyboard user to press Ctrl+C', () => {
    expect(copyFallbackMessage({ coarsePointer: false, mac: false })).toBe('Press Ctrl+C to copy')
  })

  it('is sentence case, never shouted caps', () => {
    for (const message of [
      copyFallbackMessage({ coarsePointer: true, mac: true }),
      copyFallbackMessage({ coarsePointer: false, mac: true }),
      copyFallbackMessage({ coarsePointer: false, mac: false }),
    ]) {
      // No alphabetic run of 4+ letters entirely upper-case, matching
      // e2e/label-budget.spec.ts's own "shouted caps" definition.
      expect(message).not.toMatch(/[A-Z]{4,}/)
    }
  })
})
