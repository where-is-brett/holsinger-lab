export interface CitationFields {
  author: string | null
  title: string | null
  journal: string | null
  volume: number | null
  issue: number | null
  pages: string | null
  date: string | null
  doi: string | null
  url: string | null
}

function citationYear(date: string | null): string {
  return date ? date.slice(0, 4) : 'n.d.'
}

/**
 * Trims whitespace and strips one redundant trailing period. The live dataset's
 * raw title strings sometimes carry both (e.g. one is stored as
 * " ...pathway. " with a leading space and a trailing ". ") -- this function
 * exists so the caller can append exactly one period without producing "..".
 * Display-time normalisation only; it never writes back to Sanity.
 */
function normalizeTitle(title: string | null): string {
  const trimmed = (title ?? '').trim()
  if (!trimmed) return 'Untitled'
  return trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed
}

/**
 * Trims whitespace only -- unlike the title, author strings legitimately end
 * in a period as an abbreviation marker (e.g. "Holsinger RMD."), so stripping
 * a trailing period here would corrupt real data.
 */
function normalizeAuthor(author: string | null): string {
  const trimmed = (author ?? '').trim()
  return trimmed || 'Unknown author'
}

/** Formats an APA-shaped citation as plain text -- the same string is used for display and for the copy-to-clipboard action, since the clipboard only ever carries plain text anyway. */
export function formatApaCitation(pub: CitationFields): string {
  const year = citationYear(pub.date)
  const author = normalizeAuthor(pub.author)
  const title = normalizeTitle(pub.title)
  const journal = pub.journal?.trim()
  const volumeIssue =
    pub.volume !== null
      ? `, ${pub.volume}${pub.issue !== null ? `(${pub.issue})` : ''}`
      : ''
  const pagesPart = pub.pages ? `, ${pub.pages}` : ''
  const journalPart = journal ? ` ${journal}${volumeIssue}${pagesPart}.` : ''
  const link = pub.doi ? `https://doi.org/${pub.doi}` : pub.url?.trim()

  return `${author} (${year}). ${title}.${journalPart}${link ? ` ${link}` : ''}`
}

/** Base cite key: first "word" of the author string (through the first space/comma), ASCII-only, lowercased, plus the year. Not unique across a list on its own -- see assignBibtexCiteKeys. */
function bibtexCiteKeyBase(author: string | null, date: string | null): string {
  const year = citationYear(date)
  const firstToken = (author ?? '').trim().split(/[\s,]+/)[0] ?? ''
  const asciiToken = firstToken.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${asciiToken || 'unknown'}${year}`
}

/**
 * Assigns a unique BibTeX cite key to each publication in `publications`, keyed
 * by `_id`. Two publications can share the same first-author-token + year --
 * this dataset has three such pairs (verified against the live data while
 * writing this plan, e.g. two 2023 publications both starting "Olufunmilayo").
 * The first occurrence in list order keeps the bare key; later ones get an
 * a/b/c/... suffix, matching the convention reference managers like
 * Zotero/Mendeley use to disambiguate.
 */
export function assignBibtexCiteKeys<
  T extends { _id: string; author: string | null; date: string | null },
>(publications: T[]): Map<string, string> {
  const seenCounts = new Map<string, number>()
  const keys = new Map<string, string>()

  for (const pub of publications) {
    const base = bibtexCiteKeyBase(pub.author, pub.date)
    const count = seenCounts.get(base) ?? 0
    seenCounts.set(base, count + 1)
    const suffix = count === 0 ? '' : String.fromCharCode(96 + count) // 1 -> 'a', 2 -> 'b', ...
    keys.set(pub._id, `${base}${suffix}`)
  }

  return keys
}

/** Strips BibTeX's field-terminating braces so free-text values don't break the entry. */
function escapeBibtexField(value: string): string {
  return value.replace(/[{}]/g, '')
}

/**
 * Formats a BibTeX @article entry. Every publication in this corpus is a
 * journal article (verified against the live dataset, design doc §1.1) --
 * @article is a stated assumption, not a guess, and would need revisiting if
 * a non-journal-article record is ever added (the publication schema has no
 * type field to check).
 */
export function formatBibtexCitation(pub: CitationFields, citeKey: string): string {
  const year = citationYear(pub.date)
  const fields: [string, string | null][] = [
    ['author', normalizeAuthor(pub.author)],
    ['title', normalizeTitle(pub.title)],
    ['journal', pub.journal?.trim() ?? null],
    ['year', year],
    ['volume', pub.volume !== null ? String(pub.volume) : null],
    ['number', pub.issue !== null ? String(pub.issue) : null],
    ['pages', pub.pages],
    ['doi', pub.doi],
    ['url', pub.doi ? null : (pub.url?.trim() ?? null)],
  ]

  const body = fields
    .filter((entry): entry is [string, string] => entry[1] !== null && entry[1] !== '')
    .map(([key, value]) => `  ${key} = {${escapeBibtexField(value)}},`)
    .join('\n')

  return `@article{${citeKey},\n${body}\n}`
}
