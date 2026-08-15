import { describe, expect, it } from 'vitest'

import {
  CHAR_WIDTH,
  getAspectRatio,
  LOGO_HEIGHT,
  resolveLogo,
} from './logo'

describe('resolveLogo — image mode', () => {
  it('derives width from the aspect ratio at the fixed logo height', () => {
    const resolved = resolveLogo({ aspectRatio: 2, shortName: 'Lab' })
    expect(resolved.mode).toBe('image')
    expect(resolved.height).toBe(LOGO_HEIGHT)
    expect(resolved.width).toBe(LOGO_HEIGHT * 2)
  })

  it('handles a very wide banner logo', () => {
    expect(resolveLogo({ aspectRatio: 12, shortName: 'Lab' }).width).toBe(
      LOGO_HEIGHT * 12
    )
  })

  it('handles a near-square logo', () => {
    expect(resolveLogo({ aspectRatio: 1.02, shortName: 'Lab' }).width).toBeCloseTo(
      LOGO_HEIGHT * 1.02
    )
  })

  it('handles a tall logo without producing a sub-pixel width', () => {
    const resolved = resolveLogo({ aspectRatio: 0.25, shortName: 'Lab' })
    expect(resolved.mode).toBe('image')
    expect(resolved.width).toBeGreaterThan(0)
  })
})

describe('resolveLogo — wordmark fallback', () => {
  // Every one of these is a value the CMS or a malformed asset can actually
  // produce. Each must degrade to the wordmark rather than rendering an
  // image with a zero or nonsense width -- which would also size the mobile
  // tap-overlay to zero, silently killing the header logo's tap target.
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['zero', 0],
    ['negative', -3],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('falls back to the wordmark when aspectRatio is %s', (_label, ratio) => {
    const resolved = resolveLogo({ aspectRatio: ratio, shortName: 'Holsinger' })
    expect(resolved.mode).toBe('wordmark')
    expect(resolved.width).toBeGreaterThan(0)
  })

  it('renders the short name as the wordmark text', () => {
    const resolved = resolveLogo({ shortName: 'Holsinger' })
    expect(resolved).toMatchObject({ mode: 'wordmark', text: 'Holsinger' })
  })

  it('scales width with the number of characters', () => {
    const short = resolveLogo({ shortName: 'LMND' })
    const long = resolveLogo({ shortName: 'Holsinger Laboratory' })
    expect(long.width).toBeGreaterThan(short.width)
    expect(short.width).toBe(4 * CHAR_WIDTH)
  })

  it('reproduces the pre-4B wordmark width for the ten-character legacy mark', () => {
    // The old inline SVG was a 524x120 viewBox rendered at 32px tall, i.e.
    // ~139.7px wide. CHAR_WIDTH is tuned so a ten-character name lands there.
    expect(resolveLogo({ shortName: 'HOLSINGLER' }).width).toBeCloseTo(140, 0)
  })

  it('never returns a zero width for an empty name', () => {
    // resolveBranding guarantees a non-empty shortName, but a zero-width
    // tap target is severe enough to guard independently.
    expect(resolveLogo({ shortName: '' }).width).toBeGreaterThan(0)
  })

  it('trims whitespace around the short name', () => {
    expect(resolveLogo({ shortName: '  LMND  ' })).toMatchObject({
      text: 'LMND',
      width: 4 * CHAR_WIDTH,
    })
  })
})

describe('getAspectRatio', () => {
  it('reads the ratio out of a projected Sanity asset', () => {
    expect(
      getAspectRatio({ asset: { metadata: { dimensions: { aspectRatio: 3 } } } })
    ).toBe(3)
  })

  it.each([
    ['a null image', null],
    ['an undefined image', undefined],
    ['an image with no asset', {}],
    ['an asset with no metadata', { asset: {} }],
    ['metadata with no dimensions', { asset: { metadata: {} } }],
    ['dimensions with a null ratio', {
      asset: { metadata: { dimensions: { aspectRatio: null } } },
    }],
  ])('returns null for %s', (_label, image) => {
    expect(getAspectRatio(image as never)).toBeNull()
  })
})
