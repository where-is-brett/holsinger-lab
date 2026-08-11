export interface CrossrefWorkFields {
  title: string
  author: string
  journal: string
  volume: number | null
  issue: number | null
  pages: string | null
  date: string
  abstract: string | null
}

interface CrossrefAuthor {
  given?: string
  family?: string
}

interface CrossrefMessage {
  title?: string[]
  author?: CrossrefAuthor[]
  'container-title'?: string[]
  volume?: string
  issue?: string
  page?: string
  'article-number'?: string
  published?: { 'date-parts'?: number[][] }
  abstract?: string
}

/**
 * Formats a Crossref author list as "Family Initials." per author, joined by
 * ", " -- e.g. "Holsinger R.M.D.". Deliberately consistent (one separator,
 * always initials-with-dots) so DOI-sourced `author` strings stop adding to
 * the five-spellings problem design doc §1.1 found in the hand-entered data.
 */
export function formatCrossrefAuthors(authors: CrossrefAuthor[]): string {
  return authors
    .map(({ given, family }) => {
      const familyName = (family ?? '').trim()
      const initials = (given ?? '')
        .split(/[\s-]+/)
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase())
        .join('.')
      if (!familyName) return ''
      return initials ? `${familyName} ${initials}.` : familyName
    })
    .filter(Boolean)
    .join(', ')
}

/** Converts Crossref's `[year, month?, day?]` into an ISO `YYYY-MM-DD` string, defaulting a missing month/day to 01. */
export function crossrefDateToIsoDate(dateParts: number[]): string {
  const [year, month = 1, day = 1] = dateParts
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Strips Crossref's inline HTML/XML markup out of a string. Removes any
 * `<jats:title>` block outright (Crossref's abstracts are conventionally
 * wrapped in a redundant "Abstract" title element -- unique to that field),
 * strips any remaining tag (not just `jats:`-namespaced ones -- Crossref also
 * embeds plain inline formatting like `<i>`/`<sub>`/`<sup>` in `title` and
 * `container-title`), and collapses whitespace. Tags are removed with no
 * replacement text (not a space) so formatting-only tags directly adjacent to
 * word characters -- e.g. `K<sub>0.5</sub>Na<sub>0.5</sub>NbO<sub>3</sub>` --
 * collapse back to `K0.5Na0.5NbO3` instead of being split apart.
 */
export function stripJatsTags(input: string): string {
  return input
    .replace(/<jats:title>[\s\S]*?<\/jats:title>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseNumericField(value: string | undefined): number | null {
  if (value === undefined) return null
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : null
}

/**
 * Fetches and normalises a Crossref work record for `doi` (a bare DOI, e.g.
 * `10.1038/s41420-025-02362-7`). `fetchImpl` defaults to the global `fetch`
 * and is overridable for testing.
 */
export async function fetchCrossrefWork(
  doi: string,
  fetchImpl: typeof fetch = fetch
): Promise<CrossrefWorkFields> {
  const response = await fetchImpl(`https://api.crossref.org/works/${encodeURIComponent(doi)}`)

  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? `No Crossref record found for DOI ${doi}`
        : `Crossref lookup failed (${response.status})`
    )
  }

  const body = (await response.json()) as { message: CrossrefMessage }
  const message = body.message

  const title = message.title?.[0]?.trim()
  const journal = message['container-title']?.[0]?.trim()
  const dateParts = message.published?.['date-parts']?.[0]

  if (!title || !journal || !dateParts) {
    throw new Error(`Crossref record for ${doi} is missing a title, journal, or publication date`)
  }

  return {
    title: stripJatsTags(title),
    author: formatCrossrefAuthors(message.author ?? []),
    journal: stripJatsTags(journal),
    volume: parseNumericField(message.volume),
    issue: parseNumericField(message.issue),
    pages: message.page ?? message['article-number'] ?? null,
    date: crossrefDateToIsoDate(dateParts),
    abstract: message.abstract ? stripJatsTags(message.abstract) : null,
  }
}
