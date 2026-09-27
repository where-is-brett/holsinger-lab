import { formatApaCitation } from 'lib/citation'
import type { PublicationPayload } from 'types'

import { surnameOf } from './peopleModel'

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
  linkHref: string
  type: string
  topics: string[]
  cite: string
  abstract: string[]
  resources: { id: string; title: string; kind: string | null }[]
}

const PI_SURNAME = 'Holsinger'

// A character that would make a surname match part of a longer name: a letter,
// a combining mark, an apostrophe or a hyphen.
const NAME_CHAR = /[\p{L}\p{M}'’-]/u
// One initial: a capital not followed by a lower-case letter (so "S" of "Smith"
// is never taken as an initial), with an optional dot. Initials may be joined
// by a space or a hyphen: "R.M.D.", "RMD", "R M D", "R.M.D", "Q-S.".
const INITIAL = String.raw`\p{Lu}(?!\p{Ll})\.?`
const INITIALS = String.raw`${INITIAL}(?:[\s-]?${INITIAL})*`

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Where `surname` appears in `authors` as a whole word, plus any initials that
 * follow it (after an optional comma). Case-sensitive. The start boundary is
 * checked by hand, not with a lookbehind, so the pattern also compiles on
 * WebKit versions without lookbehind support.
 */
export function findAuthorToken(authors: string, surname: string): { start: number; end: number } | null {
  const target = surname.trim()
  if (!target) {
    return null
  }
  const pattern = new RegExp(
    String.raw`${escapeRegExp(target)}(?![\p{L}\p{M}'’-])(?:(?:,\s*|\s+)${INITIALS})?`,
    'gu'
  )
  for (let match = pattern.exec(authors); match !== null; match = pattern.exec(authors)) {
    const before = Array.from(authors.slice(0, match.index)).pop()
    if (before === undefined || !NAME_CHAR.test(before)) {
      return { start: match.index, end: match.index + match[0].length }
    }
    pattern.lastIndex = match.index + 1
  }
  return null
}

export function hasAuthor(authors: string, surname: string): boolean {
  return findAuthorToken(authors, surname) !== null
}

export function splitAuthors(authors: string, surname: string = PI_SURNAME) {
  const token = findAuthorToken(authors, surname)
  if (!token) return { pre: authors, pi: '', post: '' }
  return {
    pre: authors.slice(0, token.start),
    pi: authors.slice(token.start, token.end),
    post: authors.slice(token.end),
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

export function formatRef(volume: number | null, issue: number | null, pages: string | null): string {
  const vol = volume !== null ? `${volume}${issue !== null ? `(${issue})` : ''}` : ''
  return [vol, pages ?? ''].filter(Boolean).join(' · ')
}

const DATE_LABEL = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

function buildPublication(p: PublicationPayload, surname: string): Publication {
  const title = (p.title ?? '').trim()
  const authors = (p.author ?? '').trim()
  const { pre, pi, post } = splitAuthors(authors, surname)
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

export function toPublication(p: PublicationPayload): Publication {
  return buildPublication(p, PI_SURNAME)
}

/** A `toPublication` that bolds `surname` instead of the PI's -- for a person's own profile page. */
export function toPublicationFor(surname: string): (p: PublicationPayload) => Publication {
  return (p) => buildPublication(p, surname)
}

/** The papers whose author string carries this person's surname token, in the given order, bolding that surname. */
export function publicationsByPerson(pubs: PublicationPayload[], name: string | null | undefined): Publication[] {
  const surname = surnameOf(name)
  if (!surname) return []
  const toRow = toPublicationFor(surname)
  return pubs.filter((p) => hasAuthor(p.author ?? '', surname)).map(toRow)
}

/** How many author strings carry this person's surname token -- `publicationsByPerson`'s count, from authors alone. */
export function countPublicationsByPerson(authors: (string | null)[], name: string | null | undefined): number {
  const surname = surnameOf(name)
  if (!surname) return 0
  return authors.filter((a) => hasAuthor(a ?? '', surname)).length
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
