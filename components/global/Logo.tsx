import {
  getAspectRatio,
  LOGO_HEIGHT,
  type LogoImageSource,
  resolveLogo,
} from 'lib/logo'
import { urlForImage } from 'lib/sanity.image'
import type { Image } from 'sanity'

interface LogoProps {
  logo?: LogoImageSource | null
  logoDark?: LogoImageSource | null
  /** Already resolved by `resolveBranding` — never raw CMS input. */
  shortName: string
}

/**
 * Rendered at 2x so the logo stays sharp on high-DPI screens. Sanity returns
 * SVG uploads untransformed, so this is a no-op for vector logos.
 */
const RASTER_HEIGHT = LOGO_HEIGHT * 2

function logoUrl(image: LogoImageSource): string | undefined {
  // The generated image shape leaves crop/hotspot bounds optional while
  // `Image` from 'sanity' assumes them populated — the same cast the other
  // image call sites in this repo carry (see lib/json-ld.ts).
  return urlForImage(image as Image)?.height(RASTER_HEIGHT).url()
}

/**
 * The site's header logo, in one of three modes:
 *
 *   1. `logo` uploaded            -> <img> from the Sanity CDN
 *   2. `logo` + `logoDark`        -> both, CSS-switched by colour scheme
 *   3. neither                    -> wordmark fallback (the stroked box)
 *
 * All three take their width from `resolveLogo`, which is also what sizes
 * MobileNavBar's transparent tap-overlay -- a second, independent call to
 * that same pure function, given the same `aspectRatio`/`shortName` inputs,
 * so it cannot resolve to a different number. That is the whole safety
 * property of Phase 4B: the overlay cannot drift from the logo it overlays,
 * even though neither call's result is passed to the other.
 *
 * A plain <img> rather than next/image is deliberate — see the contract test.
 */
export default function Logo({ logo, logoDark, shortName }: LogoProps) {
  const resolved = resolveLogo({
    aspectRatio: getAspectRatio(logo),
    shortName,
  })

  if (resolved.mode === 'image' && logo) {
    const lightUrl = logoUrl(logo)
    const darkUrl = logoDark ? logoUrl(logoDark) : undefined

    if (lightUrl && darkUrl) {
      return (
        <>
          {/*
            Both images carry the identical accessible name. Exactly one is
            ever visible at a time -- styles/index.css §3.4 sets
            `.logo-light { display: block }` / `.logo-dark { display: none }`
            and flips that pairing under `prefers-color-scheme: dark`. A
            `display: none` element is already removed from the accessibility
            tree in every browser and by Playwright's role-based locators, so
            exactly one "logo"-named image is exposed at a time by
            construction, in both colour schemes, with no manual
            accessibility-tree bookkeeping needed on this element (and no
            risk of the two drifting out of sync, which previously hid the
            visible image's name entirely in dark mode).
          */}
          <img
            className="logo-light"
            src={lightUrl}
            alt="logo"
            width={resolved.width}
            height={resolved.height}
          />
          <img
            className="logo-dark"
            src={darkUrl}
            alt="logo"
            width={resolved.width}
            height={resolved.height}
          />
        </>
      )
    }

    if (lightUrl) {
      return (
        <img
          src={lightUrl}
          alt="logo"
          width={resolved.width}
          height={resolved.height}
        />
      )
    }
  }

  // Wordmark fallback: either `resolveLogo` returned `mode: 'wordmark'` from
  // the start (no `logo` uploaded), or it returned `mode: 'image'` but
  // neither `logo` nor `logoDark` produced a usable URL (a malformed asset
  // reference -- `metadata.dimensions.aspectRatio` present but `asset._ref`
  // missing or otherwise unresolvable by `urlForImage`). In the latter case
  // `resolved` is image-shaped and has no `text` field, so it cannot be
  // reused here -- recompute a genuine wordmark result instead of casting
  // the image-shaped value into the wordmark shape.
  const wordmark =
    resolved.mode === 'wordmark'
      ? resolved
      : resolveLogo({ aspectRatio: null, shortName })

  // `resolveLogo` always returns `mode: 'wordmark'` when `aspectRatio` is
  // `null` (see lib/logo.ts), but that fact isn't visible in its return type
  // -- a single call signature returning the full `ResolvedLogo` union -- so
  // this narrows via a runtime check instead of asserting it away with a
  // cast. Unreachable in practice; a thrown error is safer here than an
  // unsound assumption if that invariant ever changes.
  if (wordmark.mode !== 'wordmark') {
    throw new Error(
      'Logo: resolveLogo({ aspectRatio: null }) did not return wordmark mode'
    )
  }

  const { width, height, text } = wordmark

  return (
    <svg
      role="img"
      aria-label="logo"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="text-text"
    >
      <rect
        x={1}
        y={1}
        width={width - 2}
        height={height - 2}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      />
      <text
        x={width / 2}
        y={height / 2}
        // Forces the glyphs to occupy exactly this width whatever the font's
        // real advance metrics are -- which are not knowable server-side. The
        // box proportions become exact by construction rather than by
        // assuming a per-character advance.
        textLength={width - 12}
        lengthAdjust="spacingAndGlyphs"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        className="font-antarctican"
        fontSize={height * 0.55}
      >
        {text}
      </text>
    </svg>
  )
}
