// Bare DOI, per the Crossref/DOI Handbook syntax: prefix "10." + 4-9 digits,
// "/", then any non-whitespace suffix. Deliberately permissive on the
// suffix -- DOI suffixes have no fixed shape across publishers.
const BARE_DOI_PATTERN = /^10\.\d{4,9}\/\S+$/

// The two URL shapes design doc §1.9 found to be machine-recoverable in the
// live dataset. Anything else (MDPI's /{issn}/{vol}/{iss}/{page} path,
// jneuro's /abstract/{slug}.html) does not encode a DOI in the URL at all.
const DOI_ORG_PATTERN = /^https?:\/\/(?:dx\.)?doi\.org\/(10\.\d{4,9}\/\S+)$/i
const WILEY_DOI_PATH_PATTERN = /^https?:\/\/onlinelibrary\.wiley\.com\/doi\/(10\.\d{4,9}\/\S+)$/i

/** True if `value` is a bare DOI (no scheme, no host) -- what the `doi` field stores. */
export function isValidDoi(value: string): boolean {
  return BARE_DOI_PATTERN.test(value.trim())
}

/**
 * Extracts a bare DOI from a `url`-shaped string, or returns null if the URL
 * doesn't encode one. Only handles the two recoverable shapes found in the
 * live dataset (doi.org and Wiley's /doi/ path) -- publisher URLs that don't
 * carry a DOI (MDPI, jneuro) correctly return null rather than guessing.
 */
export function extractDoiFromUrl(url: string): string | null {
  const trimmed = url.trim()
  return (
    trimmed.match(DOI_ORG_PATTERN)?.[1] ?? trimmed.match(WILEY_DOI_PATH_PATTERN)?.[1] ?? null
  )
}

/**
 * Normalises whatever an editor pastes into the `doi` field: a bare DOI
 * passes through unchanged, a full doi.org/Wiley URL is reduced to its bare
 * DOI. Used before validating or looking up a DOI, so editors don't have to
 * remember to strip the URL prefix themselves.
 */
export function normalizeDoiInput(value: string): string {
  const trimmed = value.trim()
  return extractDoiFromUrl(trimmed) ?? trimmed
}
