// Extension is explicit: scripts/backfill-publication-slugs.ts imports this
// module under plain Node, whose ESM resolver does not do extensionless lookup.
import { slugify } from './slug.ts'

// Builds a `publication` slug as title + year, per the Phase 2 content-model
// plan. The year is not decoration: publication titles collide (a preprint and
// its published version, an erratum, a review revisited) and the year is what
// separates them in /publications/<slug>.
//
// It therefore has to survive truncation. `slugify` caps its output at 96
// characters, and real titles here run well past that -- the 2025 CBX7 paper
// alone slugifies to over 140 -- so composing "<title> <year>" and handing the
// whole thing to `slugify` would silently drop the year off the end of exactly
// the long titles most likely to need it. Instead the title is truncated to a
// budget that leaves room for "-YYYY", and the year is appended afterwards.

const MAX_LENGTH = 96
const YEAR_LENGTH = 4
const SEPARATOR_LENGTH = 1
const TITLE_BUDGET = MAX_LENGTH - SEPARATOR_LENGTH - YEAR_LENGTH

/** Extracts a four-digit year from a Sanity `date` field value. */
export function yearFromDate(date: unknown): string {
  if (typeof date !== 'string') return ''
  const match = /^(\d{4})/.exec(date)
  return match ? match[1] : ''
}

/**
 * Truncates an already-slugified string to `budget`, preferring to cut on a
 * hyphen so a word is not split mid-way. Falls back to a hard cut when the
 * first word alone exceeds the budget.
 */
function truncateSlug(slug: string, budget: number): string {
  if (slug.length <= budget) return slug
  const hardCut = slug.slice(0, budget)
  const lastBoundary = hardCut.lastIndexOf('-')
  const cut = lastBoundary > 0 ? hardCut.slice(0, lastBoundary) : hardCut
  return cut.replace(/-+$/, '')
}

/**
 * The slug for a publication: its title, truncated if need be, with the
 * publication year appended. Returns the bare title slug when no year is
 * available (`date` is a required field, but a draft can be saved without it,
 * and Studio computes the slug from whatever is on the form at the time).
 */
export function publicationSlug(title: unknown, date: unknown): string {
  const titleSlug = slugify(typeof title === 'string' ? title : '')
  const year = yearFromDate(date)
  if (!year) return titleSlug
  if (!titleSlug) return year
  return `${truncateSlug(titleSlug, TITLE_BUDGET)}-${year}`
}
