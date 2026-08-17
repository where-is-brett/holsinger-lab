/**
 * The branding decisions the root layout makes, extracted so they are testable
 * without rendering. The layout itself stays a thin wiring shim -- this repo
 * has no React render-testing stack, so anything left inline in a component is
 * effectively untested.
 */

import { buildBrandStyle, resolveThemeName, themeColorFor } from 'lib/theme'

/** The subset of the settings payload this reads, declared structurally. */
export interface BrandStyleSource {
  brandColor?: { hex?: string | null } | null
  theme?: string | null
}

export interface ResolvedBrandStyle {
  /** Value for `<html data-theme>`, or undefined to omit the attribute. */
  dataTheme: string | undefined
  /** CSS to inject, or null to inject nothing at all. */
  style: string | null
}

export function resolveBrandStyle(
  settings: BrandStyleSource | null | undefined
): ResolvedBrandStyle {
  const theme = resolveThemeName(settings?.theme)

  // The base :root IS the default preset, so the attribute is only meaningful
  // when it is something else. Omitting it keeps the rendered HTML unchanged
  // for every site that never touches this setting.
  const dataTheme = theme === 'default' ? undefined : theme

  // settings comes from a GROQ query result, typed but not runtime-validated,
  // so brandColor.hex is only assumed to be a string -- guard it explicitly
  // rather than trusting the type, per this module's job of never throwing
  // regardless of what shape actually arrives.
  const rawHex = settings?.brandColor?.hex
  const hex = typeof rawHex === 'string' ? rawHex.trim() : ''
  if (!hex) return { dataTheme, style: null }

  return { dataTheme, style: buildBrandStyle(hex, theme) }
}

/**
 * The `theme-color` values `generateViewport` serves, resolved the same way
 * `resolveBrandStyle` resolves `data-theme` -- reusing `resolveThemeName` so
 * an invalid or missing CMS value degrades to the default preset instead of
 * an unstyled browser chrome colour.
 */
export function resolveViewportColors(
  settings: BrandStyleSource | null | undefined
): { light: string; dark: string } {
  return themeColorFor(resolveThemeName(settings?.theme))
}
