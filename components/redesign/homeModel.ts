import { toPlainText } from '@portabletext/react'
import { resolveHref } from 'lib/sanity.links'

import { isAlumniGroup } from './peopleModel'
import type { ResearchProjectCover, ResearchProjectView } from './researchModel'

/**
 * The IA's fixed fallback tagline (spec, agreed-ia.md). Shared by
 * `homeStatement` below and Home's own fallback tagline (`Home.tsx`).
 */
export const IA_TAGLINE =
  'Advancing the Understanding and Treatment of Neurological Disorders through Molecular Research'

/**
 * `showLabHeadOnHome` unset (null/undefined) means on -- the live
 * `settings` singleton predates this field, so every already-published
 * document has no key for it, and `!== false` is what keeps that document
 * showing the card rather than silently hiding it after deploy.
 *
 * Moved unchanged from `components/pages/home/shouldShowLabHeadCard.ts`
 * (Task 3 brief) -- same function, same tests, only the import path
 * changed at call sites.
 */
export function shouldShowLabHeadCard(settings: {
  labHead?: { _id: string } | null
  showLabHeadOnHome?: boolean | null
}): boolean {
  return Boolean(settings.labHead) && settings.showLabHeadOnHome !== false
}

/**
 * Home-card link resolution: the lab head's own page when enabled, /people
 * otherwise. Moved unchanged from
 * `components/pages/home/resolveLabHeadHref.ts` (Task 3 brief).
 */
export function resolveLabHeadHref(person: {
  hasPage?: boolean | null
  slug?: string | null
}): string {
  if (person.hasPage) {
    const href = resolveHref('profile', person.slug)
    if (href) {
      return href
    }
  }
  return '/people'
}

/**
 * The "current members" count for Home's "The lab" block: every profile
 * that isn't in an alumni role group (`isAlumniGroup`, peopleModel.ts) and
 * isn't the lab head. `labHeadId` unset (null/undefined) excludes nobody
 * by id -- mirrors `excludeLabHead`'s own "no id, no-op" rule in
 * peopleModel.ts, so a profile is never excluded from this count just
 * because it happens to share an id with something falsy.
 *
 * `roleGroups` (not each profile's own denormalized `roleGroup.title`) is
 * the source of truth for which group ids count as alumni -- the same
 * indirection `groupByRoleGroup` uses, so a profile whose `roleGroup`
 * projection is stale or partial still resolves correctly as long as its
 * `_id` matches an entry in `roleGroups`. A profile with no `roleGroup` at
 * all (ungrouped) is always counted -- it can't match an alumni id it
 * doesn't have.
 */
export function currentMemberCount(
  profiles: { _id: string; roleGroup?: { _id: string; title: string | null } | null }[],
  roleGroups: { _id: string; title: string | null }[],
  labHeadId: string | null | undefined
): number {
  const alumniGroupIds = new Set(
    roleGroups.filter((group) => isAlumniGroup(group.title)).map((group) => group._id)
  )
  return profiles.filter((profile) => {
    if (labHeadId && profile._id === labHeadId) return false
    if (profile.roleGroup && alumniGroupIds.has(profile.roleGroup._id)) return false
    return true
  }).length
}

/**
 * Home's tagline: `home.overview` (portable text) reduced to trimmed plain
 * text via `@portabletext/react`'s `toPlainText`, or `null` when there's
 * nothing there (unset, empty array, or blocks that reduce to only
 * whitespace) -- the caller falls back to the IA's constant tagline in
 * that case, never an empty string sitting in the DOM.
 *
 * `overview` is typed `unknown`, matching the brief -- `toPlainText`
 * itself only cares that it receives portable-text-shaped blocks, and the
 * query payload's own generated type for this field (TypeGen output) can
 * vary by call site; the cast happens once, here, rather than at every
 * caller.
 */
