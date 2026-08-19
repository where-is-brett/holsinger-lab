/**
 * Derives the two chromatic design tokens from one CMS brand colour.
 *
 * Pure -- no React, no Sanity, no filesystem -- for the same reason
 * `lib/branding.ts` and `lib/logo.ts` are: it stays trivially testable with
 * literals, and the guarantee this module provides is only worth as much as
 * the sweep that tests it (spec §4).
 */

import { contrast, hexToOklch, oklchToHex } from 'lib/color'

export type ThemeName = 'default' | 'warm'
export type Scheme = 'light' | 'dark'

export const THEME_NAMES: readonly ThemeName[] = ['default', 'warm']

/**
 * The two surfaces a chromatic token can land on, per preset per scheme.
 *
 * Mirrors `styles/index.css` by necessity: the neutrals must live in CSS for
 * `styles/tokens.test.ts` to guard them, and must be reachable from JS for the
 * derivation to measure against them. `lib/theme.test.ts` asserts the two stay
 * identical -- without that assertion this is exactly the two-sources-of-truth
 * shape that produced PR #16's Critical bug.
 */
export const PRESET_SURFACES: Record<
  ThemeName,
  Record<Scheme, readonly [string, string]>
> = {
  default: {
    light: ['#f5f7f9', '#eaedf1'],
    dark: ['#0d1014', '#1a1d23'],
  },
  warm: {
    light: ['#faf8f4', '#f4f1ea'],
    dark: ['#12100d', '#24201b'],
  },
}

/**
 * WCAG AA for body text -- `--sem-link` is text. `--sem-accent` (borders and
 * edges) only has to clear the WCAG AA non-text floor of 3:1, but the Modern
 * Instrument direction uses ONE chromatic colour for both, so accent is
 * derived at this same 4.5:1 floor -- which clears 3:1 with room to spare.
 */
const LINK_MIN_CONTRAST = 4.5

/** One step per 8-bit level, so the scan cannot skip a representable colour. */
const LIGHTNESS_STEPS = 256
const CHROMA_STEP = 0.02

/** The worse of the two surfaces is what the token has to clear. */
function worstContrast(
  hex: string,
  surfaces: readonly [string, string]
): number {
  return Math.min(contrast(hex, surfaces[0]), contrast(hex, surfaces[1]))
}

/**
 * Finds the colour closest to `brandHex` that clears `target` against both
 * surfaces, holding hue and (where possible) chroma.
 *
 * Anchored at the brand colour's OWN lightness, not at an extreme. Scanning
 * inward from white or black instead returns the minimum-passing colour: every
 * accent lands a hair over its floor, visibly washed out, and a brand colour
 * that already passes comes back changed -- which would break the promise that
 * the default preset reproduces the current palette (spec §1.1a).
 *
 * A fixed-step scan rather than a binary search: gamut clamping puts small flat
 * spots in the contrast-vs-lightness curve, so it is not strictly monotonic and
 * bisection can step over the first passing value.
 */
export function deriveToken(
  brandHex: string,
  surfaces: readonly [string, string],
  target: number,
  direction: 'darken' | 'lighten'
): string | null {
  const brand = hexToOklch(brandHex)
  if (!brand) return null

  const sign = direction === 'darken' ? -1 : 1

  for (let chroma = brand.C; chroma >= 0; chroma -= CHROMA_STEP) {
    const C = Math.max(0, chroma)

    for (let step = 0; step <= LIGHTNESS_STEPS; step++) {
      const L = brand.L + (sign * step) / LIGHTNESS_STEPS
      if (L < 0 || L > 1) break
      // Contrast is measured on the quantized hex, never on the OKLCH values:
      // out-of-gamut coordinates get clamped per channel on the way back, which
      // moves the real ratio (spec §1.1d).
      const hex = oklchToHex({ L, C, h: brand.h })
      if (worstContrast(hex, surfaces) >= target) return hex
    }
  }

  // Unreachable: at chroma 0 the lightness ramp includes pure black and pure
  // white, one of which clears any target against any surface. Kept as a total
  // function rather than a throw -- the caller is the root layout.
  return null
}

export function deriveTheme(
  brandHex: string,
  theme: ThemeName
): {
  light: { link: string; accent: string }
  dark: { link: string; accent: string }
} | null {
  if (!THEME_NAMES.includes(theme)) return null
  const surfaces = PRESET_SURFACES[theme]

  const lightLink = deriveToken(
    brandHex,
    surfaces.light,
    LINK_MIN_CONTRAST,
    'darken'
  )
  const darkLink = deriveToken(
    brandHex,
    surfaces.dark,
    LINK_MIN_CONTRAST,
    'lighten'
  )
  if (!lightLink || !darkLink) return null

  // The Modern Instrument direction uses ONE chromatic colour: rail numbers,
  // year stamps, links, current-nav and the focus ring are all the same value.
  // Accent therefore reuses the link derivation rather than deriving to its own
  // looser 3:1 non-text floor -- 4.5:1 clears 3:1, so nothing regresses, and the
  // two tokens can never drift apart.
  return {
    light: { link: lightLink, accent: lightLink },
    dark: { link: darkLink, accent: darkLink },
  }
}

/**
 * The CSS the root layout injects, or null if nothing should be injected.
 *
 * `:root:root:root` is (0,3,0). It has to outrank `:root[data-theme="warm"]`
 * at (0,2,0), and `:root:root` merely ties it -- which would leave the winner
 * to source order between a stylesheet and a Next-injected <style>, the exact
 * dependency this design refuses to take (spec §3.5). A Playwright test asserts
 * the computed value rather than trusting this comment.
 *
 * Only the two chromatic tokens are ever emitted. Neutrals belong to presets.
 */
export function buildBrandStyle(
  brandHex: string,
  theme: ThemeName
): string | null {
  const derived = deriveTheme(brandHex, theme)
  if (!derived) return null

  return [
    `:root:root:root{--sem-link:${derived.light.link};--sem-accent:${derived.light.accent}}`,
    `@media (prefers-color-scheme: dark){`,
    `:root:root:root{--sem-link:${derived.dark.link};--sem-accent:${derived.dark.accent}}`,
    `}`,
  ].join('')
}

/** Narrows an unvalidated CMS value to a known preset, defaulting safely. */
export function resolveThemeName(value: unknown): ThemeName {
  return typeof value === 'string' &&
    (THEME_NAMES as readonly string[]).includes(value)
    ? (value as ThemeName)
    : 'default'
}

/**
 * The `theme-color` a browser or manifest should use for one preset, per
 * colour scheme -- always the base surface, matching what an unstyled page
 * paints before any content renders. Shared by `generateViewport` and
 * `app/manifest.ts` so the two never disagree about what one preset means.
 */
export function themeColorFor(theme: ThemeName): { light: string; dark: string } {
  return {
    light: PRESET_SURFACES[theme].light[0],
    dark: PRESET_SURFACES[theme].dark[0],
  }
}
