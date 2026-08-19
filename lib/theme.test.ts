import { readFileSync } from 'node:fs'

import { contrast } from 'lib/color'
import type { ThemeName } from 'lib/theme'
import {
  buildBrandStyle,
  deriveTheme,
  deriveToken,
  PRESET_SURFACES,
  resolveThemeName,
  THEME_NAMES,
  themeColorFor,
} from 'lib/theme'
import { describe, expect, it } from 'vitest'

describe('deriveToken', () => {
  const LIGHT = PRESET_SURFACES.default.light

  it('returns the brand colour unchanged when it already clears the target', () => {
    // The identity case the whole phase turns on: a lab entering the site's
    // current accent must get the site's current accent back, exactly.
    expect(deriveToken('#2d6a4f', LIGHT, 3, 'darken')).toBe('#2d6a4f')
    expect(deriveToken('#2d6a4f', LIGHT, 4.5, 'darken')).toBe('#2d6a4f')
    expect(deriveToken('#4043e7', LIGHT, 4.5, 'darken')).toBe('#4043e7')
  })

  it('darkens only as far as the target requires', () => {
    const derived = deriveToken('#ff7a00', LIGHT, 4.5, 'darken')!
    expect(contrast(derived, LIGHT[0])).toBeGreaterThanOrEqual(4.5)
    // Not driven to the minimum-passing extreme: it stays recognisably orange
    // rather than collapsing toward black.
    expect(contrast(derived, LIGHT[0])).toBeLessThan(7)
  })

  it('measures against the worse of the two surfaces', () => {
    const derived = deriveToken('#ff7a00', LIGHT, 4.5, 'darken')!
    expect(contrast(derived, LIGHT[0])).toBeGreaterThanOrEqual(4.5)
    expect(contrast(derived, LIGHT[1])).toBeGreaterThanOrEqual(4.5)
  })

  it('returns null for an unparseable brand colour', () => {
    expect(deriveToken('nope', LIGHT, 4.5, 'darken')).toBeNull()
  })
})

