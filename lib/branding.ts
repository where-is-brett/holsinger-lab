import { fallbackSiteName } from 'lib/site'

export interface Branding {
  /** Full name: browser tab titles, Open Graph, JSON-LD, web app manifest `name`. */
  siteName: string
  /** Short form: header wordmark and manifest `short_name`. Defaults to `siteName`. */
  shortName: string
}

/**
 * The subset of `SettingsPayload` this function reads. Declared structurally
 * rather than importing `SettingsPayload` so the function stays trivially
 * testable with object literals and has no dependency on generated types.
 */
export interface BrandingSource {
  siteName?: string | null
  shortName?: string | null
}

/**
 * Resolves the site's display names from CMS settings, falling back to the
 * built-in constant. Single owner of that fallback chain — no caller should
 * reimplement it, because a caller that forgets would silently reintroduce the
 * hardcoded name this phase exists to remove.
 *
 * Whitespace-only values are treated as unset: Studio string fields readily
 * collect a stray space, and a header wordmark rendering " " is worse than one
 * rendering the default.
 */
export function resolveBranding(
  settings: BrandingSource | null | undefined
): Branding {
  const siteName = settings?.siteName?.trim() || fallbackSiteName
  const shortName = settings?.shortName?.trim() || siteName
  return { siteName, shortName }
}