export function plainTagline(overview: unknown): string | null {
  if (!overview) return null
  const text = toPlainText(overview as Parameters<typeof toPlainText>[0]).trim()
  return text === '' ? null : text
}

function plainText(blocks: unknown): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return ''
  return toPlainText(blocks as Parameters<typeof toPlainText>[0])
    .replace(/\s+/g, ' ')
    .trim()
}

/** Hero statement: siteCopy.about.body → hero.subheading → home.overview → IA tagline. */
export function homeStatement(
  siteCopy: { about?: { body?: unknown } | null; hero?: { subheading?: string | null } | null } | null,
  homeOverview: unknown
): string {
  return (
    plainText(siteCopy?.about?.body) ||
    siteCopy?.hero?.subheading?.trim() ||
    plainText(homeOverview) ||
    IA_TAGLINE
  )
}

/** The first item as the "lead", the rest in order. `{ lead: null, rest: [] }` for an empty list. */
export function splitLead<T>(publications: T[]): { lead: T | null; rest: T[] } {
  const [lead = null, ...rest] = publications
  return { lead, rest }
}

// Candidate sentence boundary: a terminator, optionally followed by closing
// quote/bracket characters, then either whitespace and an (optionally
// quote/paren-led) uppercase letter or digit, or the end of the string.
// `\p{Lu}` (with the `u` flag) matches non-ASCII uppercase (e.g. "Émile"),
// not just A-Z.
const SENTENCE_BOUNDARY = /[.!?]["'”’)\]]*(?=\s+["'“‘(]?[\p{Lu}\p{N}]|$)/gu

// A boundary candidate is a false positive, not a real sentence end, when
// the text immediately before it is a known abbreviation ("Dr.", "Fig.",
// "et al.", "e.g.", ...) or a single capital initial ("A." in "A.I.") --
// tested against the text up to and including the terminator itself (not
// any trailing closing quote/bracket).
const ABBREVIATION = /(?:\b(?:Dr|Prof|Assoc|Fig|Figs|Eq|No|St|Mr|Mrs|Ms|Jr|Sr|vs|cf|approx|ca|al|e\.g|i\.e)|\b\p{Lu})\.$/u

/** The first sentence, cut at a word boundary with "…" when longer than `max`. */
export function firstSentence(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return ''
  let sentence = clean
  for (const match of clean.matchAll(SENTENCE_BOUNDARY)) {
    const end = match.index + match[0].length
    if (ABBREVIATION.test(clean.slice(0, match.index + 1))) continue
    sentence = clean.slice(0, end)
    break
  }
  if (sentence.length <= max) return sentence
  const cut = sentence.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:]+$/, '')}…`
}

export interface ResearchCard {
  key: string
  title: string
  excerpt: string
  href: string | null
  cover: ResearchProjectCover | null
}

/** researchOrder projects first; siteCopy.about.themes only when there are none. */
export function researchCards(
  projects: ResearchProjectView[],
  themes: { title?: string | null; summary?: string | null }[] | null | undefined
): ResearchCard[] {
  if (projects.length > 0) {
    return projects.map((p) => ({
      key: p.id,
      title: p.title,
      excerpt: firstSentence(plainText(p.body)),
      href: p.slug ? `/research#${p.slug}` : '/research',
      cover: p.cover,
    }))
  }
  return (themes ?? []).flatMap((t, i) => {
    const title = t.title?.trim()
    if (!title) return []
    return [
      {
        key: `theme-${i}`,
        title,
        excerpt: firstSentence((t.summary ?? '').replace(/^\s*-\s+/, '')),
        href: null,
        cover: null,
      },
    ]
  })
}

export interface StripPerson {
  id: string
  name: string
  image: unknown
}

