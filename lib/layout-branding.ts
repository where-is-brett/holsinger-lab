/**
 * The branding decisions the root layout makes, extracted so they are testable
 * without rendering. The layout itself stays a thin wiring shim -- this repo
 * has no React render-testing stack, so anything left inline in a component is
 * effectively untested.
 */

import { buildBrandStyle, resolveThemeName } from 'lib/theme'

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

  const hex = settings?.brandColor?.hex?.trim()
  if (!hex) return { dataTheme, style: null }

  return { dataTheme, style: buildBrandStyle(hex, theme) }
}
