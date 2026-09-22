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
