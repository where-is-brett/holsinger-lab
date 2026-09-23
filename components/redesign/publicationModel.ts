import { formatApaCitation } from 'lib/citation'
import type { PublicationPayload } from 'types'

export interface Publication {
  id: string
  href: string | null
  year: string
  dateLabel: string
  title: string
  authorsPre: string
  authorsPI: string
  authorsPost: string
  journal: string
  /** volume(issue) · pages, e.g. "11(1) · 74" */
  ref: string
  linkKind: 'DOI' | 'URL' | ''
  /** printed verbatim -- identifiers are case-sensitive */
  linkLabel: string
  linkLabelShort?: string
  linkHref: string
  type: string
  topics: string[]
  cite: string
  abstract: string[]
  resources: { id: string; title: string; kind: string | null }[]
}

const PI_SURNAME = 'Holsinger'

// The PI's own name token ends at the next comma, semicolon, or " and "/
// " & " conjunction -- so a co-author listed right after the PI with no
// comma between them ("... Holsinger R.M.D. and Neely G.") is never swept
// into the bold run too.
const AUTHOR_TOKEN_BOUNDARY = /[,;]|\s+(?:and|&)\s+/

// A segment is "initials only" when it's nothing but capital letters,
// dots and hyphens (optionally space-separated), e.g. " R.M.D.", " RMD.",
// " RMD", " Q-S.", " R. M. D." -- never a real name ("Damian", "Kiang
// K.M.") mixed in, which always carries a lowercase letter or another
// author's own surname-then-initials shape.
const INITIALS_ONLY = /^\s*[A-Z](?:[A-Z.\-\s]*[A-Z.])?\s*$/

export function splitAuthors(authors: string, piSurname: string = PI_SURNAME) {
  const at = authors.indexOf(piSurname)
  if (at === -1) return { pre: authors, pi: '', post: '' }
  // The PI's name runs from the surname to that boundary or the end, so
  // initials stay attached ("Holsinger R.M.D." not "Holsinger").
  const rest = authors.slice(at + piSurname.length)
  const boundary = rest.search(AUTHOR_TOKEN_BOUNDARY)
  let end = at + piSurname.length + (boundary === -1 ? rest.length : boundary)

  // "Surname, Initials" format ("Holsinger, R.M.D."): the comma found
  // above is the name's own internal separator, not the next author's --
  // when the segment right after it (up to the *next* real boundary) is
  // initials only, fold that segment into the PI's own bolded token too,
  // so the whole "Holsinger, R.M.D." reads as one name, not just the bare
  // surname.
  if (boundary !== -1 && rest[boundary] === ',') {
    const afterComma = rest.slice(boundary + 1)
    const nextBoundary = afterComma.search(AUTHOR_TOKEN_BOUNDARY)
    const segment = nextBoundary === -1 ? afterComma : afterComma.slice(0, nextBoundary)
    if (INITIALS_ONLY.test(segment)) {
      end = at + piSurname.length + boundary + 1 + (nextBoundary === -1 ? afterComma.length : nextBoundary)
    }
  }

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

export function formatRef(volume: number | null, issue: number | null, pages: string | null): string {
  const vol = volume !== null ? `${volume}${issue !== null ? `(${issue})` : ''}` : ''
  return [vol, pages ?? ''].filter(Boolean).join(' · ')
}

const DATE_LABEL = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

export function toPublication(p: PublicationPayload): Publication {
  const title = (p.title ?? '').trim()
  const authors = (p.author ?? '').trim()
  const { pre, pi, post } = splitAuthors(authors)
  const link = deriveLink(p.doi ?? null, p.url ?? null)
  return {
    id: p._id,
    href: p.slug ? `/publications/${p.slug}` : null,
    year: p.date ? p.date.slice(0, 4) : '',
    dateLabel: p.date ? DATE_LABEL.format(new Date(`${p.date}T00:00:00Z`)) : '',
    title,
    authorsPre: pre,
    authorsPI: pi,
    authorsPost: post,
    journal: (p.journal ?? '').trim(),
    ref: formatRef(p.volume ?? null, p.issue ?? null, p.pages ?? null),
    linkKind: link?.kind ?? '',
    linkLabel: link?.label ?? '',
    linkLabelShort: link ? shortenLabel(link.label, 26) : '',
    linkHref: link?.href ?? '',
    type: p.type ?? '',
    topics: p.topics ?? [],
    cite: formatApaCitation(p),
    abstract: (p.abstract ?? '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean),
    // An untitled resource (empty/whitespace-only title) has nothing to
    // link to or label in the Resource block, so it's dropped rather than
    // rendered as a blank ResourceBlock (fix round 1).
    resources: (p.resources ?? [])
      .map((r) => ({ id: r._id, title: (r.title ?? '').trim(), kind: r.kind ?? null }))
      .filter((r) => r.title !== ''),
  }
}

/**
 * `PageTitle`'s `/publications` meta line (unfiltered), sentence case
 * (spec §1.3): "19 publications, 2020–2025" (spec's own example), or
 * "1 publication" with no years on file. Lives here rather than in
 * `PublicationsIndex.tsx` so its singular/plural, single-year
 * (`min === max`) and no-year branches get direct unit coverage instead of
 * relying only on an e2e regex check.
 */
export function formatPublicationsMeta(pubs: Pick<Publication, 'year'>[]): string {
  const years = pubs.map((p) => p.year).filter(Boolean)
  const n = pubs.length
  const label = n === 1 ? 'publication' : 'publications'
  if (years.length === 0) return `${n} ${label}`
  const min = years.reduce((a, b) => (b < a ? b : a))
  const max = years.reduce((a, b) => (b > a ? b : a))
  return min === max ? `${n} ${label}, ${min}` : `${n} ${label}, ${min}–${max}`
}

/**
 * The filtered variant of the same meta line: "5 of 19 publications shown"
 * (`PublicationsIndex.tsx`'s `accentMeta` state). A separate function, not
 * a branch inside `formatPublicationsMeta`, because it takes a different
 * shape of input (two counts, not a list to derive a year range from).
 * Unconditionally plural: a filtered view implies at least one chip is
 * active against a real dataset, which is never the single-publication
 * case in practice.
 */
export function formatFilteredPublicationsMeta(shownCount: number, totalCount: number): string {
  return `${shownCount} of ${totalCount} publications shown`
}
