/**
 * Logo geometry. Pure -- no React, no Sanity, no framework imports -- for the
 * same reason `lib/branding.ts` is: it stays trivially testable with object
 * literals, and this repo has no React render-testing stack (spec §4).
 */

/**
 * Rendered logo height in px, at every breakpoint.
 *
 * This is exactly what the pre-4B mobile rule (`h-[50%]` of an `h-16` bar)
 * already produced. Desktop reuses it rather than taking its own larger size,
 * so there is one height in the system rather than a pair that can disagree.
 */
export const LOGO_HEIGHT = 32

/**
 * Wordmark width per character, in px.
 *
 * NOT load-bearing for correctness. The wordmark renders inside
 * `<text textLength={width} lengthAdjust="spacingAndGlyphs">`, which forces
 * the glyphs to occupy exactly `width` whatever this constant is -- so this
 * only sets the *box proportions*, never whether the geometry is right. It is
 * therefore tuned by eye rather than derived from font metrics, which are not
 * knowable server-side.
 *
 * 14 is chosen so a ten-character name reproduces the pre-4B mark's ~139.7px
 * (a 524x120 viewBox rendered 32px tall).
 */
export const CHAR_WIDTH = 14

export type ResolvedLogo =
  | { mode: 'image'; width: number; height: number }
  | { mode: 'wordmark'; width: number; height: number; text: string }

/**
 * The shape `settingsQuery` projects for `logo`/`logoDark`. Declared
 * structurally rather than importing the generated type so this module has no
 * dependency on typegen output.
 */
export interface LogoImageSource {
  asset?: {
    metadata?: {
      dimensions?: { aspectRatio?: number | null } | null
    } | null
  } | null
}

export function getAspectRatio(
  image: LogoImageSource | null | undefined
): number | null {
  return image?.asset?.metadata?.dimensions?.aspectRatio ?? null
}

/**
 * Resolves which of the three render modes applies AND how wide it will be, in
 * one call.
 *
 * These are deliberately one function rather than a `getLogoWidth(aspectRatio)`
 * helper, because a wordmark has no asset to take a ratio from -- and wordmark
 * mode is what production actually renders until someone uploads a logo. Any
 * width helper that only understood aspect ratios would leave the live case
 * underivable, which is precisely the D5 bug this phase fixes: a hardcoded
 * `w-[120px]` overlay sitting under a ~140px *wordmark*.
 *
 * Both `Logo` and MobileNavBar's transparent tap-overlay size themselves from
 * this. They cannot drift, in either mode, because there is one function.
 */
export function resolveLogo({
  aspectRatio,
  shortName,
}: {
  aspectRatio?: number | null
  shortName: string
}): ResolvedLogo {
  if (
    typeof aspectRatio === 'number' &&
    Number.isFinite(aspectRatio) &&
    aspectRatio > 0
  ) {
    return {
      mode: 'image',
      width: LOGO_HEIGHT * aspectRatio,
      height: LOGO_HEIGHT,
    }
  }

  const text = shortName.trim()
  return {
    mode: 'wordmark',
    // `Math.max(1, …)` so an empty name can never produce a zero-width tap
    // target. `resolveBranding` already guarantees a non-empty string, but
    // the failure mode is severe and invisible, so it is guarded here too.
    width: Math.max(1, text.length) * CHAR_WIDTH,
    height: LOGO_HEIGHT,
    text,
  }
}
