/**
 * sRGB <-> OKLCH conversion and WCAG 2.1 contrast. Pure and dependency-free --
 * no colour library -- because this repo is handed over with no maintainer, and
 * a transitive break in a dependency would be unfixable (spec §3.2).
 *
 * Matrices are Bjorn Ottosson's published OKLab constants.
 */

export interface Oklch {
  /** Perceptual lightness, 0 (black) to 1 (white). */
  L: number
  /** Chroma, 0 (grey) upward. Values above ~0.37 leave the sRGB gamut. */
  C: number
  /** Hue angle in radians. */
  h: number
}

const HEX_PATTERN = /^#[0-9a-f]{6}$/i

const srgbToLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4

const linearToSrgb = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055

/** Parses `#rrggbb` into a 0-1 sRGB triple, or null if the input is not that. */
export function parseHex(hex: string): [number, number, number] | null {
  const trimmed = hex.trim()
  if (!HEX_PATTERN.test(trimmed)) return null
  const body = trimmed.slice(1)
  return [0, 2, 4].map((i) => parseInt(body.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number
  ]
}

function toHex(rgb: [number, number, number]): string {
  const channel = (c: number) =>
    Math.round(Math.min(1, Math.max(0, c)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(rgb[0])}${channel(rgb[1])}${channel(rgb[2])}`
}

export function hexToOklch(hex: string): Oklch | null {
  const parsed = parseHex(hex)
  if (!parsed) return null
  const [r, g, b] = parsed.map(srgbToLinear)

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s

  return { L, C: Math.hypot(a, bb), h: Math.atan2(bb, a) }
}

/**
 * Always returns a valid `#rrggbb`. Coordinates outside the sRGB gamut are
 * clamped per channel -- which is why callers must re-measure contrast on the
 * returned string rather than trusting the requested lightness (spec §1.1d).
 */
export function oklchToHex({ L, C, h }: Oklch): string {
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3

  return toHex([
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ])
}

function relativeLuminance(hex: string): number {
  const parsed = parseHex(hex)
  if (!parsed)
    throw new Error(`contrast: unparseable colour ${JSON.stringify(hex)}`)
  const [r, g, b] = parsed.map(srgbToLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.1 contrast ratio, 1 to 21. Both arguments must be `#rrggbb`. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x
  )
  return (hi + 0.05) / (lo + 0.05)
}
