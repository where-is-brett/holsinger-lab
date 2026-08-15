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
 * MobileNavBar's transparent tap-overlay. That shared call is the whole
 * safety property of Phase 4B: the overlay cannot drift from the logo it
 * overlays, because one function produces both numbers.
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
          <img
            className="logo-light"
            src={lightUrl}
            alt="logo"
            width={resolved.width}
            height={resolved.height}
          />
          {/*
            Exactly one logo is ever exposed as a named image. The inactive
            variant is hidden from the accessibility tree explicitly rather
            than relying on `display: none`'s side effect, so the guarantee
            does not depend on how a given tool resolves hidden elements.
          */}
          <img
            className="logo-dark"
            src={darkUrl}
            alt=""
            aria-hidden="true"
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

  // Wordmark fallback. `role="img"` + `aria-label` supply the accessible name
  // that the <img> modes get from `alt`.
  const { width, height, text } = resolved as Extract<
    typeof resolved,
    { mode: 'wordmark' }
  >

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