describe('deriveTheme — accessible by construction', () => {
  // A wide sweep rather than a handful of cases: this IS the guarantee that
  // no input a lab can enter produces a failing palette. styles/tokens.test.ts
  // structurally cannot cover it, because derived values never appear in any
  // file on disk (spec §1.1e).
  const BRANDS: string[] = []
  for (let r = 0; r < 256; r += 51) {
    for (let g = 0; g < 256; g += 51) {
      for (let b = 0; b < 256; b += 51) {
        BRANDS.push(
          `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
        )
      }
    }
  }

  it('covers a meaningful number of inputs', () => {
    expect(BRANDS.length).toBe(216)
  })

  for (const theme of THEME_NAMES) {
    it(`every brand colour yields a passing palette for the ${theme} preset`, () => {
      for (const brand of BRANDS) {
        const derived = deriveTheme(brand, theme)
        expect(derived, brand).not.toBeNull()

        for (const scheme of ['light', 'dark'] as const) {
          const surfaces = PRESET_SURFACES[theme][scheme]
          for (const surface of surfaces) {
            expect(
              contrast(derived![scheme].link, surface),
              `link ${
                derived![scheme].link
              } from ${brand} on ${surface} (${theme}/${scheme})`
            ).toBeGreaterThanOrEqual(4.5)
            expect(
              contrast(derived![scheme].accent, surface),
              `accent ${
                derived![scheme].accent
              } from ${brand} on ${surface} (${theme}/${scheme})`
            ).toBeGreaterThanOrEqual(3)
          }
        }
      }
    })
  }

  it('handles the achromatic and fully-saturated extremes', () => {
    for (const brand of [
      '#ffff00',
      '#00ffff',
      '#ff00ff',
      '#000000',
      '#ffffff',
      '#808080',
    ]) {
      expect(deriveTheme(brand, 'default'), brand).not.toBeNull()
    }
  })

  it('returns null rather than throwing on malformed input', () => {
    for (const bad of ['', 'nope', '#fff', '#gggggg']) {
      expect(deriveTheme(bad, 'default'), bad).toBeNull()
    }
  })

  it.each(THEME_NAMES)(
    'derives accent to the same value as link in the %s theme',
    (theme) => {
      // The Modern Instrument direction uses ONE chromatic colour, so these two
      // tokens must never drift apart for any brand colour or preset.
      const derived = deriveTheme('#4043e7', theme)
      expect(derived).not.toBeNull()
      expect(derived!.light.accent).toBe(derived!.light.link)
      expect(derived!.dark.accent).toBe(derived!.dark.link)
    }
  )

  it('returns null rather than throwing for an Object.prototype member name as theme', () => {
    // PRESET_SURFACES[theme] is a bare property lookup, so a `theme` value
    // that names an inherited Object.prototype member (e.g. 'toString') would
    // resolve truthy via the prototype chain instead of being caught by
    // `if (!surfaces)`. 'toString' and '__proto__' exercise different code
    // paths through JS (an inherited method vs. the prototype-linkage getter).
    for (const bad of ['toString', '__proto__'] as unknown as ThemeName[]) {
      expect(() => deriveTheme('#2d6a4f', bad)).not.toThrow()
      expect(deriveTheme('#2d6a4f', bad), bad as string).toBeNull()
    }
  })
})

describe('PRESET_SURFACES matches styles/index.css', () => {
  // Drift guard. These hexes exist in two places by necessity -- CSS so the
  // token guard covers them, TS so the derivation can compute against them --
  // and this is what stops the two from silently disagreeing (spec §3.4).
  const css = readFileSync(
    new URL('../styles/index.css', import.meta.url),
    'utf8'
  )

  function surfacesFromCss(
    selector: string,
    scheme: 'light' | 'dark'
  ): [string, string] {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const blockPattern =
      scheme === 'light'
        ? new RegExp(`(?<!dark[^}]*)${escaped}\\s*\\{([^}]*)\\}`)
        : new RegExp(
            `prefers-color-scheme:\\s*dark\\)\\s*\\{\\s*${escaped}\\s*\\{([^}]*)\\}`
          )
    const body = css.match(blockPattern)?.[1]
    if (!body) throw new Error(`no ${scheme} block for ${selector}`)
    const pick = (name: string) => {
      const m = body.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))
      if (!m) throw new Error(`${selector}/${scheme} declares no ${name}`)
      return m[1]
    }
    return [pick('--sem-surface'), pick('--sem-surface-raised')]
  }

  it('default matches the base :root in both schemes', () => {
    expect(PRESET_SURFACES.default.light).toEqual(
      surfacesFromCss(':root', 'light')
    )
    expect(PRESET_SURFACES.default.dark).toEqual(
      surfacesFromCss(':root', 'dark')
    )
  })

  it('warm matches its preset block in both schemes', () => {
    const selector = ":root[data-theme='warm']"
    expect(PRESET_SURFACES.warm.light).toEqual(
      surfacesFromCss(selector, 'light')
    )
    expect(PRESET_SURFACES.warm.dark).toEqual(surfacesFromCss(selector, 'dark'))
  })
})

describe('buildBrandStyle', () => {
  it('emits a light rule and a dark media rule at (0,3,0) specificity', () => {
    const css = buildBrandStyle('#ff7a00', 'default')!
    expect(css).toContain(':root:root:root')
    expect(css).toContain('prefers-color-scheme: dark')
    expect(css).toContain('--sem-link:')
    expect(css).toContain('--sem-accent:')
  })

  it('emits only the two chromatic tokens, never a neutral', () => {
    const css = buildBrandStyle('#ff7a00', 'default')!
    expect(css).not.toContain('--sem-surface')
    expect(css).not.toContain('--sem-text')
  })

  it('returns null for a brand colour it cannot use, so the caller injects nothing', () => {
    expect(buildBrandStyle('nope', 'default')).toBeNull()
  })

  it('contains no characters that could break out of a <style> element', () => {
    const css = buildBrandStyle('#ff7a00', 'warm')!
    expect(css).not.toMatch(/[<>]/)
  })
})

describe('resolveThemeName', () => {
  it('accepts the known presets', () => {
    expect(resolveThemeName('warm')).toBe('warm')
    expect(resolveThemeName('default')).toBe('default')
  })

  it('falls back to default for anything else, including stale CMS values', () => {
    for (const bad of [undefined, null, '', 'neutral', 42, {}]) {
      expect(resolveThemeName(bad)).toBe('default')
    }
  })
})

describe('themeColorFor', () => {
  it('returns the light and dark base surface for the default preset', () => {
    expect(themeColorFor('default')).toEqual({
      light: '#f8f8f8',
      dark: '#0d0e12',
    })
  })

  it('returns the light and dark base surface for the warm preset', () => {
    expect(themeColorFor('warm')).toEqual({ light: '#faf8f4', dark: '#12100d' })
  })
})
