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
