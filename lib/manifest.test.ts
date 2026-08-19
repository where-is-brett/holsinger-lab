import { buildManifest } from 'lib/manifest'
import { describe, expect, it } from 'vitest'

describe('buildManifest', () => {
  it('uses the resolved site name and short name', () => {
    const manifest = buildManifest({
      siteName: 'Holsinger Lab',
      shortName: 'Holsinger',
      theme: 'default',
      icon192: null,
      icon512: null,
    })
    expect(manifest.name).toBe('Holsinger Lab')
    expect(manifest.short_name).toBe('Holsinger')
  })

  it('falls back to the static PNGs when no CMS icon is uploaded', () => {
    const manifest = buildManifest({
      siteName: 'Holsinger Lab',
      shortName: 'Holsinger',
      theme: 'default',
      icon192: null,
      icon512: null,
    })
    expect(manifest.icons).toEqual([
      {
        src: '/favicon/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/favicon/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ])
  })

  it('uses the CMS icon URLs when supplied', () => {
    const manifest = buildManifest({
      siteName: 'Holsinger Lab',
      shortName: 'Holsinger',
      theme: 'default',
      icon192: 'https://cdn.sanity.io/icon-192.png',
      icon512: 'https://cdn.sanity.io/icon-512.png',
    })
    expect(manifest.icons).toEqual([
      { src: 'https://cdn.sanity.io/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'https://cdn.sanity.io/icon-512.png', sizes: '512x512', type: 'image/png' },
    ])
  })

  it('sources theme_color and background_color from the preset light surface', () => {
    const defaultManifest = buildManifest({
      siteName: 'x',
      shortName: 'x',
      theme: 'default',
      icon192: null,
      icon512: null,
    })
    // Modern Instrument direction (Task 3): PRESET_SURFACES.default was
    // re-pointed to match styles/index.css's re-pointed palette.
    expect(defaultManifest.theme_color).toBe('#f5f7f9')
    expect(defaultManifest.background_color).toBe('#f5f7f9')

    const warmManifest = buildManifest({
      siteName: 'x',
      shortName: 'x',
      theme: 'warm',
      icon192: null,
      icon512: null,
    })
    expect(warmManifest.theme_color).toBe('#faf8f4')
  })

  it('always requests standalone display', () => {
    const manifest = buildManifest({
      siteName: 'x',
      shortName: 'x',
      theme: 'default',
      icon192: null,
      icon512: null,
    })
    expect(manifest.display).toBe('standalone')
  })
})
