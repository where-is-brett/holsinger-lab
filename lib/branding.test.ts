import { describe, expect, it } from 'vitest'

import { resolveBranding } from './branding'
import { fallbackSiteName } from './site'

describe('resolveBranding', () => {
  it('uses the configured site name when set', () => {
    expect(resolveBranding({ siteName: 'Holsinger Lab' }).siteName).toBe(
      'Holsinger Lab'
    )
  })

  it('falls back to the built-in name when siteName is null', () => {
    expect(resolveBranding({ siteName: null }).siteName).toBe(fallbackSiteName)
  })

  it('falls back to the built-in name when settings is null', () => {
    expect(resolveBranding(null).siteName).toBe(fallbackSiteName)
  })

  it('falls back to the built-in name when settings is undefined', () => {
    expect(resolveBranding(undefined).siteName).toBe(fallbackSiteName)
  })

  it('treats a whitespace-only site name as unset', () => {
    expect(resolveBranding({ siteName: '   ' }).siteName).toBe(fallbackSiteName)
  })

  it('trims surrounding whitespace from a real site name', () => {
    expect(resolveBranding({ siteName: '  Holsinger Lab  ' }).siteName).toBe(
      'Holsinger Lab'
    )
  })

  it('uses the configured short name when set', () => {
    const branding = resolveBranding({
      siteName: 'Laboratory of Molecular Neuroscience and Dementia',
      shortName: 'Holsinger',
    })
    expect(branding.shortName).toBe('Holsinger')
  })

  it('falls back to the resolved site name when shortName is unset', () => {
    const branding = resolveBranding({ siteName: 'Holsinger Lab' })
    expect(branding.shortName).toBe('Holsinger Lab')
  })

  it('falls back through both levels when neither name is set', () => {
    const branding = resolveBranding({})
    expect(branding.siteName).toBe(fallbackSiteName)
    expect(branding.shortName).toBe(fallbackSiteName)
  })

  it('treats a whitespace-only short name as unset', () => {
    const branding = resolveBranding({
      siteName: 'Holsinger Lab',
      shortName: '  ',
    })
    expect(branding.shortName).toBe('Holsinger Lab')
  })
})
