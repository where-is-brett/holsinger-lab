export interface Publication {
  year: string
  title: string
  authorsPre: string
  authorsPI: string
  authorsPost: string
  journal: string
  /** volume(issue) · pages, e.g. "11(1) · 74" */
  ref: string
  linkKind: 'DOI' | 'URL'
  /** printed verbatim -- identifiers are case-sensitive */
  linkLabel: string
  linkLabelShort?: string
  linkHref: string
  type: string
  topics: string[]
  cite: string
}

const PI_SURNAME = 'Holsinger'

export function splitAuthors(authors: string, piSurname: string = PI_SURNAME) {
  const at = authors.indexOf(piSurname)
  if (at === -1) return { pre: authors, pi: '', post: '' }
  // The PI's name runs from the surname to the next comma or the end, so
  // initials stay attached ("Holsinger R.M.D." not "Holsinger").
  let end = at + piSurname.length
  while (end < authors.length && authors[end] !== ',') end++
  return {
    pre: authors.slice(0, at),
    pi: authors.slice(at, end).trimEnd(),
    post: authors.slice(end),
  }
}

export function deriveLink(doi: string | null, url: string | null) {
  if (doi) {
    return { kind: 'DOI' as const, label: doi, href: `https://doi.org/${doi}` }
  }
  if (url) {
    // Display drops the scheme and a leading www. for scannability; the href
    // always keeps the recorded URL intact.
    const label = url.replace(/^https?:\/\//, '').replace(/^www\./, '')
    return { kind: 'URL' as const, label, href: url }
  }
  return null
}

export function shortenLabel(label: string, max = 32) {
  if (label.length <= max) return label
  return `${label.slice(0, max - 1)}…`
}
