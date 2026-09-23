import { stegaClean } from 'next-sanity'

import { formatCitationLine } from './format'
import type { PublicationEntry } from './types'

const clean = (v: string | null | undefined) => (v ? stegaClean(v).trim() : '')

/**
 * `PublicationEntry` plus the optional `slug` (`"slug": slug.current`,
 * added to `publicationsQuery` and to `PublicationEntry` itself in
 * `lib/wix/types.ts`). Kept as an explicit intersection here -- rather than
 * importing `PublicationEntry` and using it directly -- so this module's
 * public signatures don't change if that field is ever removed from the
 * shared type again.
 */
export type CitationInput = PublicationEntry & { slug?: string | null }

const sentence = (s: string): string => {
  const t = s.trim()
  if (!t) return ''
  return /[.!?]$/.test(t) ? t : `${t}.`
}

/**
 * Splits a messy "author list" string into individual author names.
 *
 * The real data mixes several house styles:
 *   - "Surname Initial., Surname Initial., ... and Surname Initial."
 *   - "Surname, Initials. and Surname, Initials." (surname-comma-initials --
 *     the hard case: a comma here looks identical to a comma separating two
 *     authors)
 *   - "Surname INITIALS, Surname INITIALS and Surname INITIALS" (no periods
 *     at all)
 *   - a stray trailing "." after a plain (undotted) initials block, e.g.
 *     "... and Holsinger RMD." -- a leftover sentence-terminator, not part
 *     of the name (compare "Holsinger RMD" with no period, which appears
 *     elsewhere in the same dataset for the same person).
 *
 * Approach:
 *  1. Strip a genuinely orphan trailing "." -- only when it directly follows
 *     a run of 2+ undotted capital letters (`/[A-Z]{2,}\.$/`). A single
 *     initial's own period ("... Neely G.") or the last dot of a
 *     dot-separated block ("... R.M.D.") is left alone, since in both cases
 *     that period is already load-bearing for the initials themselves.
 *  2. Normalise the final " and " (there is normally exactly one, joining
 *     the last two authors) to ", " so the whole list becomes one
 *     comma-separated sequence.
 *  3. Split on ",". Then do a single forward merge pass: if a fragment,
 *     trimmed, is made up entirely of capital letters plus "." and "-"
 *     (i.e. it *looks like* a bare initials block: "E.", "Q-S.", "R.M.D.",
 *     but also a no-separator run like "JH"), merge it into the *previous*
 *     fragment as "Surname, Initials" and drop it as its own entry. Any
 *     fragment containing a space or a lowercase letter is a complete
 *     "Surname Initial(s)" author on its own and is never merged.
 *
 * Known failure modes (documented rather than guarded against, since they
 * don't occur in the current dataset):
 *  - An author list containing the literal word "and" inside a name would
 *    be mis-split, since every " and " is treated as a boundary.
 *  - A short, undotted, all-caps *surname* standing alone as its own
 *    comma-separated fragment (e.g. a hypothetical "Smith, DI, Jones")
 *    would be merged into the previous author instead of staying separate,
 *    because step 3 can't distinguish "bare initials" from "bare all-caps
 *    surname" -- it only has the shape of the fragment to go on.
 */
export function splitAuthors(author: string | null | undefined): string[] {
  const raw = clean(author)
  if (!raw) return []

  const stripped = /[A-Z]{2,}\.$/.test(raw) ? raw.replace(/\.$/, '') : raw
  const normalised = stripped.replace(/\s+and\s+/g, ', ')
  const fragments = normalised
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean)

  const INITIALS_ONLY = /^[A-Z](?:[.-]?[A-Z])*\.?$/
  const authors: string[] = []
  for (const fragment of fragments) {
    if (INITIALS_ONLY.test(fragment) && authors.length > 0) {
      authors[authors.length - 1] = `${authors[authors.length - 1]}, ${fragment}`
    } else {
      authors.push(fragment)
    }
  }
  return authors
}

const BIBTEX_KEY_SAFE = /[^A-Za-z0-9_-]+/g

function bibtexKey(pub: CitationInput): string {
  const slug = clean(pub.slug ?? undefined)
  if (slug) {
    const safe = slug.replace(BIBTEX_KEY_SAFE, '')
    if (safe) return safe
  }
  const [first] = splitAuthors(pub.author)
  const surname = first ? (first.includes(',') ? first.split(',')[0] : first.split(' ')[0]).trim() : ''
  const year = clean(pub.date).slice(0, 4)
  const safe = `${surname}${year}`.replace(BIBTEX_KEY_SAFE, '')
  return safe || 'entry'
}

/**
 * Escapes the BibTeX special characters `{ } & % $ # _ ~ ^ \` per standard
 * BibTeX conventions. Everything else -- including non-ASCII text such as
 * "κ", en dashes or curly quotes -- is left untouched (UTF-8, not
 * transliterated).
 */
