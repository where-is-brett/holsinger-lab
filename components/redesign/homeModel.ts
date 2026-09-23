import { toPlainText } from '@portabletext/react'
import { resolveHref } from 'lib/sanity.links'

import { isAlumniGroup } from './peopleModel'
import type { ResearchProjectCover, ResearchProjectView } from './researchModel'

/**
 * The IA's fixed fallback tagline (spec, agreed-ia.md) -- moved here from
 * `Home.tsx` so `homeStatement` can fall back to it without a screen-level
 * import cycle. Same text, unchanged.
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

/** The first sentence, cut at a word boundary with "…" when longer than `max`. */
export function firstSentence(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return ''
  const match = clean.match(/^.+?[.!?](?=\s+[A-Z0-9"'(]|$)/)
  const sentence = match ? match[0] : clean
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
    .filter((p) => !(p.roleGroup && alumni.has(p.roleGroup._id)))
    .filter((p) => Boolean(p.image) && Boolean(p.name?.trim()))
    .slice(0, max)
    .map((p) => ({ id: p._id, name: p.name!.trim(), image: p.image }))
}

const bare = (s: string) => s.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')

/** The MAESTRO overview minus any block that only repeats the register URL: the card has one register link. */
export function maestroOverview<B>(blocks: B[] | null | undefined, site: string | null | undefined): B[] {
  if (!blocks) return []
  if (!site) return blocks
  return blocks.filter((b) => bare(plainText([b])) !== bare(site))
}
