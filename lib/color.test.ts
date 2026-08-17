import { contrast, hexToOklch, oklchToHex, parseHex } from 'lib/color'
import { describe, expect, it } from 'vitest'

describe('parseHex', () => {
  it('parses a six-digit hex into a 0-1 triple', () => {
    expect(parseHex('#ffffff')).toEqual([1, 1, 1])
    expect(parseHex('#000000')).toEqual([0, 0, 0])
  })

  it('is case-insensitive and tolerates surrounding whitespace', () => {
    expect(parseHex('  #FF0000 ')).toEqual([1, 0, 0])
  })

  it('rejects anything that is not #rrggbb', () => {
    for (const bad of ['#fff', 'ffffff', '#gggggg', '', 'red', '#ffffffff']) {
      expect(parseHex(bad), bad).toBeNull()
    }
  })
})

describe('hexToOklch / oklchToHex', () => {
  it('round-trips in-gamut colours exactly', () => {
    for (const hex of ['#2d6a4f', '#4043e7', '#ff7a00', '#000e2f', '#808080']) {
      const oklch = hexToOklch(hex)
      expect(oklch, hex).not.toBeNull()
      expect(oklchToHex(oklch!), hex).toBe(hex)
    }
  })

  it('puts white and black at the ends of the lightness range with no chroma', () => {
    const white = hexToOklch('#ffffff')!
    const black = hexToOklch('#000000')!
    expect(white.L).toBeCloseTo(1, 2)
    expect(black.L).toBeCloseTo(0, 2)
    expect(white.C).toBeCloseTo(0, 3)
    expect(black.C).toBeCloseTo(0, 3)
  })

  it('returns null for an unparseable hex', () => {
    expect(hexToOklch('nope')).toBeNull()
  })

  it('clamps out-of-gamut coordinates to a valid hex rather than producing garbage', () => {
    // Chroma far beyond anything sRGB can represent at this lightness.
    const hex = oklchToHex({ L: 0.5, C: 0.9, h: 1.2 })
    expect(hex).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('contrast', () => {
  it('matches the WCAG reference values', () => {
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 1)
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
  })

  it('is symmetric', () => {
    expect(contrast('#2d6a4f', '#f8f8f8')).toBeCloseTo(
      contrast('#f8f8f8', '#2d6a4f'),
      10
    )
  })

  it("reproduces the current palette's published ratios", () => {
    // These are the values styles/tokens.test.ts already asserts against.
    expect(contrast('#4043e7', '#f8f8f8')).toBeCloseTo(6.23, 1)
    expect(contrast('#2d6a4f', '#f8f8f8')).toBeCloseTo(6.02, 1)
  })

  it('throws on unparseable input rather than returning a misleading number', () => {
    expect(() => contrast('#ffffff', 'nope')).toThrow(/unparseable/i)
  })
})
