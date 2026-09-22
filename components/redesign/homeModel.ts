import { toPlainText } from '@portabletext/react'
import { resolveHref } from 'lib/sanity.links'

import { isAlumniGroup } from './peopleModel'

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