/** Current members with a photo, in the given (orderRank) order, never the lab head or alumni. */
export function peopleStrip(
  profiles: {
    _id: string
    name?: string | null
    image?: unknown
    roleGroup?: { _id: string; title: string | null } | null
  }[],
  roleGroups: { _id: string; title: string | null }[],
  labHeadId: string | null | undefined,
  max = 8
): StripPerson[] {
  const alumni = new Set(roleGroups.filter((g) => isAlumniGroup(g.title)).map((g) => g._id))
  return profiles
    .filter((p) => !(labHeadId && p._id === labHeadId))
    .filter(
      (p) => !(p.roleGroup && (alumni.has(p.roleGroup._id) || isAlumniGroup(p.roleGroup.title)))
    )
    .filter((p) => Boolean(p.image) && Boolean(p.name?.trim()))
    .slice(0, max)
    .map((p) => ({ id: p._id, name: p.name!.trim(), image: p.image }))
}

// Normalises a URL (or plain text that might be one) for comparison:
// trims, drops the scheme and a leading "www.", drops any trailing slashes
// and punctuation in one combined pass, and lowercases -- so
// "HTTPS://www.tinyurl.com/maestrotalks/." matches
// "tinyurl.com/maestrotalks" instead of being kept as a visible duplicate.
const bare = (s: string) =>
  s
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/[/.,;:!?)\]]+$/, '')
    .toLowerCase()

interface PortableBlock {
  _type?: string
  children?: { text?: string; marks?: string[] }[]
  markDefs?: { _key?: string; _type?: string; href?: string }[]
}

// A link-only block's text is dropped as "just the register link" only up
// to this length -- past it, the block is read as real informational copy
// an editor chose to link (e.g. a schedule sentence), not short link text
// ("Register here", "Sign up"), and constraints.md's "CMS text prints
// verbatim" wins: it's kept.
const LINK_TEXT_MAX = 40

/**
 * True when every non-whitespace span in a block carries a mark linking to
 * `siteBare` -- i.e. the block's only content is a link to the register
 * URL -- and the block's own text is short link text (at most
 * `LINK_TEXT_MAX` characters) or itself normalises to the site. A longer,
 * fully-linked informational sentence is not matched, so it survives (its
 * text still print verbatim; only its short "Register here"-style label is
 * ever considered a duplicate of the card's own register link). Non-`block`
 * items (images, etc.) and blocks with no markDefs at all are never
 * matched.
 */
function isSiteOnlyLink(block: unknown, siteBare: string): boolean {
  const b = block as PortableBlock
  if (b?._type !== 'block' || !Array.isArray(b.children)) return false
  const linkKeys = new Set(
    (b.markDefs ?? [])
      .filter((def) => def._type === 'link' && typeof def.href === 'string' && bare(def.href) === siteBare)
      .map((def) => def._key)
  )
  if (linkKeys.size === 0) return false
  const spans = b.children.filter((c) => (c.text ?? '').trim() !== '')
  if (spans.length === 0) return false
  if (!spans.every((c) => (c.marks ?? []).some((mark) => linkKeys.has(mark)))) return false
  const text = plainText([b])
  return text.length <= LINK_TEXT_MAX || bare(text) === siteBare
}

/**
 * The MAESTRO overview minus: a block with no text at all (the real
 * defect this guards -- an empty portable-text block otherwise renders as
 * an empty `<p>`); a block whose whole text is only the register URL,
 * normalised (`bare`); and a block whose only content is a link to that
 * URL, regardless of its link text. The card already carries one register
 * link, so any of these would show it twice, or render nothing. A sentence
 * that merely contains the URL alongside other text is kept.
 */
export function maestroOverview<B>(blocks: B[] | null | undefined, site: string | null | undefined): B[] {
  if (!blocks) return []
  const siteBare = site ? bare(site) : null
  return blocks.filter((b) => {
    const isBlock = (b as PortableBlock)?._type === 'block'
    const text = plainText([b])
    if (isBlock && text === '') return false
    if (!siteBare) return true
    if (bare(text) === siteBare) return false
    if (isSiteOnlyLink(b, siteBare)) return false
    return true
  })
}