function escapeBibtex(s: string): string {
  // A literal backslash is replaced with a placeholder first and expanded to
  // `\textbackslash{}` last (same trick `~`/`^` use below) -- otherwise the
  // `{`/`}` it introduces would run straight into the following brace pass
  // and get escaped a second time (`\textbackslash\{\}` instead of
  // `\textbackslash{}`).
  const BACKSLASH_PLACEHOLDER = '\u0000'
  return s
    .replace(/\\/g, BACKSLASH_PLACEHOLDER)
    .replace(/([{}&%$#_])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(new RegExp(BACKSLASH_PLACEHOLDER, 'g'), '\\textbackslash{}')
}

/**
 * A single `@article{...}` BibTeX entry. Falls back to `@misc` when the
 * record has no journal (e.g. malformed data with a title but nothing
 * else) -- `@article` requires a journal field in the BibTeX spec, so
 * `@misc` is the closer fit rather than emitting an `@article` with a
 * missing required field.
 */
export function bibtex(pub: CitationInput): string {
  const title = clean(pub.title)
  const journal = clean(pub.journal)
  const authors = splitAuthors(pub.author)
  const year = clean(pub.date).slice(0, 4)
  const type = journal ? 'article' : 'misc'

  const fields: [string, string][] = []
  if (authors.length) fields.push(['author', authors.map(escapeBibtex).join(' and ')])
  // Wrapped in an extra brace layer ("{{...}}") so BibTeX styles that
  // lowercase titles don't touch embedded acronyms (INPP5D, NF-κB, ...).
  if (title) fields.push(['title', `{${escapeBibtex(title)}}`])
  if (journal) fields.push(['journal', escapeBibtex(journal)])
  if (year) fields.push(['year', year])
  if (pub.volume != null) fields.push(['volume', String(pub.volume)])
  if (pub.issue != null) fields.push(['number', String(pub.issue)])
  const pages = clean(pub.pages)
  if (pages) fields.push(['pages', escapeBibtex(pages)])
  const doi = clean(pub.doi)
  if (doi) fields.push(['doi', escapeBibtex(doi)])
  const url = clean(pub.url)
  if (url) fields.push(['url', escapeBibtex(url)])

  const body = fields.map(([k, v]) => `  ${k} = {${v}},`).join('\n')
  return `@${type}{${bibtexKey(pub)},\n${body}\n}`
}

/**
 * Splits a "1515-1532" page range into [start, end]; a single page ("74") is
 * [page].
 *
 * Known failure mode: any `pages` value shaped like "X-Y" is treated as a
 * range, including a hyphenated article id that isn't one (e.g. a preprint
 * id such as "e2024-01-1" would be split into SP/EP instead of staying a
 * single SP). Not a concern for the current dataset's non-hyphenated
 * preprint ids, but worth knowing if that changes.
 */
function splitPageRange(pages: string): [string, string?] {
  const m = pages.match(/^(\S+)\s*-\s*(\S+)$/)
  return m ? [m[1], m[2]] : [pages]
}

/** A single RIS record, `TY  - JOUR` ... `ER  -`, with CRLF line endings per the RIS convention. */
export function ris(pub: CitationInput): string {
  const CRLF = '\r\n'
  const lines: string[] = ['TY  - JOUR']

  for (const author of splitAuthors(pub.author)) lines.push(`AU  - ${author}`)

  const title = clean(pub.title)
  if (title) lines.push(`TI  - ${title}`)

  const journal = clean(pub.journal)
  if (journal) {
    lines.push(`T2  - ${journal}`)
    lines.push(`JO  - ${journal}`)
  }

  if (pub.volume != null) lines.push(`VL  - ${pub.volume}`)
  if (pub.issue != null) lines.push(`IS  - ${pub.issue}`)

  const pages = clean(pub.pages)
  if (pages) {
    const [start, end] = splitPageRange(pages)
    lines.push(`SP  - ${start}`)
    if (end) lines.push(`EP  - ${end}`)
  }

  const year = clean(pub.date).slice(0, 4)
  if (year) lines.push(`PY  - ${year}`)

  const doi = clean(pub.doi)
  if (doi) lines.push(`DO  - ${doi}`)

  const url = clean(pub.url)
  if (url) lines.push(`UR  - ${url}`)

  lines.push('ER  - ')
  return lines.join(CRLF) + CRLF
}

/**
 * "Authors. Title. Journal Year;Vol(Issue):Pages. doi:...".
 *
 * Reuses `formatCitationLine` for the "Journal Year; Vol(Issue):Pages."
 * segment rather than re-deriving it -- its existing output already omits
 * missing volume/issue/pages without leaving an orphan ";" (see
 * `lib/wix/format.test.ts`). One deviation from the brief's literal
 * example: `formatCitationLine` puts a space after the semicolon
 * ("Journal 2024; 12(2):289.") -- that's the established convention
 * throughout the rest of the codebase, so it's kept as-is rather than
 * duplicated with the space stripped.
 *
 * Deliberately uses the raw cleaned `author` string as-is rather than
 * `splitAuthors(pub.author).join(...)` -- the source string is already
 * prose-formatted for display, and `bibtex`/`ris` are the ones that need
 * individual author fields. Don't "fix" this into calling splitAuthors here.
 */
export function plainCitation(pub: CitationInput): string {
  const authors = sentence(clean(pub.author))
  const title = sentence(clean(pub.title))
  const journalLine = formatCitationLine(pub)
  const doi = clean(pub.doi)
  const doiPart = doi ? `doi:${doi}` : ''
  return [authors, title, journalLine, doiPart].filter(Boolean).join(' ')
}
