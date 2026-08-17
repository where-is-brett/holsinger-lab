import { resolveBrandStyle, resolveViewportColors } from 'lib/layout-branding'
import { describe, expect, it } from 'vitest'

describe('resolveBrandStyle', () => {
  it('injects nothing when brandColor is unset, so the CSS defaults stand', () => {
    expect(resolveBrandStyle({})).toEqual({ dataTheme: undefined, style: null })
    expect(resolveBrandStyle({ brandColor: null })).toEqual({ dataTheme: undefined, style: null })
    expect(resolveBrandStyle({ brandColor: { hex: '   ' } })).toEqual({
      dataTheme: undefined,
      style: null,
    })
  })

  it('omits data-theme for the default preset, which is the base :root', () => {
    const { dataTheme } = resolveBrandStyle({ theme: 'default' })
    expect(dataTheme).toBeUndefined()
  })

  it('emits data-theme for a non-default preset', () => {
    expect(resolveBrandStyle({ theme: 'warm' }).dataTheme).toBe('warm')
  })

  it('falls back to the default preset for an unknown theme value', () => {
    expect(resolveBrandStyle({ theme: 'chartreuse' }).dataTheme).toBeUndefined()
  })

  it('derives against the selected preset, not always against default', () => {
    const warm = resolveBrandStyle({ brandColor: { hex: '#ff7a00' }, theme: 'warm' })
    const base = resolveBrandStyle({ brandColor: { hex: '#ff7a00' }, theme: 'default' })
    expect(warm.style).not.toBeNull()
    expect(base.style).not.toBeNull()
    expect(warm.style).not.toBe(base.style)
  })

  it('injects nothing for a malformed brand colour rather than throwing', () => {
    expect(() => resolveBrandStyle({ brandColor: { hex: 'nope' } })).not.toThrow()
    expect(resolveBrandStyle({ brandColor: { hex: 'nope' } }).style).toBeNull()
  })
})

describe('resolveViewportColors', () => {
  it('returns the default preset colours when theme is unset', () => {
    expect(resolveViewportColors({})).toEqual({ light: '#f8f8f8', dark: '#0d0e12' })
  })

  it('returns the warm preset colours when theme is warm', () => {
    expect(resolveViewportColors({ theme: 'warm' })).toEqual({
      light: '#faf8f4',
      dark: '#12100d',
    })
  })

  it('falls back to default for an unknown theme value', () => {
    expect(resolveViewportColors({ theme: 'chartreuse' })).toEqual({
      light: '#f8f8f8',
      dark: '#0d0e12',
    })
  })
})
